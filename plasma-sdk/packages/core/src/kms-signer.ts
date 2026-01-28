/**
 * KMS Signer Abstraction
 * 
 * Provides a secure signing interface that abstracts away private key handling.
 * Supports multiple KMS backends: AWS KMS, HashiCorp Vault, or local development.
 * 
 * CRITICAL: This replaces all direct private key usage in the codebase.
 */

import type { Address, Hex, SignableMessage, TypedData, TypedDataDefinition } from 'viem';
import { keccak256, toBytes, serializeSignature, parseSignature } from 'viem';

// =============================================================================
// Types
// =============================================================================

export interface KMSSignerConfig {
  /** KMS provider type */
  provider: 'aws-kms' | 'vault' | 'local-dev';
  /** AWS KMS Key ID (for aws-kms provider) */
  awsKeyId?: string;
  /** AWS Region (for aws-kms provider) */
  awsRegion?: string;
  /** Vault address (for vault provider) */
  vaultAddress?: string;
  /** Vault token (for vault provider) */
  vaultToken?: string;
  /** Vault key path (for vault provider) */
  vaultKeyPath?: string;
  /** Local development key (ONLY for local-dev provider in non-production) */
  localDevKey?: Hex;
}

export interface SignResult {
  signature: Hex;
  v: number;
  r: Hex;
  s: Hex;
}

export interface KMSSigner {
  /** Get the public address associated with this signer */
  getAddress(): Promise<Address>;
  /** Sign a message hash */
  signHash(hash: Hex): Promise<SignResult>;
  /** Sign typed data (EIP-712) */
  signTypedData<T extends TypedData>(typedData: TypedDataDefinition<T>): Promise<SignResult>;
  /** Sign a raw message */
  signMessage(message: SignableMessage): Promise<SignResult>;
}

// =============================================================================
// AWS KMS Signer Implementation
// =============================================================================

class AWSKMSSigner implements KMSSigner {
  private keyId: string;
  private region: string;
  private cachedAddress: Address | null = null;

  constructor(keyId: string, region: string) {
    this.keyId = keyId;
    this.region = region;
  }

  async getAddress(): Promise<Address> {
    if (this.cachedAddress) {
      return this.cachedAddress;
    }

    // In production, this would call AWS KMS to get the public key
    // and derive the Ethereum address from it
    const { KMSClient, GetPublicKeyCommand } = await import('@aws-sdk/client-kms');
    const client = new KMSClient({ region: this.region });
    
    const command = new GetPublicKeyCommand({ KeyId: this.keyId });
    const response = await client.send(command);
    
    if (!response.PublicKey) {
      throw new Error('Failed to get public key from KMS');
    }

    // Extract the public key and derive Ethereum address
    // The public key from KMS is in DER format, we need to extract the raw key
    const publicKeyBuffer = Buffer.from(response.PublicKey);
    // Skip the DER header (first 23 bytes for secp256k1)
    const rawPublicKey = publicKeyBuffer.slice(23);
    
    // Derive address from public key (keccak256 of public key, take last 20 bytes)
    const addressHash = keccak256(rawPublicKey);
    this.cachedAddress = `0x${addressHash.slice(-40)}` as Address;
    
    return this.cachedAddress;
  }

  async signHash(hash: Hex): Promise<SignResult> {
    const { KMSClient, SignCommand } = await import('@aws-sdk/client-kms');
    const client = new KMSClient({ region: this.region });

    const command = new SignCommand({
      KeyId: this.keyId,
      Message: Buffer.from(hash.slice(2), 'hex'),
      MessageType: 'DIGEST',
      SigningAlgorithm: 'ECDSA_SHA_256',
    });

    const response = await client.send(command);
    
    if (!response.Signature) {
      throw new Error('Failed to sign with KMS');
    }

    // Parse the DER-encoded signature from KMS
    const signature = this.parseDERSignature(Buffer.from(response.Signature));
    
    // Recover v value by trying both possibilities
    const v = await this.recoverV(hash, signature.r, signature.s);
    
    return {
      signature: serializeSignature({ r: signature.r, s: signature.s, v: BigInt(v) }),
      v,
      r: signature.r,
      s: signature.s,
    };
  }

  async signTypedData<T extends TypedData>(typedData: TypedDataDefinition<T>): Promise<SignResult> {
    const { hashTypedData } = await import('viem');
    const hash = hashTypedData(typedData);
    return this.signHash(hash);
  }

