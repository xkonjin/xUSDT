export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: unknown[];
};

export async function callRpc<T = unknown>(rpcUrl: string, method: string, params: unknown[] = []): Promise<T> {
  const body: JsonRpcRequest = { jsonrpc: "2.0", id: Date.now(), method, params };
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "RPC error");
  return json.result as T;
}

export async function waitForReceipt(rpcUrl: string, txHash: string, polls = 60, intervalMs = 1500) {
  for (let i = 0; i < polls; i++) {
    const receipt = await callRpc<unknown>(rpcUrl, "eth_getTransactionReceipt", [txHash]);
    if (receipt) return receipt;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Timed out waiting for receipt");
}

export async function callContractString(rpcUrl: string, to: string, data: string): Promise<string> {
  const result: string = await callRpc(rpcUrl, "eth_call", [
    { to, data },
    "latest",
  ]);
  if (!result || result === "0x") throw new Error("Empty result");
  // Strip length prefix for strings, decode as UTF-8 when possible
  try {
    // result is ABI-encoded string: first 32 bytes offset, then length, then data
    const hex = result.startsWith("0x") ? result.slice(2) : result;
    const lenHex = hex.slice(64, 128);
    const len = parseInt(lenHex, 16);
    const dataHex = hex.slice(128, 128 + len * 2);
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = parseInt(dataHex.slice(i * 2, i * 2 + 2), 16);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return result;
  }
}


