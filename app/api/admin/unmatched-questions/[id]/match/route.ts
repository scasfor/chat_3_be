import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/apiAuth";
import { normalizeText } from "@/lib/chatbot/normalize";

const schema = z.object({ intentId: z.number() });

/** Port of the "Match to Intent" row action on UnmatchedQuestionResource. */
export const POST = withAdminAuth(async (request: NextRequest, context) => {
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ message: "Validation failed" }, { status: 422 });
  }

  const question = await prisma.unmatchedQuestion.findUnique({ where: { id: Number(id) } });
  if (!question) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const intent = await prisma.intent.findUnique({ where: { id: parsed.data.intentId } });
  if (!intent) {
    return NextResponse.json({ message: "Intent not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.intentPhrase.create({
      data: {
        intentId: intent.id,
        phrase: question.question,
        normalizedPhrase: normalizeText(question.question),
      },
    }),
    prisma.unmatchedQuestion.delete({ where: { id: question.id } }),
  ]);

  return NextResponse.json({ success: true, intentTitle: intent.title });
});
