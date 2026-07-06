import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { GENERAL_CONVERSATION_NAME } from "../lib/chatbot/constants";
import { normalizeText } from "../lib/chatbot/normalize";
import { ensureTitlePhrase } from "../lib/intents";

const CATEGORIES = [
  {
    name: "Acceso y Configuración",
    topics: "Acceso, creación de usuarios, correos habilitados",
    sortOrder: 1,
  },
  {
    name: "Cargue de Información",
    topics: "Plazos, no reporte, CSV, duplicados, período cerrado, CUIPO",
    sortOrder: 2,
  },
  {
    name: "Corrección de Reportes",
    topics: "Inhabilitación de registros, cargues erróneos",
    sortOrder: 3,
  },
  {
    name: "Usuarios y Responsabilidades",
    topics: "Número de usuarios, responsable de cargue",
    sortOrder: 4,
  },
  {
    name: "Plataformas y Herramientas",
    topics: "Relación con SFTP, FileZilla, CAS, SIRECI, CHIP, FUT",
    sortOrder: 5,
  },
  {
    name: "Calendarios y Vigencias",
    topics: "Año de inicio, información acumulada",
    sortOrder: 6,
  },
  {
    name: "Tipos de Reportes",
    topics: "Qué reportar, contratos, obras, liquidación",
    sortOrder: 7,
  },
  {
    name: "Prórrogas y Sanciones",
    topics: "Solicitud de prórroga, consecuencias de incumplimiento",
    sortOrder: 8,
  },
  {
    name: "Soporte y Capacitación",
    topics: "Manuales, videotutoriales, Mesa de Servicios",
    sortOrder: 9,
  },
] as const;

const GENERAL_CONVERSATION_INTENTS = [
  {
    intentKey: "greeting",
    title: "Saludo",
    response: "¡Hola! 👋 ¿Cómo puedo ayudarte hoy?",
    priority: 100,
    phrases: [
      "hola",
      "buenos días",
      "buenas tardes",
      "buenas noches",
      "qué tal",
      "saludos",
      "hey",
      "hola amigo",
    ],
    keywords: [
      { keyword: "hola", weight: 10 },
      { keyword: "buenos", weight: 7 },
      { keyword: "días", weight: 7 },
      { keyword: "tardes", weight: 7 },
      { keyword: "noches", weight: 7 },
      { keyword: "saludos", weight: 8 },
      { keyword: "qué", weight: 6 },
      { keyword: "tal", weight: 6 },
      { keyword: "hey", weight: 8 },
    ],
  },
  {
    intentKey: "goodbye",
    title: "Despedida",
    response: "¡Adiós! 👋 No dudes en volver cuando necesites ayuda.",
    priority: 100,
    phrases: [
      "adiós",
      "hasta luego",
      "nos vemos",
      "hasta pronto",
      "que tengas un buen día",
      "cuídate",
      "hasta mañana",
      "buenas noches",
    ],
    keywords: [
      { keyword: "adiós", weight: 10 },
      { keyword: "luego", weight: 8 },
      { keyword: "vemos", weight: 8 },
      { keyword: "pronto", weight: 8 },
      { keyword: "cuídate", weight: 9 },
      { keyword: "mañana", weight: 7 },
      { keyword: "noches", weight: 6 },
    ],
  },
  {
    intentKey: "thanks",
    title: "Agradecimiento",
    response: "¡De nada! 😊 ¿Hay algo más en lo que pueda ayudarte?",
    priority: 100,
    phrases: ["gracias", "muchas gracias", "mil gracias", "te lo agradezco", "agradecido", "agradecida"],
    keywords: [
      { keyword: "gracias", weight: 10 },
      { keyword: "agradezco", weight: 9 },
      { keyword: "agradecido", weight: 8 },
      { keyword: "agradecida", weight: 8 },
      { keyword: "muchas", weight: 6 },
      { keyword: "mil", weight: 6 },
    ],
  },
  {
    intentKey: "help",
    title: "Solicitud de Ayuda",
    response: "Puedo ayudarte con temas de soporte de APPUI. ¿Qué te gustaría saber?",
    priority: 90,
    phrases: ["ayuda", "necesito ayuda", "soporte", "puedes ayudarme", "necesito asistencia", "ayúdame", "tengo una pregunta"],
    keywords: [
      { keyword: "ayuda", weight: 10 },
      { keyword: "soporte", weight: 9 },
      { keyword: "asistencia", weight: 8 },
      { keyword: "ayúdame", weight: 9 },
      { keyword: "pregunta", weight: 7 },
    ],
  },
  {
    intentKey: "yes_confirmation",
    title: "Sí / Confirmación",
    response: "¡Entendido! Puedes continuar.",
    priority: 80,
    phrases: ["sí", "claro", "correcto", "por supuesto", "de acuerdo", "vale", "exacto"],
    keywords: [
      { keyword: "sí", weight: 10 },
      { keyword: "claro", weight: 9 },
      { keyword: "correcto", weight: 9 },
      { keyword: "acuerdo", weight: 8 },
      { keyword: "vale", weight: 8 },
      { keyword: "exacto", weight: 9 },
    ],
  },
  {
    intentKey: "no_confirmation",
    title: "No / Negación",
    response: "¡Entendido! Avísame si cambias de opinión.",
    priority: 80,
    phrases: ["no", "no gracias", "cancelar", "olvídalo", "para nada", "negativo"],
    keywords: [
      { keyword: "no", weight: 10 },
      { keyword: "cancelar", weight: 8 },
      { keyword: "olvídalo", weight: 8 },
      { keyword: "negativo", weight: 8 },
    ],
  },
] as const;

