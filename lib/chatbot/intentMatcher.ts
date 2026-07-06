import { prisma } from "@/lib/prisma";
import type { Intent } from "@/app/generated/prisma/client";
import { normalizeText, tokenize } from "./normalize";
import {
  CONVERSATIONAL_KEYS,
  buildHybridText,
  detectConversationalIntent,
  isHybridEligible,
} from "./conversationEngine";
import type { MatchResult } from "./types";

/**
 * Direct TypeScript port of `app/Services/IntentMatcher.php`.
 * Keep this file's control flow 1:1 with the original PHP so behavior stays
 * identical for the chat-bot widget consuming /api/chatbot/message.
 */

const CONFIDENCE_THRESHOLD = 40.0;
const AMBIGUITY_THRESHOLD = 0.2; // 20% difference triggers clarification

export async function matchMessage(message: string, sessionId: string): Promise<MatchResult> {
  const normalized = normalizeText(message);

  // ---------------------------------------------------------------------
  // 1. Exact match (phrase or title) across ALL active intents
  // ---------------------------------------------------------------------
  const exactIntent = await exactMatch(normalized);

  if (exactIntent) {
    const response = await buildResponse(exactIntent);
    await logConversation(sessionId, message, normalized, exactIntent.id, 100.0, response.text);

    return {
      intent: exactIntent.intentKey,
      confidence: 100,
      response: { text: response.text },
      suggestions: [],
    };
  }

  // ---------------------------------------------------------------------
  // 2. Tokenize + synonym expansion
  // ---------------------------------------------------------------------
  let tokens = tokenize(normalized);
  tokens = await expandSynonyms(tokens);

  // ---------------------------------------------------------------------
  // 3. Detect conversational intent
  // ---------------------------------------------------------------------
  const conversationalIntent = tokens.length > 0 ? await detectConversationalIntent(normalized) : null;

  // ---------------------------------------------------------------------
  // 4. Business keyword scoring (exclude conversational intents)
  // ---------------------------------------------------------------------
  let businessIntent: Intent | null = null;
  let businessConfidence = 0;

  if (tokens.length > 0) {
    const scores = await keywordScoringExcluding(tokens, [...CONVERSATIONAL_KEYS]);

    if (scores.size > 0) {
      const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
      const topIds = sorted.map(([id]) => id);
      const topScore = sorted[0][1];
      const totalScore = sorted.reduce((sum, [, score]) => sum + score, 0);
      const confidence = confidenceCalc(topScore, totalScore);

      if (confidence >= CONFIDENCE_THRESHOLD) {
        // Ambiguity check (only relevant when there is no conversational intent)
        if (topIds.length >= 2 && ambiguityCheck(sorted[0][1], sorted[1][1]) && conversationalIntent === null) {
          const top4Ids = topIds.slice(0, 4);
          const topIntents = await prisma.intent.findMany({ where: { id: { in: top4Ids } } });
          const byId = new Map(topIntents.map((intent) => [intent.id, intent]));
          const options = top4Ids
            .map((id) => byId.get(id)?.title)
            .filter((title): title is string => Boolean(title));

          await logConversation(sessionId, message, normalized, null, confidence, null);

          return {
            type: "clarification",
            message: "I found multiple related topics. Which one do you mean?",
            options,
          };
        }

        businessIntent = await prisma.intent.findUnique({ where: { id: topIds[0] } });
        businessConfidence = Math.round(confidence * 100) / 100;
      }
    }
  }

  // ---------------------------------------------------------------------
  // 5. Decision tree
  // ---------------------------------------------------------------------

  // 5a. Hybrid — conversational prefix + business answer
  if (conversationalIntent && businessIntent && isHybridEligible(conversationalIntent.intentKey)) {
    const businessResponse = await buildResponse(businessIntent);
    const hybridText = buildHybridText(conversationalIntent, businessResponse.text);

    await logConversation(sessionId, message, normalized, businessIntent.id, 90.0, hybridText);

    return {
      intent: businessIntent.intentKey,
      confidence: 90,
      response: { text: hybridText },
      suggestions: businessResponse.suggestions,
    };
  }

  // 5b. Pure conversational
  if (conversationalIntent) {
    const response = await buildResponse(conversationalIntent);
    await logConversation(sessionId, message, normalized, conversationalIntent.id, 100.0, response.text);

    return {
      intent: conversationalIntent.intentKey,
      confidence: 100,
      response: { text: response.text },
      suggestions: response.suggestions,
    };
  }

  // 5c. Pure business
  if (businessIntent) {
    const response = await buildResponse(businessIntent);
    await logConversation(sessionId, message, normalized, businessIntent.id, businessConfidence, response.text);

    return {
      intent: businessIntent.intentKey,
      confidence: businessConfidence,
      response: { text: response.text },
      suggestions: response.suggestions,
    };
  }

  // 5d. No tokens at all
  if (tokens.length === 0) {
    return fallbackResponse(sessionId, message, normalized);
  }

  // 5e. Fallback — log the unmatched question
  await prisma.unmatchedQuestion.create({ data: { question: message } });

  return fallbackResponse(sessionId, message, normalized);
}

