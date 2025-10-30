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
    build_channel_receipt_typed_data,
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
        # Prefer Plasma only when explicitly enabled and configured
        if not settings.PREFER_PLASMA:
            return False
        try:
            addr = Web3.to_checksum_address(settings.USDT0_ADDRESS)
        except Exception:
            return False
        return settings.PLASMA_CHAIN_ID == 9745 and addr != Web3.to_checksum_address("0x0000000000000000000000000000000000000000")

    def _choose_option(self, req: PaymentRequired) -> Tuple[dict, str]:
        opts = req.paymentOptions
        if not opts:
            raise ValueError("No payment options presented")
        plasma_first = self._prefer_plasma()
        priority = {"plasma": 0, "ethereum": 1} if plasma_first else {"ethereum": 0, "plasma": 1}
        ordered = sorted(opts, key=lambda o: priority.get(o.network, 99))
        chosen = ordered[0]
        return chosen.dict(by_alias=True), chosen.scheme

    def prepare_channel_receipt(self, req: PaymentRequired) -> dict:
        """Build and sign a channel receipt when channel-first is recommended.

        Returns a dict suitable for POST /channel/receipt.
        """
        # Choose the first option (likely Plasma) as the target merchant + amount
        chosen_dict, _scheme = self._choose_option(req)
        amount = int(chosen_dict["amount"])  # atomic units
        merchant = chosen_dict["recipient"]
        chain_id = int(chosen_dict["chainId"]) or settings.PLASMA_CHAIN_ID
        from_addr = self.client_acct.address

        # Build EIP-712 receipt typed data for the configured channel
        if not getattr(settings, "CHANNEL_ADDRESS", None):
            raise RuntimeError("CHANNEL_ADDRESS not configured")

        # Derive a deterministic serviceId from invoiceId (keccak256)
        service_id = Web3.to_hex(Web3.keccak(text=f"svc:{req.invoiceId}"))
        nonce32 = random_nonce32()
        expiry = _now() + 600

        typed = build_channel_receipt_typed_data(
            chain_id=chain_id,
            verifying_contract=settings.CHANNEL_ADDRESS,
            payer=from_addr,
            merchant=merchant,
            amount=amount,
            service_id_hex32=service_id,
            nonce32=nonce32,
            expiry=expiry,
        )
        v, r, s = sign_typed_data(settings.CLIENT_PRIVATE_KEY, typed)
        # Serialize to 0x-sig bytes (r||s||v)
        r_hex = r[2:] if r.startswith("0x") else r
        s_hex = s[2:] if s.startswith("0x") else s
        v_hex = f"{v:02x}"
        sig_bytes_hex = "0x" + r_hex.rjust(64, "0") + s_hex.rjust(64, "0") + v_hex

        return {
            "payer": from_addr,
            "merchant": merchant,
            "amount": amount,
            "serviceId": service_id,
            "nonce": nonce32,
            "expiry": expiry,
            "signature": sig_bytes_hex,
            "channel": settings.CHANNEL_ADDRESS,
            "chainId": chain_id,
        }

    def _fetch_router_nonce(self, payer: str, router: str) -> int:
        # Query PaymentRouter.nonces(payer); fallback to 0 if router is not deployed/reachable.
        try:
            abi = [
                {
                    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
                    "name": "nonces",
                    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                    "stateMutability": "view",
                    "type": "function",
                }
            ]
            c = self.w3_eth.eth.contract(address=Web3.to_checksum_address(router), abi=abi)
            return int(c.functions.nonces(Web3.to_checksum_address(payer)).call())
        except Exception:
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
            nonce = self._fetch_router_nonce(from_addr, verifying_contract)
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
            # Prefer on-chain token name/version; fallback to configured overrides
            token_contract = self.w3_plasma.eth.contract(
                address=Web3.to_checksum_address(token),
                abi=[
                    {"inputs": [], "name": "name", "outputs": [{"type": "string"}], "stateMutability": "view", "type": "function"},
                    {"inputs": [], "name": "version", "outputs": [{"type": "string"}], "stateMutability": "view", "type": "function"},
                ],
            )
            try:
                token_name = token_contract.functions.name().call()
            except Exception:
                token_name = settings.USDT0_NAME
            try:
                token_version = token_contract.functions.version().call()
            except Exception:
                token_version = settings.USDT0_VERSION

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
                validAfter=valid_after,
                validBefore=valid_before,
            )
            sig = Signature(v=v, r=r, s=s)
            return PaymentSubmitted(
                invoiceId=req.invoiceId,
                chosenOption=chosen,
                signature=sig,
                scheme=scheme,
            )

        if scheme == "eip3009-receive":
            # Router-based atomic pay+mint path
            # Sign ReceiveWithAuthorization to the router (so router can receive),
            # then router forwards to treasury and mints the NFT.
            router_addr = chosen_dict.get("routerContract")
            treasury_addr = chosen_dict.get("recipient")
            to_nft = from_addr  # default to payer
            # Use on-chain token name/version where possible
            token_contract = self.w3_plasma.eth.contract(
                address=Web3.to_checksum_address(token),
                abi=[
                    {"inputs": [], "name": "name", "outputs": [{"type": "string"}], "stateMutability": "view", "type": "function"},
                    {"inputs": [], "name": "version", "outputs": [{"type": "string"}], "stateMutability": "view", "type": "function"},
                ],
            )
            try:
                token_name = token_contract.functions.name().call()
            except Exception:
                token_name = settings.USDT0_NAME
            try:
                token_version = token_contract.functions.version().call()
            except Exception:
                token_version = settings.USDT0_VERSION

            valid_after = _now() - 1
            valid_before = deadline
            nonce32 = chosen_dict.get("nonce") or random_nonce32()

            from .crypto import build_eip3009_receive_typed_data  # local import to avoid cycles
            typed = build_eip3009_receive_typed_data(
                token_name=token_name,
                token_version=token_version,
                chain_id=chain_id,
                verifying_contract=token,
                from_addr=from_addr,
                to_addr=router_addr,
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
                to=router_addr,  # destination contract for submission
                nonce=nonce32,
                deadline=valid_before,
                validAfter=valid_after,
                validBefore=valid_before,
                toNFT=from_addr,
            )
            sig = Signature(v=v, r=r, s=s)
            return PaymentSubmitted(
                invoiceId=req.invoiceId,
                chosenOption=chosen,
                signature=sig,
                scheme=scheme,
            )

        raise ValueError(f"Unsupported scheme: {scheme}")


