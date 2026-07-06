import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/apiAuth";

export const POST = withAdminAuth(async (_request: NextRequest, context) => {
  const { id } = await context.params;
  const category = await prisma.category.findUnique({ where: { id: Number(id) } });

  if (!category) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const updated = await prisma.category.update({
    where: { id: Number(id) },
    data: { status: category.status ? 0 : 1 },
  });

  return NextResponse.json(updated);
});
