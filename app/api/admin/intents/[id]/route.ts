import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/apiAuth";
import { ensureTitlePhrase } from "@/lib/intents";
import { normalizeText } from "@/lib/chatbot/normalize";

export const GET = withAdminAuth(async (_request: NextRequest, context) => {
  const { id } = await context.params;

  const intent = await prisma.intent.findUnique({
    where: { id: Number(id) },
    include: {
      category: { select: { id: true, name: true } },
      phrases: true,
      keywords: true,
      followUpOf: { include: { followUpIntent: { select: { id: true, title: true } } } },
    },
  });

  if (!intent) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...intent,
    followUpIntentIds: intent.followUpOf.map((f) => f.followUpIntentId),
  });
});

const updateSchema = z.object({
  categoryId: z.number().optional(),
  title: z.string().min(1).optional(),
  intentKey: z.string().min(1).optional(),
  response: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  priority: z.number().optional(),
  resourceLink: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  referenceInOriginalFile: z.string().nullable().optional(),
});

export const PATCH = withAdminAuth(async (request: NextRequest, context) => {
  const { id } = await context.params;
  const parsed = updateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten() }, { status: 422 });
  }

  const intentId = Number(id);
  const { title, ...rest } = parsed.data;

  const intent = await prisma.$transaction(async (tx) => {
    const updated = await tx.intent.update({
      where: { id: intentId },
      data: {
        ...rest,
        ...(title !== undefined ? { title, normalizedTitle: normalizeText(title) } : {}),
      },
    });

    if (title !== undefined) {
      await ensureTitlePhrase(tx, intentId, title);
    }

    return updated;
  });

  return NextResponse.json(intent);
});

export const DELETE = withAdminAuth(async (_request: NextRequest, context) => {
  const { id } = await context.params;
  const intentId = Number(id);

  // SQL Server FollowUpIntent FKs use NoAction (no multi-path cascades), so
  // clear both sides of the join before deleting the intent.
  const intent = await prisma.$transaction(async (tx) => {
    await tx.followUpIntent.deleteMany({
      where: { OR: [{ intentId }, { followUpIntentId: intentId }] },
    });
    return tx.intent.delete({ where: { id: intentId } });
  });

  return NextResponse.json(intent);
});