  async signMessage(message: SignableMessage): Promise<SignResult> {
    const { hashMessage } = await import('viem');
    const hash = hashMessage(message);
    return this.signHash(hash);
  }

  private parseDERSignature(derSig: Buffer): { r: Hex; s: Hex } {
    // DER signature format: 0x30 [total-length] 0x02 [r-length] [r] 0x02 [s-length] [s]
    let offset = 2; // Skip 0x30 and total length
    
    // Parse r
    if (derSig[offset] !== 0x02) throw new Error('Invalid DER signature');
    offset++;
    const rLength = derSig[offset];
    offset++;
    let r = derSig.slice(offset, offset + rLength);
    offset += rLength;
    
    // Parse s
    if (derSig[offset] !== 0x02) throw new Error('Invalid DER signature');
    offset++;
    const sLength = derSig[offset];
    offset++;
    let s = derSig.slice(offset, offset + sLength);
    
    // Remove leading zeros and pad to 32 bytes
    r = r[0] === 0 ? r.slice(1) : r;
    s = s[0] === 0 ? s.slice(1) : s;
    
    const rHex = `0x${r.toString('hex').padStart(64, '0')}` as Hex;
    const sHex = `0x${s.toString('hex').padStart(64, '0')}` as Hex;
    
    return { r: rHex, s: sHex };
  }

  private async recoverV(hash: Hex, r: Hex, s: Hex): Promise<number> {
    const { recoverAddress } = await import('viem');
    const expectedAddress = await this.getAddress();
    
    // Try v = 27
    try {
      const recovered27 = await recoverAddress({
        hash,
        signature: serializeSignature({ r, s, v: 27n }),
      });
      if (recovered27.toLowerCase() === expectedAddress.toLowerCase()) {
        return 27;
      }
    } catch {}
    
    // Try v = 28
    try {
      const recovered28 = await recoverAddress({
        hash,
        signature: serializeSignature({ r, s, v: 28n }),
      });
      if (recovered28.toLowerCase() === expectedAddress.toLowerCase()) {
        return 28;
      }
    } catch {}
    
    throw new Error('Failed to recover v value');
  }
}

// =============================================================================
// HashiCorp Vault Signer Implementation
// =============================================================================

class VaultSigner implements KMSSigner {
  private vaultAddress: string;
  private vaultToken: string;
  private keyPath: string;
  private cachedAddress: Address | null = null;

  constructor(vaultAddress: string, vaultToken: string, keyPath: string) {
    this.vaultAddress = vaultAddress;
    this.vaultToken = vaultToken;
    this.keyPath = keyPath;
  }

  async getAddress(): Promise<Address> {
    if (this.cachedAddress) {
      return this.cachedAddress;
    }

    const response = await fetch(`${this.vaultAddress}/v1/${this.keyPath}/address`, {
      headers: { 'X-Vault-Token': this.vaultToken },
    });

    if (!response.ok) {
      throw new Error(`Vault error: ${response.statusText}`);
    }

    const data = await response.json();
    this.cachedAddress = data.data.address as Address;
    return this.cachedAddress;
  }

  async signHash(hash: Hex): Promise<SignResult> {
    const response = await fetch(`${this.vaultAddress}/v1/${this.keyPath}/sign`, {
      method: 'POST',
      headers: {
        'X-Vault-Token': this.vaultToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ hash: hash.slice(2) }),
    });

