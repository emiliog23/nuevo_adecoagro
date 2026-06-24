import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Railway uses "railwaypostgresql://" internally — normalize to standard "postgresql://"
function normalizeDbUrl(url: string | undefined): string {
  if (!url) return "postgresql://build:build@localhost/build";
  return url.replace(/^railwaypostgresql:\/\//, "postgresql://");
}

function createClient() {
  const url = normalizeDbUrl(process.env.DATABASE_URL);
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
