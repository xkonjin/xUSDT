# plasma-brain-v3/tests/gateways/kms/test_signer.py

import os
import unittest
from unittest.mock import patch, MagicMock

from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding

# It's better to import the module that is being tested
from agent.kms import signer as kms_signer

class TestKmsSigner(unittest.TestCase):
    """
    Unit tests for the KmsSigner service and factory.
    """

    def setUp(self):
        """Set up a dummy private key for local signing tests."""
        self.private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )
        self.public_key = self.private_key.public_key()
        self.key_path = "/tmp/test_private_key.pem"

        with open(self.key_path, "wb") as f:
            f.write(
                self.private_key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.PKCS8,
                    encryption_algorithm=serialization.NoEncryption(),
                )
            )

        self.message = b"This is a test message for signing."

    def tearDown(self):
        """Clean up the dummy private key file."""
        if os.path.exists(self.key_path):
            os.remove(self.key_path)

    def test_local_dev_signer_success(self):
        """E2E Test: Verify that the LocalDevSigner signs correctly."""
        os.environ["LOCAL_PRIVATE_KEY_PATH"] = self.key_path
        signer = kms_signer.LocalDevSigner(self.key_path)
        signature = signer.sign(self.message)

        # Verify the signature with the public key
        try:
            self.public_key.verify(
                signature,
                self.message,
                padding.PKCS1v15(),
                hashes.SHA256(),
            )
            verification_success = True
        except Exception:
            verification_success = False

        self.assertTrue(verification_success, "Signature verification failed.")

    def test_local_dev_signer_file_not_found(self):
        """Test that LocalDevSigner raises an error if the key file is missing."""
        with self.assertRaises(RuntimeError):
            kms_signer.LocalDevSigner("/tmp/non_existent_key.pem")

    @patch.dict(os.environ, {"KMS_PROVIDER": "local", "LOCAL_PRIVATE_KEY_PATH": "/tmp/test_private_key.pem"})
    def test_factory_creates_local_signer(self):
        """Test that the factory correctly creates a LocalDevSigner."""
        # We need to ensure the file exists for the factory to succeed
        with open("/tmp/test_private_key.pem", "wb") as f:
            f.write(
                self.private_key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.PKCS8,
                    encryption_algorithm=serialization.NoEncryption(),
                )
            )
        signer = kms_signer.KmsSignerFactory.create_signer()
        self.assertIsInstance(signer, kms_signer.LocalDevSigner)
        os.remove("/tmp/test_private_key.pem")

    @patch.dict(os.environ, {"KMS_PROVIDER": "aws", "AWS_KMS_KEY_ID": "key-123", "AWS_REGION": "us-east-1"})
    @patch("boto3.client")
    def test_factory_creates_aws_signer(self, mock_boto_client):
        """Test that the factory correctly creates an AwsKmsSigner."""
        signer = kms_signer.KmsSignerFactory.create_signer()
        self.assertIsInstance(signer, kms_signer.AwsKmsSigner)

    @patch.dict(os.environ, {"KMS_PROVIDER": "vault", "VAULT_ADDR": "http://vault:8200", "VAULT_TOKEN": "token-123", "VAULT_KMS_KEY_NAME": "key-name"})
    @patch("hvac.Client")
    def test_factory_creates_vault_signer(self, mock_hvac_client):
        """Test that the factory correctly creates a VaultKmsSigner."""
        signer = kms_signer.KmsSignerFactory.create_signer()
        self.assertIsInstance(signer, kms_signer.VaultKmsSigner)

    def test_factory_unsupported_provider(self):
        """Test that the factory raises an error for an unsupported provider."""
        with patch.dict(os.environ, {"KMS_PROVIDER": "gcp"}):
            with self.assertRaises(ValueError):
                kms_signer.KmsSignerFactory.create_signer()

    @patch("boto3.client")
    def test_aws_signer_success(self, mock_boto_client):
        """E2E Test: Verify that AwsKmsSigner correctly calls the AWS KMS API."""
        mock_kms = MagicMock()
        mock_kms.sign.return_value = {"Signature": b"aws-signature"}
        mock_boto_client.return_value = mock_kms

        signer = kms_signer.AwsKmsSigner("key-123", "us-east-1")
        signature = signer.sign(self.message)

        self.assertEqual(signature, b"aws-signature")
        mock_kms.sign.assert_called_once()

    @patch("boto3.client")
    def test_aws_signer_api_error(self, mock_boto_client):
        """Test that AwsKmsSigner handles API errors gracefully."""
        from botocore.exceptions import ClientError

        mock_kms = MagicMock()
        mock_kms.sign.side_effect = ClientError({"Error": {"Code": "AccessDeniedException"}}, "Sign")
        mock_boto_client.return_value = mock_kms

        signer = kms_signer.AwsKmsSigner("key-123", "us-east-1")
        with self.assertRaises(RuntimeError):
            signer.sign(self.message)

    @patch("hvac.Client")
    def test_vault_signer_success(self, mock_hvac_client):
        """E2E Test: Verify that VaultKmsSigner correctly calls the Vault API."""
        mock_vault = MagicMock()
        mock_vault.secrets.transit.sign_data.return_value = {
            "data": {"signature": "vault:v1:dmF1bHQtc2lnbmF0dXJl"} # base64 of "vault-signature"
        }
        mock_hvac_client.return_value = mock_vault

        signer = kms_signer.VaultKmsSigner("http://vault:8200", "token-123", "key-name")
        signature = signer.sign(self.message)

        self.assertEqual(signature, b"dmF1bHQtc2lnbmF0dXJl")
        mock_vault.secrets.transit.sign_data.assert_called_once()

    @patch("hvac.Client")
    def test_vault_signer_api_error(self, mock_hvac_client):
        """Test that VaultKmsSigner handles API errors gracefully."""
        mock_vault = MagicMock()
        mock_vault.secrets.transit.sign_data.side_effect = Exception("Vault is sealed")
        mock_hvac_client.return_value = mock_vault

        signer = kms_signer.VaultKmsSigner("http://vault:8200", "token-123", "key-name")
        with self.assertRaises(RuntimeError):
            signer.sign(self.message)

if __name__ == "__main__":
    unittest.main()
