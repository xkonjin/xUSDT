from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional, Dict, Any

from web3 import Web3


NFT_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "string", "name": "tokenUri", "type": "string"},
        ],
        "name": "safeMint",
        "outputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "address", "name": "to", "type": "address"},
            {"indexed": True, "internalType": "uint256", "name": "tokenId", "type": "uint256"},
            {"indexed": False, "internalType": "string", "name": "uri", "type": "string"},
        ],
        "name": "Minted",
        "type": "event",
    },
]


@dataclass
class MintResult:
    success: bool
    tx_hash: Optional[str]
    token_id: Optional[int]
    error: Optional[str]
    receipt: Optional[Dict[str, Any]]


class PlasmaMinter:
    def __init__(self) -> None:
        plasma_rpc = os.environ.get("PLASMA_RPC", "https://rpc.plasma.to")
        self.w3 = Web3(Web3.HTTPProvider(plasma_rpc))
        self.account = self.w3.eth.account.from_key(os.environ["RELAYER_PRIVATE_KEY"])  # raises if missing
        nft_addr = os.environ.get("NFT_CONTRACT")
        if not nft_addr:
            raise RuntimeError("NFT_CONTRACT env var is required to mint")
        self.nft = self.w3.eth.contract(address=Web3.to_checksum_address(nft_addr), abi=NFT_ABI)

    def _wait(self, tx_hash: str) -> Dict[str, Any]:
        r = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        return dict(r)

    def mint(self, *, to: str, token_uri: str) -> MintResult:
        try:
            tx = self.nft.functions.safeMint(Web3.to_checksum_address(to), token_uri).build_transaction(
                {
                    "from": self.account.address,
                    "nonce": self.w3.eth.get_transaction_count(self.account.address),
                }
            )
            signed = self.w3.eth.account.sign_transaction(tx, private_key=self.account.key)
            tx_hash = self.w3.to_hex(self.w3.eth.send_raw_transaction(signed.rawTransaction))
            receipt = self._wait(tx_hash)
            status = receipt.get("status", 0) == 1

            token_id: Optional[int] = None
            if status:
                try:
                    logs = receipt.get("logs", []) or []
                    for lg in logs:
                        if lg.get("address", "").lower() == self.nft.address.lower():
                            # decode with ABI if signature matches Minted(to, tokenId, uri)
                            try:
                                ev = self.nft.events.Minted().processLog(lg)
                                token_id = int(ev["args"]["tokenId"])  # type: ignore[index]
                                break
                            except Exception:
                                continue
                except Exception:
                    token_id = None

            return MintResult(success=status, tx_hash=tx_hash, token_id=token_id, error=None if status else "reverted", receipt=receipt)
        except Exception as e:  # noqa: BLE001
            return MintResult(success=False, tx_hash=None, token_id=None, error=str(e), receipt=None)


