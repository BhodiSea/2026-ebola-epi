import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  framework: "nextjs",
  buildCommand: "turbo build --filter=@ituri/web",
  installCommand: "pnpm install --frozen-lockfile",
  outputDirectory: ".next",
};
