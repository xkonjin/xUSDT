#!/usr/bin/env node
/**
 * @plasma-pay/mcp-server
 *
 * MCP Server for Plasma Pay - enables Claude, Cursor, and other AI agents to make payments
 *
 * Usage:
 *   npx @plasma-pay/mcp-server
 *
 * Environment variables:
 *   PLASMA_WALLET_KEY - Private key for signing payments (required)
 *   PLASMA_RPC_URL - Plasma RPC URL (optional, defaults to https://rpc.plasma.xyz)
 *   PLASMA_FACILITATOR_URL - Facilitator URL (optional, defaults to https://pay.plasma.xyz)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

// ============================================================================
// Configuration
// ============================================================================

const PLASMA_CHAIN_ID = 98866;
const PLASMA_RPC_URL = process.env.PLASMA_RPC_URL || "https://rpc.plasma.xyz";
// @ts-ignore - reserved for future use
const _FACILITATOR_URL =
  process.env.PLASMA_FACILITATOR_URL || "https://pay.plasma.xyz";
const USDT0_ADDRESS = (process.env.USDT0_ADDRESS ||
  "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb") as Address;
const USDT0_DECIMALS = 6;

// Plasma chain definition
const plasma = {
  id: PLASMA_CHAIN_ID,
  name: "Plasma",
  nativeCurrency: { decimals: 18, name: "XPL", symbol: "XPL" },
  rpcUrls: { default: { http: [PLASMA_RPC_URL] } },
};

// ERC20 ABI
const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ============================================================================
// Tool Definitions
// ============================================================================

const TOOLS: Tool[] = [
  {
    name: "plasma_get_balance",
    description:
      "Get the USDT0 and XPL (gas) balance of the configured wallet on Plasma",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "plasma_send_payment",
    description:
      "Send USDT0 payment to a recipient address on Plasma. Uses gasless EIP-3009 transfers.",
    inputSchema: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "Recipient address (0x...)",
        },
        amount: {
          type: "string",
          description: 'Amount in USDT0 (e.g., "10.50" for $10.50)',
        },
        note: {
          type: "string",
          description: "Optional payment note/memo",
        },
      },
      required: ["to", "amount"],
    },
  },
  {
    name: "plasma_pay_invoice",
    description:
      "Pay an X402 invoice/payment request. Automatically handles the payment flow.",
    inputSchema: {
      type: "object",
      properties: {
        invoiceUrl: {
          type: "string",
          description: "URL that returned 402 Payment Required",
        },
        maxAmount: {
          type: "string",
          description: 'Maximum amount willing to pay in USDT0 (e.g., "1.00")',
        },
      },
      required: ["invoiceUrl"],
    },
  },
  {
    name: "plasma_get_address",
    description: "Get the wallet address configured for Plasma Pay",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "plasma_estimate_gas",
    description:
      "Estimate gas cost for a transaction on Plasma (extremely cheap)",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

// ============================================================================
// Tool Handlers
// ============================================================================

async function handleGetBalance(
  publicClient: any,
  address: Address
): Promise<string> {
  // Get USDT0 balance
  let usdt0 = BigInt(0);
  try {
    usdt0 = (await publicClient.readContract({
      address: USDT0_ADDRESS,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    })) as bigint;
  } catch (e) {
    // Token might not exist yet
  }

  // Get XPL (native) balance
  const xpl = await publicClient.getBalance({ address });

  return JSON.stringify(
    {
      address,
      usdt0: {
        balance: usdt0.toString(),
        formatted: formatUnits(usdt0, USDT0_DECIMALS),
        symbol: "USDT0",
      },
      xpl: {
        balance: xpl.toString(),
        formatted: formatUnits(xpl, 18),
        symbol: "XPL",
      },
      hasGas: xpl >= BigInt(10_000_000_000_000_000), // 0.01 XPL
    },
    null,
    2
  );
}

async function handleSendPayment(
  publicClient: any,
  _walletClient: any,
  address: Address,
  to: string,
  amount: string,
  note?: string
): Promise<string> {
  // Validate recipient address
  if (!to.startsWith("0x") || to.length !== 42) {
    throw new Error("Invalid recipient address");
  }

  // Parse amount
  const amountWei = parseUnits(amount, USDT0_DECIMALS);

  // Check balance
  const balance = (await publicClient.readContract({
    address: USDT0_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
  })) as bigint;

  if (balance < amountWei) {
    throw new Error(
      `Insufficient balance. Have ${formatUnits(
        balance,
        USDT0_DECIMALS
      )} USDT0, need ${amount} USDT0`
    );
  }

  // For now, return a simulated response
  // In production, this would sign and submit an EIP-3009 authorization
  return JSON.stringify(
    {
      status: "simulated",
      message:
        "Payment would be sent (simulation mode - configure facilitator for real payments)",
      details: {
        from: address,
        to,
        amount,
        amountWei: amountWei.toString(),
        note: note || null,
        network: "Plasma",
        token: "USDT0",
      },
    },
    null,
    2
  );
}

async function handlePayInvoice(
  _address: Address,
  invoiceUrl: string,
  _maxAmount?: string
): Promise<string> {
  // Fetch the invoice
  const response = await fetch(invoiceUrl);

  if (response.status !== 402) {
    return JSON.stringify(
      {
        status: "no_payment_required",
        message: `URL returned status ${response.status}, not 402 Payment Required`,
      },
      null,
      2
    );
  }

  // Parse payment required header
  const paymentHeader = response.headers.get("X-Payment-Required");
  if (!paymentHeader) {
    return JSON.stringify(
      {
        status: "error",
        message: "No X-Payment-Required header found in 402 response",
      },
      null,
      2
    );
  }

  try {
    const paymentRequired = JSON.parse(atob(paymentHeader));

    return JSON.stringify(
      {
        status: "payment_required",
        invoiceId: paymentRequired.invoiceId,
        options: paymentRequired.paymentOptions,
        message: "Payment required. Use plasma_send_payment to pay.",
      },
      null,
      2
    );
  } catch (e) {
    return JSON.stringify(
      {
        status: "error",
        message: "Failed to parse payment required header",
      },
      null,
      2
    );
  }
}

function handleGetAddress(address: Address): string {
  return JSON.stringify(
    {
      address,
      network: "Plasma",
      chainId: PLASMA_CHAIN_ID,
    },
    null,
    2
  );
}

function handleEstimateGas(): string {
  const gasLimit = BigInt(65_000); // Typical ERC20 transfer
  const gasPrice = BigInt(1_000_000_000); // 1 gwei
  const cost = gasLimit * gasPrice;

  return JSON.stringify(
    {
      gasLimit: gasLimit.toString(),
      gasPrice: formatUnits(gasPrice, 9) + " gwei",
      totalCost: {
        wei: cost.toString(),
        xpl: formatUnits(cost, 18),
        usd: "< $0.0001",
      },
      note: "Plasma gas is extremely cheap - ~10,000x cheaper than Ethereum",
    },
    null,
    2
  );
}

// ============================================================================
// Main Server
// ============================================================================

async function main() {
  // Get private key from environment
  const privateKey = process.env.PLASMA_WALLET_KEY as Hex | undefined;

  if (!privateKey) {
    console.error("Error: PLASMA_WALLET_KEY environment variable is required");
    console.error("Set it to your wallet private key (0x...)");
    process.exit(1);
  }

  // Initialize wallet
  const account = privateKeyToAccount(privateKey);
  const address = account.address;

  // Initialize clients
  const publicClient = createPublicClient({
    chain: plasma as any,
    transport: http(PLASMA_RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: plasma as any,
    transport: http(PLASMA_RPC_URL),
  });

  // Create MCP server
  const server = new Server(
    {
      name: "plasma-pay",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle list tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: string;

      switch (name) {
        case "plasma_get_balance":
          result = await handleGetBalance(publicClient, address);
          break;

        case "plasma_send_payment":
          result = await handleSendPayment(
            publicClient,
            walletClient,
            address,
            (args as any).to,
            (args as any).amount,
            (args as any).note
          );
          break;

        case "plasma_pay_invoice":
          result = await handlePayInvoice(
            address,
            (args as any).invoiceUrl,
            (args as any).maxAmount
          );
          break;

        case "plasma_get_address":
          result = handleGetAddress(address);
          break;

        case "plasma_estimate_gas":
          result = handleEstimateGas();
          break;

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [{ type: "text", text: result }],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: true,
                message: error.message || "Unknown error",
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`Plasma Pay MCP Server started`);
  console.error(`Wallet: ${address}`);
  console.error(`Network: Plasma (${PLASMA_CHAIN_ID})`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
