import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import vitest from "@vitest/eslint-plugin";
import { defineConfig } from "eslint/config";
import drizzle from "eslint-plugin-drizzle";
import erasableSyntaxOnly from "eslint-plugin-erasable-syntax-only";
import functional from "eslint-plugin-functional";
import importX from "eslint-plugin-import-x";
import jsxA11y from "eslint-plugin-jsx-a11y";
import nPlugin from "eslint-plugin-n";
import noSecrets from "eslint-plugin-no-secrets";
import perfectionist from "eslint-plugin-perfectionist";
import playwright from "eslint-plugin-playwright";
import promisePlugin from "eslint-plugin-promise";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import regexp from "eslint-plugin-regexp";
import security from "eslint-plugin-security";
import sonarjs from "eslint-plugin-sonarjs";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  // ---- Global ignores ----
  {
    ignores: [
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      "**/.turbo/**",
      "**/node_modules/**",
      "**/*.generated.*",
      "**/types.gen.ts",
      "**/next-env.d.ts",
      "supabase/.branches/**",
      "coverage/**",
      "packages/ingest/bin/**",
    ],
  },

  // ---- BASE: TypeScript + JS, type-aware ----
  {
    name: "ituri/base",
    files: ["**/*.{ts,tsx,mts,cts,js,mjs,cjs,jsx}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
      unicorn.configs.recommended,
      perfectionist.configs["recommended-natural"],
      promisePlugin.configs["flat/recommended"],
      sonarjs.configs.recommended,
      regexp.configs["flat/recommended"],
      erasableSyntaxOnly.configs.recommended,
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            "eslint.config.ts",
            "knip.config.ts",
            "vitest.config.ts",
            "packages/*/vitest.config.ts",
            "packages/db/drizzle.config.ts",
            "evals/vitest.config.ts",
          ],
          // WP7: apps/web/e2e/*.ts removed from allowDefaultProject — they now have
          // their own apps/web/e2e/tsconfig.json which ESLint projectService picks up.
          // eslint-disable-next-line @typescript-eslint/naming-convention
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 20,
        },
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: { jsx: true },
      },
      globals: { ...globals.browser, ...globals.node, ...globals.es2024 },
    },
    plugins: { "no-secrets": noSecrets, security },
    settings: {
      "import-x/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: ["./tsconfig.json", "./apps/*/tsconfig.json", "./packages/*/tsconfig.json"],
        },
      },
      react: { version: "detect" },
      n: { version: ">=22.0.0" },
    },
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      // ---- typescript-eslint type-aware ----
      "@typescript-eslint/no-floating-promises": ["error", { ignoreVoid: true, ignoreIIFE: true }],
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/require-await": "error",
      "@typescript-eslint/no-unnecessary-condition": [
        "error",
        { allowConstantLoopConditions: true, checkTypePredicates: true },
      ],
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-unsafe-type-assertion": "error",
      "@typescript-eslint/strict-boolean-expressions": [
        "error",
        {
          allowString: true,
          allowNumber: false,
          allowNullableObject: true,
          allowNullableBoolean: false,
          allowNullableString: false,
          allowNullableNumber: false,
          allowAny: false,
        },
      ],
      "@typescript-eslint/switch-exhaustiveness-check": [
        "error",
        { considerDefaultExhaustiveForUnions: true },
      ],
      "@typescript-eslint/prefer-readonly": "error",
      "@typescript-eslint/prefer-nullish-coalescing": [
        "error",
        { ignoreConditionalTests: true, ignorePrimitives: true },
      ],
      "@typescript-eslint/prefer-optional-chain": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",
      "@typescript-eslint/promise-function-async": "error",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowNumber: true,
          allowBoolean: true,
          allowNullish: false,
          allowAny: false,
          allowRegExp: false,
        },
      ],
      "@typescript-eslint/restrict-plus-operands": [
        "error",
        {
          allowAny: false,
          allowBoolean: false,
          allowNullish: false,
          allowNumberAndString: false,
          allowRegExp: false,
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "separate-type-imports",
          disallowTypeAnnotations: true,
        },
      ],
      "@typescript-eslint/consistent-type-exports": [
        "error",
        { fixMixedExportsWithInlineTypeSpecifier: true },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/unbound-method": ["error", { ignoreStatic: true }],
      "@typescript-eslint/no-shadow": "error",
      "@typescript-eslint/member-ordering": "warn",
      "@typescript-eslint/no-confusing-void-expression": [
        "error",
        { ignoreVoidReturningFunctions: true, ignoreArrowShorthand: true },
      ],
      "@typescript-eslint/no-meaningless-void-operator": "error",
      "@typescript-eslint/prefer-find": "error",
      "@typescript-eslint/prefer-includes": "error",
      "@typescript-eslint/prefer-string-starts-ends-with": "error",
      "@typescript-eslint/no-base-to-string": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-empty-function": [
        "error",
        { allow: ["constructors", "arrowFunctions"] },
      ],
      "@typescript-eslint/only-throw-error": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          minimumDescriptionLength: 10,
          "ts-expect-error": "allow-with-description",
          "ts-ignore": true,
          "ts-nocheck": true,
          "ts-check": false,
        },
      ],
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "default",
          format: ["camelCase"],
          leadingUnderscore: "allow",
        },
        {
          selector: "variable",
          format: ["camelCase", "UPPER_CASE", "PascalCase"],
          leadingUnderscore: "allow",
        },
        {
          // React components and Next.js HTTP handlers (GET, POST…) require PascalCase or UPPER_CASE.
          selector: "function",
          format: ["camelCase", "PascalCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
        },
        {
          // External packages export PascalCase names (Link, React, CheckboxPrimitive…).
          selector: "import",
          format: ["camelCase", "PascalCase", "UPPER_CASE"],
        },
        {
          // Tailwind palette keys ("DEFAULT", "1"–"5"), CSS var names (kebab/@), ESLint rule names (plugin/rule, plugin-name).
          selector: "objectLiteralProperty",
          format: null,
          filter: {
            regex: String.raw`^([A-Z][A-Z0-9_]*|[A-Z]{2,}[a-z]*|[A-Z][a-z][A-Za-z0-9]*|[0-9]+|[@-].*|.+[-/].+|\..*)$`,
            match: true,
          },
        },
        {
          selector: "parameter",
          format: ["camelCase"],
          leadingUnderscore: "allow",
        },
        {
          selector: "memberLike",
          modifiers: ["private"],
          format: ["camelCase"],
          leadingUnderscore: "require",
        },
        { selector: "typeLike", format: ["PascalCase"] },
        {
          selector: "typeParameter",
          format: ["PascalCase"],
          prefix: ["T", "K", "V", "U"],
        },
        {
          selector: "interface",
          format: ["PascalCase"],
          custom: { regex: "^I[A-Z]", match: false },
        },
        {
          selector: "typeAlias",
          filter: { regex: "Id$", match: true },
          format: ["PascalCase"],
        },
        { selector: "enumMember", format: ["UPPER_CASE", "PascalCase"] },
      ],

      // ---- Core ESLint rules: AI slop catchers ----
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-var": "error",
      "prefer-const": "error",
      "prefer-template": "error",
      "no-await-in-loop": "error",
      "consistent-return": "error",
      "default-case-last": "error",
      "guard-for-in": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
      curly: ["error", "all"],
      "object-shorthand": "error",
      "no-else-return": ["error", { allowElseIf: false }],
      "no-lonely-if": "error",
      "no-useless-concat": "error",
      "no-useless-rename": "error",
      "no-useless-computed-key": "error",
      "no-unneeded-ternary": "error",
      radix: "error",

      // ---- HARD CAPS ----
      "max-lines": ["error", { max: 400, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": [
        "error",
        { max: 75, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
      "max-params": ["error", 3],
      complexity: ["error", { max: 12 }],
      "sonarjs/cognitive-complexity": ["error", 15],
      "max-depth": ["error", 4],
      "max-nested-callbacks": ["error", 3],
      "max-statements": ["error", 20],
      "max-statements-per-line": ["error", { max: 1 }],
      "max-classes-per-file": ["error", 1],

      // ---- no-restricted-imports: ban the footguns ----
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "lodash",
              message: "Use lodash-es with named imports, or write the helper yourself.",
            },
            { name: "moment", message: "Use date-fns or Temporal polyfill." },
            { name: "request", message: "Use the native fetch API." },
            {
              name: "node-fetch",
              message: "Use the native fetch API (Node 18+).",
            },
            {
              name: "@supabase/auth-helpers-nextjs",
              message: "Deprecated; use @supabase/ssr.",
            },
            {
              name: "react",
              importNames: ["default"],
              message: "Use named imports: `import { useState } from 'react'`.",
            },
          ],
          patterns: [
            {
              group: ["../../**", "**/../../**"],
              message: "No parent-relative imports beyond one level — use @/* aliases.",
            },
          ],
        },
      ],

      // ---- no-restricted-syntax: catch sloppy patterns ----
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSEnumDeclaration",
          message: "Use `const X = {...} as const` with a derived union type instead of enums.",
        },
        {
          selector: "TSModuleDeclaration[kind='namespace']",
          message: "Use ES modules; namespaces are banned.",
        },
        {
          selector: "CatchClause[body.body.length=0]",
          message: "Empty catch blocks swallow errors. Log or rethrow.",
        },
        {
          selector: "CallExpression[callee.property.name='then'] > ArrowFunctionExpression",
          message: "Prefer async/await over .then() chains.",
        },
      ],

      // ---- import-x ----
      "import-x/no-cycle": ["error", { maxDepth: 3, ignoreExternal: true }],
      "import-x/no-self-import": "error",
      "import-x/no-useless-path-segments": ["error", { noUselessIndex: true }],
      "import-x/no-relative-packages": "error",
      "import-x/no-default-export": "warn",
      "import-x/no-duplicates": ["error", { "prefer-inline": false }],
      "import-x/first": "error",
      "import-x/newline-after-import": "error",
      "import-x/no-amd": "error",
      "import-x/no-mutable-exports": "error",
      "import-x/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: [
            "**/*.{test,spec,e2e}.{ts,tsx}",
            "**/*.config.{ts,js,mjs}",
            "**/vitest.setup.{ts,js}",
            "**/test/**",
            "**/tests/**",
          ],
        },
      ],
      "import-x/consistent-type-specifier-style": ["error", "prefer-top-level"],

      // ---- Unicorn (cherry-picked) ----
      "unicorn/no-null": "off",
      "unicorn/no-array-reduce": "off",
      "unicorn/no-array-callback-reference": "error",
      "unicorn/no-array-for-each": "warn",
      "unicorn/prefer-node-protocol": "error",
      "unicorn/prefer-top-level-await": "error",
      "unicorn/throw-new-error": "error",
      "unicorn/error-message": "error",
      "unicorn/filename-case": [
        "error",
        {
          cases: { kebabCase: true, pascalCase: true },
          ignore: ["next-env.d.ts", "README.md", String.raw`\.config\.(ts|js|mjs)$`],
        },
      ],
      "unicorn/no-useless-undefined": ["error", { checkArguments: false }],
      "unicorn/prefer-string-replace-all": "error",
      "unicorn/prefer-structured-clone": "error",
      "unicorn/no-typeof-undefined": "error",
      "unicorn/prevent-abbreviations": "off",
      "unicorn/no-keyword-prefix": "off",
      "unicorn/prefer-module": "error",
      "unicorn/expiring-todo-comments": "off",

      // ---- perfectionist ----
      // Biome organizeImports handles import ordering; perfectionist/sort-imports conflicts with Biome's alias resolution.
      "perfectionist/sort-imports": "off",
      "perfectionist/sort-named-imports": ["error", { type: "natural" }],
      "perfectionist/sort-objects": "off",
      "perfectionist/sort-jsx-props": "off",

      // ---- promise ----
      "promise/no-return-wrap": "error",
      "promise/no-nesting": "warn",
      "promise/no-promise-in-callback": "warn",

      // ---- security / secrets ----
      "no-secrets/no-secrets": ["error", { tolerance: 4.5 }],
      "security/detect-object-injection": "off",
      "security/detect-non-literal-fs-filename": "warn",
      "security/detect-unsafe-regex": "error",
      "security/detect-eval-with-expression": "error",

      // ---- sonarjs extras ----
      "sonarjs/no-duplicate-string": ["warn", { threshold: 5 }],
      "sonarjs/no-identical-functions": "error",
      "sonarjs/no-collapsible-if": "error",
      "sonarjs/no-redundant-jump": "error",
      "sonarjs/no-small-switch": "off",
    },
  },

  // ---- React + Next + a11y ----
  {
    name: "ituri/react",
    files: ["apps/web/**/*.{ts,tsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      "@next/next": nextPlugin,
    },
    languageOptions: { globals: globals.browser },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat["jsx-runtime"].rules,
      ...reactHooks.configs["recommended-latest"].rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "react/jsx-no-leaked-render": ["error", { validStrategies: ["ternary"] }],
      "react/no-array-index-key": "error",
      "react/self-closing-comp": "error",
      "react/jsx-curly-brace-presence": ["error", { props: "never", children: "never" }],
      "@next/next/no-img-element": "error",
      "@next/next/no-html-link-for-pages": "error",
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/rules-of-hooks": "error",
    },
  },

  // ---- Drizzle scope ----
  {
    name: "ituri/drizzle",
    files: ["apps/web/db/**/*.ts", "packages/db/**/*.ts"],
    plugins: { drizzle },
    rules: {
      "drizzle/enforce-delete-with-where": ["error", { drizzleObjectName: ["db", "tx"] }],
      "drizzle/enforce-update-with-where": ["error", { drizzleObjectName: ["db", "tx"] }],
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='select'][arguments.length=0]",
          message:
            "Pass an explicit columns object to .select(); never select * (bypasses RLS column projection).",
        },
      ],
    },
  },

  // ---- Next.js files that MUST default-export ----
  {
    name: "ituri/next-default-exports",
    files: [
      "apps/web/app/**/page.tsx",
      "apps/web/app/**/layout.tsx",
      "apps/web/app/**/error.tsx",
      "apps/web/app/**/loading.tsx",
      "apps/web/app/**/not-found.tsx",
      "apps/web/app/**/route.ts",
      "apps/web/app/**/template.tsx",
      "apps/web/app/**/opengraph-image.{ts,tsx}",
      "apps/web/app/robots.ts",
      "apps/web/app/sitemap.ts",
      "apps/web/middleware.ts",
      "apps/web/instrumentation.ts",
      "apps/web/next.config.{ts,js,mjs}",
      // Root layout until monorepo migration completes
      "app/**/page.tsx",
      "app/**/layout.tsx",
      "app/**/error.tsx",
      "app/**/loading.tsx",
      "app/**/not-found.tsx",
      "app/**/route.ts",
      "app/**/template.tsx",
      "middleware.ts",
      "next.config.{ts,js,mjs}",
    ],
    rules: { "import-x/no-default-export": "off" },
  },

  // ---- Client Component boundary: ban server-only imports ----
  // Next.js App Router route files are always Server Components — exclude them.
  {
    name: "ituri/client-component-boundary",
    files: ["apps/web/**/*.tsx"],
    ignores: [
      "apps/web/app/**/page.tsx",
      "apps/web/app/**/layout.tsx",
      "apps/web/app/**/template.tsx",
      "apps/web/app/**/loading.tsx",
      "apps/web/app/**/not-found.tsx",
      "apps/web/app/**/error.tsx",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message: "server-only must not be imported in a Client Component.",
            },
            {
              name: "@/db",
              message: "DB access is server-only. Move into a Server Action or Route Handler.",
            },
            {
              name: "@anthropic-ai/sdk",
              message: "Anthropic client is server-only.",
            },
          ],
        },
      ],
    },
  },

  // ---- packages/shared & packages/extract: strictest (pure, no I/O) ----
  {
    name: "ituri/packages-shared",
    files: ["packages/shared/**/*.ts", "packages/extract/**/*.ts"],
    extends: [nPlugin.configs["flat/recommended-module"], functional.configs.recommended],
    rules: {
      "functional/immutable-data": "error",
      "functional/no-let": "warn",
      "functional/no-throw-statements": "off",
      "functional/prefer-immutable-types": "off",
      "n/no-process-env": "error",
      "n/no-sync": "error",
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "max-lines-per-function": ["error", { max: 30, skipBlankLines: true, skipComments: true }],
      "import-x/no-default-export": "error",
    },
  },

  // ---- Tests ----
  {
    name: "ituri/tests",
    files: ["**/*.{test,spec}.{ts,tsx}", "**/tests/**/*.{ts,tsx}", "**/__tests__/**/*.{ts,tsx}"],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      "vitest/expect-expect": ["error", { assertFunctionNames: ["expect", "expectTypeOf"] }],
      "max-lines-per-function": ["error", { max: 200 }],
      "max-lines": ["error", { max: 600 }],
      "@typescript-eslint/no-non-null-assertion": "off",
      // Vitest mock factories use PascalCase component names as object keys and
      // async mock helpers without explicit awaits — relax naming + async rules.
      "@typescript-eslint/naming-convention": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/promise-function-async": "off",
      "functional/functional-parameters": "off",
      "no-console": "off",
      "sonarjs/no-duplicate-string": "off",
      "import-x/no-extraneous-dependencies": "off",
      "functional/no-expression-statements": "off",
      "functional/no-return-void": "off",
      "functional/immutable-data": "off",
      "n/no-extraneous-import": "off",
      "n/no-missing-import": "off",
    },
  },

  // ---- Playwright ----
  {
    name: "ituri/playwright",
    files: ["apps/web/e2e/**/*.ts"],
    extends: [playwright.configs["flat/recommended"]],
    rules: {
      "playwright/no-skipped-test": "warn",
      "playwright/expect-expect": "error",
    },
  },

  // ---- Config files ----
  {
    name: "ituri/configs",
    files: [
      "**/*.config.{ts,js,mjs}",
      "**/.*rc.{ts,js,mjs}",
      "**/vitest.setup.{ts,js}",
      "**/vitest.*.setup.{ts,js}",
      "**/vitest.*.globalSetup.{ts,js}",
      "tooling/**/*.ts",
    ],
    rules: {
      "import-x/no-default-export": "off",
      "import-x/no-extraneous-dependencies": "off",
      "import-x/no-named-as-default": "off",
      "import-x/no-named-as-default-member": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "no-restricted-imports": "off",
      "max-lines": "off",
      "n/no-extraneous-import": "off",
    },
  },

  // ---- Scripts (CLI tools — console output is intentional) ----
  {
    name: "ituri/scripts",
    files: ["**/scripts/**/*.ts"],
    rules: {
      "no-console": "off",
      "import-x/no-extraneous-dependencies": "off",
      "n/no-extraneous-import": "off",
    },
  },

  // ---- proxy.ts: String.raw banned — Next.js extractExportedConstValue cannot evaluate tagged template literals ----
  {
    name: "ituri/proxy",
    files: ["apps/web/proxy.ts"],
    rules: { "unicorn/prefer-string-raw": "off" },
  },

  // ---- Supabase Edge Functions (Deno) ----
  {
    name: "ituri/supabase-functions",
    files: ["supabase/functions/**/*.ts"],
    languageOptions: { globals: { Deno: "readonly" } },
    rules: {
      "n/no-missing-import": "off",
      "import-x/no-unresolved": "off",
      "unicorn/prefer-node-protocol": "off",
    },
  },

  // ---- JS-only files: disable type checking ----
  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
