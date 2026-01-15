/**
 * Chains Tests
 * 
 * Tests for chain configurations from @plasma-pay/core
 */

import {
  plasmaMainnet,
  plasmaTestnet,
  plasmaChains,
  getPlasmaChain,
  getViemChain,
  isPlasmaChain,
  getNetworkFromChainId,
  getExplorerTxUrl,
  getExplorerAddressUrl,
} from '../chains';

import {
  PLASMA_MAINNET_CHAIN_ID,
  PLASMA_TESTNET_CHAIN_ID,
  PLASMA_MAINNET_RPC,
  PLASMA_TESTNET_RPC,
  PLASMA_EXPLORER_URL,
  USDT0_ADDRESS,
} from '../constants';

describe('plasmaMainnet', () => {
  it('has correct chain ID', () => {
    expect(plasmaMainnet.id).toBe(PLASMA_MAINNET_CHAIN_ID);
  });

  it('has correct name', () => {
    expect(plasmaMainnet.name).toBe('Plasma');
  });

  it('has XPL as native currency', () => {
    expect(plasmaMainnet.nativeCurrency.symbol).toBe('XPL');
    expect(plasmaMainnet.nativeCurrency.decimals).toBe(18);
  });

  it('has correct RPC URLs', () => {
    expect(plasmaMainnet.rpcUrls.default.http).toContain(PLASMA_MAINNET_RPC);
  });

  it('has block explorer configured', () => {
    expect(plasmaMainnet.blockExplorers?.default.url).toBe(PLASMA_EXPLORER_URL);
  });
});

describe('plasmaTestnet', () => {
  it('has correct chain ID', () => {
    expect(plasmaTestnet.id).toBe(PLASMA_TESTNET_CHAIN_ID);
  });

  it('has correct name', () => {
    expect(plasmaTestnet.name).toBe('Plasma Testnet');
  });

  it('is marked as testnet', () => {
    expect(plasmaTestnet.testnet).toBe(true);
  });

  it('has XPL as native currency', () => {
    expect(plasmaTestnet.nativeCurrency.symbol).toBe('XPL');
  });

  it('has testnet RPC URL', () => {
    expect(plasmaTestnet.rpcUrls.default.http).toContain(PLASMA_TESTNET_RPC);
  });
});

describe('plasmaChains', () => {
  it('has mainnet configuration', () => {
    expect(plasmaChains.mainnet).toBeDefined();
    expect(plasmaChains.mainnet.chainId).toBe(PLASMA_MAINNET_CHAIN_ID);
  });

  it('has testnet configuration', () => {
    expect(plasmaChains.testnet).toBeDefined();
    expect(plasmaChains.testnet.chainId).toBe(PLASMA_TESTNET_CHAIN_ID);
  });

  it('mainnet has correct USDT0 address', () => {
    expect(plasmaChains.mainnet.usdt0Address).toBe(USDT0_ADDRESS);
  });

  it('testnet has correct USDT0 address', () => {
    expect(plasmaChains.testnet.usdt0Address).toBe(USDT0_ADDRESS);
  });
});

describe('getPlasmaChain', () => {
  it('returns mainnet config by default', () => {
    const chain = getPlasmaChain();
    expect(chain.chainId).toBe(PLASMA_MAINNET_CHAIN_ID);
  });

  it('returns mainnet config when specified', () => {
    const chain = getPlasmaChain('mainnet');
    expect(chain.chainId).toBe(PLASMA_MAINNET_CHAIN_ID);
    expect(chain.name).toBe('Plasma');
  });

  it('returns testnet config when specified', () => {
    const chain = getPlasmaChain('testnet');
    expect(chain.chainId).toBe(PLASMA_TESTNET_CHAIN_ID);
    expect(chain.name).toBe('Plasma Testnet');
  });
});

describe('getViemChain', () => {
  it('returns mainnet chain by default', () => {
    const chain = getViemChain();
    expect(chain.id).toBe(PLASMA_MAINNET_CHAIN_ID);
  });

  it('returns mainnet chain when specified', () => {
    const chain = getViemChain('mainnet');
    expect(chain).toBe(plasmaMainnet);
  });

  it('returns testnet chain when specified', () => {
    const chain = getViemChain('testnet');
    expect(chain).toBe(plasmaTestnet);
  });
});

describe('isPlasmaChain', () => {
  it('returns true for mainnet chain ID', () => {
    expect(isPlasmaChain(PLASMA_MAINNET_CHAIN_ID)).toBe(true);
  });

  it('returns true for testnet chain ID', () => {
    expect(isPlasmaChain(PLASMA_TESTNET_CHAIN_ID)).toBe(true);
  });

  it('returns false for other chain IDs', () => {
    expect(isPlasmaChain(1)).toBe(false); // Ethereum
    expect(isPlasmaChain(137)).toBe(false); // Polygon
    expect(isPlasmaChain(8453)).toBe(false); // Base
  });
});

describe('getNetworkFromChainId', () => {
  it('returns mainnet for mainnet chain ID', () => {
    expect(getNetworkFromChainId(PLASMA_MAINNET_CHAIN_ID)).toBe('mainnet');
  });

  it('returns testnet for testnet chain ID', () => {
    expect(getNetworkFromChainId(PLASMA_TESTNET_CHAIN_ID)).toBe('testnet');
  });

  it('returns null for unknown chain ID', () => {
    expect(getNetworkFromChainId(1)).toBe(null);
    expect(getNetworkFromChainId(999999)).toBe(null);
  });
});

describe('getExplorerTxUrl', () => {
  const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

  it('builds mainnet explorer URL by default', () => {
    const url = getExplorerTxUrl(txHash);
    expect(url).toBe(`${PLASMA_EXPLORER_URL}/tx/${txHash}`);
  });

  it('builds mainnet explorer URL when specified', () => {
    const url = getExplorerTxUrl(txHash, 'mainnet');
    expect(url).toContain(PLASMA_EXPLORER_URL);
    expect(url).toContain(`/tx/${txHash}`);
  });

  it('builds testnet explorer URL when specified', () => {
    const url = getExplorerTxUrl(txHash, 'testnet');
    expect(url).toContain('testnet');
    expect(url).toContain(`/tx/${txHash}`);
  });
});

describe('getExplorerAddressUrl', () => {
  const address = '0x1234567890123456789012345678901234567890';

  it('builds mainnet explorer URL by default', () => {
    const url = getExplorerAddressUrl(address);
    expect(url).toBe(`${PLASMA_EXPLORER_URL}/address/${address}`);
  });

  it('builds mainnet explorer URL when specified', () => {
    const url = getExplorerAddressUrl(address, 'mainnet');
    expect(url).toContain(PLASMA_EXPLORER_URL);
    expect(url).toContain(`/address/${address}`);
  });

  it('builds testnet explorer URL when specified', () => {
    const url = getExplorerAddressUrl(address, 'testnet');
    expect(url).toContain('testnet');
    expect(url).toContain(`/address/${address}`);
  });
});
