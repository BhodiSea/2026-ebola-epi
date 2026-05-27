import { defineConfig } from "drizzle-kit";

const url = process.env.SUPABASE_DB_URL;
if (url === undefined || url === "") {
  throw new Error("SUPABASE_DB_URL env var is required for drizzle-kit");
}

export default defineConfig({
  schema: "./src/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url },
  extensionsFilters: ["postgis"],
  schemaFilter: ["public"],
});