    if (!response.ok) {
      throw new Error(`Vault signing error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      signature: data.data.signature as Hex,
      v: data.data.v,
      r: data.data.r as Hex,
      s: data.data.s as Hex,
    };
  }

  async signTypedData<T extends TypedData>(typedData: TypedDataDefinition<T>): Promise<SignResult> {
    const { hashTypedData } = await import('viem');
    const hash = hashTypedData(typedData);
    return this.signHash(hash);
  }

  async signMessage(message: SignableMessage): Promise<SignResult> {
    const { hashMessage } = await import('viem');
    const hash = hashMessage(message);
    return this.signHash(hash);
  }
}

// =============================================================================
// Local Development Signer (ONLY for non-production)
// =============================================================================

class LocalDevSigner implements KMSSigner {
  private privateKey: Hex;
  private cachedAddress: Address | null = null;

  constructor(privateKey: Hex) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('LocalDevSigner cannot be used in production');
    }
    this.privateKey = privateKey;
  }

  async getAddress(): Promise<Address> {
    if (this.cachedAddress) {
      return this.cachedAddress;
    }

    const { privateKeyToAccount } = await import('viem/accounts');
    const account = privateKeyToAccount(this.privateKey);
    this.cachedAddress = account.address;
    return this.cachedAddress;
  }

  async signHash(hash: Hex): Promise<SignResult> {
    const { privateKeyToAccount } = await import('viem/accounts');
    const account = privateKeyToAccount(this.privateKey);
    const signature = await account.signMessage({ message: { raw: hash } });
    const parsed = parseSignature(signature);
    
    return {
      signature,
      v: Number(parsed.v),
      r: parsed.r,
      s: parsed.s,
    };
  }

  async signTypedData<T extends TypedData>(typedData: TypedDataDefinition<T>): Promise<SignResult> {
    const { privateKeyToAccount } = await import('viem/accounts');
    const account = privateKeyToAccount(this.privateKey);
    const signature = await account.signTypedData(typedData as any);
    const parsed = parseSignature(signature);
    
    return {
      signature,
      v: Number(parsed.v),
      r: parsed.r,
      s: parsed.s,
    };
  }

  async signMessage(message: SignableMessage): Promise<SignResult> {
    const { privateKeyToAccount } = await import('viem/accounts');
    const account = privateKeyToAccount(this.privateKey);
    const signature = await account.signMessage({ message });
    const parsed = parseSignature(signature);
    
    return {
      signature,
      v: Number(parsed.v),
      r: parsed.r,
      s: parsed.s,
    };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a KMS signer based on configuration.
 * 
 * In production, use AWS KMS or Vault.
 * In development, can use local-dev with a test key.
 */
export function createKMSSigner(config: KMSSignerConfig): KMSSigner {
  switch (config.provider) {
    case 'aws-kms':
      if (!config.awsKeyId || !config.awsRegion) {
        throw new Error('AWS KMS requires awsKeyId and awsRegion');
      }
      return new AWSKMSSigner(config.awsKeyId, config.awsRegion);
    
    case 'vault':
      if (!config.vaultAddress || !config.vaultToken || !config.vaultKeyPath) {
        throw new Error('Vault requires vaultAddress, vaultToken, and vaultKeyPath');
      }
      return new VaultSigner(config.vaultAddress, config.vaultToken, config.vaultKeyPath);
    
    case 'local-dev':
      if (!config.localDevKey) {
        throw new Error('Local dev requires localDevKey');
      }
      return new LocalDevSigner(config.localDevKey);
    
    default:
      throw new Error(`Unknown KMS provider: ${config.provider}`);
  }
}

/**
 * Create a KMS signer from environment variables.
 * 
 * Environment variables:
 * - KMS_PROVIDER: 'aws-kms' | 'vault' | 'local-dev'
 * - AWS_KMS_KEY_ID: AWS KMS key ID
 * - AWS_REGION: AWS region
 * - VAULT_ADDR: Vault address
 * - VAULT_TOKEN: Vault token
 * - VAULT_KEY_PATH: Vault key path
 * - LOCAL_DEV_KEY: Local development private key (non-production only)
 */
export function createKMSSignerFromEnv(): KMSSigner {
  const provider = process.env.KMS_PROVIDER as KMSSignerConfig['provider'];
  
  if (!provider) {
    throw new Error('KMS_PROVIDER environment variable is required');
  }

  const config: KMSSignerConfig = {
    provider,
    awsKeyId: process.env.AWS_KMS_KEY_ID,
    awsRegion: process.env.AWS_REGION,
    vaultAddress: process.env.VAULT_ADDR,
    vaultToken: process.env.VAULT_TOKEN,
    vaultKeyPath: process.env.VAULT_KEY_PATH,
    localDevKey: process.env.LOCAL_DEV_KEY as Hex | undefined,
  };

  return createKMSSigner(config);
}

// =============================================================================
// Singleton Instance
// =============================================================================

let globalSigner: KMSSigner | null = null;

/**
 * Get the global KMS signer instance.
 * Creates one from environment variables if not already initialized.
 */
export function getGlobalKMSSigner(): KMSSigner {
  if (!globalSigner) {
    globalSigner = createKMSSignerFromEnv();
  }
  return globalSigner;
}

/**
 * Set the global KMS signer instance.
 * Useful for testing or custom initialization.
 */
export function setGlobalKMSSigner(signer: KMSSigner): void {
  globalSigner = signer;
}
