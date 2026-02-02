/**
 * @plasma-pay/facilitator - PlasmaFacilitator
 * 
 * Implementation of FacilitatorEvmSigner for Plasma chain.
 * Based on SemanticPay/wdk-wallet-evm-x402-facilitator adapter pattern.
 */

import { ethers, Contract, Wallet, JsonRpcProvider, verifyTypedData as ethersVerifyTypedData } from 'ethers';
import {
  Address,
  Hex,
  TransactionHash,
  PlasmaFacilitatorConfig,
  FacilitatorEvmSigner,
  GetCodeArgs,
  ReadContractArgs,
  VerifyTypedDataArgs,
  WriteContractArgs,
  SendTransactionArgs,
  WaitForTransactionReceiptArgs,
  TransactionReceiptResult,
  PLASMA_MAINNET,
  PlasmaChainConfig,
} from './types';

/**
 * PlasmaFacilitator - X402 FacilitatorEvmSigner implementation
 * 
 * This class wraps an ethers.js wallet and adapts it to the FacilitatorEvmSigner
 * interface required by @x402/evm for processing payments.
 * 
 * @example
 * ```typescript
 * const facilitator = new PlasmaFacilitator({
 *   privateKey: '0x...',
 *   rpcUrl: 'https://rpc.plasma.io'
 * });
 * 
 * // Use with @x402/evm
 * import { ExactEvmScheme } from '@x402/evm/exact/facilitator';
 * const scheme = new ExactEvmScheme(facilitator);
 * ```
 */
export class PlasmaFacilitator implements FacilitatorEvmSigner {
  private readonly wallet: Wallet;
  private readonly provider: JsonRpcProvider;
  private readonly chain: PlasmaChainConfig;
  private readonly transactionTimeout: number;
  private readonly confirmations: number;

  constructor(config: PlasmaFacilitatorConfig) {
    // Validate private key
    if (!config.privateKey || !config.privateKey.startsWith('0x')) {
      throw new Error('Invalid private key: must be a hex string starting with 0x');
    }

    // Set chain configuration
    this.chain = config.chain || PLASMA_MAINNET;
    
    // Create provider
    const rpcUrl = config.rpcUrl || this.chain.rpcUrl;
    this.provider = new JsonRpcProvider(rpcUrl, {
      chainId: this.chain.chainId,
      name: this.chain.name,
    });

    // Create wallet
    this.wallet = new Wallet(config.privateKey, this.provider);

    // Set timeouts
    this.transactionTimeout = config.transactionTimeout || 60000;
    this.confirmations = config.confirmations || 1;
  }

  // ============================================================================
  // FacilitatorEvmSigner Implementation
  // ============================================================================

  /**
   * Get all addresses this facilitator can use for signing.
   * Returns the wallet address.
   */
  getAddresses(): Address[] {
    return [this.wallet.address as Address];
  }

  /**
   * Get the bytecode deployed at a given address.
   * Returns undefined if no contract is deployed.
   */
  async getCode(args: GetCodeArgs): Promise<Hex | undefined> {
    try {
      const code = await this.provider.getCode(args.address);
      // Return undefined if no code (EOA or empty contract)
      return code === '0x' || code === '0x0' ? undefined : (code as Hex);
    } catch (error) {
      console.error('Error getting code:', error);
      throw error;
    }
  }

  /**
   * Read contract state by calling a view/pure function.
   */
  async readContract(args: ReadContractArgs): Promise<unknown> {
    try {
      const contract = new Contract(args.address, args.abi as ethers.InterfaceAbi, this.provider);
      const result = await contract[args.functionName](...(args.args || []));
      return result;
    } catch (error) {
      console.error('Error reading contract:', error);
      throw error;
    }
  }

  /**
   * Verify an EIP-712 typed data signature.
   * 
   * @param args - Verification arguments
   * @returns true if signature is valid, false otherwise
   */
  async verifyTypedData(args: VerifyTypedDataArgs): Promise<boolean> {
    try {
      // Convert domain to ethers format
      const domain: ethers.TypedDataDomain = {
        name: args.domain.name as string,
        version: args.domain.version as string,
        chainId: args.domain.chainId as number,
        verifyingContract: args.domain.verifyingContract as string,
      };

      // Remove EIP712Domain from types (ethers handles it internally)
      const types = { ...args.types } as Record<string, ethers.TypedDataField[]>;
      delete types['EIP712Domain'];

      // Recover signer address
      const recoveredAddress = ethersVerifyTypedData(
        domain,
        types,
        args.message,
        args.signature
      );

      // Compare addresses (case-insensitive)
      return recoveredAddress.toLowerCase() === args.address.toLowerCase();
    } catch (error) {
      console.error('Error verifying typed data:', error);
      return false;
    }
  }

