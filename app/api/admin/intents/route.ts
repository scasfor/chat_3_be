import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/apiAuth";
import { listHeaders, parseListQuery } from "@/lib/apiList";
import { ensureTitlePhrase } from "@/lib/intents";
import { normalizeText } from "@/lib/chatbot/normalize";

export const GET = withAdminAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const { skip, take, orderBy } = parseListQuery(searchParams);

  const titleLike = searchParams.get("title_like");
  const categoryId = searchParams.get("categoryId");

  const where = {
    ...(titleLike ? { title: { contains: titleLike } } : {}),
    ...(categoryId ? { categoryId: Number(categoryId) } : {}),
  };

  const [intents, total] = await Promise.all([
    prisma.intent.findMany({
      where,
      skip,
      take,
      orderBy: orderBy && orderBy.length > 0 ? orderBy : [{ createdAt: "desc" as const }],
      include: { category: { select: { id: true, name: true } }, _count: { select: { phrases: true, keywords: true } } },
    }),
    prisma.intent.count({ where }),
  ]);

  const data = intents.map((intent) => ({
    ...intent,
    categoryName: intent.category.name,
    phrasesCount: intent._count.phrases,
    keywordsCount: intent._count.keywords,
  }));

  return NextResponse.json(data, { headers: listHeaders(total) });
});

const createSchema = z.object({
  categoryId: z.number(),
  title: z.string().min(1),
  intentKey: z.string().min(1),
  response: z.string().min(1),
  isActive: z.boolean().optional(),
  priority: z.number().optional(),
  resourceLink: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  referenceInOriginalFile: z.string().nullable().optional(),
});

export const POST = withAdminAuth(async (request: NextRequest) => {
  const parsed = createSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten() }, { status: 422 });
  }

  const { title, ...rest } = parsed.data;

  const intent = await prisma.$transaction(async (tx) => {
    const created = await tx.intent.create({
      data: {
        ...rest,
        title,
        normalizedTitle: normalizeText(title),
        priority: rest.priority ?? 1,
        isActive: rest.isActive ?? true,
      },
    });
    await ensureTitlePhrase(tx, created.id, title);
    return created;
  });

  return NextResponse.json(intent, { status: 201 });
});
