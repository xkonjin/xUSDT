/**
 * EIP-3009 Transaction Signer
 * 
 * Signs transfer authorizations using wallet or private key
 */

import type { Address, Hex, WalletClient, Account, PrivateKeyAccount } from 'viem';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  PLASMA_MAINNET_CHAIN_ID,
  USDT0_ADDRESS,
  type TransferWithAuthorizationParams,
  type SignedTransferAuthorization,
  type PlasmaWallet,
  splitSignature,
} from '@plasma-pay/core';
import { plasmaMainnet } from '@plasma-pay/core';
import { buildTransferAuthorizationTypedData, createTransferParams } from './eip3009';

export interface SignerConfig {
  chainId?: number;
  tokenAddress?: Address;
  tokenName?: string;
  tokenVersion?: string;
}

/**
 * Sign a transfer authorization using viem WalletClient
 */
export async function signTransferAuthorization(
  walletClient: WalletClient,
  params: TransferWithAuthorizationParams,
  config: SignerConfig = {}
): Promise<SignedTransferAuthorization> {
  const {
    chainId = PLASMA_MAINNET_CHAIN_ID,
    tokenAddress = USDT0_ADDRESS,
    tokenName,
    tokenVersion,
  } = config;

  const typedData = buildTransferAuthorizationTypedData(params, {
    chainId,
    tokenAddress,
    tokenName,
    tokenVersion,
  });

  // Sign the typed data
  const signature = await walletClient.signTypedData({
    domain: typedData.domain,
    types: typedData.types,
    primaryType: typedData.primaryType,
    message: typedData.message,
    account: walletClient.account!,
  });

  const { v, r, s } = splitSignature(signature);

  return {
    ...params,
    signature,
    v,
    r,
    s,
  };
}

/**
 * Sign a transfer authorization using a private key
 */
export async function signTransferAuthorizationWithKey(
  privateKey: Hex,
  params: TransferWithAuthorizationParams,
  config: SignerConfig = {}
): Promise<SignedTransferAuthorization> {
  const account = privateKeyToAccount(privateKey);
  
  const walletClient = createWalletClient({
    account,
    chain: plasmaMainnet,
    transport: http(),
  });

  return signTransferAuthorization(walletClient, params, config);
}

/**
 * Sign a transfer authorization using a PlasmaWallet interface
 */
export async function signTransferAuthorizationWithWallet(
  wallet: PlasmaWallet,
  params: TransferWithAuthorizationParams,
  config: SignerConfig = {}
): Promise<SignedTransferAuthorization> {
  const {
    chainId = PLASMA_MAINNET_CHAIN_ID,
    tokenAddress = USDT0_ADDRESS,
    tokenName,
    tokenVersion,
  } = config;

  const typedData = buildTransferAuthorizationTypedData(params, {
    chainId,
    tokenAddress,
    tokenName,
    tokenVersion,
  });

  const signature = await wallet.signTypedData(typedData);
  const { v, r, s } = splitSignature(signature);

  return {
    ...params,
    signature,
    v,
    r,
    s,
  };
}

/**
 * Convenient function to create and sign a transfer in one call
 */
export async function createAndSignTransfer(
  walletClient: WalletClient,
  to: Address,
  value: bigint,
  config: SignerConfig & {
    validityPeriod?: number;
    nonce?: Hex;
  } = {}
): Promise<SignedTransferAuthorization> {
  const from = walletClient.account?.address;
  if (!from) {
    throw new Error('WalletClient must have an account');
  }

  const params = createTransferParams(from, to, value, {
    validityPeriod: config.validityPeriod,
    nonce: config.nonce,
  });

  return signTransferAuthorization(walletClient, params, config);
}

/**
 * Create a signer function that can be used repeatedly
 */
export function createSigner(
  walletClient: WalletClient,
  config: SignerConfig = {}
) {
  return {
    /**
     * Sign a transfer authorization
     */
    sign: (params: TransferWithAuthorizationParams) =>
      signTransferAuthorization(walletClient, params, config),

    /**
     * Create and sign a transfer in one call
     */
    transfer: (to: Address, value: bigint, options: { validityPeriod?: number; nonce?: Hex } = {}) =>
      createAndSignTransfer(walletClient, to, value, { ...config, ...options }),

    /**
     * Get the signer's address
     */
    get address(): Address {
      const addr = walletClient.account?.address;
      if (!addr) throw new Error('WalletClient must have an account');
      return addr;
    },
  };
}

/**
 * Create a signer from a private key
 */
export function createSignerFromKey(
  privateKey: Hex,
  config: SignerConfig = {}
) {
  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    chain: plasmaMainnet,
    transport: http(),
  });

  return createSigner(walletClient, config);
}
