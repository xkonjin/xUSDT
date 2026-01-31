# @plasma-pay/agent

> **One-click payment integration for AI agents on Plasma**

The Plasma Pay SDK enables AI agents to make and receive payments with minimal setup. Built on Plasma's ultra-low-cost infrastructure, it provides:

- **Gasless transfers** via EIP-3009 (no ETH needed)
- **Auto gas management** (self-sovereign operation)
- **Cross-chain funding** via LiFi (accept any token)
- **X402 compatibility** (HTTP 402 Payment Required)

## Quick Start

```bash
npm install @plasma-pay/agent
```

```typescript
import { PlasmaPayClient } from '@plasma-pay/agent';

const client = new PlasmaPayClient({
  privateKey: process.env.WALLET_KEY,
});

// Send $10 USDT0 to another address
const result = await client.sendPayment({
  to: '0x...',
  amount: '10.00',
  note: 'Payment for API access',
});

console.log(`Sent! TX: ${result.txHash}`);
```

## Why Plasma?

| Feature | Plasma | Base (CDP) | Ethereum |
|---------|--------|------------|----------|
| Cost per TX | **~$0.0001** | $0.001 | $1-10 |
| Needs gas token | No* | No | Yes |
| Settlement | Instant | Instant | 12s |
| P2P capable | **Yes** | Via facilitator | Yes |

*Auto-managed via USDT0→XPL swap when needed

## Installation

```bash
# Core SDK
npm install @plasma-pay/agent

# Optional: Cross-chain swaps
npm install @plasma-pay/lifi

# Optional: Auto gas management
npm install @plasma-pay/gas-manager

# Optional: MCP Server for Claude/Cursor
npm install -g @plasma-pay/mcp-server
```

## Usage

### Basic Payment

```typescript
import { PlasmaPayClient } from '@plasma-pay/agent';

const client = new PlasmaPayClient({
  privateKey: process.env.WALLET_KEY,
});

// Check balance
const balance = await client.getBalance();
console.log(`Balance: ${balance.usdt0Formatted} USDT0`);

// Send payment
const result = await client.sendPayment({
  to: '0x1234...',
  amount: '25.00',
});
```

### X402 Auto-Pay (HTTP 402)

```typescript
// Automatically pay when APIs return 402 Payment Required
const response = await client.fetch('https://api.example.com/premium-data');

// If the API returns 402, the client:
// 1. Parses the X-Payment-Required header
// 2. Signs an EIP-3009 authorization
// 3. Retries the request with payment proof
// 4. Returns the actual response
```

### Cross-Chain Funding (LiFi)

```typescript
import { PlasmaLiFiClient } from '@plasma-pay/lifi';

const lifi = new PlasmaLiFiClient({
  privateKey: process.env.WALLET_KEY,
});

// Swap ETH on Ethereum to USDT0 on Plasma
const result = await lifi.swap({
  fromChainId: 1,
  fromToken: '0x0000000000000000000000000000000000000000', // ETH
  fromAmount: '1000000000000000000', // 1 ETH
  fromAddress: '0x...',
});
```

### Auto Gas Management

```typescript
import { PlasmaGasManager } from '@plasma-pay/gas-manager';

const gasManager = new PlasmaGasManager({
  privateKey: process.env.WALLET_KEY,
  autoRefill: true, // Auto-swap USDT0 to XPL when low
});

// Start monitoring
gasManager.startMonitoring();

// Subscribe to events
gasManager.on((event) => {
  if (event.type === 'balance_low') {
    console.log('Gas running low, auto-refill triggered');
  }
});
```

### MCP Server (Claude/Cursor)

```bash
# Set your wallet key
export PLASMA_WALLET_KEY=0x...

# Start the MCP server
plasma-pay-mcp
```

Add to your Claude/Cursor MCP config:

```json
{
  "mcpServers": {
    "plasma-pay": {
      "command": "plasma-pay-mcp",
      "env": {
        "PLASMA_WALLET_KEY": "0x..."
      }
    }
  }
}
```

Now Claude/Cursor can:
- Check wallet balance
- Send payments
- Pay X402 invoices
- Estimate gas costs

## API Reference

### PlasmaPayClient

```typescript
new PlasmaPayClient(config: PlasmaPayConfig)
```

**Config Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `privateKey` | `Hex` | - | Wallet private key (required) |
| `facilitatorUrl` | `string` | `https://pay.plasma.xyz` | Facilitator endpoint |
| `plasmaRpcUrl` | `string` | `https://rpc.plasma.xyz` | Plasma RPC URL |
| `autoGas` | `boolean` | `true` | Enable auto gas management |
| `debug` | `boolean` | `false` | Enable debug logging |

**Methods:**

| Method | Description |
|--------|-------------|
| `getBalance()` | Get USDT0 and XPL balance |
| `sendPayment(opts)` | Send USDT0 to an address |
| `signAuthorization(opts)` | Sign EIP-3009 authorization |
| `fetch(url, opts)` | Fetch with auto X402 payment |

### PlasmaLiFiClient

```typescript
new PlasmaLiFiClient(config: LiFiConfig)
```

**Methods:**

| Method | Description |
|--------|-------------|
| `getSwapQuote(request)` | Get quote for cross-chain swap |
| `executeSwap(quote)` | Execute a swap |
| `swap(request)` | Quote + execute in one call |
| `getSupportedChains()` | List supported source chains |

### PlasmaGasManager

```typescript
new PlasmaGasManager(config: GasManagerConfig)
```

**Methods:**

| Method | Description |
|--------|-------------|
| `getBalance()` | Get XPL gas balance |
| `refill(amount?)` | Swap USDT0 for XPL gas |
| `startMonitoring()` | Start auto-refill monitoring |
| `stopMonitoring()` | Stop monitoring |
| `on(handler)` | Subscribe to events |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AI Agent / Application                   │
├─────────────────────────────────────────────────────────────┤
│                    @plasma-pay/agent                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ EIP-3009    │  │ X402       │  │ Auto Gas            │  │
│  │ Signer      │  │ Client     │  │ Manager             │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    @plasma-pay/lifi                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Cross-chain swaps: Any token → USDT0 on Plasma          ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                      Plasma Network                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ USDT0       │  │ XPL (Gas)  │  │ Facilitator         │  │
│  │ Token       │  │ Native     │  │ (Optional)          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Self-Sovereign vs Facilitated

**Self-Sovereign Mode** (recommended for Plasma):
- Agent holds XPL for gas
- Direct P2P transfers
- No middleman fees
- Auto gas management via USDT0→XPL swap

**Facilitated Mode** (for Base/other chains):
- Facilitator sponsors gas
- Agent signs EIP-3009 authorization
- Facilitator submits transaction
- Small facilitator fee

On Plasma, gas is so cheap (~$0.0001) that self-sovereign mode is almost always better.

## Security

- Private keys are never sent to any server
- All signatures are created locally
- EIP-3009 authorizations are single-use
- Facilitator only sees the authorization, not the private key

## Examples

See the [examples](./examples) directory for:
- Basic payment flow
- X402 API integration
- Cross-chain funding
- MCP server setup
- LangChain tool integration

## License

MIT
