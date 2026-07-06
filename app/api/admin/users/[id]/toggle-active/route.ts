import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/apiAuth";

export const POST = withAdminAuth(async (_request: NextRequest, context) => {
  const { id } = await context.params;
  const user = await prisma.user.findUnique({ where: { id: Number(id) } });
  if (!user) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const updated = await prisma.user.update({
    where: { id: Number(id) },
    data: { isActive: !user.isActive },
    select: { id: true, name: true, email: true, isActive: true },
  });

  return NextResponse.json(updated);
});
