# Local setup (secrets and environment)

This repo uses pydantic-settings to load configuration from a local `.env` file at the repository root. Do not commit your real keys. The `.gitignore` excludes `.env` by default.

## Your provided values

- MERCHANT_ADDRESS: `0x03BD07c84B6D9682E238ec865B34bECFE045d09A`
- RELAYER_PRIVATE_KEY: `0xf1ed1529…a32b84` (masked)

## Quick start

1. Copy `env.example` to `.env`:

```bash
cp env.example .env
```

2. Open `.env` and set the following (replace the placeholders):

```env
MERCHANT_ADDRESS=0x03BD07c84B6D9682E238ec865B34bECFE045d09A
RELAYER_PRIVATE_KEY=<YOUR_RELAYER_PRIVATE_KEY>
```

3. Optional: prefer Plasma path in invoices

```env
PREFER_PLASMA=true
```

4. Ensure other required fields in `.env` are set (see comments in `env.example`):

- `ETH_RPC` (required)
- `PLASMA_RPC` (defaults to `https://rpc.plasma.to`)
- `CLIENT_PRIVATE_KEY` (required for local client tests)

## Notes

- The Next.js Client Demo (`/client`) shows a minimal end-to-end flow:
  - Request resource → see 402 `PaymentRequired`
  - Sign & Pay (EIP-3009) → see `PaymentCompleted`
  - Tx status lamp (idle/pending/confirmed/failed) with optional explorer link
  - Re-request resource → 200 with premium content once confirmed
