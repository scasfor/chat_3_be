export type NormalMatchResult = {
  intent: string;
  confidence: number;
  response: { text: string };
  suggestions: string[];
};

export type ClarificationResult = {
  type: "clarification";
  message: string;
  options: string[];
};

export type FallbackResult = {
  type: "fallback";
  message: string;
  suggestions: string[];
};

export type MatchResult = NormalMatchResult | ClarificationResult | FallbackResult;
