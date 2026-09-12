import { drizzle } from "drizzle-orm/neon-http";

const _databaseUrl = process.env.DATABASE_URL;

if (!_databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

export const db = drizzle(_databaseUrl);
