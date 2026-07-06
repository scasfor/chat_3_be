import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { matchMessage } from "@/lib/chatbot/intentMatcher";
import { corsHeaders } from "@/lib/cors";

export const runtime = "nodejs";

const bodySchema = z.object({
  message: z.string().min(1).max(1000),
  session_id: z.string().max(255).optional(),
});

/**
 * Port of `ChatbotController::store`. Contract must stay byte-for-byte
 * compatible with the chat-bot widget (see chat-bot/src/api/chatApi.ts).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400, headers });
  }

  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "The given data was invalid.", errors: parsed.error.flatten().fieldErrors },
      { status: 422, headers },
    );
  }

  const sessionId = parsed.data.session_id ?? randomUUID();

  const result = await matchMessage(parsed.data.message, sessionId);

  return NextResponse.json({ ...result, session_id: sessionId }, { headers });
}

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}
