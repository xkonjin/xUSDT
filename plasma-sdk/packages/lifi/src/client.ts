/**
 * @plasma-pay/lifi - LiFi Swap Client
 *
 * Cross-chain swap module for converting any token to USDT0 on Plasma
 */

import {
  createConfig,
  getQuote,
  executeRoute,
  getChains,
  getTokens,
  type QuoteRequest,
  type Route,
} from "@lifi/sdk";
import {
  createWalletClient,
  http,
  formatUnits,
  type WalletClient,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type {
  LiFiConfig,
  SwapRequest,
  SwapQuote,
  SwapResult,
  TokenInfo,
  ChainInfo,
  SendRequest,
  SendQuote,
  SendResult,
} from "./types";
import {
  PLASMA_CHAIN_ID,
  USDT0_ADDRESS_PLASMA,
  NATIVE_TOKEN_ADDRESS,
  COMMON_TOKENS,
  SUPPORTED_SOURCE_CHAINS,
} from "./types";

// Default configuration
const DEFAULT_CONFIG: LiFiConfig = {
  integrator: "PlasmaPaySDK",
  slippage: 0.5,
  maxPriceImpact: 2,
  debug: false,
};

/**
 * PlasmaLiFiClient - Cross-chain swap module
 *
 * Enables agents to accept any token on any chain and convert to USDT0 on Plasma
 *
 * @example
 * ```typescript
 * const lifi = new PlasmaLiFiClient({
 *   privateKey: process.env.WALLET_KEY,
 * });
 *
 * // Get a quote for swapping ETH on Ethereum to USDT0 on Plasma
 * const quote = await lifi.getSwapQuote({
 *   fromChainId: 1,
 *   fromToken: '0x0000000000000000000000000000000000000000', // ETH
 *   fromAmount: '1000000000000000000', // 1 ETH
 *   fromAddress: '0x...',
 * });
 *
 * // Execute the swap
 * const result = await lifi.executeSwap(quote);
 * ```
 */
export class PlasmaLiFiClient {
  private config: LiFiConfig;
  private walletClient: WalletClient | null = null;

  constructor(config: LiFiConfig & { privateKey?: Hex } = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize LiFi SDK
    createConfig({
      integrator: this.config.integrator || "PlasmaPaySDK",
    });

    // Initialize wallet if private key provided
    if (config.privateKey) {
      const account = privateKeyToAccount(config.privateKey);
      this.walletClient = createWalletClient({
        account,
        transport: http(),
      });
    }

    this.log("PlasmaLiFiClient initialized");
  }

  /**
   * Get a quote for swapping any token to USDT0 on Plasma
   */
  async getSwapQuote(request: SwapRequest): Promise<SwapQuote> {
    this.log(
      "Getting swap quote",
      request as unknown as Record<string, unknown>
    );

    // Default to Plasma and USDT0 as destination
    const toChainId = request.toChainId || PLASMA_CHAIN_ID;
    const toToken = request.toToken || USDT0_ADDRESS_PLASMA;
    const toAddress = request.toAddress || request.fromAddress;

    // Build LiFi quote request
    const quoteRequest: QuoteRequest = {
      fromChain: request.fromChainId,
      toChain: toChainId,
      fromToken: request.fromToken,
      toToken: toToken,
      fromAmount: request.fromAmount,
      fromAddress: request.fromAddress,
      toAddress: toAddress,
      slippage: this.config.slippage! / 100, // Convert to decimal
    };

    try {
      const quote = await getQuote(quoteRequest);
      return this.formatQuote(quote);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.log("Quote error", { error: message });
      throw new Error(`Failed to get swap quote: ${message}`);
    }
  }

  /**
   * Execute a swap using a previously obtained quote
   */
  async executeSwap(quote: SwapQuote): Promise<SwapResult> {
    if (!this.walletClient) {
      throw new Error(
        "Wallet not configured. Provide privateKey in constructor."
      );
    }

    this.log("Executing swap", { quoteId: quote.id });

    try {
      const route = quote.rawRoute as Route;

      // Execute the route
      const result = await executeRoute(route, {
        // Update callback for progress tracking
        updateRouteHook: (updatedRoute) => {
          this.log("Route update", {
            status: updatedRoute.steps[0]?.execution?.status,
          });
        },
      });

      // Check final status
      const lastStep = result.steps[result.steps.length - 1];
      const execution = lastStep?.execution;

      if (execution?.status === "DONE") {
        return {
          sourceTxHash: execution.process[0]?.txHash as Hex,
          destinationTxHash: execution.process[execution.process.length - 1]
            ?.txHash as Hex,
          status: "success",
          amountReceived: lastStep?.estimate?.toAmount,
        };
      } else if (execution?.status === "FAILED") {
        return {
          sourceTxHash: execution.process[0]?.txHash as Hex,
          status: "failed",
          error:
            execution.process.find((p) => p.error)?.error?.message ||
            "Unknown error",
        };
      } else {
        return {
          sourceTxHash: execution?.process[0]?.txHash as Hex,
          status: "pending",
        };
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.log("Swap execution error", { error: message });
      throw new Error(`Swap execution failed: ${message}`);
    }
  }

  /**
   * Get quote and execute in one call
   */
  async swap(request: SwapRequest): Promise<SwapResult> {
    const quote = await this.getSwapQuote(request);
    return this.executeSwap(quote);
  }

  /**
   * Get supported chains for swapping to Plasma
   */
  async getSupportedChains(): Promise<ChainInfo[]> {
    try {
      const chains = await getChains();
      return chains
        .filter((chain) => SUPPORTED_SOURCE_CHAINS.includes(chain.id))
        .map((chain) => ({
          id: chain.id,
          name: chain.name,
          nativeCurrency: {
            symbol: chain.nativeToken?.symbol || "ETH",
            decimals: chain.nativeToken?.decimals || 18,
          },
          logoURI: chain.logoURI,
        }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.log("Failed to get chains", { error: message });
      return [];
    }
  }

  /**
   * Get tokens available on a specific chain
   */
  async getTokensOnChain(chainId: number): Promise<TokenInfo[]> {
    try {
      const result = await getTokens({ chains: [chainId] });
      const tokens = result.tokens[chainId] || [];

      return tokens.map((token) => ({
        address: token.address as Address,
        chainId: token.chainId,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        logoURI: token.logoURI,
        priceUsd: token.priceUSD,
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.log("Failed to get tokens", { error: message });
      return [];
    }
  }

  /**
   * Get common token address on a chain
   */
  getCommonToken(chainId: number, symbol: string): Address | null {
    const chainTokens = COMMON_TOKENS[chainId];
    if (!chainTokens) return null;
    return chainTokens[symbol.toUpperCase()] || null;
  }

  /**
   * Check if a chain is supported for swaps to Plasma
   */
  isChainSupported(chainId: number): boolean {
    return SUPPORTED_SOURCE_CHAINS.includes(chainId);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private formatQuote(quote: unknown): SwapQuote {
    const route = quote as Route;
    const action = route.steps[0]?.action;
    const estimate = route.steps[0]?.estimate;

    return {
      id: route.id,
      from: {
        chainId: action?.fromChainId || 0,
        token: action?.fromToken?.address as Address,
        amount: action?.fromAmount || "0",
        amountFormatted: formatUnits(
          BigInt(action?.fromAmount || "0"),
          action?.fromToken?.decimals || 18
        ),
        symbol: action?.fromToken?.symbol || "UNKNOWN",
      },
      to: {
        chainId: action?.toChainId || PLASMA_CHAIN_ID,
        token: action?.toToken?.address as Address,
        amount: estimate?.toAmount || "0",
        amountFormatted: formatUnits(
          BigInt(estimate?.toAmount || "0"),
          action?.toToken?.decimals || 6
        ),
        symbol: action?.toToken?.symbol || "USDT0",
      },
      estimatedTime: route.steps.reduce(
        (acc, step) => acc + (step.estimate?.executionDuration || 0),
        0
      ),
      gasCostUsd: route.gasCostUSD || "0",
      priceImpact: parseFloat(
        (estimate as unknown as Record<string, string>)?.priceImpact || "0"
      ),
      exchangeRate: this.calculateExchangeRate(
        action?.fromAmount,
        estimate?.toAmount,
        action?.fromToken?.decimals,
        action?.toToken?.decimals
      ),
      steps: route.steps.map((step) => ({
        type: step.type as "swap" | "bridge" | "cross",
        tool: step.tool,
        fromChainId: step.action?.fromChainId || 0,
        toChainId: step.action?.toChainId || 0,
        fromToken: step.action?.fromToken?.symbol || "",
        toToken: step.action?.toToken?.symbol || "",
        estimatedTime: step.estimate?.executionDuration || 0,
      })),
      rawRoute: route,
    };
  }

  private calculateExchangeRate(
    fromAmount?: string,
    toAmount?: string,
    fromDecimals?: number,
    toDecimals?: number
  ): string {
    if (!fromAmount || !toAmount) return "0";

    const from = parseFloat(
      formatUnits(BigInt(fromAmount), fromDecimals || 18)
    );
    const to = parseFloat(formatUnits(BigInt(toAmount), toDecimals || 6));

    if (from === 0) return "0";
    return (to / from).toFixed(6);
  }

  private log(message: string, data?: Record<string, unknown>): void {
    if (this.config.debug) {
      console.log(`[PlasmaLiFiClient] ${message}`, data || "");
    }
  }

  // ============================================================================
  // LiFi OUT - Send payments in any currency (prefer Plasma)
  // ============================================================================

  /**
   * Get a quote for sending payment to any chain/token
   * Prefers Plasma when possible for lowest fees
   */
  async getSendQuote(request: SendRequest): Promise<SendQuote> {
    const { to, amount, toChainId, toToken, preferPlasma = true } = request;

    // If sending to Plasma or preferPlasma is true and no specific chain requested,
    // use Plasma for lowest fees
    const destinationChainId =
      toChainId || (preferPlasma ? PLASMA_CHAIN_ID : 1);
    const destinationToken =
      toToken ||
      (destinationChainId === PLASMA_CHAIN_ID
        ? USDT0_ADDRESS_PLASMA
        : NATIVE_TOKEN_ADDRESS);

    // If destination is Plasma, no bridge needed - direct transfer
    if (destinationChainId === PLASMA_CHAIN_ID) {
      return {
        id: `plasma_direct_${Date.now()}`,
        senderPays: {
          chainId: PLASMA_CHAIN_ID,
          token: USDT0_ADDRESS_PLASMA,
          amount: amount,
          amountFormatted: formatUnits(BigInt(amount), 6),
          symbol: "USDT0",
        },
        recipientReceives: {
          chainId: PLASMA_CHAIN_ID,
          token: destinationToken,
          amount: amount,
          amountFormatted: formatUnits(BigInt(amount), 6),
          symbol: "USDT0",
        },
        fees: {
          bridgeFee: "0",
          gasFee: "100", // ~0.0001 USDT0 in atomic units
          totalFee: "100",
          totalFeeUsd: "0.0001",
        },
        estimatedTime: 2, // 2 seconds
        isPlasmaOnly: true,
        steps: [],
        rawRoute: null,
      };
    }

    // Need to bridge - get LiFi quote
    const quoteRequest: QuoteRequest = {
      fromChain: PLASMA_CHAIN_ID,
      toChain: destinationChainId,
      fromToken: USDT0_ADDRESS_PLASMA,
      toToken: destinationToken,
      fromAmount: amount,
      fromAddress:
        this.walletClient?.account?.address ||
        "0x0000000000000000000000000000000000000000",
      toAddress: to,
      slippage: this.config.slippage! / 100,
    };

    try {
      const quote = await getQuote(quoteRequest);
      const route = quote as unknown as Route;
      const estimate = route.steps[0]?.estimate;

      return {
        id: route.id,
        senderPays: {
          chainId: PLASMA_CHAIN_ID,
          token: USDT0_ADDRESS_PLASMA,
          amount: amount,
          amountFormatted: formatUnits(BigInt(amount), 6),
          symbol: "USDT0",
        },
        recipientReceives: {
          chainId: destinationChainId,
          token: destinationToken,
          amount: estimate?.toAmount || "0",
          amountFormatted: formatUnits(BigInt(estimate?.toAmount || "0"), 18),
          symbol: route.steps[0]?.action?.toToken?.symbol || "UNKNOWN",
        },
        fees: {
          bridgeFee: route.steps
            .reduce(
              (acc, s) =>
                acc + parseFloat(s.estimate?.feeCosts?.[0]?.amountUSD || "0"),
              0
            )
            .toString(),
          gasFee: route.gasCostUSD || "0",
          totalFee: (
            parseFloat(route.gasCostUSD || "0") +
            parseFloat(
              route.steps[0]?.estimate?.feeCosts?.[0]?.amountUSD || "0"
            )
          ).toString(),
          totalFeeUsd: (
            parseFloat(route.gasCostUSD || "0") +
            parseFloat(
              route.steps[0]?.estimate?.feeCosts?.[0]?.amountUSD || "0"
            )
          ).toFixed(4),
        },
        estimatedTime: route.steps.reduce(
          (acc, step) => acc + (step.estimate?.executionDuration || 0),
          0
        ),
        isPlasmaOnly: false,
        steps: route.steps.map((step) => ({
          type: step.type as "swap" | "bridge" | "cross",
          tool: step.tool,
          fromChainId: step.action?.fromChainId || 0,
          toChainId: step.action?.toChainId || 0,
          fromToken: step.action?.fromToken?.symbol || "",
          toToken: step.action?.toToken?.symbol || "",
          estimatedTime: step.estimate?.executionDuration || 0,
        })),
        rawRoute: route,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get send quote: ${message}`);
    }
  }

  /**
   * Execute a send payment using a quote
   */
  async executeSend(quote: SendQuote, recipient: Address): Promise<SendResult> {
    if (!this.walletClient) {
      throw new Error(
        "Wallet not configured. Provide privateKey in constructor."
      );
    }

    // If Plasma-only, execute direct transfer
    if (quote.isPlasmaOnly) {
      // This would use EIP-3009 gasless transfer
      // For now, return a placeholder
      return {
        sourceTxHash: "0x" as Hex,
        status: "pending",
        recipient,
        destinationChain: PLASMA_CHAIN_ID,
      };
    }

    // Execute bridge route
    try {
      const route = quote.rawRoute as Route;
      const result = await executeRoute(route, {
        updateRouteHook: (updatedRoute) => {
          this.log("Send route update", {
            status: updatedRoute.steps[0]?.execution?.status,
          });
        },
      });

      const lastStep = result.steps[result.steps.length - 1];
      const execution = lastStep?.execution;

      if (execution?.status === "DONE") {
        return {
          sourceTxHash: execution.process[0]?.txHash as Hex,
          destinationTxHash: execution.process[execution.process.length - 1]
            ?.txHash as Hex,
          status: "success",
          amountReceived: lastStep?.estimate?.toAmount,
          recipient,
          destinationChain: quote.recipientReceives.chainId,
        };
      } else {
        return {
          sourceTxHash: execution?.process[0]?.txHash as Hex,
          status: execution?.status === "FAILED" ? "failed" : "pending",
          error: execution?.process.find((p) => p.error)?.error?.message,
          recipient,
          destinationChain: quote.recipientReceives.chainId,
        };
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Send execution failed: ${message}`);
    }
  }

  /**
   * Send payment in one call (get quote + execute)
   * Prefers Plasma for lowest fees
   */
  async send(request: SendRequest): Promise<SendResult> {
    const quote = await this.getSendQuote(request);
    return this.executeSend(quote, request.to);
  }

  /**
   * Check if recipient can receive on Plasma (preferred)
   * Returns true if address is valid on Plasma
   */
  canReceiveOnPlasma(address: Address): boolean {
    // All valid Ethereum addresses can receive on Plasma
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Get the best chain to send to based on recipient preferences
   */
  async getBestSendChain(
    recipient: Address,
    _amount: string
  ): Promise<{
    chainId: number;
    chainName: string;
    estimatedFee: string;
    estimatedTime: number;
    reason: string;
  }> {
    // Always prefer Plasma for lowest fees
    if (this.canReceiveOnPlasma(recipient)) {
      return {
        chainId: PLASMA_CHAIN_ID,
        chainName: "Plasma",
        estimatedFee: "0.0001",
        estimatedTime: 2,
        reason: "Lowest fees (~$0.0001), instant settlement",
      };
    }

    // Fallback to Base as second choice
    return {
      chainId: 8453,
      chainName: "Base",
      estimatedFee: "0.10",
      estimatedTime: 60,
      reason: "Low fees, fast bridging",
    };
  }
}

/**
 * Convenience function to create a swap quote
 */
export async function getPlasmaSwapQuote(
  request: SwapRequest,
  config?: LiFiConfig
): Promise<SwapQuote> {
  const client = new PlasmaLiFiClient(config);
  return client.getSwapQuote(request);
}

/**
 * Convenience function to send payment
 */
export async function sendPayment(
  request: SendRequest,
  config?: LiFiConfig & { privateKey?: Hex }
): Promise<SendResult> {
  const client = new PlasmaLiFiClient(config);
  return client.send(request);
}
