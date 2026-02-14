/**
 * Key Manager - Secure key storage and management
 *
 * Supports multiple storage backends:
 * 1. OS Keyring (most secure) - Uses system keychain
 * 2. Encrypted file - Password-protected local storage
 * 3. Environment variable - For CI/CD and containers
 */

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  createHash,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scrypt,
} from "crypto";
import { promisify } from "util";
import type { Hex, Address } from "viem";
import type { WalletConfig } from "./types";

const scryptAsync = promisify(scrypt);

const SERVICE_NAME = "plasma-pay";
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const MIN_PASSWORD_LENGTH = 8;
const SCRYPT_N = 16384; // CPU/memory cost parameter
const SCRYPT_R = 8; // Block size
const SCRYPT_P = 1; // Parallelization

/**
 * Securely clear sensitive data from memory
 */
function secureClear(buffer: Buffer | Uint8Array): void {
  if (buffer instanceof Buffer) {
    buffer.fill(0);
  } else {
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = 0;
    }
  }
}

/**
 * Validate password strength
 */
function validatePassword(password: string): {
  valid: boolean;
  error?: string;
} {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    };
  }
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one lowercase letter",
    };
  }
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one uppercase letter",
    };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }
  return { valid: true };
}

export interface KeyManagerConfig {
  configDir: string;
  useKeyring: boolean;
}

export class KeyManager {
  private configDir: string;
  private useKeyring: boolean;
  private keytar: typeof import("keytar") | null = null;

  constructor(config: KeyManagerConfig) {
    this.configDir = config.configDir;
    this.useKeyring = config.useKeyring;
  }

  /**
   * Initialize keytar for OS keyring access
   */
  private async initKeytar(): Promise<typeof import("keytar") | null> {
    if (this.keytar) return this.keytar;

    try {
      // Dynamic import to handle systems without keytar
      this.keytar = await import("keytar");
      return this.keytar;
    } catch {
      console.warn(
        "OS keyring not available, falling back to encrypted file storage"
      );
      return null;
    }
  }

  /**
   * Generate a new wallet
   */
  async generateWallet(
    name?: string
  ): Promise<{ address: Address; privateKey: Hex }> {
    void name;
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);

