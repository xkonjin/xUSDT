(function () {
  "use strict";

  // Utility: left-pad a hex (no 0x) to 32 bytes
  function pad32(hexNo0x) {
    return (hexNo0x || "").replace(/^0x/, "").padStart(64, "0");
  }

  // Utility: decimal string to 6dp atomic bigint (USD₮ style)
  function toAtomic6(amountDecimal) {
    var s = String(amountDecimal || "").trim();
    if (!s) return 0n;
    var parts = s.split(".");
    var i = parts[0] || "0";
    var f = (parts[1] || "").slice(0, 6);
    while (f.length < 6) f += "0";
    var digits = (i + f).replace(/^0+(?=\d)/, "");
    return BigInt(digits || "0");
  }

  // Utility: wait for tx receipt success with timeout
  async function waitForReceipt(eth, txHash, timeoutMs) {
    var start = Date.now();
    for (;;) {
      var rcpt = await eth.request({ method: "eth_getTransactionReceipt", params: [txHash] });
      if (rcpt && rcpt.status === "0x1") return rcpt;
      if (rcpt && rcpt.status === "0x0") throw new Error("Transaction failed");
      if (Date.now() - start > (timeoutMs || 60000)) throw new Error("Timeout waiting for approval");
      await new Promise(function (r) { setTimeout(r, 1000); });
    }
  }

  // Ensure wallet is on given chain id (decimal). If unknown, try to add using rpcUrl.
  async function ensureChain(eth, chainIdDec, rpcUrl) {
    var targetHex = "0x" + Number(chainIdDec).toString(16);
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: targetHex }] });
    } catch (e) {
      var code = e && typeof e === "object" ? e.code : undefined;
      if (code === 4902 && rpcUrl) {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [{ chainId: targetHex, chainName: "Plasma", rpcUrls: [rpcUrl], nativeCurrency: { name: "XPL", symbol: "XPL", decimals: 18 } }],
        });
      } else {
        throw e;
      }
    }
  }

  // Derive server base URL
  function resolveServerBase(element) {
    var dataset = (element && element.dataset) || {};
    if (dataset.server) return dataset.server.replace(/\/$/, "");
    var script = document.currentScript;
    if (script && script.dataset && script.dataset.server) return script.dataset.server.replace(/\/$/, "");
    var src = (script && script.src) || "";
    if (src) { try { return new URL(src).origin; } catch (_) { /* noop */ } }
    return window.location.origin;
  }

  async function handleClick(el, opts) {
    var eth = window.ethereum;
    if (!eth) throw new Error("No wallet available");

    var server = resolveServerBase(el);
    var amountDec = (opts && opts.amountDecimal) || el.dataset.amount || null;
    var amtSelector = el.dataset.amountSelector || (opts ? opts.amountSelector : null);
    if (!amountDec && amtSelector) {
      var input = document.querySelector(amtSelector);
      if (input) amountDec = String(input.value || "");
    }
    if (!amountDec) throw new Error("Missing amount. Provide data-amount or data-amount-selector.");

    var accounts = await eth.request({ method: "eth_requestAccounts" });
    var buyer = accounts && accounts[0];
    if (!buyer) throw new Error("No account selected");

    // Ask server for typed data (also returns chainId, token, router in payload)
    var chRes = await fetch(server + "/router/checkout_total", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ buyer: buyer, amountDecimal: amountDec }),
    });
    if (!chRes.ok) throw new Error(await chRes.text());
    var ch = await chRes.json();

    // Ensure chain
    var rpcHint = el.dataset.rpc || (document.currentScript && document.currentScript.dataset && document.currentScript.dataset.rpc) || "https://rpc.plasma.to";
    await ensureChain(eth, ch.domain.chainId, rpcHint);

    // Allowance check
    var token = ch.message.token;
    var router = ch.domain.verifyingContract;
    var allowanceData = "0xdd62ed3e" + pad32(buyer.replace(/^0x/, "").toLowerCase()) + pad32(String(router).replace(/^0x/, "").toLowerCase());
    var allowanceHex = await eth.request({ method: "eth_call", params: [{ to: token, data: allowanceData }, "latest"] });
    if (BigInt(allowanceHex) < BigInt(ch.amount)) {
      var approveData = "0x095ea7b3" + pad32(String(router).replace(/^0x/, "")) + pad32(BigInt(ch.amount).toString(16));
      var approveTx = await eth.request({ method: "eth_sendTransaction", params: [{ from: buyer, to: token, value: "0x0", data: approveData }] });
      await waitForReceipt(eth, approveTx, 90000);
    }

    // Sign EIP-712 typed data
    var signature = await eth.request({ method: "eth_signTypedData_v4", params: [buyer, JSON.stringify({ domain: ch.domain, types: ch.types, primaryType: "Transfer", message: ch.message })] });

    // Relay on server
    var relayRes = await fetch(server + "/router/relay_total", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ buyer: buyer, amount: ch.amount, deadline: ch.deadline, signature: signature }),
    });
    if (!relayRes.ok) throw new Error(await relayRes.text());
    var relayed = await relayRes.json();

    var ev = new CustomEvent("plasma:paid", { detail: relayed });
    el.dispatchEvent(ev);
    return relayed;
  }

  function setBusy(el, busy) {
    if (!el) return;
    if (busy) {
      el.setAttribute("disabled", "true");
      el.dataset._label = el.textContent || el.value || "";
      if (el.tagName === "BUTTON") el.textContent = "Processing…";
    } else {
      el.removeAttribute("disabled");
      var prev = el.dataset._label || "Pay with Plasma";
      if (el.tagName === "BUTTON") el.textContent = prev;
    }
  }

  async function clickWrapper(el, opts) {
    try {
      setBusy(el, true);
      var result = await handleClick(el, opts || {});
      return result;
    } catch (e) {
      var ev = new CustomEvent("plasma:error", { detail: String(e && e.message ? e.message : e) });
      el.dispatchEvent(ev);
      alert(e && e.message ? e.message : String(e));
      throw e;
    } finally {
      setBusy(el, false);
    }
  }

  function attach(target, opts) {
    var el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) throw new Error("Target not found");
    if (el._plasmaAttached) return;
    el._plasmaAttached = true;
    el.addEventListener("click", function () { clickWrapper(el, opts); });
  }

  // Auto-attach to elements with data-plasma-pay
  function autoAttach() {
    var nodes = document.querySelectorAll("[data-plasma-pay]");
    nodes.forEach(function (el) {
      if (!el._plasmaAttached) attach(el, {});
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoAttach);
  } else {
    autoAttach();
  }

  // Public API
  window.PlasmaCheckout = {
    attach: attach,
    pay: function (opts) { return clickWrapper(document.createElement("button"), opts); },
    utils: { toAtomic6: toAtomic6 }
  };
})();


