import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/apiAuth";

export const GET = withAdminAuth(async (_request: NextRequest, context) => {
  const { id } = await context.params;
  const category = await prisma.category.findUnique({
    where: { id: Number(id) },
    include: { topics: true },
  });

  if (!category) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ...category, topics: category.topics.map((topic) => topic.topic) });
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.union([z.number(), z.string()]).optional(),
  sortOrder: z.number().optional(),
  topics: z.array(z.string()).optional(),
});

export const PATCH = withAdminAuth(async (request: NextRequest, context) => {
  const { id } = await context.params;
  const parsed = updateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten() }, { status: 422 });
  }

  const { name, status, sortOrder, topics } = parsed.data;
  const categoryId = Number(id);

  const category = await prisma.$transaction(async (tx) => {
    if (topics !== undefined) {
      await tx.categoryTopic.deleteMany({ where: { categoryId } });
    }

    return tx.category.update({
      where: { id: categoryId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(status !== undefined ? { status: Number(status) } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
        ...(topics !== undefined ? { topics: { create: topics.map((topic) => ({ topic })) } } : {}),
      },
      include: { topics: true },
    });
  });

  return NextResponse.json({ ...category, topics: category.topics.map((topic) => topic.topic) });
});

export const DELETE = withAdminAuth(async (_request: NextRequest, context) => {
  const { id } = await context.params;
  const categoryId = Number(id);

  // Clear follow-up join rows for intents in this category before cascade
  // delete (SQL Server FollowUpIntent FKs are NoAction).
  const category = await prisma.$transaction(async (tx) => {
    const intentIds = (
      await tx.intent.findMany({ where: { categoryId }, select: { id: true } })
    ).map((intent) => intent.id);

    if (intentIds.length > 0) {
      await tx.followUpIntent.deleteMany({
        where: {
          OR: [{ intentId: { in: intentIds } }, { followUpIntentId: { in: intentIds } }],
        },
      });
    }

    return tx.category.delete({ where: { id: categoryId } });
  });

  return NextResponse.json(category);
});
