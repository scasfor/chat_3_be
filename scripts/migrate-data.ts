/**
 * One-off migration of data from the legacy Laravel/MySQL database into the
 * new Prisma-managed MySQL schema. Run with `npm run migrate:legacy-data`
 * after applying Prisma migrations (`npm run db:migrate:deploy`) against an
 * EMPTY target database.
 *
 * Source connection is configured via LEGACY_DB_* env vars (see .env.example).
 * Target connection is the regular DATABASE_URL used by Prisma.
 *
 * NOTE: the legacy `settings.value` column is encrypted with Laravel's APP_KEY
 * cipher, which this app cannot decrypt. The `settings` table is intentionally
 * NOT migrated — re-enter the Gemini API key via the new /admin/settings page
 * after cutover.
 */
import mariadb, { type Connection } from "mariadb";
import { prisma } from "../lib/prisma";

type Row = Record<string, unknown>;

async function main() {
  const legacyHost = process.env.LEGACY_DB_HOST ?? "127.0.0.1";
  const legacyPort = Number(process.env.LEGACY_DB_PORT ?? 3306);
  const legacyDatabase = process.env.LEGACY_DB_DATABASE;
  const legacyUser = process.env.LEGACY_DB_USERNAME ?? "root";
  const legacyPassword = process.env.LEGACY_DB_PASSWORD ?? "";

  if (!legacyDatabase) {
    throw new Error("LEGACY_DB_DATABASE environment variable is required (the old Laravel database name).");
  }

  const legacyConnection = await mariadb.createConnection({
    host: legacyHost,
    port: legacyPort,
    database: legacyDatabase,
    user: legacyUser,
    password: legacyPassword,
  });

  console.log(`Connected to legacy database "${legacyDatabase}" at ${legacyHost}:${legacyPort}.`);

  try {
    await migrateUsers(legacyConnection);
    await migrateCategories(legacyConnection);
    await migrateCategoryTopics(legacyConnection);
    await migrateIntents(legacyConnection);
    await migrateIntentPhrases(legacyConnection);
    await migrateIntentKeywords(legacyConnection);
    await migrateFollowUpIntents(legacyConnection);
    await migrateSynonyms(legacyConnection);
    await migrateConversations(legacyConnection);
    await migrateUnmatchedQuestions(legacyConnection);

    console.log("\nDone. Reminder: re-enter the Gemini API key at /admin/settings (not migrated).");
  } finally {
    await legacyConnection.end();
    await prisma.$disconnect();
  }
}

async function fixAutoIncrement(table: string, maxId: number): Promise<void> {
  if (maxId <= 0) return;
  await prisma.$executeRawUnsafe(`ALTER TABLE \`${table}\` AUTO_INCREMENT = ${maxId + 1}`);
}

async function migrateUsers(conn: Connection): Promise<void> {
  const rows: Row[] = await conn.query("SELECT * FROM users");
  for (const row of rows) {
    await prisma.user.create({
      data: {
        id: Number(row.id),
        name: String(row.name),
        email: String(row.email),
        emailVerifiedAt: row.email_verified_at ? new Date(row.email_verified_at as string) : null,
        password: String(row.password),
        rememberToken: (row.remember_token as string) ?? null,
        isActive: true,
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
      },
    });
  }
  await fixAutoIncrement("users", Math.max(0, ...rows.map((r) => Number(r.id))));
  console.log(`Migrated ${rows.length} users.`);
}

async function migrateCategories(conn: Connection): Promise<void> {
  const rows: Row[] = await conn.query("SELECT * FROM categories");
  for (const row of rows) {
    await prisma.category.create({
      data: {
        id: Number(row.id),
        name: String(row.name),
        sortOrder: Number(row.sort_order ?? 0),
        status: Number(row.status ?? 1),
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
      },
    });
  }
  await fixAutoIncrement("categories", Math.max(0, ...rows.map((r) => Number(r.id))));
  console.log(`Migrated ${rows.length} categories.`);
}

async function migrateCategoryTopics(conn: Connection): Promise<void> {
  const rows: Row[] = await conn.query("SELECT * FROM category_topics");
  for (const row of rows) {
    await prisma.categoryTopic.create({
      data: {
        id: Number(row.id),
        categoryId: Number(row.category_id),
        topic: String(row.topic),
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
      },
    });
  }
  await fixAutoIncrement("category_topics", Math.max(0, ...rows.map((r) => Number(r.id))));
  console.log(`Migrated ${rows.length} category topics.`);
}

