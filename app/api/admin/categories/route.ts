import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/apiAuth";
import { listHeaders, parseListQuery } from "@/lib/apiList";

export const GET = withAdminAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const { skip, take, orderBy } = parseListQuery(searchParams);

  const nameLike = searchParams.get("name_like");
  const where = nameLike ? { name: { contains: nameLike } } : {};

  const [categories, total] = await Promise.all([
    prisma.category.findMany({
      where,
      skip,
      take,
      orderBy: orderBy && orderBy.length > 0 ? orderBy : [{ sortOrder: "asc" as const }],
      include: { topics: true, _count: { select: { intents: true } } },
    }),
    prisma.category.count({ where }),
  ]);

  const data = categories.map((category) => ({
    id: category.id,
    name: category.name,
    sortOrder: category.sortOrder,
    status: category.status,
    topics: category.topics.map((topic) => topic.topic),
    topicsCount: category.topics.length,
    intentsCount: category._count.intents,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  }));

  return NextResponse.json(data, { headers: listHeaders(total) });
});

const createSchema = z.object({
  name: z.string().min(1),
  status: z.union([z.number(), z.string()]).optional(),
  topics: z.array(z.string()).optional(),
});

export const POST = withAdminAuth(async (request: NextRequest) => {
  const parsed = createSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten() }, { status: 422 });
  }

  const { name, status, topics } = parsed.data;

  const maxSortOrder = await prisma.category.aggregate({ _max: { sortOrder: true } });

  const category = await prisma.category.create({
    data: {
      name,
      status: status === undefined ? 1 : Number(status),
      sortOrder: (maxSortOrder._max.sortOrder ?? 0) + 1,
      topics: topics && topics.length > 0 ? { create: topics.map((topic) => ({ topic })) } : undefined,
    },
    include: { topics: true },
  });

  return NextResponse.json(
    { ...category, topics: category.topics.map((topic) => topic.topic) },
    { status: 201 },
  );
});
