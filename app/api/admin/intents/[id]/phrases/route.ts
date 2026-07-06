import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/apiAuth";
import { normalizeText } from "@/lib/chatbot/normalize";

const schema = z.object({ phrases: z.array(z.string().min(1)) });

/** Replace-all, mirroring the Filament "Phrases" row action. */
export const PUT = withAdminAuth(async (request: NextRequest, context) => {
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ message: "Validation failed" }, { status: 422 });
  }

  const intentId = Number(id);

  await prisma.$transaction([
    prisma.intentPhrase.deleteMany({ where: { intentId } }),
    prisma.intentPhrase.createMany({
      data: parsed.data.phrases.map((phrase) => ({
        intentId,
        phrase,
        normalizedPhrase: normalizeText(phrase),
      })),
    }),
  ]);

  const phrases = await prisma.intentPhrase.findMany({ where: { intentId } });
  return NextResponse.json(phrases);
});
