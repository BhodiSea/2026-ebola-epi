import type { KnipConfig } from "knip";

const config: KnipConfig = {
  workspaces: {
    ".": {
      entry: ["scripts/**/*.ts", "tooling/**/*.ts"],
      ignoreBinaries: ["docker", "supabase"],
    },
    "apps/web": {
      entry: [
        "app/**/{page,layout,error,loading,not-found,route,template,opengraph-image,sitemap,robots,manifest}.{ts,tsx}",
        "middleware.ts",
        "instrumentation.ts",
        "next.config.{ts,mjs}",
      ],
      project: ["**/*.{ts,tsx}!"],
      next: { entry: ["app/**/*.{ts,tsx}"] },
    },
    "packages/*": {
      entry: ["src/index.ts"],
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
    config: ["playwright.config.ts"],
    entry: ["tests/e2e/**/*.{test,spec}.ts"],
  },
  biome: { config: ["biome.json"] },
  drizzle: {
    config: ["drizzle.config.ts"],
    entry: ["packages/db/migrations/*.ts"],
  },
};

export default config;
