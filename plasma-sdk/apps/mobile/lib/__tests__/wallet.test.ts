/**
 * Tests for Mobile Wallet Management
 *
 * Tests secure storage and wallet operations.
 */

import * as SecureStore from 'expo-secure-store';
import { ethers } from 'ethers';
import {
  getStoredWallet,
  createWallet,
  importWallet,
  importWalletFromKey,
  getMnemonic,
  signTypedData,
  clearWallet,
  hasWallet,
} from '../wallet';

// Mock expo-secure-store
const mockSecureStore: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockSecureStore[key] || null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockSecureStore[key] = value;
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    delete mockSecureStore[key];
    return Promise.resolve();
  }),
}));

// Mock wallet data
const mockWalletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f91234';
const mockMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const mockSignature = '0xmockedsignature';

// Mock ethers - must be declared before jest.mock due to hoisting
jest.mock('ethers', () => {
  // These values are duplicated since hoisting prevents external variable access
  const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f91234';
  const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  const signature = '0xmockedsignature';

  const mockSignTypedData = jest.fn().mockResolvedValue(signature);
  
  // Wallet mock - used as both constructor and static methods
  function MockWallet(privateKey: string) {
    return {
      address: '0xPrivateKeyAddress' + privateKey.slice(0, 5),
    };
  }
  
  MockWallet.createRandom = jest.fn(() => ({
    address: address,
    mnemonic: { phrase: mnemonic },
    signTypedData: mockSignTypedData,
  }));
  
  MockWallet.fromPhrase = jest.fn((inputMnemonic: string) => ({
    address: '0xRestoredAddress' + inputMnemonic.slice(0, 5),
    mnemonic: { phrase: inputMnemonic },
    signTypedData: mockSignTypedData,
  }));

  return {
    ethers: {
      Wallet: MockWallet,
    },
  };
});

describe('Wallet Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear mock storage
    Object.keys(mockSecureStore).forEach(key => delete mockSecureStore[key]);
  });

  describe('getStoredWallet', () => {
    it('should return null when no wallet is stored', async () => {
      const result = await getStoredWallet();
      expect(result).toBeNull();
    });

    it('should return wallet info when wallet exists', async () => {
      mockSecureStore['plasma_wallet'] = '0x123456789';
      mockSecureStore['plasma_mnemonic'] = 'test mnemonic phrase';

      const result = await getStoredWallet();
      
      expect(result).toEqual({
        address: '0x123456789',
        hasBackup: true,
      });
    });

    it('should return hasBackup false when only address is stored', async () => {
      mockSecureStore['plasma_wallet'] = '0x123456789';

      const result = await getStoredWallet();
      
      expect(result).toEqual({
        address: '0x123456789',
        hasBackup: false,
      });
    });

    it('should return null on storage error', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));
      
      const result = await getStoredWallet();
      expect(result).toBeNull();
    });
  });

  describe('createWallet', () => {
    it('should create a new wallet and store it', async () => {
      const result = await createWallet();
      
      expect(ethers.Wallet.createRandom).toHaveBeenCalled();
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('plasma_wallet', mockWalletAddress);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('plasma_mnemonic', mockMnemonic);
      
      expect(result).toEqual({
        address: mockWalletAddress,
        hasBackup: true,
      });
    });
  });

  describe('importWallet', () => {
    it('should import wallet from mnemonic', async () => {
      const mnemonic = 'test word word word word word word word word word word word';
      
      const result = await importWallet(mnemonic);
      
      expect(ethers.Wallet.fromPhrase).toHaveBeenCalledWith(mnemonic);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'plasma_wallet',
        expect.stringContaining('0xRestoredAddress')
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('plasma_mnemonic', mnemonic);
      
      expect(result.hasBackup).toBe(true);
    });

    it('should store the provided mnemonic', async () => {
      const mnemonic = 'custom mnemonic phrase here';
      
      await importWallet(mnemonic);
      
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('plasma_mnemonic', mnemonic);
    });
  });

  describe('importWalletFromKey', () => {
    it('should import wallet from private key', async () => {
      const privateKey = '0xprivatekey123';
      
      const result = await importWalletFromKey(privateKey);
      
      // The mock wallet returns address based on private key
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'plasma_wallet',
        expect.stringContaining('0xPrivateKeyAddress')
      );
      // No mnemonic for private key imports, so hasBackup should be false
      expect(result.hasBackup).toBe(false);
      expect(result.address).toBeDefined();
    });
  });

  describe('getMnemonic', () => {
    it('should return mnemonic when stored', async () => {
      mockSecureStore['plasma_mnemonic'] = 'stored mnemonic phrase';

      const result = await getMnemonic();
      
      expect(result).toBe('stored mnemonic phrase');
    });

    it('should return null when no mnemonic is stored', async () => {
      const result = await getMnemonic();
      expect(result).toBeNull();
    });

    it('should return null on storage error', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(new Error('Biometric failed'));
      
      const result = await getMnemonic();
      expect(result).toBeNull();
    });
  });

  describe('signTypedData', () => {
    it('should sign typed data with stored wallet', async () => {
      mockSecureStore['plasma_mnemonic'] = 'test mnemonic phrase';
      
      const domain = { name: 'Test', version: '1' };
      const types = { Test: [{ name: 'value', type: 'uint256' }] };
      const value = { value: 123 };

      const result = await signTypedData(domain, types, value);
      
      expect(ethers.Wallet.fromPhrase).toHaveBeenCalledWith('test mnemonic phrase');
      expect(result).toBe(mockSignature);
    });

    it('should throw error when no wallet is found', async () => {
      // No mnemonic stored
      
      await expect(signTypedData({}, {}, {})).rejects.toThrow('No wallet found');
    });
  });

  describe('clearWallet', () => {
    it('should delete wallet and mnemonic from storage', async () => {
      mockSecureStore['plasma_wallet'] = '0x123';
      mockSecureStore['plasma_mnemonic'] = 'phrase';

      await clearWallet();
      
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('plasma_wallet');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('plasma_mnemonic');
    });
  });

  describe('hasWallet', () => {
    it('should return true when wallet exists', async () => {
      mockSecureStore['plasma_wallet'] = '0x123';

      const result = await hasWallet();
      expect(result).toBe(true);
    });

    it('should return false when no wallet exists', async () => {
      const result = await hasWallet();
      expect(result).toBe(false);
    });
  });

  describe('WalletInfo type', () => {
    it('should return correctly typed wallet info', async () => {
      mockSecureStore['plasma_wallet'] = '0x123';
      mockSecureStore['plasma_mnemonic'] = 'phrase';

      const wallet = await getStoredWallet();
      
      // Type check
      expect(wallet).toHaveProperty('address');
      expect(wallet).toHaveProperty('hasBackup');
      expect(typeof wallet?.address).toBe('string');
      expect(typeof wallet?.hasBackup).toBe('boolean');
    });
  });

  describe('edge cases', () => {
    it('should handle empty mnemonic string', async () => {
      mockSecureStore['plasma_wallet'] = '0x123';
      mockSecureStore['plasma_mnemonic'] = '';

      const result = await getStoredWallet();
      
      // Empty string is falsy, so hasBackup should be false
      expect(result?.hasBackup).toBe(false);
    });

    it('should handle concurrent wallet operations', async () => {
      // Test that operations don't interfere with each other
      const create1 = createWallet();
      const create2 = createWallet();
      
      const results = await Promise.all([create1, create2]);
      
      // Both should succeed
      expect(results[0].address).toBeDefined();
      expect(results[1].address).toBeDefined();
    });
  });
});
