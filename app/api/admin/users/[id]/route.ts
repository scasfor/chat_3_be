import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/apiAuth";

const selectFields = { id: true, name: true, email: true, isActive: true, createdAt: true, updatedAt: true } as const;

export const GET = withAdminAuth(async (_request: NextRequest, context) => {
  const { id } = await context.params;
  const user = await prisma.user.findUnique({ where: { id: Number(id) }, select: selectFields });
  if (!user) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json(user);
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
});

export const PATCH = withAdminAuth(async (request: NextRequest, context) => {
  const { id } = await context.params;
  const parsed = updateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten() }, { status: 422 });
  }

  const user = await prisma.user.update({
    where: { id: Number(id) },
    data: parsed.data,
    select: selectFields,
  });

  return NextResponse.json(user);
});

export const DELETE = withAdminAuth(async (_request: NextRequest, context) => {
  const { id } = await context.params;
  const user = await prisma.user.delete({ where: { id: Number(id) }, select: selectFields });
  return NextResponse.json(user);
});
