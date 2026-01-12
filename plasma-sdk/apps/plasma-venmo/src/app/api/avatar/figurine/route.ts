import { buildFigurinePrompt } from "@/lib/avatar/prompts";
import { generateGeminiImage } from "@/lib/avatar/gemini";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = buildFigurinePrompt({
      characterName: body?.characterName || "Plenmo Buddy",
      outfit: body?.outfit || "modern fintech hoodie and sneakers",
      action: body?.action || "waving",
      prop: body?.prop,
      expression: body?.expression || "smiling",
    });

    const image = await generateGeminiImage(prompt);

    return Response.json({
      prompt,
      image,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image generation failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
