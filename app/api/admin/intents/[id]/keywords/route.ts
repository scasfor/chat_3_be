import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/apiAuth";

const schema = z.object({
  keywords: z.array(z.object({ keyword: z.string().min(1), weight: z.number() })),
});

/** Replace-all, mirroring the Filament "Keywords" row action. */
export const PUT = withAdminAuth(async (request: NextRequest, context) => {
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ message: "Validation failed" }, { status: 422 });
  }

  const intentId = Number(id);

  await prisma.$transaction([
    prisma.intentKeyword.deleteMany({ where: { intentId } }),
    prisma.intentKeyword.createMany({
      data: parsed.data.keywords.map((kw) => ({ intentId, keyword: kw.keyword, weight: kw.weight })),
    }),
  ]);

  const keywords = await prisma.intentKeyword.findMany({ where: { intentId } });
  return NextResponse.json(keywords);
});