  /**
   * Write to a contract (send a state-changing transaction).
   * 
   * @param args - Contract write arguments
   * @returns Transaction hash
   */
  async writeContract(args: WriteContractArgs): Promise<TransactionHash> {
    try {
      const contract = new Contract(args.address, args.abi as ethers.InterfaceAbi, this.wallet);
      const tx = await contract[args.functionName](...args.args);
      return tx.hash as TransactionHash;
    } catch (error) {
      console.error('Error writing to contract:', error);
      throw error;
    }
  }

  /**
   * Send a raw transaction.
   * 
   * @param args - Transaction arguments
   * @returns Transaction hash
   */
  async sendTransaction(args: SendTransactionArgs): Promise<TransactionHash> {
    try {
      const tx = await this.wallet.sendTransaction({
        to: args.to,
        data: args.data,
        value: args.value || 0n,
      });
      return tx.hash as TransactionHash;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  }

  /**
   * Wait for a transaction to be mined and return its receipt.
   * 
   * @param args - Receipt arguments
   * @returns Transaction receipt with status
   */
  async waitForTransactionReceipt(args: WaitForTransactionReceiptArgs): Promise<TransactionReceiptResult> {
    try {
      const timeout = args.timeout || this.transactionTimeout;
      
      // Create a promise that rejects on timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Transaction timeout')), timeout);
      });

      // Wait for transaction with timeout
      const receipt = await Promise.race([
        this.provider.waitForTransaction(args.hash, this.confirmations),
        timeoutPromise,
      ]);

      if (!receipt) {
        throw new Error('Transaction receipt not found');
      }

      return {
        status: receipt.status === 1 ? 'success' : 'reverted',
        blockNumber: BigInt(receipt.blockNumber),
        gasUsed: receipt.gasUsed,
        transactionHash: receipt.hash as TransactionHash,
      };
    } catch (error) {
      console.error('Error waiting for transaction receipt:', error);
      throw error;
    }
  }

  // ============================================================================
  // Additional Helper Methods
  // ============================================================================

  /**
   * Get the facilitator's address.
   */
  get address(): Address {
    return this.wallet.address as Address;
  }

  /**
   * Get the chain configuration.
   */
  get chainConfig(): PlasmaChainConfig {
    return this.chain;
  }

  /**
   * Get the native token (XPL) balance.
   */
  async getNativeBalance(): Promise<bigint> {
    return await this.provider.getBalance(this.wallet.address);
  }

  /**
   * Get the USDT0 balance.
   */
  async getUSDT0Balance(): Promise<bigint> {
    const balance = await this.readContract({
      address: this.chain.usdt0Address,
      abi: ['function balanceOf(address) view returns (uint256)'],
      functionName: 'balanceOf',
      args: [this.wallet.address],
    });
    return balance as bigint;
  }

  /**
   * Check if an authorization nonce has been used.
   */
  async isAuthorizationUsed(authorizer: Address, nonce: Hex): Promise<boolean> {
    const used = await this.readContract({
      address: this.chain.usdt0Address,
      abi: ['function authorizationState(address, bytes32) view returns (bool)'],
      functionName: 'authorizationState',
      args: [authorizer, nonce],
    });
    return used as boolean;
  }

  /**
   * Execute a TransferWithAuthorization.
   * 
   * @param params - Authorization parameters
   * @returns Transaction hash
   */
  async executeTransferWithAuthorization(params: {
    from: Address;
    to: Address;
    value: bigint;
    validAfter: bigint;
    validBefore: bigint;
    nonce: Hex;
    v: number;
    r: Hex;
    s: Hex;
  }): Promise<TransactionHash> {
    return await this.writeContract({
      address: this.chain.usdt0Address,
      abi: [
        'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)',
      ],
      functionName: 'transferWithAuthorization',
      args: [
        params.from,
        params.to,
        params.value,
        params.validAfter,
        params.validBefore,
        params.nonce,
        params.v,
        params.r,
        params.s,
      ],
    });
  }
}
