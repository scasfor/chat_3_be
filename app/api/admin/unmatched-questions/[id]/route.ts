import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/apiAuth";

export const GET = withAdminAuth(async (_request: NextRequest, context) => {
  const { id } = await context.params;
  const question = await prisma.unmatchedQuestion.findUnique({ where: { id: Number(id) } });
  if (!question) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json(question);
});

export const DELETE = withAdminAuth(async (_request: NextRequest, context) => {
  const { id } = await context.params;
  const question = await prisma.unmatchedQuestion.delete({ where: { id: Number(id) } });
  return NextResponse.json(question);
});
