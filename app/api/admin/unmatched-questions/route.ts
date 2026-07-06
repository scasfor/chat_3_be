import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/apiAuth";
import { listHeaders, parseListQuery } from "@/lib/apiList";

export const GET = withAdminAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const { skip, take, orderBy } = parseListQuery(searchParams);

  const questionLike = searchParams.get("question_like");
  const where = questionLike ? { question: { contains: questionLike } } : {};

  const [questions, total] = await Promise.all([
    prisma.unmatchedQuestion.findMany({
      where,
      skip,
      take,
      orderBy: orderBy && orderBy.length > 0 ? orderBy : [{ createdAt: "desc" as const }],
    }),
    prisma.unmatchedQuestion.count({ where }),
  ]);

  return NextResponse.json(questions, { headers: listHeaders(total) });
});
