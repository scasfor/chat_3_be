import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { normalizeText } from "@/lib/chatbot/normalize";
import { ensureTitlePhrase, generateUniqueIntentKey } from "@/lib/intents";
import { generateIntentData } from "@/lib/gemini";

export type ImportResult = { imported: number; failed: number; errors: string[] };

function cellText(row: ExcelJS.Row, index: number): string {
  const cell = row.getCell(index);
  const value = cell.value;
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in (value as { text?: unknown })) {
    return String((value as { text?: unknown }).text ?? "").trim();
  }
  return String(value).trim();
}

/** Port of `app/Services/IntentImporter.php`. Expected columns: Category ID | Question | Response */
export async function importIntentsFromExcel(buffer: Buffer): Promise<ImportResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];

  const result: ImportResult = { imported: 0, failed: 0, errors: [] };
  if (!sheet) {
    return result;
  }

  for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex++) {
    const row = sheet.getRow(rowIndex);
    const categoryIdRaw = cellText(row, 1);
    const question = cellText(row, 2);
    const response = cellText(row, 3);

    if (!question || !response || !categoryIdRaw || Number.isNaN(Number(categoryIdRaw))) {
      continue;
    }

    try {
      await processRow(Number(categoryIdRaw), question, response);
      result.imported += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push(`Row ${rowIndex}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return result;
}

/** Port of the "Import Phrases" row action on IntentResource. */
export async function importPhrasesFromExcel(intentId: number, buffer: Buffer): Promise<number> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return 0;

  let imported = 0;
  for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex++) {
    const phrase = cellText(sheet.getRow(rowIndex), 1);
    if (!phrase) continue;
    await prisma.intentPhrase.create({
      data: { intentId, phrase, normalizedPhrase: normalizeText(phrase) },
    });
    imported += 1;
  }
  return imported;
}

/** Port of the "Import Keywords" row action on IntentResource. */
export async function importKeywordsFromExcel(intentId: number, buffer: Buffer): Promise<number> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return 0;

  let imported = 0;
  for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex++) {
    const row = sheet.getRow(rowIndex);
    const keyword = cellText(row, 1);
    if (!keyword) continue;
    const rawWeight = cellText(row, 2);
    const weight = rawWeight && !Number.isNaN(Number(rawWeight)) ? Number(rawWeight) : 1;
    await prisma.intentKeyword.create({ data: { intentId, keyword, weight } });
    imported += 1;
  }
  return imported;
}

async function processRow(categoryId: number, question: string, response: string): Promise<void> {
  const intentKey = await generateUniqueIntentKey(question);
  const normalizedTitle = normalizeText(question);

  const intent = await prisma.$transaction(async (tx) => {
    const created = await tx.intent.create({
      data: {
        categoryId,
        intentKey,
        title: question,
        normalizedTitle,
        response,
        priority: 1,
        isActive: true,
      },
    });
    await ensureTitlePhrase(tx, created.id, question);
    return created;
  });

  // Enrich with AI-generated phrases and keywords — failures here don't
  // fail the whole row, matching the Laravel importer's behavior.
  try {
    const aiData = await generateIntentData(question, response);

    for (const phrase of aiData.phrases ?? []) {
      if (typeof phrase === "string" && phrase.trim()) {
        const trimmed = phrase.trim();
        await prisma.intentPhrase.create({
          data: { intentId: intent.id, phrase: trimmed, normalizedPhrase: normalizeText(trimmed) },
        });
      }
    }

    for (const kw of aiData.keywords ?? []) {
      if (kw?.keyword && String(kw.keyword).trim()) {
        await prisma.intentKeyword.create({
          data: {
            intentId: intent.id,
            keyword: String(kw.keyword).trim(),
            weight: Number(kw.weight) || 1,
          },
        });
      }
    }
  } catch {
    // Intent was created — AI enrichment failed silently. Phrases/keywords
    // can be added manually via the admin, same as the Laravel behavior.
  }
}
