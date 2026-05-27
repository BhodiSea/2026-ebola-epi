# ituri-sitrep — Reference-Grade TypeScript + ESLint + Biome 2 Ruleset (2026)

## TL;DR

- **Run Biome 2 (starting from the `ultracite` preset) for format + fast lint + organize-imports on every save and pre-commit, AND ESLint flat config with `typescript-eslint` v8 `strictTypeChecked` + `stylisticTypeChecked` for type-aware rules Biome's single-file type synthesizer still misses** — per the Biome v2 launch post (biomejs.dev/blog/biome-v2/): _"Preliminary testing shows that our noFloatingPromises rule, which is based on our new type inference work, can detect floating promises in about 75% of the cases that would be detected by using typescript-eslint, at a fraction of the performance impact."_
- **Anchor strictness in `tsconfig.json` first** (`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `verbatimModuleSyntax`, `isolatedModules`, `erasableSyntaxOnly`) — these catch more AI slop than any lint rule, and the user pays them once at write-time rather than on every lint pass.
- **Hard caps (file/function/complexity) are an opinionated layer NOT enforced by any of the top-tier public configs surveyed.** Shopify's CHANGELOG explicitly lists `max-lines-per-function (disabled)` and `max-classes-per-file (disabled)`; Google `gts`'s `.eslintrc.json` has no length or complexity rules; typescript-eslint's own `eslint.config.mjs` has none either. We add them because you asked — pick **SonarSource's documented default of 15 for cognitive complexity**, **400-line files**, **75-line functions**, **3 params**, **4-level nesting**.

---

## Key Findings

1. **Hybrid is correct in 2026.** The industry has converged on "Biome for the fast 90%, ESLint for type-aware + ecosystem-specific". Biome v2 added type-aware rules (`noFloatingPromises`, `noMisusedPromises`, `useAwaitThenable`, `noUnnecessaryConditions` — moved to a `types` domain in v2.4). But the Biome v2 launch post is explicit about limits: _"It can currently only analyse types that occur in the same file."_ Vercel even ran an internal "stress test Biome's noFloatingPromises" competition (vercel.com/blog/stress-testing-biomes-nofloatingpromises-lint-rule) and documented many `PromiseLike` / generic-conditional edge cases the rule still misses. ESLint with `typescript-eslint` remains required for production-grade type-aware linting.

2. **`projectService: true` is the only correct parser setup in 2026.** typescript-eslint's own `eslint.config.mjs` (github.com/typescript-eslint/typescript-eslint/blob/main/eslint.config.mjs) uses `parserOptions: { projectService: true, tsconfigRootDir: __dirname }`. It eliminates the `tsconfig.eslint.json` hack, gives editor-identical types, and supports project references — crucial for a pnpm monorepo. Per Josh Goldberg's May 29, 2025 blog post, the legacy `parserOptions.project: true` is now demoted to a fallback.

3. **`eslint-plugin-import-x` has replaced `eslint-plugin-import`.** Per the import-x README: _"eslint-plugin-import refused to accept BREAKING CHANGES… eslint-plugin-import refuses to support the exports feature, and the maintainer even locked the feature request issue to prevent future discussion."_ Use import-x for `no-cycle`, `no-default-export`, `no-self-import`. **Important perf flag**: per `eslint-plugin-import` GitHub issue #2182 ("import/no-cycle takes 70% of lint time"), and stronger numbers from issues #1943 and #2348 (99.3% and 97.0% of total lint time respectively on real codebases), the rule is the single biggest cost in ESLint. Set `maxDepth: 3` and consider scoping to CI only.

4. **`erasableSyntaxOnly` (TS 5.8+) is the cheapest way to ban enums, namespaces, and parameter properties** — better than `no-restricted-syntax` selectors because the typechecker enforces it. From TS 5.8 release notes (typescriptlang.org): _"That's why TypeScript 5.8 introduces the `--erasableSyntaxOnly` flag. When this flag is enabled, TypeScript will error on most TypeScript-specific constructs that have runtime behavior."_ Combine with `eslint-plugin-erasable-syntax-only` for in-editor red squiggles.

5. **No major public config from Vercel, Shopify, Google, Sentry, Cloudflare, or the typescript-eslint team enforces numeric caps on `max-lines`, `complexity`, or `no-magic-numbers`.** Verified against `vercel/next-forge`'s tsconfig (uses Biome+ultracite, no length caps), `Shopify/web-configs`' CHANGELOG (explicit "disabled"), `google/gts/.eslintrc.json` (no length rules; gts README: _"No lint rules to edit, no configuration to update, no more bike shedding over syntax."_), and `typescript-eslint/typescript-eslint/eslint.config.mjs` (no caps). We're going stricter intentionally.

6. **The user's `// @ts-ignore` → `// @ts-expect-error` instinct mirrors what typescript-eslint themselves enforce.** Verbatim from their `eslint.config.mjs`: `'@typescript-eslint/ban-ts-comment': ['error', { minimumDescriptionLength: 5, 'ts-check': false, 'ts-expect-error': 'allow-with-description', 'ts-ignore': true, 'ts-nocheck': true }]`. We use `minimumDescriptionLength: 10` (stricter).

7. **Push back on "ban enums entirely via ESLint":** with `erasableSyntaxOnly: true`, enums are already a tsc error, so a duplicate `no-restricted-syntax: TSEnumDeclaration` rule is redundant noise. Keep `erasableSyntaxOnly` only. (Keep the no-restricted-syntax stub commented out as documentation.)

8. **Push back on `unicorn/no-null`:** Supabase/Postgres treats `null` as semantically distinct from `undefined`/missing. Disable globally. Same for `unicorn/no-array-reduce` (ideological), `unicorn/prevent-abbreviations` (false-positive minefield).

9. **`tseslint.configs.strictTypeChecked` is not stable semver** per typescript-eslint docs: _"This configuration is not considered 'stable' under Semantic Versioning. Its enabled rules and/or their options may change outside of major version updates."_ Pin your typescript-eslint version and read the changelog on bumps.

---

## Details

### 1) `tsconfig.base.json` — every compiler option, justified

Start conceptually from **`@total-typescript/tsconfig/bundler/dom`** (Matt Pocock, github.com/total-typescript/tsconfig/blob/main/bundler/dom.json), whose verbatim contents are:

```json
{
  "compilerOptions": {
    "esModuleInterop": true,
    "skipLibCheck": true,
    "target": "es2022",
    "allowJs": true,
    "resolveJsonModule": true,
    "moduleDetection": "force",
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "module": "preserve",
    "noEmit": true,
    "lib": ["es2022", "dom", "dom.iterable"]
  }
}
```

Then add the flags Matt explicitly leaves out as "too noisy" — we re-enable them because the user wants an aggressive reviewer.

```jsonc
// tsconfig.base.json — project root
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    // Module / target
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "moduleDetection": "force",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "useDefineForClassFields": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "forceConsistentCasingInFileNames": true,
    "incremental": true,
    "tsBuildInfoFile": ".turbo/tsbuildinfo.json",

    // Strict family (full)
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "strictBuiltinIteratorReturn": true,
    "alwaysStrict": true,
    "useUnknownInCatchVariables": true,

    // Underrated strictness
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "noPropertyAccessFromIndexSignature": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false,

    // Build hygiene
    "skipLibCheck": true,
    "noEmit": true,
    "declaration": false,
  },
  "exclude": ["node_modules", ".next", "dist", ".turbo", "supabase/functions"],
}
```

**Per-option verdict** (highlights):

| Flag                                 | Verdict                                | Cost                                                          | What it catches                                                                                                                                                                |
| ------------------------------------ | -------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `noUncheckedIndexedAccess`           | **On**                                 | High initial friction (~50 sites per medium app)              | The #1 AI footgun: `arr[0].name` without bounds-check                                                                                                                          |
| `exactOptionalPropertyTypes`         | **On**                                 | Real pain at React boundaries (`{x?:T}` ≠ `{x:T\|undefined}`) | Forces honest typing of optionality                                                                                                                                            |
| `noPropertyAccessFromIndexSignature` | **On in packages/\*, off in apps/web** | Fights `process.env.FOO` patterns                             | Forces `obj["foo"]` to surface index-sig contracts (use `@t3-oss/env-nextjs` to bypass for env vars)                                                                           |
| `verbatimModuleSyntax`               | **On**                                 | Need `import type` everywhere                                 | Server/Client boundary cleanliness; smaller bundles                                                                                                                            |
| `erasableSyntaxOnly`                 | **On**                                 | Some legacy code in workspaces uses enums                     | Per Matt Pocock: _"It disables a bunch of features that I don't think should ever have been part of TypeScript."_ Also gives free Node 22 `--experimental-strip-types` interop |
| `skipLibCheck`                       | **On** (justified)                     | None — opposite is a 30s+ tax                                 | typescript-eslint themselves keep it on                                                                                                                                        |
| `useUnknownInCatchVariables`         | **On**                                 | Have to narrow in catch                                       | `catch (e)` is `unknown`, not `any`                                                                                                                                            |
| `strictBuiltinIteratorReturn`        | **On**                                 | None                                                          | TS 5.6+; correct Generator/Iterator return typing                                                                                                                              |

**Compared with `@tsconfig/strictest`**: it bundles `exactOptionalPropertyTypes: true` and `noPropertyAccessFromIndexSignature: true`. Both painful but worth it for `packages/shared`. We **roll our own** because Next.js `process.env` access fights `noPropertyAccessFromIndexSignature` and we need the override.

**Per-package overrides:**

```jsonc
// packages/shared/tsconfig.json — strictest, library
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "lib": ["ES2023"],
  },
  "include": ["src"],
}
```

```jsonc
// apps/web/tsconfig.json — Next.js 15
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] },
    "noPropertyAccessFromIndexSignature": false,
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
}
```

```jsonc
// supabase/functions/tsconfig.json — Deno scope
{
  "compilerOptions": {
    "lib": ["deno.ns", "deno.window", "ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
  },
}
```

### 2) ESLint flat config (`eslint.config.ts`)

Use the new `defineConfig()` helper from ESLint core (March 2025 release) which restored `extends` inside flat configs.

**Plugin verdict matrix:**

| Plugin                                | Use                  | Severity verdict                                                       |
| ------------------------------------- | -------------------- | ---------------------------------------------------------------------- |
| `@eslint/js` + `typescript-eslint` v8 | base                 | `strictTypeChecked + stylisticTypeChecked`                             |
| `eslint-plugin-react`                 | React 19             | recommended; `react-in-jsx-scope: off`                                 |
| `eslint-plugin-react-hooks` (v5+)     | hooks + Compiler     | `recommended-latest`, error                                            |
| `eslint-plugin-jsx-a11y`              | a11y                 | recommended, error                                                     |
| `eslint-plugin-import-x`              | imports              | NOT `eslint-plugin-import`                                             |
| `eslint-plugin-unicorn`               | misc                 | cherry-pick, NOT recommended preset                                    |
| `@next/eslint-plugin-next`            | Next.js              | `core-web-vitals`, error                                               |
| `eslint-plugin-perfectionist`         | sorting              | replaces `sort-imports`, `sort-keys`                                   |
| `eslint-plugin-promise`               | promises             | flat/recommended                                                       |
| `eslint-plugin-n`                     | Node                 | `recommended-module`, Node packages only                               |
| `@vitest/eslint-plugin`               | tests                | recommended in `*.test.ts`                                             |
| `eslint-plugin-playwright`            | e2e                  | `tests/e2e/*` only                                                     |
| `eslint-plugin-drizzle`               | DB                   | both `enforce-delete-with-where` and `enforce-update-with-where` error |
| `eslint-plugin-functional`            | FP                   | `packages/shared` + `packages/extract` ONLY                            |
| `eslint-plugin-security`              | sec                  | a few rules (warn)                                                     |
| `eslint-plugin-no-secrets`            | secrets              | error                                                                  |
| `eslint-plugin-regexp`                | regex                | recommended                                                            |
| `eslint-plugin-sonarjs`               | cognitive complexity | recommended + threshold 15                                             |
| `eslint-plugin-erasable-syntax-only`  | editor feedback      | recommended (redundant with tsc but faster)                            |

**Full `eslint.config.ts`:**

```ts
// eslint.config.ts
import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import importX from "eslint-plugin-import-x";
import nextPlugin from "@next/eslint-plugin-next";
import unicorn from "eslint-plugin-unicorn";
import perfectionist from "eslint-plugin-perfectionist";
import promisePlugin from "eslint-plugin-promise";
import nPlugin from "eslint-plugin-n";
import vitest from "@vitest/eslint-plugin";
import playwright from "eslint-plugin-playwright";
import drizzle from "eslint-plugin-drizzle";
import functional from "eslint-plugin-functional";
import security from "eslint-plugin-security";
import noSecrets from "eslint-plugin-no-secrets";
import regexp from "eslint-plugin-regexp";
import sonarjs from "eslint-plugin-sonarjs";
import erasableSyntaxOnly from "eslint-plugin-erasable-syntax-only";
import globals from "globals";

export default defineConfig(
  // Global ignores
  {
    ignores: [
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      "**/.turbo/**",
      "**/node_modules/**",
      "**/*.generated.*",
      "**/next-env.d.ts",
      "supabase/.branches/**",
      "coverage/**",
    ],
  },

  // BASE: TypeScript + JS, type-aware
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
        projectService: true,
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
          project: [
            "./tsconfig.json",
            "./apps/*/tsconfig.json",
            "./packages/*/tsconfig.json",
          ],
        },
      },
      react: { version: "detect" },
    },
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      // ---- typescript-eslint type-aware (escalated to error) ----
      "@typescript-eslint/no-floating-promises": [
        "error",
        { ignoreVoid: true, ignoreIIFE: true },
      ],
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
          fixStyle: "inline-type-imports",
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
      "max-lines": [
        "error",
        { max: 400, skipBlankLines: true, skipComments: true },
      ],
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
              message:
                "Use lodash-es with named imports, or write the helper yourself.",
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
              group: ["**/.."],
              message:
                "No parent-relative imports beyond one level — use @/* aliases.",
            },
          ],
        },
      ],

      // ---- no-restricted-syntax: catch sloppy patterns ----
      "no-restricted-syntax": [
        "error",
        // Enums/namespaces already blocked by erasableSyntaxOnly at tsc level; kept here for IDE clarity.
        {
          selector: "TSEnumDeclaration",
          message:
            "Use `const X = {...} as const` with a derived union type instead of enums.",
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
          selector:
            "CallExpression[callee.property.name='then'] > ArrowFunctionExpression",
          message: "Prefer async/await over .then() chains.",
        },
      ],

      // ---- import-x ----
      "import-x/no-cycle": ["error", { maxDepth: 3, ignoreExternal: true }],
      "import-x/no-self-import": "error",
      "import-x/no-useless-path-segments": ["error", { noUselessIndex: true }],
      "import-x/no-relative-packages": "error",
      "import-x/no-default-export": "warn",
      "import-x/no-duplicates": ["error", { "prefer-inline": true }],
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
            "**/test/**",
            "**/tests/**",
          ],
        },
      ],
      "import-x/consistent-type-specifier-style": ["error", "prefer-inline"],

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
          ignore: ["next-env.d.ts", "README.md", "\\.config\\.(ts|js|mjs)$"],
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
      "perfectionist/sort-imports": [
        "error",
        {
          type: "natural",
          order: "asc",
          groups: [
            "type-import",
            ["value-builtin", "value-external"],
            "type-internal",
            "value-internal",
            ["type-parent", "type-sibling", "type-index"],
            ["value-parent", "value-sibling", "value-index"],
            "side-effect",
            "unknown",
          ],
          internalPattern: ["^@/.+", "^~/.+"],
          newlinesBetween: 1,
        },
      ],
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

  // React + Next + a11y
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
      "react/jsx-curly-brace-presence": [
        "error",
        { props: "never", children: "never" },
      ],
      "@next/next/no-img-element": "error",
      "@next/next/no-html-link-for-pages": "error",
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/rules-of-hooks": "error",
    },
  },

  // Drizzle scope
  {
    name: "ituri/drizzle",
    files: ["apps/web/db/**/*.ts", "packages/db/**/*.ts"],
    plugins: { drizzle },
    rules: {
      "drizzle/enforce-delete-with-where": [
        "error",
        { drizzleObjectName: ["db", "tx"] },
      ],
      "drizzle/enforce-update-with-where": [
        "error",
        { drizzleObjectName: ["db", "tx"] },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.property.name='select'][arguments.length=0]",
          message:
            "Pass an explicit columns object to .select(); never select * (bypasses RLS column projection).",
        },
      ],
    },
  },

  // Next.js files that MUST default-export
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
      "apps/web/middleware.ts",
      "apps/web/instrumentation.ts",
      "apps/web/next.config.{ts,js,mjs}",
    ],
    rules: { "import-x/no-default-export": "off" },
  },

  // Client Component boundary: ban server-only imports
  {
    name: "ituri/client-component-boundary",
    files: ["apps/web/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "server-only must not be imported in a Client Component.",
            },
            {
              name: "@/db",
              message:
                "DB access is server-only. Move into a Server Action or Route Handler.",
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

  // packages/shared & packages/extract: strictest (pure, no I/O)
  {
    name: "ituri/packages-shared",
    files: ["packages/shared/**/*.ts", "packages/extract/**/*.ts"],
    extends: [
      nPlugin.configs["flat/recommended-module"],
      functional.configs.recommended,
    ],
    rules: {
      "functional/immutable-data": "error",
      "functional/no-let": "warn",
      "functional/no-throw-statements": "off",
      "functional/prefer-immutable-types": "off",
      "n/no-process-env": "error",
      "n/no-sync": "error",
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "max-lines-per-function": [
        "error",
        { max: 30, skipBlankLines: true, skipComments: true },
      ],
      "import-x/no-default-export": "error",
    },
  },

  // Tests
  {
    name: "ituri/tests",
    files: [
      "**/*.{test,spec}.{ts,tsx}",
      "**/tests/**/*.{ts,tsx}",
      "**/__tests__/**/*.{ts,tsx}",
    ],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      "max-lines-per-function": ["error", { max: 200 }],
      "max-lines": ["error", { max: 600 }],
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "no-console": "off",
      "sonarjs/no-duplicate-string": "off",
      "import-x/no-extraneous-dependencies": "off",
    },
  },

  // Playwright
  {
    name: "ituri/playwright",
    files: ["tests/e2e/**/*.ts"],
    extends: [playwright.configs["flat/recommended"]],
    rules: {
      "playwright/no-skipped-test": "warn",
      "playwright/expect-expect": "error",
    },
  },

  // Config files
  {
    name: "ituri/configs",
    files: [
      "**/*.config.{ts,js,mjs}",
      "**/.*rc.{ts,js,mjs}",
      "tooling/**/*.ts",
    ],
    rules: {
      "import-x/no-default-export": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "no-restricted-imports": "off",
      "max-lines": "off",
    },
  },

  // Supabase Edge Functions (Deno)
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

  // JS-only files: disable type checking
  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
```

### 3) Hard caps — numeric justification

| Rule                           | Value   | Industry reference                                                                                                                                                                                                                                                                                                        | Notes                                                               |
| ------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `max-lines`                    | **400** | Steve McConnell, _Code Complete_ (2nd ed.) cites studies recommending ≤200 routines per file; we land at 400 pragmatically. Tests: **600**                                                                                                                                                                                | No major public ESLint config sets this                             |
| `max-lines-per-function`       | **75**  | Google's C++ Style Guide is the source of the "≤40" guideline — verbatim: _"If a function exceeds about 40 lines, think about whether it can be broken up without harming the structure of the program."_ The Google JavaScript Style Guide contains no function-length rule. Linux kernel guide: 48. Rubocop default: 10 | We pick 75 for React components; `packages/shared` tightens to 30   |
| `max-params`                   | **3**   | Robert C. Martin, _Clean Code_: _"the ideal number of arguments for a function is zero…three arguments…should be avoided where possible"_                                                                                                                                                                                 | Forces options-object destructuring                                 |
| `complexity` (cyclomatic)      | **12**  | Thomas J. McCabe, _"A Complexity Measure,"_ IEEE Transactions on Software Engineering, Vol. 2, No. 4, pp. 308–320, December 1976 — McCabe suggested limiting cyclomatic complexity per module to a maximum value of 10. SonarSource defaults to 15                                                                        | Compromise at 12                                                    |
| `sonarjs/cognitive-complexity` | **15**  | SonarSource's documented default. Per the Trimble developer guidelines: _"SonarQube defines a cognitive complexity of 15 as the default threshold for functions. This is a good starting point"_                                                                                                                          | Cognitive > cyclomatic — weighs nesting and is what humans perceive |
| `max-depth`                    | **4**   | McConnell recommends 3; we allow 4 (one guard-clause + one happy path branch)                                                                                                                                                                                                                                             |                                                                     |
| `max-nested-callbacks`         | **3**   | Callback hell defense                                                                                                                                                                                                                                                                                                     |                                                                     |
| `max-statements`               | **20**  | Forces decomposition                                                                                                                                                                                                                                                                                                      |                                                                     |
| `max-statements-per-line`      | **1**   | Always                                                                                                                                                                                                                                                                                                                    |                                                                     |
| `max-classes-per-file`         | **1**   | File = unit-of-thinking                                                                                                                                                                                                                                                                                                   |                                                                     |

**Honest caveat:** I verified against `vercel/next-forge/packages/typescript-config`, `Shopify/web-configs/packages/eslint-plugin/CHANGELOG.md` (explicit `max-lines-per-function (disabled)`), `google/gts/.eslintrc.json`, `getsentry/sentry-javascript` SDK eslint config, and `typescript-eslint/typescript-eslint/eslint.config.mjs`. **None of these configs enforce numeric caps on file/function/complexity.** You are explicitly going stricter than industry baseline. That's the user's intent — but be ready to lower the caps (e.g., max-lines 500, complexity 15, cognitive 20) if friction outweighs value after a month.

### 4) AI-slop rules — what each catches

| Rule                                               | AI-generated mistake it catches                      |
| -------------------------------------------------- | ---------------------------------------------------- |
| `@typescript-eslint/no-floating-promises`          | `someAsyncFn()` without `await` — the #1 LLM mistake |
| `noUncheckedIndexedAccess` (tsc)                   | `arr[0].name` when arr might be empty                |
| `@typescript-eslint/no-non-null-assertion`         | `value!` sprinkled to silence tsc                    |
| `@typescript-eslint/no-explicit-any`               | `as any` escape hatches                              |
| `@typescript-eslint/no-unsafe-*`                   | Downstream uses of `any` leaked from untyped libs    |
| `@typescript-eslint/strict-boolean-expressions`    | `if (str)` ambiguity between `""` and `undefined`    |
| `@typescript-eslint/switch-exhaustiveness-check`   | Missing enum/union cases when LLM refactors          |
| `@typescript-eslint/no-misused-promises`           | Passing async fn to non-promise-aware API            |
| `@typescript-eslint/restrict-template-expressions` | `${someObject}` prints `[object Object]`             |
| `@typescript-eslint/no-unnecessary-condition`      | `if (x !== undefined)` when x is `string`            |
| `unicorn/no-array-callback-reference`              | `arr.map(parseInt)` classic                          |
| `consistent-return`                                | Functions returning sometimes implicitly             |
| `no-await-in-loop`                                 | Serializing parallelizable ops                       |
| `no-restricted-imports: react default`             | Cargo-culted `import React from "react"`             |
| `drizzle/enforce-delete-with-where`                | Catastrophic `db.delete(users)` without where        |
| `ban-ts-comment` w/ description                    | `// @ts-ignore` with no reason                       |
| `unicorn/prefer-node-protocol`                     | `import "fs"` vs `import "node:fs"`                  |
| `sonarjs/cognitive-complexity 15`                  | Nested-if waterfalls                                 |
| `import-x/no-cycle`                                | Circular imports                                     |
| `max-params 3`                                     | 7-positional-arg functions                           |
| `noBarrelFile` (Biome)                             | `export *` re-export sprawl that kills tree-shaking  |

### 5) `biome.json` (full, ready to ship)

```jsonc
{
  "$schema": "https://biomejs.dev/schemas/2.4.0/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true,
    "defaultBranch": "main",
  },
  "files": {
    "includes": [
      "**/*.{ts,tsx,mts,cts,js,mjs,cjs,jsx,json,jsonc,css}",
      "!!**/.next/**",
      "!!**/dist/**",
      "!!**/.turbo/**",
      "!!**/node_modules/**",
      "!**/*.generated.*",
      "!supabase/functions/**",
    ],
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf",
    "useEditorconfig": false,
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "jsxQuoteStyle": "double",
      "semicolons": "always",
      "trailingCommas": "all",
      "arrowParentheses": "always",
      "bracketSpacing": true,
      "bracketSameLine": false,
    },
    "globals": ["React"],
  },
  "json": { "formatter": { "trailingCommas": "none" } },
  "assist": {
    "enabled": true,
    "actions": {
      "source": {
        "organizeImports": {
          "level": "on",
          "options": {
            "groups": [
              ":BUN:",
              ":NODE:",
              ":PACKAGE_WITH_PROTOCOL:",
              ":BLANK_LINE:",
              ":PACKAGE:",
              ":BLANK_LINE:",
              { "source": "^@/.+", "type": false },
              ":BLANK_LINE:",
              ":PATH:",
            ],
          },
        },
      },
    },
  },
  "linter": {
    "enabled": true,
    "domains": {
      "react": "recommended",
      "next": "recommended",
      "test": "recommended",
    },
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedImports": "error",
        "noUnusedVariables": "error",
        "noUnusedFunctionParameters": "error",
        "useExhaustiveDependencies": "error",
        "useHookAtTopLevel": "error",
        "noUnusedPrivateClassMembers": "error",
        "noNodejsModules": "off",
      },
      "suspicious": {
        "noExplicitAny": "error",
        "noConsole": {
          "level": "error",
          "options": { "allow": ["warn", "error"] },
        },
        "noDebugger": "error",
        "noDoubleEquals": "error",
        "noEmptyBlockStatements": "error",
        "noAssignInExpressions": "error",
        "noArrayIndexKey": "error",
        "noConfusingVoidType": "error",
        "noFocusedTests": "error",
      },
      "style": {
        "useImportType": {
          "level": "error",
          "options": { "style": "inlineType" },
        },
        "useExportType": "error",
        "noNonNullAssertion": "error",
        "useConst": "error",
        "useTemplate": "error",
        "noNegationElse": "error",
        "useNodejsImportProtocol": "error",
        "useBlockStatements": "error",
        "useCollapsedElseIf": "error",
        "useDefaultSwitchClause": "warn",
        "useShorthandAssign": "error",
        "useExplicitLengthCheck": "error",
        "noNamespaceImport": "off",
        "noDefaultExport": "off",
        "noParameterAssign": "error",
        "useNamingConvention": "off",
      },
      "complexity": {
        "noExcessiveCognitiveComplexity": {
          "level": "error",
          "options": { "maxAllowedComplexity": 15 },
        },
        "noUselessStringConcat": "error",
        "noUselessUndefinedInitialization": "error",
        "useSimplifiedLogicExpression": "error",
        "noForEach": "off",
      },
      "performance": {
        "noBarrelFile": "error",
        "noReExportAll": "error",
        "useTopLevelRegex": "error",
      },
      "nursery": {
        "noFloatingPromises": "error",
        "noMisusedPromises": "error",
        "useAwaitThenable": "error",
        "useSortedClasses": {
          "level": "error",
          "options": {
            "attributes": ["className"],
            "functions": ["clsx", "cva", "cn", "tw"],
          },
        },
        "noProcessEnv": "off",
      },
      "security": { "noDangerouslySetInnerHtml": "error" },
      "a11y": { "recommended": true },
    },
  },
  "plugins": ["./node_modules/biome-plugin-drizzle/dist/drizzle.grit"],
  "overrides": [
    {
      "includes": [
        "apps/web/app/**/page.tsx",
        "apps/web/app/**/layout.tsx",
        "apps/web/app/**/route.ts",
        "apps/web/middleware.ts",
        "**/*.config.{ts,js,mjs}",
      ],
      "linter": { "rules": { "style": { "noDefaultExport": "off" } } },
    },
    {
      "includes": ["**/*.{test,spec}.{ts,tsx}", "**/tests/**"],
      "linter": {
        "rules": {
          "suspicious": { "noConsole": "off", "noExplicitAny": "off" },
          "style": { "noNonNullAssertion": "off" },
        },
      },
    },
    {
      "includes": ["packages/shared/**", "packages/extract/**"],
      "linter": {
        "rules": {
          "performance": { "noBarrelFile": "error", "noReExportAll": "error" },
          "style": { "noDefaultExport": "error" },
        },
      },
    },
  ],
}
```

### 6) Biome + ESLint cohabitation — division of labor

- **Biome**: format (Prettier replacement), organize-imports, fast safe lint (`recommended` + nursery additions including `useSortedClasses` for Tailwind), `noBarrelFile`, `noReExportAll`, `useExhaustiveDependencies` (React Hooks).
- **ESLint**: type-aware (`no-floating-promises` more accurately, `no-unnecessary-condition`, `restrict-template-expressions`, `strict-boolean-expressions`, `switch-exhaustiveness-check`, `naming-convention`), ecosystem rules (drizzle, jsx-a11y, perfectionist groups, import-x cycle detection, security, no-secrets, sonarjs cognitive complexity), and hard caps.

**Overlap rule**: while Biome's type synthesizer is single-file-only (Biome v2 launch: _"it can currently only analyse types that occur in the same file"_), keep both `noFloatingPromises` (Biome) and `@typescript-eslint/no-floating-promises` (ESLint) ON. Biome catches in editor instantly; ESLint catches the rest in CI. Once Biome's type inference is multi-file (post-v3), turn off the ESLint duplicate.

**Pre-commit — `lefthook.yml`:**

```yaml
pre-commit:
  parallel: false
  commands:
    1_biome:
      glob: "*.{ts,tsx,js,jsx,json,jsonc,css}"
      run: pnpm exec biome check --write --no-errors-on-unmatched {staged_files}
      stage_fixed: true
    2_eslint:
      glob: "*.{ts,tsx,js,jsx}"
      run: pnpm exec eslint --fix --no-warn-ignored {staged_files}
      stage_fixed: true
    3_typecheck:
      glob: "*.{ts,tsx}"
      run: pnpm exec tsc --noEmit -p tsconfig.json
```

**CI — `turbo.json`:**

```jsonc
{
  "tasks": {
    "lint:biome": { "outputs": [], "cache": true },
    "lint:eslint": { "outputs": [], "cache": true, "dependsOn": ["^build"] },
    "typecheck": {
      "outputs": [".turbo/tsbuildinfo.json"],
      "cache": true,
      "dependsOn": ["^build"],
    },
    "test": { "dependsOn": ["^build"] },
  },
}
```

`pnpm turbo lint:biome lint:eslint typecheck --concurrency=4`.

**`.vscode/settings.json`:**

```jsonc
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports.biome": "explicit",
    "source.fixAll.biome": "explicit",
    "source.fixAll.eslint": "explicit",
  },
  "eslint.useFlatConfig": true,
  "eslint.workingDirectories": [{ "mode": "auto" }],
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "deno.enable": false,
  "deno.enablePaths": ["supabase/functions"],
}
```

### 7) `knip.config.ts` — the dead-code policeman

```ts
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
```

Run `pnpm knip --strict` weekly in CI cron, not every PR — knip is too pedantic for tight loops.

### 8) "First-PR will fail until…" — friction list

1. `void someAsyncFn()` escape hatch for fire-and-forget (we keep `ignoreVoid: true`).
2. `explicit-module-boundary-types` is on in `packages/shared` — every exported function needs a return type.
3. `||` → `??` (`prefer-nullish-coalescing` autofix changes behavior for `""`, `0`).
4. `import type` everywhere because of `verbatimModuleSyntax`.
5. Branded ID types (`type SourceQuoteId = string & { readonly __brand: "SourceQuoteId" }`) cause friction at library boundaries — write adapters.
6. `exactOptionalPropertyTypes` + React props: spread `{...(maybe !== undefined && { bar: maybe })}` or declare `bar: string | undefined` instead of optional.
7. `noUncheckedIndexedAccess` makes `arr[0]` typed `T | undefined`. Use `.at()` + `??` or bounds-check before access.
8. React 19 RSC types need TS ≥5.4; JSX namespace is now `global.JSX` not `React.JSX`.
9. `drizzle/enforce-delete-with-where` requires `// eslint-disable-next-line drizzle/enforce-delete-with-where -- intentional truncation` for full-table truncates.
10. `no-default-export` vs Next.js: pages/layouts/route handlers/middleware/`next.config.ts` require default exports — handled by per-package override.
11. `no-restricted-imports` blocks `@/db` from Client Components — the rule that catches the AI dragging server-only code into `'use client'` files.
12. `max-lines: 400` will break on the first big page — extract.

---

## Recommendations (staged rollout)

**Phase 1 — day 1:**

- Commit `tsconfig.base.json` exactly as above.
- Commit `biome.json` with `recommended: true` + `useImportType`, `useExportType`, `noBarrelFile`, `noReExportAll`, `useSortedClasses`, `noFloatingPromises`, `noConsole`, `noNonNullAssertion`, `noExplicitAny`.
- Lefthook running `biome check --write` only.
- `.vscode/settings.json` as above.

**Phase 2 — week 1:**

- Add ESLint flat config with `tseslint.configs.strictTypeChecked` + `stylisticTypeChecked` + `react`/`react-hooks`/`jsx-a11y`/`@next/next`/`import-x`/`perfectionist`/`drizzle`.
- Skip hard caps for now. Skip `functional`/`security`/`no-secrets`/`sonarjs`.

**Phase 3 — week 2-3:**

- Add all `max-*`, `complexity: 12`, `sonarjs/cognitive-complexity: 15`.
- Add `no-restricted-imports` + `no-restricted-syntax`.
- Add Unicorn cherry-picks.
- Add `functional` only in `packages/shared`.
- Add `no-secrets` and `security` warnings.

**Phase 4 — month 1:**

- Add `knip --strict` in CI cron.

**Thresholds that would change my advice:**

- If Biome's type-aware coverage reaches >95% of typescript-eslint in v3, drop ESLint except for ecosystem-specific plugins (drizzle, jsx-a11y).
- If `tsgolint` (Oxlint wrapping the official TypeScript Go port) ships stable — per Jökull Sólberg's article _"Faster Type-Aware Lint Rules: Biome vs. Oxlint"_ (solberg.is/fast-type-aware-linting), Oxlint will "wrap it and ship the full 40-rule suite in one release" — reconsider the entire stack.
- If pre-commit time exceeds 10s consistently, demote `import-x/no-cycle` to CI-only. The 70% number traces to eslint-plugin-import GitHub issue #2182 ("import/no-cycle takes 70% of lint time"); related issues #1943 and #2348 record even starker measured values of 99.3% and 97.0% of total lint time respectively on real codebases.
- If typescript-eslint cold runs exceed 5 minutes, split into a `typed-lint` job parallelized in CI. Per Jökull Sólberg of TripToJapan.com: _"a cold run of typescript-eslint on our monorepo at TripToJapan.com is 7 minutes. That is the tax we pay for safety."_

---

## Caveats

1. **Biome v2's type inference is single-file-only as of v2.4.** Multi-file type inference is on the roadmap (per the Biome v2 launch post). This is why we keep typescript-eslint in the loop — and why we run both `noFloatingPromises` rules during the transition.

2. **The hard caps (max-lines, complexity, etc.) are stricter than any of the public top-tier configs surveyed.** Verified absent from `vercel/next-forge`, `t3-oss/create-t3-app`, `Shopify/web-configs` (CHANGELOG explicitly says `max-lines-per-function (disabled)`), `google/gts/.eslintrc.json`, `getsentry/sentry-javascript`, and `typescript-eslint/typescript-eslint/eslint.config.mjs`. Lower the bar (max-lines 500, complexity 15, cognitive 20) rather than disable if friction outweighs value.

3. **`erasableSyntaxOnly` will reject any third-party code that uses enums in `.ts` form**. Most libraries ship as `.d.ts` + `.js` so this isn't an issue, but if you import a `.ts` source from a workspace package that uses enums, it will fail. Enforce from day one across the whole monorepo.

4. **`eslint-plugin-drizzle` has known false positives** when you use the repository pattern (any class with a `.delete()` method triggers it — verified in drizzle-team/drizzle-orm issue #2446). Scope `drizzleObjectName: ["db", "tx"]` strictly, as our config does.

5. **`tseslint.configs.strictTypeChecked` is not stable semver** — per typescript-eslint's own docs: _"This configuration is not considered 'stable' under Semantic Versioning. Its enabled rules and/or their options may change outside of major version updates."_ Pin your typescript-eslint version and review the changelog on bumps.

6. **`useSortedClasses` in Biome requires telling it about your Tailwind config**. As of Biome v2.4 there's no auto-detection — you must list `cn`/`cva`/`clsx` manually.

7. **typescript-eslint type-aware linting is slow on large monorepos.** With `projectService: true` and Turborepo caching, expect 30-90s incremental. If you grow past 7-minute cold runs, follow Sólberg's TripToJapan playbook and split type-aware linting into its own parallelized CI job.

8. **next-forge ships Biome + `ultracite` (Hayden Bleasel's zero-config preset), NOT ESLint** — verified at `vercel/next-forge/biome.json` (`"extends": ["ultracite"]`). If you want a one-tool setup, study ultracite (github.com/haydenbleasel/ultracite). But for "linter as code reviewer" the hybrid Biome + ESLint setup is strictly more powerful than either alone in 2026.

9. **PHI / provenance enforcement is out of lint scope.** No ESLint rule can enforce "every rendered figure carries a source_quote_id FK" — that belongs in tsc (via branded types like `type RenderedFigure = { sourceQuoteId: SourceQuoteId }` and Zod schemas on the boundary) and in runtime tests, not lint. The lint configuration above gives you the surrounding scaffolding to make that enforcement structurally impossible to bypass.
