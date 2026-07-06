import { GEMINI_API_KEY_SETTING, getSetting } from "@/lib/settings";

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export type GeneratedIntentData = {
  phrases: string[];
  keywords: { keyword: string; weight: number }[];
};

/** Direct port of `app/Services/GeminiService.php`. */
export async function generateIntentData(question: string, response: string): Promise<GeneratedIntentData> {
  const apiKey = (await getSetting(GEMINI_API_KEY_SETTING)) || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Please set it in Settings.");
  }

  const prompt = `You are configuring a rule-based chatbot. Given the following intent:

Question: ${question}
Response: ${response}

Generate ONLY a JSON object (no markdown, no explanation) with:
1. "phrases": 5-8 natural language variations of the question (array of strings)
2. "keywords": 5-10 important single words or short terms with weight 1-10, where 10 is most important (array of objects)

Example format:
{"phrases":["how to login","how do i sign in","sign in help"],"keywords":[{"keyword":"login","weight":9},{"keyword":"password","weight":6}]}`;

  const httpResponse = await fetch(`${API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!httpResponse.ok) {
    const body = await httpResponse.text();
    throw new Error(`Gemini API request failed with status ${httpResponse.status}: ${body}`);
  }

  const json = await httpResponse.json();
  let text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  text = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/m, "");

  let data: unknown;
  try {
    data = JSON.parse(text.trim());
  } catch {
    throw new Error(`Unexpected response format from Gemini API: ${text}`);
  }

  if (typeof data !== "object" || data === null || !("phrases" in data) || !("keywords" in data)) {
    throw new Error(`Unexpected response format from Gemini API: ${text}`);
  }

  return data as GeneratedIntentData;
}
