declare module "eslint-plugin-drizzle" {
  import type { ESLint } from "eslint";

  const plugin: ESLint.Plugin;
  export = plugin;
}

declare module "eslint-plugin-jsx-a11y" {
  import type { ESLint, Linter } from "eslint";

  const plugin: ESLint.Plugin & {
    flatConfigs: {
      recommended: Linter.Config;
      strict: Linter.Config;
    };
  };
  export = plugin;
}

declare module "eslint-plugin-promise" {
  import type { ESLint, Linter } from "eslint";

  const plugin: ESLint.Plugin & {
    configs: Record<string, Linter.Config>;
  };
  export = plugin;
}

declare module "eslint-plugin-security" {
  import type { ESLint } from "eslint";

  const plugin: ESLint.Plugin;
  export = plugin;
}