async function seedAdminUser(): Promise<void> {
  const name = process.env.SEED_ADMIN_NAME ?? "Admin";
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "password";

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, password: hashedPassword },
  });

  console.log(`Seeded admin user: ${user.email} (id ${user.id})`);
}

async function seedCategories(): Promise<void> {
  for (const categoryData of CATEGORIES) {
    let category = await prisma.category.findFirst({
      where: { name: categoryData.name },
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          name: categoryData.name,
          sortOrder: categoryData.sortOrder,
          status: 1,
        },
      });
    }

    const topics = categoryData.topics.split(",").map((topic) => topic.trim());

    for (const topic of topics) {
      const existingTopic = await prisma.categoryTopic.findFirst({
        where: { categoryId: category.id, topic },
      });

      if (!existingTopic) {
        await prisma.categoryTopic.create({
          data: { categoryId: category.id, topic },
        });
      }
    }
  }

  console.log(`Seeded ${CATEGORIES.length} categories with topics.`);
}

async function seedGeneralConversation(): Promise<void> {
  let category = await prisma.category.findFirst({
    where: { name: GENERAL_CONVERSATION_NAME },
  });

  if (!category) {
    category = await prisma.category.create({
      data: {
        name: GENERAL_CONVERSATION_NAME,
        sortOrder: 0,
        status: 1,
      },
    });
  }

  for (const intentData of GENERAL_CONVERSATION_INTENTS) {
    const intent = await prisma.intent.upsert({
      where: { intentKey: intentData.intentKey },
      update: {},
      create: {
        categoryId: category.id,
        intentKey: intentData.intentKey,
        title: intentData.title,
        normalizedTitle: normalizeText(intentData.title),
        response: intentData.response,
        priority: intentData.priority,
        isActive: true,
      },
    });

    await ensureTitlePhrase(prisma, intent.id, intentData.title);

    for (const phrase of intentData.phrases) {
      const normalizedPhrase = normalizeText(phrase);
      const existingPhrase = await prisma.intentPhrase.findFirst({
        where: { intentId: intent.id, normalizedPhrase },
      });

      if (!existingPhrase) {
        await prisma.intentPhrase.create({
          data: { intentId: intent.id, phrase, normalizedPhrase },
        });
      }
    }

    for (const keywordData of intentData.keywords) {
      const existingKeyword = await prisma.intentKeyword.findFirst({
        where: { intentId: intent.id, keyword: keywordData.keyword },
      });

      if (!existingKeyword) {
        await prisma.intentKeyword.create({
          data: {
            intentId: intent.id,
            keyword: keywordData.keyword,
            weight: keywordData.weight,
          },
        });
      }
    }
  }

  console.log(`Seeded ${GENERAL_CONVERSATION_INTENTS.length} general conversation intents.`);
}

async function main() {
  await seedAdminUser();
  await seedCategories();
  await seedGeneralConversation();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