async function migrateIntents(conn: Connection): Promise<void> {
  const rows: Row[] = await conn.query("SELECT * FROM intents");
  for (const row of rows) {
    await prisma.intent.create({
      data: {
        id: Number(row.id),
        categoryId: Number(row.category_id),
        intentKey: String(row.intent_key),
        title: String(row.title),
        normalizedTitle: (row.normalized_title as string) ?? null,
        response: String(row.response),
        priority: Number(row.priority ?? 1),
        isActive: Boolean(row.is_active),
        resourceLink: (row.resource_link as string) ?? null,
        source: (row.source as string) ?? null,
        referenceInOriginalFile: (row.reference_in_original_file as string) ?? null,
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
      },
    });
  }
  await fixAutoIncrement("intents", Math.max(0, ...rows.map((r) => Number(r.id))));
  console.log(`Migrated ${rows.length} intents.`);
}

async function migrateIntentPhrases(conn: Connection): Promise<void> {
  const rows: Row[] = await conn.query("SELECT * FROM intent_phrases");
  for (const row of rows) {
    await prisma.intentPhrase.create({
      data: {
        id: Number(row.id),
        intentId: Number(row.intent_id),
        phrase: String(row.phrase),
        normalizedPhrase: (row.normalized_phrase as string) ?? null,
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
      },
    });
  }
  await fixAutoIncrement("intent_phrases", Math.max(0, ...rows.map((r) => Number(r.id))));
  console.log(`Migrated ${rows.length} intent phrases.`);
}

async function migrateIntentKeywords(conn: Connection): Promise<void> {
  const rows: Row[] = await conn.query("SELECT * FROM intent_keywords");
  for (const row of rows) {
    await prisma.intentKeyword.create({
      data: {
        id: Number(row.id),
        intentId: Number(row.intent_id),
        keyword: String(row.keyword),
        weight: Number(row.weight ?? 1),
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
      },
    });
  }
  await fixAutoIncrement("intent_keywords", Math.max(0, ...rows.map((r) => Number(r.id))));
  console.log(`Migrated ${rows.length} intent keywords.`);
}

async function migrateFollowUpIntents(conn: Connection): Promise<void> {
  const rows: Row[] = await conn.query("SELECT * FROM follow_up_intents");
  for (const row of rows) {
    await prisma.followUpIntent.create({
      data: {
        id: Number(row.id),
        intentId: Number(row.intent_id),
        followUpIntentId: Number(row.follow_up_intent_id),
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
      },
    });
  }
  await fixAutoIncrement("follow_up_intents", Math.max(0, ...rows.map((r) => Number(r.id))));
  console.log(`Migrated ${rows.length} follow-up intent links.`);
}

async function migrateSynonyms(conn: Connection): Promise<void> {
  const rows: Row[] = await conn.query("SELECT * FROM synonyms");
  for (const row of rows) {
    await prisma.synonym.create({
      data: {
        id: Number(row.id),
        word: String(row.word),
        synonym: String(row.synonym),
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
      },
    });
  }
  await fixAutoIncrement("synonyms", Math.max(0, ...rows.map((r) => Number(r.id))));
  console.log(`Migrated ${rows.length} synonyms.`);
}

async function migrateConversations(conn: Connection): Promise<void> {
  const rows: Row[] = await conn.query("SELECT * FROM conversations");
  for (const row of rows) {
    await prisma.conversation.create({
      data: {
        id: Number(row.id),
        sessionId: String(row.session_id),
        userMessage: String(row.user_message),
        normalizedMessage: (row.normalized_message as string) ?? null,
        intentId: row.intent_id !== null && row.intent_id !== undefined ? Number(row.intent_id) : null,
        confidence: row.confidence !== null && row.confidence !== undefined ? Number(row.confidence) : null,
        botResponse: (row.bot_response as string) ?? null,
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
      },
    });
  }
  await fixAutoIncrement("conversations", Math.max(0, ...rows.map((r) => Number(r.id))));
  console.log(`Migrated ${rows.length} conversations.`);
}

async function migrateUnmatchedQuestions(conn: Connection): Promise<void> {
  const rows: Row[] = await conn.query("SELECT * FROM unmatched_questions");
  for (const row of rows) {
    await prisma.unmatchedQuestion.create({
      data: {
        id: Number(row.id),
        question: String(row.question),
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
      },
    });
  }
  await fixAutoIncrement("unmatched_questions", Math.max(0, ...rows.map((r) => Number(r.id))));
  console.log(`Migrated ${rows.length} unmatched questions.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