// ---------------------------------------------------------------------------
// Exact match via phrase or title (all active intents)
// ---------------------------------------------------------------------------

async function exactMatch(normalized: string): Promise<Intent | null> {
  const phraseIntent = await prisma.intent.findFirst({
    where: {
      isActive: true,
      phrases: { some: { normalizedPhrase: normalized } },
    },
    orderBy: { priority: "desc" },
  });

  if (phraseIntent) {
    return phraseIntent;
  }

  return prisma.intent.findFirst({
    where: { isActive: true, normalizedTitle: normalized },
    orderBy: { priority: "desc" },
  });
}

// ---------------------------------------------------------------------------
// Synonym expansion
// ---------------------------------------------------------------------------

async function expandSynonyms(tokens: string[]): Promise<string[]> {
  if (tokens.length === 0) {
    return tokens;
  }

  const synonyms = await prisma.synonym.findMany({ where: { synonym: { in: tokens } } });
  const synonymMap = new Map<string, string>();
  for (const row of synonyms) {
    synonymMap.set(row.synonym, row.word);
  }

  const expanded: string[] = [];
  for (const token of tokens) {
    expanded.push(token);
    const mapped = synonymMap.get(token);
    if (mapped && mapped !== token) {
      expanded.push(mapped);
    }
  }

  return Array.from(new Set(expanded));
}

// ---------------------------------------------------------------------------
// Keyword scoring (excludes specified intent keys)
// ---------------------------------------------------------------------------

async function keywordScoringExcluding(tokens: string[], excludeKeys: string[]): Promise<Map<number, number>> {
  const intents = await prisma.intent.findMany({
    where: { isActive: true, intentKey: { notIn: excludeKeys } },
    include: { keywords: true },
  });

  const scores = new Map<number, number>();
  for (const intent of intents) {
    let score = 0;
    for (const keyword of intent.keywords) {
      if (tokens.includes(keyword.keyword)) {
        score += keyword.weight;
      }
    }
    if (score > 0) {
      scores.set(intent.id, score);
    }
  }

  return scores;
}

// ---------------------------------------------------------------------------
// Confidence / ambiguity math
// ---------------------------------------------------------------------------

function confidenceCalc(winningScore: number, totalScore: number): number {
  if (totalScore === 0) {
    return 0;
  }
  return (winningScore / totalScore) * 100;
}

function ambiguityCheck(first: number, second: number): boolean {
  if (first === 0) {
    return false;
  }
  return (first - second) / first < AMBIGUITY_THRESHOLD;
}

// ---------------------------------------------------------------------------
// Build response with follow-up suggestions
// ---------------------------------------------------------------------------

async function buildResponse(intent: Intent): Promise<{ text: string; suggestions: string[] }> {
  const followUps = await prisma.followUpIntent.findMany({
    where: { intentId: intent.id },
    include: { followUpIntent: true },
  });

  return {
    text: intent.response,
    suggestions: followUps.map((followUp) => followUp.followUpIntent.title),
  };
}

// ---------------------------------------------------------------------------
// Log conversation
// ---------------------------------------------------------------------------

async function logConversation(
  sessionId: string,
  userMessage: string,
  normalizedMessage: string,
  intentId: number | null,
  confidence: number,
  botResponse: string | null,
): Promise<void> {
  await prisma.conversation.create({
    data: {
      sessionId,
      userMessage,
      normalizedMessage,
      intentId,
      confidence,
      botResponse,
    },
  });
}

// ---------------------------------------------------------------------------
// Fallback response
// ---------------------------------------------------------------------------

async function fallbackResponse(sessionId: string, message: string, normalized: string): Promise<MatchResult> {
  await logConversation(sessionId, message, normalized, null, 0, null);

  const suggestions = await prisma.intent.findMany({
    where: { isActive: true, intentKey: { notIn: [...CONVERSATIONAL_KEYS] } },
    orderBy: { priority: "desc" },
    take: 4,
    select: { title: true },
  });

  return {
    type: "fallback",
    message:
      "Estoy aqu\u00ed para ayudar con temas de soporte de APPUI. Por favor, intenta reformular tu pregunta.",
    suggestions: suggestions.map((intent) => intent.title),
  };
}
