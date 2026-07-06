import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import { normalizeText } from "@/lib/chatbot/normalize";

/**
 * Mirrors the Eloquent model hooks on `Intent` / `IntentPhrase`
 * (see app/Models/Intent.php, app/Models/IntentPhrase.php):
 *  - `normalized_title` / `normalized_phrase` are always derived, never
 *    trusted from input.
 *  - Creating/renaming an intent ensures a matching phrase exists for its
 *    title so exact-title matches also work via the phrases table.
 */

export async function ensureTitlePhrase(
  tx: Prisma.TransactionClient,
  intentId: number,
  title: string,
): Promise<void> {
  const normalizedTitle = normalizeText(title);

  const existing = await tx.intentPhrase.findFirst({
    where: { intentId, normalizedPhrase: normalizedTitle },
  });

  if (!existing) {
    await tx.intentPhrase.create({
      data: { intentId, phrase: title, normalizedPhrase: normalizedTitle },
    });
  }
}

export async function generateUniqueIntentKey(base: string): Promise<string> {
  const slug = slugify(base) || "intent";
  let key = slug;
  let counter = 1;

  while (await prisma.intent.findUnique({ where: { intentKey: key } })) {
    key = `${slug}-${counter}`;
    counter += 1;
  }

  return key;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
