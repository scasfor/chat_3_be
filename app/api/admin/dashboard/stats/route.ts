import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/apiAuth";

/** Port of `StatsOverviewWidget`. */
export const GET = withAdminAuth(async () => {
  const [totalIntents, activeIntents, conversations, unmatchedQuestions, categories, phrases, keywords] =
    await Promise.all([
      prisma.intent.count(),
      prisma.intent.count({ where: { isActive: true } }),
      prisma.conversation.count(),
      prisma.unmatchedQuestion.count(),
      prisma.category.count(),
      prisma.intentPhrase.count(),
      prisma.intentKeyword.count(),
    ]);

  return NextResponse.json({
    totalIntents,
    activeIntents,
    conversations,
    unmatchedQuestions,
    categories,
    phrases,
    keywords,
  });
});
