import { buildAssistantPrompt } from "@/lib/avatar/prompts";
import { generateGeminiText } from "@/lib/avatar/gemini";

type AvatarContext = {
  route?: string;
  activeTab?: "send" | "request";
  authenticated?: boolean;
  hoverLabel?: string;
  hoverTip?: string;
  focusedLabel?: string;
  balance?: string;
};

const buildLocalAssistantResponse = (context: AvatarContext, message?: string) => {
  const focus = context.hoverTip || context.focusedLabel || context.hoverLabel;
  if (message) {
    return "Try sending to an email, phone, or wallet address. I can also help you request money or check your balance.";
  }
  if (focus) {
    return context.hoverTip || `This controls ${focus}.`;
  }
  if (context.authenticated === false) {
    return "Connect your wallet to send or request money.";
  }
  if (context.activeTab === "request") {
    return "Enter a recipient and amount, then send a request.";
  }
  return "Enter a recipient and amount to send USDT0.";
};

export async function POST(request: Request) {
  const body = await request.json();
  const context = body?.context || {};
  const message = typeof body?.message === "string" ? body.message : undefined;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      const close = () => {
        send("[DONE]");
        controller.close();
      };

      (async () => {
        try {
          const prompt = buildAssistantPrompt(context, message);
          const text = process.env.GEMINI_API_KEY
            ? await generateGeminiText(prompt)
            : buildLocalAssistantResponse(context, message);

          for (const chunk of text.split(/(\s+)/)) {
            if (!chunk) continue;
            send(chunk);
          }
        } catch (error) {
          const fallback =
            "I can help with sending, requesting, or adding funds. Try hovering a button.";
          send(fallback);
        } finally {
          close();
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
