/**
 * Minimal in-memory stand-in for the Prisma Client, covering only the query
 * shapes that lib/chatbot/{intentMatcher,conversationEngine}.ts issue. Used
 * to unit-test the ported matching engine without a real MySQL database.
 */

export type FakeIntent = {
  id: number;
  intentKey: string;
  title: string;
  normalizedTitle: string;
  response: string;
  isActive: boolean;
  priority: number;
  keywords: { keyword: string; weight: number }[];
  phrases: { phrase: string; normalizedPhrase: string }[];
};

export type FakeSynonym = { word: string; synonym: string };
export type FakeFollowUp = { intentId: number; followUpIntentId: number };

type Where = Record<string, unknown>;

function getField<T>(intent: FakeIntent, field: string): T {
  return (intent as unknown as Record<string, T>)[field];
}

function matchesIntentWhere(intent: FakeIntent, where: Where | undefined): boolean {
  if (!where) return true;

  if ("isActive" in where && intent.isActive !== where.isActive) return false;

  if ("normalizedTitle" in where && intent.normalizedTitle !== where.normalizedTitle) return false;

  if ("id" in where) {
    const idClause = where.id as number | { in: number[] };
    if (typeof idClause === "number") {
      if (intent.id !== idClause) return false;
    } else if (idClause && "in" in idClause) {
      if (!idClause.in.includes(intent.id)) return false;
    }
  }

  if ("intentKey" in where) {
    const clause = where.intentKey as { in?: string[]; notIn?: string[] };
    if (clause.in && !clause.in.includes(intent.intentKey)) return false;
    if (clause.notIn && clause.notIn.includes(intent.intentKey)) return false;
  }

  if ("phrases" in where) {
    const clause = where.phrases as { some?: { normalizedPhrase?: string } };
    const target = clause.some?.normalizedPhrase;
    if (target !== undefined && !intent.phrases.some((p) => p.normalizedPhrase === target)) {
      return false;
    }
  }

  return true;
}

function applyOrderAndTake<T extends FakeIntent>(items: T[], orderBy: unknown, take?: number): T[] {
  let result = items;
  if (orderBy && typeof orderBy === "object" && "priority" in orderBy) {
    const direction = (orderBy as { priority: "asc" | "desc" }).priority;
    result = [...result].sort((a, b) => (direction === "desc" ? b.priority - a.priority : a.priority - b.priority));
  }
  if (take !== undefined) {
    result = result.slice(0, take);
  }
  return result;
}

export function createFakePrisma(fixtures: {
  intents: FakeIntent[];
  synonyms?: FakeSynonym[];
  followUps?: FakeFollowUp[];
}) {
  const synonyms = fixtures.synonyms ?? [];
  const followUps = fixtures.followUps ?? [];
  const conversations: Record<string, unknown>[] = [];
  const unmatchedQuestions: Record<string, unknown>[] = [];

  const intent = {
    findFirst: async ({ where, orderBy }: { where?: Where; orderBy?: unknown }) => {
      const filtered = fixtures.intents.filter((i) => matchesIntentWhere(i, where));
      const ordered = applyOrderAndTake(filtered, orderBy);
      return ordered[0] ?? null;
    },
    findMany: async ({
      where,
      orderBy,
      take,
      select,
    }: {
      where?: Where;
      orderBy?: unknown;
      take?: number;
      select?: Record<string, boolean>;
    }) => {
      const filtered = fixtures.intents.filter((i) => matchesIntentWhere(i, where));
      const ordered = applyOrderAndTake(filtered, orderBy, take);
      if (select) {
        return ordered.map((i) => {
          const picked: Record<string, unknown> = {};
          for (const key of Object.keys(select)) {
            if (select[key]) picked[key] = getField(i, key);
          }
          return picked;
        });
      }
      return ordered;
    },
    findUnique: async ({ where }: { where: { id: number } }) => {
      return fixtures.intents.find((i) => i.id === where.id) ?? null;
    },
  };

  const intentPhrase = {
    findFirst: async ({
      where,
    }: {
      where: { normalizedPhrase: string; intent?: { intentKey?: { in?: string[] }; isActive?: boolean } };
    }) => {
      for (const candidate of fixtures.intents) {
        if (where.intent?.intentKey?.in && !where.intent.intentKey.in.includes(candidate.intentKey)) continue;
        if (where.intent?.isActive !== undefined && candidate.isActive !== where.intent.isActive) continue;
        const phrase = candidate.phrases.find((p) => p.normalizedPhrase === where.normalizedPhrase);
        if (phrase) return { ...phrase, intent: candidate };
      }
      return null;
    },
  };

  const synonym = {
    findMany: async ({ where }: { where: { synonym: { in: string[] } } }) => {
      return synonyms.filter((s) => where.synonym.in.includes(s.synonym));
    },
  };

  const followUpIntent = {
    findMany: async ({ where }: { where: { intentId: number } }) => {
      return followUps
        .filter((f) => f.intentId === where.intentId)
        .map((f) => ({ ...f, followUpIntent: fixtures.intents.find((i) => i.id === f.followUpIntentId) }));
    },
  };

  const conversation = {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      conversations.push(data);
      return { id: conversations.length, ...data };
    },
  };

  const unmatchedQuestion = {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      unmatchedQuestions.push(data);
      return { id: unmatchedQuestions.length, ...data };
    },
  };

  return {
    intent,
    intentPhrase,
    synonym,
    followUpIntent,
    conversation,
    unmatchedQuestion,
    __conversations: conversations,
    __unmatchedQuestions: unmatchedQuestions,
  };
}
