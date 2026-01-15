const DEFAULT_TEXT_MODEL = "gemini-2.0-flash";
const DEFAULT_IMAGE_MODEL = "nano-banana-pro";

export function getGeminiConfig() {
  return {
    apiKey: process.env.GEMINI_API_KEY || "",
    textModel: process.env.GEMINI_TEXT_MODEL || DEFAULT_TEXT_MODEL,
    imageModel: process.env.GEMINI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL,
    baseUrl: process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta",
  } as const;
}

export async function generateGeminiText(prompt: string) {
  const { apiKey, textModel, baseUrl } = getGeminiConfig();

  if (!apiKey) {
    return "I need a Gemini API key set as GEMINI_API_KEY to answer fully.";
  }

  const response = await fetch(
    `${baseUrl}/models/${textModel}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          topP: 0.9,
          maxOutputTokens: 180,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "I was not able to generate a response yet.";

  return text as string;
}

export async function generateGeminiImage(prompt: string) {
  const { apiKey, imageModel, baseUrl } = getGeminiConfig();

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required for image generation.");
  }

  const response = await fetch(
    `${baseUrl}/models/${imageModel}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini image request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const part = data?.candidates?.[0]?.content?.parts?.[0];
  const inlineData = part?.inlineData || null;

  if (!inlineData?.data || !inlineData?.mimeType) {
    throw new Error("No image data returned from Gemini.");
  }

  return {
    base64: inlineData.data as string,
    mimeType: inlineData.mimeType as string,
  };
}
