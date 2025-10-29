# x402-compatible USD₮ payments on Ethereum and Plasma

Production implementation of an x402-style A2A payment rail supporting:
- Ethereum mainnet (USDT via gasless pull using PaymentRouter.sol)
- Plasma L1 (USD₮0 via native EIP-3009 transferWithAuthorization)

## Quick start

1. Install toolchains (already scripted in this repo):
   - Python venv with pinned deps in requirements.txt
   - Node with Hardhat and OZ contracts

2. Configure environment variables in .env (see keys below):

```
ETH_RPC=
PLASMA_RPC=https://rpc.plasma.to
ROUTER_ADDRESS=0xPaymentRouterAddress
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
USDT0_ADDRESS=0xPlasmaUSDT0Address
ETH_CHAIN_ID=1
PLASMA_CHAIN_ID=9745
MERCHANT_ADDRESS=0xYourMerchantEOA
RELAYER_PRIVATE_KEY=0x...
CLIENT_PRIVATE_KEY=0x...
DRY_RUN=true
```

3. Compile contracts:

```
npx hardhat compile
```

4. Deploy router to Ethereum mainnet (requires funded relayer key):

```
ETH_RPC=... RELAYER_PRIVATE_KEY=0x... npx hardhat run scripts/deploy.js --network mainnet
```

5. Run end-to-end demo (DRY_RUN=true to skip chain submission):

```
source .venv/bin/activate
python test_flow.py
```

## Notes
- Plasma mainnet params: chainId 9745, RPC https://rpc.plasma.to (docs: https://docs.plasma.to/, explorer: https://plasmascan.to/).
- Replace USDT0_ADDRESS with the official USD₮0 contract from Plasma resources once confirmed.
- USDT on Ethereum requires a one-time approve(router, allowance) by the payer.

## References
- x402 spec and repo: https://github.com/coinbase/x402
- Plasma documentation: https://docs.plasma.to/
- USDT (Ethereum): 0xdAC17F958D2ee523a2206206994597C13D831ec7
