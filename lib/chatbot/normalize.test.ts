import { describe, expect, it } from "vitest";
import { normalizeText, tokenize } from "./normalize";

describe("normalizeText", () => {
  it("lowercases, strips punctuation, and collapses whitespace", () => {
    expect(normalizeText("How do I reset my PASSWORD?!")).toBe("how do i reset my password");
  });

  it("collapses multiple spaces and trims", () => {
    expect(normalizeText("  Hello   World  ")).toBe("hello world");
  });

  it("strips accented characters entirely (matches PHP preg_replace a-z0-9 only)", () => {
    expect(normalizeText("¿Cómo restablezco mi contraseña?")).toBe("cmo restablezco mi contrasea");
  });
});

describe("tokenize", () => {
  it("splits on spaces and drops single-character tokens", () => {
    expect(tokenize("how do i reset my password")).toEqual(["how", "do", "reset", "my", "password"]);
  });

  it("returns an empty array for strings with no usable tokens", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("a b")).toEqual([]);
  });
});
