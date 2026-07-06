import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/apiAuth";

const schema = z.object({ followUpIntentIds: z.array(z.number()) });

/** Sync, mirroring `$record->followUpIntents()->sync(...)`. */
export const PUT = withAdminAuth(async (request: NextRequest, context) => {
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ message: "Validation failed" }, { status: 422 });
  }

  const intentId = Number(id);
  const ids = parsed.data.followUpIntentIds.filter((followUpId) => followUpId !== intentId);

  await prisma.$transaction([
    prisma.followUpIntent.deleteMany({ where: { intentId } }),
    prisma.followUpIntent.createMany({
      data: ids.map((followUpIntentId) => ({ intentId, followUpIntentId })),
    }),
  ]);

  return NextResponse.json({ success: true, followUpIntentIds: ids });
});
