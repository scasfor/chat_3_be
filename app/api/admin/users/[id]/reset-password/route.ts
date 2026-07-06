import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/apiAuth";

const schema = z.object({ password: z.string().min(8) });

export const POST = withAdminAuth(async (request: NextRequest, context) => {
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ message: "Password must be at least 8 characters." }, { status: 422 });
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 10);

  await prisma.user.update({ where: { id: Number(id) }, data: { password: hashedPassword } });

  return NextResponse.json({ success: true });
});
