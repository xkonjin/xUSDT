/**
 * Wallet Management for Mobile App
 * 
 * Handles secure storage and wallet operations.
 * Uses expo-secure-store for sensitive data.
 */

import * as SecureStore from 'expo-secure-store';
import { ethers } from 'ethers';

const WALLET_KEY = 'plasma_wallet';
const MNEMONIC_KEY = 'plasma_mnemonic';

export interface WalletInfo {
  address: string;
  hasBackup: boolean;
}

/**
 * Get stored wallet address
 */
export async function getStoredWallet(): Promise<WalletInfo | null> {
  try {
    const address = await SecureStore.getItemAsync(WALLET_KEY);
    const mnemonic = await SecureStore.getItemAsync(MNEMONIC_KEY);
    
    if (!address) return null;
    
    return {
      address,
      hasBackup: !!mnemonic,
    };
  } catch {
    return null;
  }
}

/**
 * Create a new wallet
 */
export async function createWallet(): Promise<WalletInfo> {
  const wallet = ethers.Wallet.createRandom();
  
  await SecureStore.setItemAsync(WALLET_KEY, wallet.address);
  await SecureStore.setItemAsync(MNEMONIC_KEY, wallet.mnemonic?.phrase || '');
  
  return {
    address: wallet.address,
    hasBackup: true,
  };
}

/**
 * Import wallet from mnemonic
 */
export async function importWallet(mnemonic: string): Promise<WalletInfo> {
  const wallet = ethers.Wallet.fromPhrase(mnemonic);
  
  await SecureStore.setItemAsync(WALLET_KEY, wallet.address);
  await SecureStore.setItemAsync(MNEMONIC_KEY, mnemonic);
  
  return {
    address: wallet.address,
    hasBackup: true,
  };
}

/**
 * Import wallet from private key
 */
export async function importWalletFromKey(privateKey: string): Promise<WalletInfo> {
  const wallet = new ethers.Wallet(privateKey);
  
  await SecureStore.setItemAsync(WALLET_KEY, wallet.address);
  // No mnemonic for imported keys
  
  return {
    address: wallet.address,
    hasBackup: false,
  };
}

/**
 * Get mnemonic for backup (requires biometric auth)
 */
export async function getMnemonic(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(MNEMONIC_KEY);
  } catch {
    return null;
  }
}

/**
 * Sign typed data (EIP-712)
 */
export async function signTypedData(
  domain: any,
  types: any,
  value: any
): Promise<string> {
  const mnemonic = await SecureStore.getItemAsync(MNEMONIC_KEY);
  if (!mnemonic) {
    throw new Error('No wallet found');
  }
  
  const wallet = ethers.Wallet.fromPhrase(mnemonic);
  return wallet.signTypedData(domain, types, value);
}

/**
 * Clear wallet (logout)
 */
export async function clearWallet(): Promise<void> {
  await SecureStore.deleteItemAsync(WALLET_KEY);
  await SecureStore.deleteItemAsync(MNEMONIC_KEY);
}

/**
 * Check if wallet exists
 */
export async function hasWallet(): Promise<boolean> {
  const address = await SecureStore.getItemAsync(WALLET_KEY);
  return !!address;
}
