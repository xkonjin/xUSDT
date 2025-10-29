from __future__ import annotations

import time
from typing import Optional, Tuple

from eth_account import Account
from web3 import Web3

from .config import settings
from .x402_models import PaymentRequired, PaymentSubmitted, ChosenOption, Signature
from .crypto import (
    build_router_typed_data,
    sign_typed_data,
    build_eip3009_typed_data,
    random_nonce32,
)


def _now() -> int:
    return int(time.time())


class ClientAgent:
    def __init__(self) -> None:
        self.w3_eth = Web3(Web3.HTTPProvider(settings.ETH_RPC))
        self.w3_plasma = Web3(Web3.HTTPProvider(settings.PLASMA_RPC))
        self.client_acct = Account.from_key(settings.CLIENT_PRIVATE_KEY)

    def _prefer_plasma(self) -> bool:
        # Simple heuristic: prefer Plasma when USDT0 address is configured
        return settings.USDT0_ADDRESS.lower() != "0xplasmausdt0address"

    def _choose_option(self, req: PaymentRequired) -> Tuple[dict, str]:
        opts = req.paymentOptions
        if not opts:
            raise ValueError("No payment options presented")
        plasma_first = self._prefer_plasma()
        priority = {"plasma": 0, "ethereum": 1} if plasma_first else {"ethereum": 0, "plasma": 1}
        ordered = sorted(opts, key=lambda o: priority.get(o.network, 99))
        chosen = ordered[0]
        return chosen.dict(by_alias=True), chosen.scheme

    def _fetch_router_nonce(self, payer: str) -> int:
        # Off-chain nonce lookup is optional pre-check; router enforces it on-chain.
        # For simplicity, let client start with its local sequential counter of 0.
        # Production: call router.nonces(payer) via eth_call (requires ABI).
        return 0

    def prepare_submission(self, req: PaymentRequired) -> PaymentSubmitted:
        chosen_dict, scheme = self._choose_option(req)
        amount = int(chosen_dict["amount"])
        token = chosen_dict["token"]
        to_addr = chosen_dict["recipient"]
        chain_id = int(chosen_dict["chainId"]) 
        deadline = int(chosen_dict["deadline"]) 

        from_addr = self.client_acct.address

        if scheme == "erc20-gasless-router":
            verifying_contract = chosen_dict["routerContract"]
            nonce = self._fetch_router_nonce(from_addr)
            typed = build_router_typed_data(
                chain_id=chain_id,
                verifying_contract=verifying_contract,
                token=token,
                from_addr=from_addr,
                to_addr=to_addr,
                amount=amount,
                nonce=nonce,
                deadline=deadline,
            )
            v, r, s = sign_typed_data(settings.CLIENT_PRIVATE_KEY, typed)
            chosen = ChosenOption(
                network="ethereum",
                chainId=chain_id,
                token=token,
                amount=str(amount),
                **{"from": from_addr},
                to=to_addr,
                nonce=nonce,
                deadline=deadline,
            )
            sig = Signature(v=v, r=r, s=s)
            return PaymentSubmitted(
                invoiceId=req.invoiceId,
                chosenOption=chosen,
                signature=sig,
                scheme=scheme,
            )

        if scheme == "eip3009-transfer-with-auth":
            # Query token name/version if available; fallback to sensible defaults
            token_contract = self.w3_plasma.eth.contract(
                address=Web3.to_checksum_address(token), abi=[
                    {"inputs": [], "name": "name", "outputs": [{"type": "string"}], "stateMutability": "view", "type": "function"},
                    {"inputs": [], "name": "version", "outputs": [{"type": "string"}], "stateMutability": "view", "type": "function"},
                ]
            )
            try:
                token_name = token_contract.functions.name().call()
            except Exception:
                token_name = "USDTe"
            try:
                token_version = token_contract.functions.version().call()
            except Exception:
                token_version = "1"

            valid_after = _now() - 1
            valid_before = deadline
            nonce32 = chosen_dict.get("nonce") or random_nonce32()

            typed = build_eip3009_typed_data(
                token_name=token_name,
                token_version=token_version,
                chain_id=chain_id,
                verifying_contract=token,
                from_addr=from_addr,
                to_addr=to_addr,
                value=amount,
                valid_after=valid_after,
                valid_before=valid_before,
                nonce32=nonce32,
            )
            v, r, s = sign_typed_data(settings.CLIENT_PRIVATE_KEY, typed)
            chosen = ChosenOption(
                network="plasma",
                chainId=chain_id,
                token=token,
                amount=str(amount),
                **{"from": from_addr},
                to=to_addr,
                nonce=nonce32,
                deadline=valid_before,
            )
            sig = Signature(v=v, r=r, s=s)
            return PaymentSubmitted(
                invoiceId=req.invoiceId,
                chosenOption=chosen,
                signature=sig,
                scheme=scheme,
            )

        raise ValueError(f"Unsupported scheme: {scheme}")


