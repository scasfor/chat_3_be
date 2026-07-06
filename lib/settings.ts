import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";

/** Port of `Setting::get()` / `Setting::set()` from the Laravel app. */
export async function getSetting(key: string, fallback: string | null = null): Promise<string | null> {
  try {
    const row = await prisma.setting.findUnique({ where: { key } });
    if (!row?.value) {
      return fallback;
    }
    return decrypt(row.value);
  } catch {
    return fallback;
  }
}

export async function setSetting(key: string, value: string | null): Promise<void> {
  const stored = value ? encrypt(value) : null;

  await prisma.setting.upsert({
    where: { key },
    update: { value: stored },
    create: { key, value: stored },
  });
}

export const GEMINI_API_KEY_SETTING = "gemini_api_key";
