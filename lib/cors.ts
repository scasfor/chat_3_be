/**
 * CORS helper for the public /api/chatbot/* endpoints so the chat-bot React
 * widget (hosted on a different origin) can call them directly from the
 * browser, matching the previous Laravel app's public/no-auth behavior.
 */
export function corsHeaders(origin: string | null): Record<string, string> {
  const configured = (process.env.CHATBOT_CORS_ORIGINS ?? "*").trim();

  let allowOrigin = "*";

  if (configured !== "*") {
    const allowedList = configured
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    allowOrigin = origin && allowedList.includes(origin) ? origin : allowedList[0] ?? "null";
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
