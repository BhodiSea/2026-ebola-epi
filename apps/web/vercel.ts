import type { VercelConfig } from "@vercel/config/v1";

// firewall.rules was added to the Vercel platform after the @vercel/config/v1 type snapshot.
type VercelConfigWithFirewall = VercelConfig & {
  firewall?: {
    rules: {
      matches: { path: string };
      name: string;
      rateLimitAction: {
        action: "challenge" | "deny" | "log";
        limit: number;
        period: number;
        persistent?: { duration: number };
      };
    }[];
  };
};

export const config: VercelConfigWithFirewall = {
  framework: "nextjs",
  buildCommand: "cd ../.. && pnpm turbo build --filter=@ituri/web",
  installCommand: "cd ../.. && pnpm install --frozen-lockfile",
  outputDirectory: ".next",
  firewall: {
    rules: [
      // Tile-abuse cap — token bucket; counters are per-region, set conservatively.
      {
        name: "mvt-tile-abuse",
        matches: { path: "/api/mvt/*" },
        rateLimitAction: {
          limit: 600,
          period: 60,
          action: "deny",
          persistent: { duration: 300 },
        },
      },
      // Inngest webhook — signed by INNGEST_SIGNING_KEY but still rate-limited.
      {
        name: "inngest-endpoint",
        matches: { path: "/api/inngest" },
        rateLimitAction: { limit: 60, period: 60, action: "challenge" },
      },
      // Auth brute-force protection.
      {
        name: "auth-brute-force",
        matches: { path: "/auth/*" },
        rateLimitAction: {
          limit: 10,
          period: 60,
          action: "deny",
          persistent: { duration: 900 },
        },
      },
      // Editorial outbreak pages.
      {
        name: "editorial-pages",
        matches: { path: "/outbreaks/*" },
        rateLimitAction: { limit: 300, period: 60, action: "deny" },
      },
    ],
  },
};
