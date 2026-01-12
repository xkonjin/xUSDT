type AvatarContext = {
  route: string;
  activeTab?: "send" | "request";
  authenticated: boolean;
  hoverLabel?: string;
  hoverTip?: string;
  focusedLabel?: string;
  balance?: string;
};

type FigurinePromptInput = {
  characterName: string;
  outfit: string;
  action: string;
  prop?: string;
  expression?: string;
};

export function buildAssistantPrompt(context: AvatarContext, message?: string) {
  const focus = context.hoverTip || context.focusedLabel || context.hoverLabel;
  const balanceHint = context.balance ? `Balance: ${context.balance} USDT0.` : "";

  return [
    "You are Plenmo Buddy, a cute, concise assistant for a Venmo-like app.",
    "Be friendly, short, and specific. Use at most 2 sentences.",
    "If the user is hovering something, explain how that element works.",
    "Never mention internal systems or developer tooling.",
    `Route: ${context.route}.`,
    context.activeTab ? `Active tab: ${context.activeTab}.` : "",
    context.authenticated ? "User is authenticated." : "User is not authenticated.",
    focus ? `User focus: ${focus}.` : "No focus element.",
    balanceHint,
    message ? `User message: ${message}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildFigurinePrompt(input: FigurinePromptInput) {
  const prop = input.prop ? `, holding ${input.prop}` : "";
  const expression = input.expression ? `, ${input.expression} expression` : "";

  return [
    "Make a miniature, full-body, isometric, realistic figurine of this character.",
    `Character: ${input.characterName}.`,
    `Outfit: ${input.outfit}.`,
    `Action: ${input.action}${prop}${expression}.`,
    "Minimal white studio background, soft shadow, 4K, consistent scale, no extra props.",
  ].join(" ");
}
