"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { EthereumProvider } from "./rpc";

export type WalletState = {
  account: string;
  chainIdHex: string | null;
  connected: boolean;
  chainOk: boolean;
};

type WalletContextValue = WalletState & {
  connect: () => Promise<void>;
  refresh: () => Promise<void>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

const PLASMA_CHAIN_HEX = "0x2611"; // 9745

function getEthereum(): EthereumProvider | undefined {
  const w = globalThis as unknown as { ethereum?: EthereumProvider };
  return w.ethereum;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string>("");
  const [chainIdHex, setChainIdHex] = useState<string | null>(null);

  // On mount, read current accounts and chain without prompting
  useEffect(() => {
    const eth = getEthereum();
    if (!eth) return;
    (async () => {
      try {
        const [cid, accounts] = await Promise.all([
          eth.request({ method: "eth_chainId" }) as Promise<string>,
          eth.request({ method: "eth_accounts" }) as Promise<string[]>,
        ]);
        setChainIdHex(cid);
        setAccount(accounts[0] || "");
      } catch {}
    })();

    // subscribe to wallet events
    const onAccountsChanged = (accs: unknown) => {
      try {
        const a = Array.isArray(accs) ? (accs as string[])[0] || "" : "";
        setAccount(a);
      } catch {}
    };
    const onChainChanged = (cid: unknown) => {
      if (typeof cid === "string") setChainIdHex(cid);
    };
    // @ts-expect-error - event methods exist on injected providers
    eth.on?.("accountsChanged", onAccountsChanged);
    // @ts-expect-error - event methods exist on injected providers
    eth.on?.("chainChanged", onChainChanged);
    return () => {
      // @ts-expect-error - event methods exist on injected providers
      eth.removeListener?.("accountsChanged", onAccountsChanged);
      // @ts-expect-error - event methods exist on injected providers
      eth.removeListener?.("chainChanged", onChainChanged);
    };
  }, []);

  const connect = async () => {
    const eth = getEthereum();
    if (!eth) throw new Error("No injected wallet");
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: PLASMA_CHAIN_HEX }] });
    } catch {
      await eth.request({ method: "wallet_addEthereumChain", params: [{ chainId: PLASMA_CHAIN_HEX, chainName: "Plasma", nativeCurrency: { name: "XPL", symbol: "XPL", decimals: 18 }, rpcUrls: ["https://rpc.plasma.to"], blockExplorerUrls: [] }] });
    }
    const accs = (await eth.request({ method: "eth_requestAccounts" })) as string[];
    setAccount(accs[0] || "");
    setChainIdHex(PLASMA_CHAIN_HEX);
  };

  const refresh = async () => {
    const eth = getEthereum();
    if (!eth) return;
    try {
      const [cid, accounts] = await Promise.all([
        eth.request({ method: "eth_chainId" }) as Promise<string>,
        eth.request({ method: "eth_accounts" }) as Promise<string[]>,
      ]);
      setChainIdHex(cid);
      setAccount(accounts[0] || "");
    } catch {}
  };

  const value = useMemo<WalletContextValue>(() => ({
    account,
    chainIdHex,
    connected: !!account,
    chainOk: chainIdHex?.toLowerCase() === PLASMA_CHAIN_HEX,
    connect,
    refresh,
  }), [account, chainIdHex]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
