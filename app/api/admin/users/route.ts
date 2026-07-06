import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/apiAuth";
import { listHeaders, parseListQuery } from "@/lib/apiList";

export const GET = withAdminAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const { skip, take, orderBy } = parseListQuery(searchParams);

  const nameLike = searchParams.get("name_like");
  const where = nameLike
    ? { OR: [{ name: { contains: nameLike } }, { email: { contains: nameLike } }] }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: orderBy && orderBy.length > 0 ? orderBy : [{ createdAt: "desc" as const }],
      select: { id: true, name: true, email: true, isActive: true, createdAt: true, updatedAt: true },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json(users, { headers: listHeaders(total) });
});

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export const POST = withAdminAuth(async (request: NextRequest) => {
  const parsed = createSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten() }, { status: 422 });
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 10);

  const user = await prisma.user.create({
    data: { name: parsed.data.name, email: parsed.data.email, password: hashedPassword },
    select: { id: true, name: true, email: true, isActive: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json(user, { status: 201 });
});
