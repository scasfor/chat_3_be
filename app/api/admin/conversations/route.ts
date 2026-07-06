import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/apiAuth";
import { listHeaders, parseListQuery } from "@/lib/apiList";

export const GET = withAdminAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const { skip, take, orderBy } = parseListQuery(searchParams);

  const messageLike = searchParams.get("userMessage_like");
  const sessionId = searchParams.get("sessionId");
  const unmatchedOnly = searchParams.get("unmatchedOnly");

  const where = {
    ...(messageLike ? { userMessage: { contains: messageLike } } : {}),
    ...(sessionId ? { sessionId: { contains: sessionId } } : {}),
    ...(unmatchedOnly === "1" ? { intentId: null } : {}),
  };

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      skip,
      take,
      orderBy: orderBy && orderBy.length > 0 ? orderBy : [{ createdAt: "desc" as const }],
      include: { intent: { select: { id: true, title: true, intentKey: true } } },
    }),
    prisma.conversation.count({ where }),
  ]);

  const data = conversations.map((conversation) => ({
    ...conversation,
    intentTitle: conversation.intent?.title ?? null,
    intentKey: conversation.intent?.intentKey ?? null,
  }));

  return NextResponse.json(data, { headers: listHeaders(total) });
});
