import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/apiAuth";

const reorderSchema = z.object({ orderedIds: z.array(z.number()) });

export const POST = withAdminAuth(async (request: NextRequest) => {
  const parsed = reorderSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ message: "Validation failed" }, { status: 422 });
  }

  await prisma.$transaction(
    parsed.data.orderedIds.map((id, index) =>
      prisma.category.update({ where: { id }, data: { sortOrder: index + 1 } }),
    ),
  );

  return NextResponse.json({ success: true });
});
