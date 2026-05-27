import type { Config } from "drizzle-kit";

export default {
  schema: "./src/schema.ts",
  out: "../../supabase/migrations",
  dialect: "postgresql",
} satisfies Config;
