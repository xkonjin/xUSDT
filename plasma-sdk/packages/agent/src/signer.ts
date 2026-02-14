/**
 * @plasma-pay/agent - EIP-3009 Signer
 *
 * Handles signing of EIP-3009 TransferWithAuthorization messages
 */

import {
  createWalletClient,
  http,
  type WalletClient,
  type Hex,
  type Address,
  type Account,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { plasma } from "./chains";
import type {
  PlasmaPayConfig,
  PlasmaWallet,
  EIP3009Authorization,
  EIP712TypedData,
} from "./types";

/**
 * Generate a random 32-byte nonce for EIP-3009
 */
export function generateNonce(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}` as Hex;
}

/**
 * Build EIP-712 typed data for TransferWithAuthorization
 */
export function buildTransferWithAuthTypedData(params: {
  tokenName: string;
  tokenVersion: string;
  chainId: number;
  tokenAddress: Address;
  from: Address;
  to: Address;
  value: bigint;
  validAfter: number;
  validBefore: number;
  nonce: Hex;
}): EIP712TypedData {
  return {
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    primaryType: "TransferWithAuthorization",
    domain: {
      name: params.tokenName,
      version: params.tokenVersion,
      chainId: params.chainId,
      verifyingContract: params.tokenAddress,
    },
    message: {
      from: params.from,
      to: params.to,
      value: params.value.toString(),
      validAfter: params.validAfter,
      validBefore: params.validBefore,
      nonce: params.nonce,
    },
  };
}

/**
 * Build EIP-712 typed data for ReceiveWithAuthorization
 */
export function buildReceiveWithAuthTypedData(params: {
  tokenName: string;
  tokenVersion: string;
  chainId: number;
  tokenAddress: Address;
  from: Address;
  to: Address;
  value: bigint;
  validAfter: number;
  validBefore: number;
  nonce: Hex;
}): EIP712TypedData {
  return {
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      ReceiveWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    primaryType: "ReceiveWithAuthorization",
    domain: {
      name: params.tokenName,
      version: params.tokenVersion,
      chainId: params.chainId,
      verifyingContract: params.tokenAddress,
    },
    message: {
      from: params.from,
      to: params.to,
      value: params.value.toString(),
      validAfter: params.validAfter,
      validBefore: params.validBefore,
      nonce: params.nonce,
    },
  };
}

/**
 * Parse a signature into v, r, s components
 */
export function parseSignature(signature: Hex): { v: number; r: Hex; s: Hex } {
  const sig = signature.slice(2); // Remove 0x prefix
  const r = `0x${sig.slice(0, 64)}` as Hex;
  const s = `0x${sig.slice(64, 128)}` as Hex;
  let v = parseInt(sig.slice(128, 130), 16);

  // Handle EIP-155 v values
  if (v < 27) {
    v += 27;
  }

  return { v, r, s };
}

/**
 * Plasma Pay Signer - handles all signing operations
 */
export class PlasmaSigner {
  private account: Account | null = null;
  private customWallet: PlasmaWallet | null = null;
  private walletClient: WalletClient | null = null;

  constructor(config: PlasmaPayConfig) {
    if (config.privateKey) {
      const account = privateKeyToAccount(config.privateKey);
      this.account = account;
      this.walletClient = createWalletClient({
        account,
        chain: plasma,
        transport: http(config.plasmaRpcUrl || "https://rpc.plasma.xyz"),
      });
    } else if (config.wallet) {
      this.customWallet = config.wallet;
    }
  }

  /**
   * Get the signer's address
   */
  get address(): Address {
    if (this.account) {
      return this.account.address;
    }
    if (this.customWallet) {
      return this.customWallet.address;
    }
    throw new Error("No wallet configured");
  }

  /**
   * Sign EIP-712 typed data
   */
  async signTypedData(typedData: EIP712TypedData): Promise<Hex> {
    if (this.walletClient && this.account) {
      return this.walletClient.signTypedData({
        account: this.account,
        domain: typedData.domain,
        types: typedData.types,
        primaryType: typedData.primaryType,
        message: typedData.message,
      });
    }

    if (this.customWallet) {
      return this.customWallet.signTypedData(typedData);
    }

    throw new Error("No wallet configured for signing");
  }

  /**
   * Sign a TransferWithAuthorization message
   */
  async signTransferWithAuth(params: {
    tokenName: string;
    tokenVersion: string;
    chainId: number;
    tokenAddress: Address;
    to: Address;
    value: bigint;
    validAfter: number;
    validBefore: number;
    nonce?: Hex;
  }): Promise<EIP3009Authorization> {
    const nonce = params.nonce || generateNonce();

    const typedData = buildTransferWithAuthTypedData({
      ...params,
      from: this.address,
      nonce,
    });

    const signature = await this.signTypedData(typedData);
    const { v, r, s } = parseSignature(signature);

    return {
      from: this.address,
      to: params.to,
      value: params.value.toString(),
      validAfter: params.validAfter,
      validBefore: params.validBefore,
      nonce,
      v,
      r,
      s,
    };
  }

  /**
   * Sign a ReceiveWithAuthorization message
   */
  async signReceiveWithAuth(params: {
    tokenName: string;
    tokenVersion: string;
    chainId: number;
    tokenAddress: Address;
    to: Address;
    value: bigint;
    validAfter: number;
    validBefore: number;
    nonce?: Hex;
  }): Promise<EIP3009Authorization> {
    const nonce = params.nonce || generateNonce();

    const typedData = buildReceiveWithAuthTypedData({
      ...params,
      from: this.address,
      nonce,
    });

    const signature = await this.signTypedData(typedData);
    const { v, r, s } = parseSignature(signature);

    return {
      from: this.address,
      to: params.to,
      value: params.value.toString(),
      validAfter: params.validAfter,
      validBefore: params.validBefore,
      nonce,
      v,
      r,
      s,
    };
  }
}
