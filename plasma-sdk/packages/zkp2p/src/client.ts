/**
 * ZKP2P Client - Fiat on-ramp for AI agents
 *
 * Enables agents to accept fiat payments via Venmo, Zelle, Revolut, etc.
 * and convert them to USDT0 on Plasma using zero-knowledge proofs.
 */

import {
  createPublicClient,
  http,
  formatUnits,
  type Address,
  type PublicClient,
} from "viem";
import type {
  ZKP2PConfig,
  OnrampRequest,
  OnrampResponse,
  OnrampStatus,
  PaymentPlatform,
  PlatformInfo,
} from "./types";
import { PLATFORM_INFO } from "./types";

const DEFAULT_BASE_URL = "https://www.zkp2p.xyz";

// Plasma chain configuration
const PLASMA_CHAIN_ID = 98866; // Plasma mainnet
const USDT0_ADDRESS: Address = "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb";
const PLASMA_RPC_URL = "https://rpc.plasma.io/v1";

const ERC20_BALANCE_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export class ZKP2PClient {
  private baseUrl: string;
  private defaultPlatform: PaymentPlatform;
  private callbackUrl?: string;
  private statusPollingInterval: NodeJS.Timer | null = null;
  private publicClient: PublicClient;
  private preOnrampSnapshots: Map<
    string,
    { recipient: string; balance: bigint }
  > = new Map();

  constructor(config: ZKP2PConfig = {}) {
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    this.defaultPlatform = config.defaultPlatform || "venmo";
    this.callbackUrl = config.callbackUrl;
    this.publicClient = createPublicClient({
      chain: {
        id: PLASMA_CHAIN_ID,
        name: "Plasma",
        nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
        rpcUrls: { default: { http: [PLASMA_RPC_URL] } },
      },
      transport: http(PLASMA_RPC_URL),
    });
  }

  async getUSDT0Balance(address: string): Promise<bigint> {
    const balance = await this.publicClient.readContract({
      address: USDT0_ADDRESS,
      abi: ERC20_BALANCE_ABI,
      functionName: "balanceOf",
      args: [address as Address],
    });
    return balance as bigint;
  }

  /**
   * Generate an on-ramp request URL
   */
  async createOnrampRequest(request: OnrampRequest): Promise<OnrampResponse> {
    const { amount, recipient, platform, referenceId } = request;

    // Validate amount
    const platformInfo = this.getPlatformInfo(platform);
    const amountNum = parseFloat(amount);

    if (amountNum < parseFloat(platformInfo.minAmount)) {
      throw new Error(
        `Minimum amount for ${platformInfo.name} is $${platformInfo.minAmount}`
      );
    }
    if (amountNum > parseFloat(platformInfo.maxAmount)) {
      throw new Error(
        `Maximum amount for ${platformInfo.name} is $${platformInfo.maxAmount}`
      );
    }

    // Generate reference ID if not provided
    const refId = referenceId || this.generateReferenceId();

    // Build ZKP2P deep link URL
    const params = new URLSearchParams({
      amount: amount,
      recipient: recipient,
      platform: platform,
      chainId: PLASMA_CHAIN_ID.toString(),
      token: USDT0_ADDRESS,
      ref: refId,
    });

    if (this.callbackUrl) {
      params.append("callback", this.callbackUrl);
    }

    const url = `${this.baseUrl}/?${params.toString()}`;

    // Snapshot pre-onramp balance for polling-based status detection
    try {
      const balance = await this.getUSDT0Balance(recipient);
      this.preOnrampSnapshots.set(refId, { recipient, balance });
    } catch {
      this.preOnrampSnapshots.set(refId, { recipient, balance: 0n });
    }

    return {
      url,
      estimatedTime: this.getEstimatedTime(platform),
      referenceId: refId,
    };
  }

  /**
   * Generate a QR code for the on-ramp URL
   */
  async generateQRCode(url: string): Promise<string> {
    // In production, use a QR code library
    // For now, return a placeholder
    return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><text>QR: ${encodeURIComponent(
      url
    )}</text></svg>`;
  }

  /**
   * Check the status of an on-ramp request
   */
  async checkStatus(referenceId: string): Promise<OnrampStatus> {
    const snapshot = this.preOnrampSnapshots.get(referenceId);
    if (!snapshot) {
      return {
        referenceId,
        status: "pending",
        amount: "0",
        updatedAt: new Date().toISOString(),
      };
    }

    try {
      const currentBalance = await this.getUSDT0Balance(snapshot.recipient);
      const diff = currentBalance - snapshot.balance;

      if (diff > 0n) {
        const receivedAmount = formatUnits(diff, 6);
        this.preOnrampSnapshots.delete(referenceId);
        return {
          referenceId,
          status: "completed",
          amount: receivedAmount,
          receivedAmount,
          updatedAt: new Date().toISOString(),
        };
      }

      return {
        referenceId,
        status: "pending",
        amount: "0",
        updatedAt: new Date().toISOString(),
      };
    } catch {
      return {
        referenceId,
        status: "pending",
        amount: "0",
        updatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Wait for on-ramp completion with polling
   */
  async waitForCompletion(
    referenceId: string,
    options: {
      timeout?: number;
      pollInterval?: number;
      onStatusChange?: (status: OnrampStatus) => void;
    } = {}
  ): Promise<OnrampStatus> {
    const {
      timeout = 30 * 60 * 1000,
      pollInterval = 10000,
      onStatusChange,
    } = options;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const status = await this.checkStatus(referenceId);

          if (onStatusChange) {
            onStatusChange(status);
          }

          if (status.status === "completed") {
            resolve(status);
            return;
          }

          if (status.status === "failed") {
            reject(new Error(status.error || "On-ramp failed"));
            return;
          }

          if (Date.now() - startTime > timeout) {
            reject(new Error("On-ramp timed out"));
            return;
          }

          setTimeout(poll, pollInterval);
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }

  /**
   * Get information about a payment platform
   */
  getPlatformInfo(platform: PaymentPlatform): PlatformInfo {
    return PLATFORM_INFO[platform];
  }

  /**
   * Get all available payment platforms
   */
  getAvailablePlatforms(region?: string): PlatformInfo[] {
    return Object.values(PLATFORM_INFO).filter((p) => {
      if (!p.available) return false;
      if (
        region &&
        !p.regions.includes(region) &&
        !p.regions.includes("Global")
      ) {
        return false;
      }
      return true;
    });
  }

  /**
   * Estimate the amount of USDT0 to receive
   */
  async estimateReceiveAmount(
    amount: string,
    platform: PaymentPlatform
  ): Promise<{
    inputAmount: string;
    outputAmount: string;
    fee: string;
    rate: string;
  }> {
    // ZKP2P typically has ~1% fee (platform-dependent placeholder)
    const inputNum = parseFloat(amount);
    const platformFees: Partial<Record<PaymentPlatform, number>> = {
      venmo: 0.01,
      zelle: 0.01,
      revolut: 0.01,
    };
    const feePercent = platformFees[platform] ?? 0.01;
    const fee = inputNum * feePercent;
    const outputAmount = inputNum - fee;

    return {
      inputAmount: amount,
      outputAmount: outputAmount.toFixed(2),
      fee: fee.toFixed(2),
      rate: "1.00", // 1 USD = 1 USDT0
    };
  }

  /**
   * Generate instructions for completing the on-ramp
   */
  getInstructions(platform: PaymentPlatform): string[] {
    const instructions: Record<PaymentPlatform, string[]> = {
      venmo: [
        "1. Open the ZKP2P link in your browser",
        "2. Connect your wallet (or it will use the provided address)",
        "3. You will see a Venmo payment request",
        "4. Open Venmo and send the exact amount shown",
        "5. Include the reference code in the payment note",
        "6. ZKP2P will generate a ZK proof of your payment",
        "7. USDT0 will be sent to your wallet on Plasma",
      ],
      zelle: [
        "1. Open the ZKP2P link in your browser",
        "2. Connect your wallet (or it will use the provided address)",
        "3. You will see Zelle payment instructions",
        "4. Open your bank app and send via Zelle",
        "5. Use the exact amount and recipient shown",
        "6. ZKP2P will verify your payment via ZK proof",
        "7. USDT0 will be sent to your wallet on Plasma",
      ],
      revolut: [
        "1. Open the ZKP2P link in your browser",
        "2. Connect your wallet (or it will use the provided address)",
        "3. You will see Revolut payment instructions",
        "4. Open Revolut and send the payment",
        "5. Use the exact amount and reference shown",
        "6. ZKP2P will verify your payment via ZK proof",
        "7. USDT0 will be sent to your wallet on Plasma",
      ],
      wise: [
        "1. Open the ZKP2P link in your browser",
        "2. Connect your wallet (or it will use the provided address)",
        "3. You will see Wise payment instructions",
        "4. Open Wise and initiate the transfer",
        "5. Use the exact amount and reference shown",
        "6. ZKP2P will verify your payment via ZK proof",
        "7. USDT0 will be sent to your wallet on Plasma",
      ],
      cashapp: [
        "1. Open the ZKP2P link in your browser",
        "2. Connect your wallet (or it will use the provided address)",
        "3. You will see Cash App payment instructions",
        "4. Open Cash App and send the payment",
        "5. Include the reference in the note",
        "6. ZKP2P will verify your payment via ZK proof",
        "7. USDT0 will be sent to your wallet on Plasma",
      ],
      paypal: [
        "1. Open the ZKP2P link in your browser",
        "2. Connect your wallet (or it will use the provided address)",
        "3. You will see PayPal payment instructions",
        "4. Open PayPal and send the payment",
        "5. Use the exact amount and reference shown",
        "6. ZKP2P will verify your payment via ZK proof",
        "7. USDT0 will be sent to your wallet on Plasma",
      ],
    };

    return instructions[platform];
  }

  /**
   * Create a funding link for an agent
   */
  createAgentFundingLink(
    agentAddress: string,
    options: {
      suggestedAmount?: string;
      platform?: PaymentPlatform;
      agentName?: string;
    } = {}
  ): string {
    const params = new URLSearchParams({
      recipient: agentAddress,
      chainId: PLASMA_CHAIN_ID.toString(),
      token: USDT0_ADDRESS,
    });

    if (options.suggestedAmount) {
      params.append("amount", options.suggestedAmount);
    }
    if (options.platform) {
      params.append("platform", options.platform);
    }
    if (options.agentName) {
      params.append("name", options.agentName);
    }

    return `${this.baseUrl}/?${params.toString()}`;
  }

  /**
   * Generate a reference ID
   */
  private generateReferenceId(): string {
    return `plasma_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Get estimated time for a platform
   */
  private getEstimatedTime(platform: PaymentPlatform): number {
    const times: Record<PaymentPlatform, number> = {
      venmo: 7,
      zelle: 7,
      revolut: 10,
      wise: 20,
      cashapp: 7,
      paypal: 15,
    };
    return times[platform];
  }
}

export default ZKP2PClient;
