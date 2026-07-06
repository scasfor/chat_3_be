import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/apiAuth";
import { listHeaders, parseListQuery } from "@/lib/apiList";

export const GET = withAdminAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const { skip, take, orderBy } = parseListQuery(searchParams);

  const wordLike = searchParams.get("word_like");
  const where = wordLike
    ? { OR: [{ word: { contains: wordLike } }, { synonym: { contains: wordLike } }] }
    : {};

  const [synonyms, total] = await Promise.all([
    prisma.synonym.findMany({
      where,
      skip,
      take,
      orderBy: orderBy && orderBy.length > 0 ? orderBy : [{ word: "asc" as const }],
    }),
    prisma.synonym.count({ where }),
  ]);

  return NextResponse.json(synonyms, { headers: listHeaders(total) });
});

const createSchema = z.object({ word: z.string().min(1), synonym: z.string().min(1) });

export const POST = withAdminAuth(async (request: NextRequest) => {
  const parsed = createSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten() }, { status: 422 });
  }

  const synonym = await prisma.synonym.create({
    data: { word: parsed.data.word.toLowerCase().trim(), synonym: parsed.data.synonym.toLowerCase().trim() },
  });

  return NextResponse.json(synonym, { status: 201 });
});
