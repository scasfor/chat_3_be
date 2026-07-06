import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeText } from "./normalize";
import { createFakePrisma, type FakeIntent } from "../../test/fakePrisma";

/**
 * These tests pin down the behavior of the ported IntentMatcher/
 * ConversationEngine against known fixtures, mirroring scenarios that were
 * manually verified against the original Laravel app's IntentMatcher.php /
 * ConversationEngine.php (exact match -> synonym expansion -> conversational
 * detection -> keyword scoring -> confidence/ambiguity -> hybrid/business/
 * conversational/fallback branches).
 */

function phrase(text: string) {
  return { phrase: text, normalizedPhrase: normalizeText(text) };
}

let fakePrisma: ReturnType<typeof createFakePrisma>;

vi.mock("@/lib/prisma", () => ({
  get prisma() {
    return fakePrisma;
  },
}));

const greeting: FakeIntent = {
  id: 1,
  intentKey: "greeting",
  title: "Greeting",
  normalizedTitle: normalizeText("Greeting"),
  response: "Hello! How can I help you today?",
  isActive: true,
  priority: 1,
  keywords: [
    { keyword: "hi", weight: 5 },
    { keyword: "hello", weight: 5 },
  ],
  phrases: [phrase("hello"), phrase("hi")],
};

const help: FakeIntent = {
  id: 2,
  intentKey: "help",
  title: "Help",
  normalizedTitle: normalizeText("Help"),
  response: "Sure, what do you need help with?",
  isActive: true,
  priority: 1,
  keywords: [{ keyword: "help", weight: 5 }],
  phrases: [phrase("help")],
};

const passwordReset: FakeIntent = {
  id: 3,
  intentKey: "password_reset",
  title: "How do I reset my password",
  normalizedTitle: normalizeText("How do I reset my password"),
  response: "Go to Settings > Security > Reset Password.",
  isActive: true,
  priority: 1,
  keywords: [
    { keyword: "password", weight: 8 },
    { keyword: "reset", weight: 6 },
  ],
  phrases: [phrase("reset password"), phrase("forgot password"), phrase("How do I reset my password")],
};

const loginIssue: FakeIntent = {
  id: 4,
  intentKey: "login_issue",
  title: "How do I login",
  normalizedTitle: normalizeText("How do I login"),
  response: "Try clearing your cache and logging in again.",
  isActive: true,
  priority: 1,
  keywords: [
    { keyword: "login", weight: 8 },
    { keyword: "password", weight: 3 },
  ],
  phrases: [phrase("How do I login")],
};

const accountLocked: FakeIntent = {
  id: 5,
  intentKey: "account_locked",
  title: "My account is locked",
  normalizedTitle: normalizeText("My account is locked"),
  response: "Contact support to unlock your account.",
  isActive: true,
  priority: 1,
  keywords: [{ keyword: "password", weight: 7 }],
  phrases: [phrase("My account is locked")],
};

const allIntents = [greeting, help, passwordReset, loginIssue, accountLocked];

beforeEach(() => {
  vi.resetModules();
  fakePrisma = createFakePrisma({ intents: allIntents, synonyms: [{ word: "password", synonym: "pwd" }] });
});

describe("matchMessage", () => {
  it("returns a 100% exact phrase match", async () => {
    const { matchMessage } = await import("./intentMatcher");
    const result = await matchMessage("reset password", "session-1");

    expect(result).toMatchObject({
      intent: "password_reset",
      confidence: 100,
      response: { text: passwordReset.response },
      suggestions: [],
    });
  });

  it("returns a 100% exact title match when no phrase matches", async () => {
    const { matchMessage } = await import("./intentMatcher");
    const result = await matchMessage("My account is locked", "session-2");

    expect(result).toMatchObject({ intent: "account_locked", confidence: 100 });
  });

  it("matches a pure conversational intent via keyword scoring", async () => {
    const { matchMessage } = await import("./intentMatcher");
    // "hi there friend" doesn't exact-match any phrase/title, but scores on
    // the greeting keyword "hi".
    const result = await matchMessage("hi there friend", "session-3");

    expect(result).toMatchObject({ intent: "greeting", confidence: 100 });
  });

  it("builds a hybrid response (conversational prefix + business answer)", async () => {
    const { matchMessage } = await import("./intentMatcher");
    const result = await matchMessage("hi how do I reset my password", "session-4");

    expect(result).toMatchObject({ intent: "password_reset", confidence: 90 });
    if ("response" in result) {
      expect(result.response.text.startsWith("Hello! ")).toBe(true);
      expect(result.response.text).toContain(passwordReset.response);
    }
  });

  it("expands synonyms so an aliased keyword still scores", async () => {
    const { matchMessage } = await import("./intentMatcher");
    // "pwd" only scores via the word<->synonym expansion (word: password, synonym: pwd).
    // Adding "reset" pushes password_reset clear of the ambiguity threshold.
    const result = await matchMessage("forgot my pwd reset", "session-5");

    expect(result).toMatchObject({ intent: "password_reset" });
  });

  it("returns a clarification when two intents score too closely", async () => {
    const { matchMessage } = await import("./intentMatcher");
    // Only "password" token present: password_reset(8) vs account_locked(7) vs login_issue(3).
    // (8-7)/8 = 0.125 < 0.20 ambiguity threshold => clarification.
    const result = await matchMessage("password", "session-6");

    expect(result).toMatchObject({ type: "clarification" });
    if ("options" in result) {
      expect(result.options).toEqual(
        expect.arrayContaining([passwordReset.title, accountLocked.title, loginIssue.title]),
      );
    }
  });

  it("falls back and logs an unmatched question when tokens don't match anything", async () => {
    const { matchMessage } = await import("./intentMatcher");
    const result = await matchMessage("what is the weather today", "session-7");

    expect(result).toMatchObject({ type: "fallback" });
    expect(fakePrisma.__unmatchedQuestions).toHaveLength(1);
    expect(fakePrisma.__unmatchedQuestions[0]).toMatchObject({ question: "what is the weather today" });
  });

  it("falls back WITHOUT logging an unmatched question when there are no usable tokens", async () => {
    const { matchMessage } = await import("./intentMatcher");
    const result = await matchMessage("!!!", "session-8");

    expect(result).toMatchObject({ type: "fallback" });
    expect(fakePrisma.__unmatchedQuestions).toHaveLength(0);
  });

  it("always logs a conversation row", async () => {
    const { matchMessage } = await import("./intentMatcher");
    await matchMessage("reset password", "session-9");

    expect(fakePrisma.__conversations).toHaveLength(1);
    expect(fakePrisma.__conversations[0]).toMatchObject({ sessionId: "session-9", intentId: passwordReset.id });
  });
});
