"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type AvatarContext = {
  route: string;
  activeTab?: "send" | "request";
  authenticated: boolean;
  hoverLabel?: string;
  hoverTip?: string;
  focusedLabel?: string;
  balance?: string;
};

type AvatarAssistantProps = {
  activeTab?: "send" | "request";
  authenticated: boolean;
  balance?: string;
};

const DEFAULT_MESSAGE = "Hey! Hover or focus something and I will help.";

function getElementLabel(target: HTMLElement | null) {
  if (!target) return {} as { hoverLabel?: string; hoverTip?: string };

  const tipEl = target.closest<HTMLElement>("[data-avatar-tip]");
  const hoverTip = tipEl?.getAttribute("data-avatar-tip") || undefined;
  const ariaLabel = target.getAttribute("aria-label") || undefined;
  const textContent = target.textContent?.trim();
  const hoverLabel = ariaLabel || textContent || undefined;

  return { hoverLabel, hoverTip };
}

function parseSseText(chunk: string) {
  return chunk
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s*/, ""))
    .filter(Boolean);
}

export function AvatarAssistant({ activeTab, authenticated, balance }: AvatarAssistantProps) {
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const lastContextRef = useRef<string>("");
  const requestControllerRef = useRef<AbortController | null>(null);

  const sendContext = useCallback(async (context: AvatarContext, userMessage?: string) => {
    const contextKey = JSON.stringify({ ...context, userMessage: userMessage || "" });
    if (contextKey === lastContextRef.current) return;
    lastContextRef.current = contextKey;

    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/avatar/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, message: userMessage || null }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        setMessage("Sorry, I could not reach the assistant just now.");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = parseSseText(buffer);
        if (parts.length > 0) {
          parts.forEach((part) => {
            if (part === "[DONE]") return;
            setMessage((prev) => prev + part);
          });
          buffer = "";
        }
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setMessage("Sorry, I hit a hiccup. Try again in a moment.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const baseContext: AvatarContext = {
      route: window.location.pathname,
      activeTab,
      authenticated,
      balance,
    };

    const handleHover = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const { hoverLabel, hoverTip } = getElementLabel(target);
      if (!hoverLabel && !hoverTip) return;

      void sendContext({ ...baseContext, hoverLabel, hoverTip });
    };

    const handleFocus = () => {
      const target = document.activeElement as HTMLElement | null;
      const { hoverLabel, hoverTip } = getElementLabel(target);
      if (!hoverLabel && !hoverTip) return;

      void sendContext({ ...baseContext, focusedLabel: hoverLabel, hoverTip });
    };

    const handleIdle = () => {
      void sendContext({ ...baseContext });
    };

    const idleTimer = window.setTimeout(handleIdle, 900);

    document.addEventListener("mouseover", handleHover);
    document.addEventListener("focusin", handleFocus);

    return () => {
      window.clearTimeout(idleTimer);
      document.removeEventListener("mouseover", handleHover);
      document.removeEventListener("focusin", handleFocus);
    };
  }, [activeTab, authenticated, balance, sendContext]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;

    const context: AvatarContext = {
      route: window.location.pathname,
      activeTab,
      authenticated,
      balance,
    };

    const userMessage = input.trim();
    setInput("");
    await sendContext(context, userMessage);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-xs text-white">
      <div className="rounded-3xl border border-white/15 bg-black/70 backdrop-blur-xl shadow-xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[rgb(0,212,255)] to-purple-500 animate-avatar-bob" />
          <div>
            <p className="text-sm font-semibold">Plenmo Buddy</p>
            <p className="text-xs text-white/60">Always here to help</p>
          </div>
        </div>
        <div className="text-sm text-white/80 min-h-[56px]">
          {loading && !message ? "Thinking..." : message || DEFAULT_MESSAGE}
        </div>
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask me anything"
            className="flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-[rgb(0,212,255)]"
            aria-label="Chat with Plenmo Buddy"
          />
          <button
            type="submit"
            className="rounded-xl bg-[rgb(0,212,255)]/20 px-3 py-2 text-xs font-semibold text-[rgb(0,212,255)] hover:bg-[rgb(0,212,255)]/30"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
