import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: "./apps/api/.env.local" });

const _databaseUrl = process.env.DATABASE_URL;

if (!_databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

export default defineConfig({
  schema: "./apps/api/src/services/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: _databaseUrl,
  },
});