    return {
      address: account.address,
      privateKey,
    };
  }

  /**
   * Import an existing private key
   */
  validatePrivateKey(privateKey: string): {
    valid: boolean;
    address?: Address;
    error?: string;
  } {
    try {
      // Ensure proper format
      const key = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;

      if (!/^0x[a-fA-F0-9]{64}$/.test(key)) {
        return {
          valid: false,
          error: "Invalid private key format. Must be 64 hex characters.",
        };
      }

      const account = privateKeyToAccount(key as Hex);
      return { valid: true, address: account.address };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid private key";
      return { valid: false, error: message };
    }
  }

  /**
   * Store private key securely
   */
  async storeKey(
    address: string,
    privateKey: Hex,
    password?: string
  ): Promise<{ method: "keyring" | "encrypted"; success: boolean }> {
    // Try OS keyring first if enabled
    if (this.useKeyring) {
      const keytar = await this.initKeytar();
      if (keytar) {
        try {
          await keytar.setPassword(SERVICE_NAME, address, privateKey);
          return { method: "keyring", success: true };
        } catch {
          console.warn(
            "Failed to store in keyring, falling back to encrypted file"
          );
        }
      }
    }

    // Fall back to encrypted file storage
    if (!password) {
      throw new Error("Password required for encrypted file storage");
    }

    await this.encryptKey(privateKey, password);
    return { method: "encrypted", success: true };
  }

  /**
   * Retrieve private key
   */
  async retrieveKey(
    address: string,
    encryptedKey?: string,
    password?: string
  ): Promise<Hex | null> {
    // Try OS keyring first
    if (this.useKeyring) {
      const keytar = await this.initKeytar();
      if (keytar) {
        try {
          const key = await keytar.getPassword(SERVICE_NAME, address);
          if (key) return key as Hex;
        } catch {
          // Fall through to encrypted file
        }
      }
    }

    // Try environment variable
    const envKey = process.env.PLASMA_WALLET_KEY || process.env.WALLET_KEY;
    if (envKey) {
      const validation = this.validatePrivateKey(envKey);
      if (
        validation.valid &&
        validation.address?.toLowerCase() === address.toLowerCase()
      ) {
        return envKey as Hex;
      }
    }

    // Try encrypted file
    if (encryptedKey && password) {
      return this.decryptKey(encryptedKey, password);
    }

    return null;
  }

  /**
   * Delete a stored key
   */
  async deleteKey(address: string): Promise<boolean> {
    if (this.useKeyring) {
      const keytar = await this.initKeytar();
      if (keytar) {
        try {
          return await keytar.deletePassword(SERVICE_NAME, address);
        } catch {
          return false;
        }
      }
    }
    return false;
  }

  /**
   * Encrypt a private key with a password
   */
  async encryptKey(privateKey: Hex, password: string): Promise<string> {
    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.error);
    }

    const salt = randomBytes(32);
    const iv = randomBytes(16);
    const key = (await scryptAsync(password, salt, 32, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
    })) as Buffer;

    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    let encrypted = cipher.update(privateKey, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();

    // Format: salt:iv:authTag:encrypted
    const result = `${salt.toString("hex")}:${iv.toString(
      "hex"
    )}:${authTag.toString("hex")}:${encrypted}`;

    // Clear sensitive data from memory
    secureClear(key);
    secureClear(salt);
    secureClear(iv);

    return result;
  }

  /**
   * Decrypt a private key with a password
   */
  async decryptKey(encryptedData: string, password: string): Promise<Hex> {
    const parts = encryptedData.split(":");
    if (parts.length !== 4) {
      throw new Error("Invalid encrypted data format");
    }

    const [saltHex, ivHex, authTagHex, encrypted] = parts;

    // Validate hex strings
    if (
      !/^[a-fA-F0-9]+$/.test(saltHex) ||
      !/^[a-fA-F0-9]+$/.test(ivHex) ||
      !/^[a-fA-F0-9]+$/.test(authTagHex)
    ) {
      throw new Error("Invalid encrypted data format");
    }

    const salt = Buffer.from(saltHex, "hex");
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const key = (await scryptAsync(password, salt, 32, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
    })) as Buffer;

    const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted: string;
    try {
      decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");
    } catch {
      // Clear sensitive data before throwing
      secureClear(key);
      secureClear(salt);
      secureClear(iv);
      throw new Error("Decryption failed - invalid password or corrupted data");
    }

    // Clear sensitive data from memory
    secureClear(key);
    secureClear(salt);
    secureClear(iv);

    return decrypted as Hex;
  }

  /**
   * Generate a recovery phrase (BIP39 mnemonic)
   */
  generateMnemonic(): string {
    // Generate 128 bits of entropy for 12 words
    const entropy = randomBytes(16);
    // In production, use a proper BIP39 library
    // This is a simplified version for demonstration
    const words = this.entropyToMnemonic(entropy);
    return words.join(" ");
  }

  /**
   * Derive private key from mnemonic
   */
  async mnemonicToPrivateKey(
    mnemonic: string,
    path: string = "m/44'/60'/0'/0/0"
  ): Promise<Hex> {
    // In production, use a proper BIP39/BIP32 library
    // This is a simplified derivation for demonstration
    const seed = createHash("sha256").update(mnemonic).digest();
    const pathHash = createHash("sha256").update(path).digest();
    const combined = Buffer.concat([seed, pathHash]);
    const privateKey = createHash("sha256").update(combined).digest("hex");
    return `0x${privateKey}` as Hex;
  }

  /**
   * Simple entropy to word list (simplified BIP39)
   */
  private entropyToMnemonic(entropy: Buffer): string[] {
    // Simplified word list - in production use full BIP39 wordlist
    const wordlist = [
      "abandon",
      "ability",
      "able",
      "about",
      "above",
      "absent",
      "absorb",
      "abstract",
      "absurd",
      "abuse",
      "access",
      "accident",
      "account",
      "accuse",
      "achieve",
      "acid",
      "acoustic",
      "acquire",
      "across",
      "act",
      "action",
      "actor",
      "actress",
      "actual",
      "adapt",
      "add",
      "addict",
      "address",
      "adjust",
      "admit",
      "adult",
      "advance",
      "advice",
      "aerobic",
      "affair",
      "afford",
      "afraid",
      "again",
      "age",
      "agent",
      "agree",
      "ahead",
      "aim",
      "air",
      "airport",
      "aisle",
      "alarm",
      "album",
      "alcohol",
      "alert",
      "alien",
      "all",
      "alley",
      "allow",
      "almost",
      "alone",
      "alpha",
      "already",
      "also",
      "alter",
      "always",
      "amateur",
      "amazing",
      "among",
      "amount",
      "amused",
      "analyst",
      "anchor",
      "ancient",
      "anger",
      "angle",
      "angry",
      "animal",
      "ankle",
      "announce",
      "annual",
      "another",
      "answer",
      "antenna",
      "antique",
      "anxiety",
      "any",
      "apart",
      "apology",
      "appear",
      "apple",
      "approve",
      "april",
      "arch",
      "arctic",
      "area",
      "arena",
      "argue",
      "arm",
      "armed",
      "armor",
      "army",
      "around",
      "arrange",
      "arrest",
      "arrive",
      "arrow",
      "art",
      "artefact",
      "artist",
      "artwork",
      "ask",
      "aspect",
      "assault",
      "asset",
      "assist",
      "assume",
      "asthma",
      "athlete",
      "atom",
      "attack",
      "attend",
      "attitude",
      "attract",
      "auction",
      "audit",
      "august",
      "aunt",
      "author",
      "auto",
      "autumn",
      "average",
      "avocado",
    ];

    const words: string[] = [];
    for (let i = 0; i < 12; i++) {
      const index = entropy[i % entropy.length] % wordlist.length;
      words.push(wordlist[index]);
    }
    return words;
  }

  /**
   * Export wallet info (without private key)
   */
  exportWalletInfo(address: string, name?: string): WalletConfig {
    return {
      address,
      name,
      createdAt: new Date().toISOString(),
    };
  }
}

export default KeyManager;
