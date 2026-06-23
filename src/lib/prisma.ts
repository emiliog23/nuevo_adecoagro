import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  // During build DATABASE_URL may be undefined — return a placeholder client
  // that will throw only when actually queried (not at import/construct time).
  const url = process.env.DATABASE_URL;
  if (!url) {
    // No-op client for build-time static analysis
    return new PrismaClient({ adapter: new PrismaPg({ connectionString: "postgresql://build:build@localhost/build" } as any) });
  }
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
