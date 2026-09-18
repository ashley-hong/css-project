import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Local dev uses a plain SQLite file. Production (Vercel's filesystem isn't
// writable/persistent) points DATABASE_URL at a hosted libSQL database
// (e.g. Turso) instead — same "sqlite" schema provider, just a different
// driver adapter, so no schema/provider migration is needed to deploy.
function createClient() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  if (url.startsWith("libsql:")) {
    const adapter = new PrismaLibSql({ url, authToken: process.env.TURSO_AUTH_TOKEN });
    return new PrismaClient({ adapter });
  }
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
