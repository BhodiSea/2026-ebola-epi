import type { KnipConfig } from "knip";

const config: KnipConfig = {
  workspaces: {
    ".": {
      entry: ["types/**/*.d.ts", "vitest.config.ts"],
      ignoreBinaries: ["docker", "supabase"],
    },
    "apps/web": {
      entry: [
        "app/**/{page,layout,error,loading,not-found,route,template,opengraph-image,sitemap,robots,manifest}.{ts,tsx}",
        "proxy.ts",
        "instrumentation.ts",
        "next.config.{ts,mjs}",
        "vitest.config.ts",
        "playwright.config.ts",
        "vercel.ts",
      ],
      project: ["**/*.{ts,tsx}!"],
      next: { entry: ["app/**/*.{ts,tsx}"] },
    },
    "packages/*": {
      entry: ["src/index.ts", "drizzle.config.ts"],
      project: ["src/**/*.ts"],
    },
  },
  ignoreDependencies: ["@types/node", "eslint-plugin-*"],
  rules: {
    files: "error",
    dependencies: "error",
    devDependencies: "error",
    unlisted: "error",
    binaries: "error",
    unresolved: "error",
    exports: "error",
    types: "error",
    enumMembers: "error",
    classMembers: "warn",
    duplicates: "error",
  },
  vitest: true,
  playwright: {
    config: ["apps/web/playwright.config.ts"],
    entry: ["apps/web/e2e/**/*.{test,spec}.ts"],
  },
  biome: { config: ["biome.json"] },
  drizzle: {
    config: ["packages/db/drizzle.config.ts"],
    entry: ["packages/db/src/**/*.ts"],
  },
};

export default config;
