import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/apiAuth";

export const GET = withAdminAuth(async (_request: NextRequest, context) => {
  const { id } = await context.params;
  const conversation = await prisma.conversation.findUnique({
    where: { id: Number(id) },
    include: { intent: { select: { id: true, title: true } } },
  });
  if (!conversation) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json(conversation);
});

export const DELETE = withAdminAuth(async (_request: NextRequest, context) => {
  const { id } = await context.params;
  const conversation = await prisma.conversation.delete({ where: { id: Number(id) } });
  return NextResponse.json(conversation);
});
