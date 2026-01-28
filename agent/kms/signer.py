# plasma-brain-v3/gateways/kms/signer.py

"""
KMS Signer Service

This module provides a centralized service for cryptographic signing operations,
integrating with various Key Management Systems (KMS) to eliminate direct
handling of private keys within the application. By abstracting the signing
process, it enhances security and simplifies key management.

Security Rationale:
- Private Key Isolation: Private keys are never loaded into the application
  memory. All signing operations are delegated to a secure, isolated
  environment (AWS KMS, HashiCorp Vault, or a local file for development).
  This mitigates the risk of private key exposure through code vulnerabilities,
  memory dumps, or unauthorized access to the application server.
- Centralized Key Management: Simplifies key rotation, access control, and
  auditing by managing cryptographic keys in a dedicated system.
- Defense-in-Depth: Adds an additional layer of security. Even if an attacker
  gains control of the application, they cannot extract the private keys.

Usage:
  signer = KmsSignerFactory.create_signer()
  signature = signer.sign(b"message_to_sign")
"""

import os
import boto3
import hvac
from abc import ABC, abstractmethod
from botocore.exceptions import ClientError
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives import serialization

class KmsSigner(ABC):
    """
    Abstract base class for a KMS signer.
    Defines the interface for signing data without exposing the private key.
    """

    @abstractmethod
    def sign(self, message: bytes) -> bytes:
        """
        Signs a message using the configured key.

        Args:
            message: The message to sign, as bytes.

        Returns:
            The signature, as bytes.

        Raises:
            Exception: If the signing operation fails.
        """
        pass

class AwsKmsSigner(KmsSigner):
    """
    Signs messages using AWS KMS.

    Security:
    - Leverages IAM roles for authentication, avoiding long-lived credentials.
    - The private key resides within the AWS KMS HSM and is never exposed.
    - All signing operations are logged in AWS CloudTrail for auditing.
    """

    def __init__(self, key_id: str, region_name: str):
        """
        Initializes the AWS KMS signer.

        Args:
            key_id: The ARN or alias of the KMS key.
            region_name: The AWS region.
        """
        if not key_id or not region_name:
            raise ValueError("AWS KMS Key ID and region must be provided.")
        self.key_id = key_id
        self.client = boto3.client("kms", region_name=region_name)

    def sign(self, message: bytes) -> bytes:
        """
        Signs a message using the specified AWS KMS key.

        Args:
            message: The message to sign.

        Returns:
            The signature.

        Raises:
            RuntimeError: If the signing operation fails.
        """
        try:
            # For RSA keys, KMS requires the message to be pre-hashed.
            # We use SHA-256 as a secure hashing algorithm.
            digest = hashes.Hash(hashes.SHA256())
            digest.update(message)
            message_hash = digest.finalize()

            response = self.client.sign(
                KeyId=self.key_id,
                Message=message_hash,
                MessageType="DIGEST",
                SigningAlgorithm="RSASSA_PKCS1_V1_5_SHA_256",
            )
            return response["Signature"]
        except ClientError as e:
            # Log the specific error for debugging without exposing sensitive info.
            print(f"AWS KMS signing failed: {e.response['Error']['Code']}")
            raise RuntimeError("Failed to sign message with AWS KMS.") from e

class VaultKmsSigner(KmsSigner):
    """
    Signs messages using HashiCorp Vault.

    Security:
    - Authenticates to Vault using AppRole or other secure methods.
    - The private key is stored in Vault's transit secret engine.
    - All operations are audited within Vault.
    """

    def __init__(self, vault_addr: str, vault_token: str, key_name: str):
        """
        Initializes the Vault signer.

        Args:
            vault_addr: The address of the Vault server.
            vault_token: The Vault token for authentication.
            key_name: The name of the key in the transit engine.
        """
        if not all([vault_addr, vault_token, key_name]):
            raise ValueError("Vault address, token, and key name are required.")
        self.client = hvac.Client(url=vault_addr, token=vault_token)
        self.key_name = key_name

    def sign(self, message: bytes) -> bytes:
        """
        Signs a message using Vault's transit engine.

        Args:
            message: The message to sign.

        Returns:
            The signature.

        Raises:
            RuntimeError: If the signing operation fails.
        """
        try:
            response = self.client.secrets.transit.sign_data(
                name=self.key_name,
                hash_algorithm="sha2-256",
                data_to_sign=message.hex(),  # Vault expects hex-encoded data
            )
            # The signature is returned in a format like 'vault:v1:signature'
            # We need to extract the base64 part.
            return response["data"]["signature"].split(":")[2].encode("utf-8")
        except Exception as e:
            print(f"HashiCorp Vault signing failed: {e}")
            raise RuntimeError("Failed to sign message with HashiCorp Vault.") from e

class LocalDevSigner(KmsSigner):
    """
    A signer for local development that uses a locally stored private key.

    **WARNING**: This is for development purposes ONLY. Do not use in production.
    It exposes the private key in the application environment, which is insecure.
    """

    def __init__(self, private_key_path: str):
        """
        Initializes the local signer.

        Args:
            private_key_path: The file path to the PEM-encoded private key.
        """
        if not private_key_path:
            raise ValueError("Private key path is required for local development signer.")
        try:
            with open(private_key_path, "rb") as key_file:
                self.private_key = serialization.load_pem_private_key(
                    key_file.read(), password=None
                )
        except (IOError, ValueError) as e:
            raise RuntimeError(f"Failed to load local private key: {e}") from e

    def sign(self, message: bytes) -> bytes:
        """
        Signs a message using the local private key.

        Args:
            message: The message to sign.

        Returns:
            The signature.
        """
        return self.private_key.sign(
            message,
            padding.PKCS1v15(),
            hashes.SHA256(),
        )

class KmsSignerFactory:
    """
    Factory for creating a KmsSigner based on environment configuration.
    """

    @staticmethod
    def create_signer() -> KmsSigner:
        """
        Creates a KMS signer based on environment variables.

        Configuration is determined by the `KMS_PROVIDER` environment variable:
        - "aws": Uses AwsKmsSigner. Requires `AWS_KMS_KEY_ID` and `AWS_REGION`.
        - "vault": Uses VaultKmsSigner. Requires `VAULT_ADDR`, `VAULT_TOKEN`,
                   and `VAULT_KMS_KEY_NAME`.
        - "local": Uses LocalDevSigner. Requires `LOCAL_PRIVATE_KEY_PATH`.
                   **FOR DEVELOPMENT ONLY**.

        Returns:
            An instance of a KmsSigner.

        Raises:
            ValueError: If the configuration is invalid or missing.
        """
        provider = os.getenv("KMS_PROVIDER", "local").lower()

        if provider == "aws":
            key_id = os.getenv("AWS_KMS_KEY_ID")
            region = os.getenv("AWS_REGION")
            return AwsKmsSigner(key_id, region)
        elif provider == "vault":
            addr = os.getenv("VAULT_ADDR")
            token = os.getenv("VAULT_TOKEN")
            key_name = os.getenv("VAULT_KMS_KEY_NAME")
            return VaultKmsSigner(addr, token, key_name)
        elif provider == "local":
            key_path = os.getenv("LOCAL_PRIVATE_KEY_PATH")
            print("WARNING: Using local signer. For development only.")
            return LocalDevSigner(key_path)
        else:
            raise ValueError(f"Unsupported KMS provider: {provider}")
