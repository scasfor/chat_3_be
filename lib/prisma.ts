import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaMssql } from "@prisma/adapter-mssql";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set.");
  }

  // JDBC-style SQL Server URL, e.g.
  // sqlserver://localhost:1433;database=coibot;user=sa;password=...;encrypt=true;trustServerCertificate=true
  const adapter = new PrismaMssql(connectionString);

  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = global.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
