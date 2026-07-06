import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/apiAuth";

export const GET = withAdminAuth(async (_request: NextRequest, context) => {
  const { id } = await context.params;
  const synonym = await prisma.synonym.findUnique({ where: { id: Number(id) } });
  if (!synonym) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json(synonym);
});

const updateSchema = z.object({ word: z.string().min(1).optional(), synonym: z.string().min(1).optional() });

export const PATCH = withAdminAuth(async (request: NextRequest, context) => {
  const { id } = await context.params;
  const parsed = updateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ message: "Validation failed" }, { status: 422 });
  }

  const synonym = await prisma.synonym.update({
    where: { id: Number(id) },
    data: {
      ...(parsed.data.word !== undefined ? { word: parsed.data.word.toLowerCase().trim() } : {}),
      ...(parsed.data.synonym !== undefined ? { synonym: parsed.data.synonym.toLowerCase().trim() } : {}),
    },
  });

  return NextResponse.json(synonym);
});

export const DELETE = withAdminAuth(async (_request: NextRequest, context) => {
  const { id } = await context.params;
  const synonym = await prisma.synonym.delete({ where: { id: Number(id) } });
  return NextResponse.json(synonym);
});
