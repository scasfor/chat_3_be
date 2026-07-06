import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { corsHeaders } from "@/lib/cors";
import { GENERAL_CONVERSATION_NAME } from "@/lib/chatbot/constants";

export const runtime = "nodejs";

/**
 * Port of `ChatbotController::categories`. Response shape must stay
 * compatible with chat-bot/src/api/categoriesApi.ts: `{ id, name, question }[]`.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const headers = corsHeaders(request.headers.get("origin"));

  const categories = await prisma.category.findMany({
    where: {
      status: 1,
      name: { not: GENERAL_CONVERSATION_NAME },
    },
    orderBy: { sortOrder: "asc" },
    include: {
      intents: {
        where: { isActive: true },
        orderBy: [{ priority: "desc" }, { title: "asc" }],
        select: { title: true },
      },
    },
  });

  const result = categories.map((category) => ({
    id: category.id,
    name: category.name,
    question: category.intents.map((intent) => intent.title),
  }));

  return NextResponse.json(result, { headers });
}

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}
