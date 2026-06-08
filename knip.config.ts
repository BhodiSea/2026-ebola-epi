import type { KnipConfig } from "knip";

const config: KnipConfig = {
  workspaces: {
    ".": {
      entry: ["types/**/*.d.ts", "vitest.config.ts"],
      // docker/supabase: system tools, not npm packages
      // gitleaks: system binary installed via mise (see mise.toml)
      // promptfoo: evals package binary, not a root-level npm dep
      ignoreBinaries: ["docker", "supabase", "gitleaks", "promptfoo"],
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
        "scripts/**/*.ts",
      ],
      project: ["**/*.{ts,tsx}!"],
      next: { entry: ["app/**/*.{ts,tsx}"] },
    },
    "packages/*": {
      entry: ["src/index.ts", "drizzle.config.ts"],
      project: ["src/**/*.ts"],
    },
    "packages/ingest": {
      entry: ["src/index.ts", "src/bin/backfill.ts"],
      project: ["src/**/*.ts"],
      // tsx is the script runner for src/bin/backfill.ts; invoked as a binary
      // in package.json scripts, not imported as a TS module.
      ignoreBinaries: ["tsx"],
    },
  },
  ignoreDependencies: [
    "@types/node",
    "eslint-plugin-*",
    // CSS imports — knip doesn't scan CSS @import statements
    "tw-animate-css",
    "tailwindcss",
    // CLI tools invoked via npx in CI workflows, not imported in TS
    "@axe-core/cli",
    "@lhci/cli",
    // PostCSS ecosystem: postcss-load-config is used by PostCSS to find
    // postcss.config.mjs; it's a transitive runtime dep, not a TS import
    "postcss-load-config",
    // Script runner for packages/ingest/src/bin/backfill.ts — used in npm scripts,
    // not imported in any TS file so knip cannot detect the dep relationship.
    "tsx",
  ],
  ignoreFiles: [
    // Scaffolded components not yet wired into any page; tracked as future work
    "apps/web/components/ui/badge.tsx",
    "apps/web/components/theme-switcher.tsx",
    "apps/web/components/provenance/skeleton-map.tsx",
    "apps/web/lib/copy/daily-brief.ts",
    // Playwright globalSetup — referenced as a string path in playwright.config.ts,
    // not as an import, so knip's Playwright plugin does not discover it automatically.
    "apps/web/e2e/global-setup.ts",
  ],
  rules: {
    files: "error",
    dependencies: "error",
    devDependencies: "error",
    unlisted: "error",
    binaries: "error",
    unresolved: "error",
    // Pre-existing unused-export debt tracked as follow-up (WP8 lint tightening)
    exports: "warn",
    types: "warn",
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
