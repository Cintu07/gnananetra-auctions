import { defineConfig } from "drizzle-kit";

// `npm run db:generate` turns db/schema.ts into SQL migrations under drizzle/ (SQLite, for D1).
export default defineConfig({ dialect: "sqlite", schema: "./db/schema.ts", out: "./drizzle" });
