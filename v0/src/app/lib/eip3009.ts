import { callContractString } from "./rpc";

export type Eip712TypedData = {
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  domain: { name: string; version: string; chainId: number; verifyingContract: string };
  message: Record<string, unknown>;
};

export function buildTransferWithAuthorization(
  tokenName: string,
  tokenVersion: string,
  chainId: number,
  verifyingContract: string,
  from: string,
  to: string,
  value: string | number,
  validAfter: number,
  validBefore: number,
  nonce: string,
): Eip712TypedData {
  return {
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    primaryType: "TransferWithAuthorization",
    domain: { name: tokenName, version: tokenVersion, chainId, verifyingContract },
    message: { from, to, value, validAfter, validBefore, nonce },
  };
}

export function splitSignature(sigHex: string): { v: number; r: string; s: string } {
  const hex = sigHex.startsWith("0x") ? sigHex.slice(2) : sigHex;
  const r = "0x" + hex.slice(0, 64);
  const s = "0x" + hex.slice(64, 128);
  let v = parseInt(hex.slice(128, 130), 16);
  if (v < 27) v += 27;
  return { v, r, s };
}

export async function fetchTokenNameAndVersion(rpcUrl: string, token: string) {
  // name() -> 0x06fdde03, version() -> 0x54fd4d50
  const NAME_SELECTOR = "0x06fdde03";
  const VERSION_SELECTOR = "0x54fd4d50";
  let name = "USDTe";
  let version = "1";
  try {
    name = await callContractString(rpcUrl, token, NAME_SELECTOR);
  } catch {}
  try {
    version = await callContractString(rpcUrl, token, VERSION_SELECTOR);
  } catch {}
  return { name, version };
}


