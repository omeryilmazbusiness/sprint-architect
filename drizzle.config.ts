import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

/**
 * Drizzle Kit config — always targets DATABASE_URL (production / dev DB).
 * NEVER point drizzle-kit at DATABASE_URL_TEST.
 * To reset the test DB use: npm run test:db:reset
 */
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for drizzle-kit. Ensure the database is provisioned.");
}

const prodUrl = process.env.DATABASE_URL;

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: prodUrl,
  },
});
