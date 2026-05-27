import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  framework: "nextjs",
  buildCommand: "cd ../.. && pnpm turbo build --filter=@ituri/web",
  installCommand: "cd ../.. && pnpm install --frozen-lockfile",
  outputDirectory: ".next",
};
