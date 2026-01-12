import { buildAssistantPrompt } from "@/lib/avatar/prompts";
import { generateGeminiText } from "@/lib/avatar/gemini";

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
          const text = await generateGeminiText(prompt);

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
