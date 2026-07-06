import { prisma } from "@/lib/prisma";
import type { Intent } from "@/app/generated/prisma/client";
import { tokenize } from "./normalize";

/**
 * Direct TypeScript port of `app/Services/ConversationEngine.php`.
 */

/** Intent keys that belong to the general conversation layer. */
export const CONVERSATIONAL_KEYS = [
  "greeting",
  "goodbye",
  "thanks",
  "help",
  "yes_confirmation",
  "no_confirmation",
] as const;

/** Conversational intents that can participate in hybrid responses. */
const HYBRID_ELIGIBLE = ["greeting", "help"];

/**
 * Detect a conversational intent from the normalised message.
 */
export async function detectConversationalIntent(normalized: string): Promise<Intent | null> {
  // 1. Exact phrase match against conversational intents.
  const phrase = await prisma.intentPhrase.findFirst({
    where: {
      normalizedPhrase: normalized,
      intent: {
        intentKey: { in: [...CONVERSATIONAL_KEYS] },
        isActive: true,
      },
    },
    include: { intent: true },
  });

  if (phrase) {
    return phrase.intent;
  }

  // 2. Keyword scan across conversational intents.
  const tokens = tokenize(normalized);

  if (tokens.length === 0) {
    return null;
  }

  const intents = await prisma.intent.findMany({
    where: {
      intentKey: { in: [...CONVERSATIONAL_KEYS] },
      isActive: true,
    },
    include: { keywords: true },
    orderBy: { priority: "desc" },
  });

  let best: Intent | null = null;
  let bestScore = 0;

  for (const intent of intents) {
    let score = 0;
    for (const keyword of intent.keywords) {
      if (tokens.includes(keyword.keyword)) {
        score += keyword.weight;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = intent;
    }
  }

  return bestScore > 0 ? best : null;
}

export function isConversationalKey(key: string): boolean {
  return (CONVERSATIONAL_KEYS as readonly string[]).includes(key);
}

export function isHybridEligible(intentKey: string): boolean {
  return HYBRID_ELIGIBLE.includes(intentKey);
}

/** Prepend a short conversational prefix to a business response text. */
export function buildHybridText(conversational: Pick<Intent, "intentKey">, businessText: string): string {
  let prefix = "";
  if (conversational.intentKey === "greeting") {
    prefix = "Hello! \u{1F44B} ";
  } else if (conversational.intentKey === "help") {
    prefix = "Sure, I can help! ";
  }
  return prefix + businessText;
}
