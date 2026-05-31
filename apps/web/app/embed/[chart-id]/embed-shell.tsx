"use client";

import { useEffect } from "react";
import { z } from "zod";

import { siteUrl } from "@/lib/env";

const SET_THEME_SCHEMA = z.object({
  type: z.literal("set-theme"),
  theme: z.enum(["light", "dark"]),
});

const SITE_DOMAIN = siteUrl().replace("https://", "").replace("http://", "");

interface EmbedShellProps {
  chartId: string;
  children?: React.ReactNode;
  initialTheme: "dark" | "light";
}

function EmbedShell({ chartId, children, initialTheme }: Readonly<EmbedShellProps>) {
  useEffect(() => {
    function handleMessage(event: MessageEvent<unknown>) {
      const parsed = SET_THEME_SCHEMA.safeParse(event.data);
      if (parsed.success) {
        document.documentElement.dataset.theme = parsed.data.theme;
      }
    }
    // eslint-disable-next-line sonarjs/post-message -- embed intentionally accepts theme-sync from any parent frame
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = initialTheme;
  }, [initialTheme]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-bg p-4" data-embed>
      {children === undefined ? (
        <p className="font-mono text-[13px] text-fg-muted">Unknown chart: {chartId}</p>
      ) : (
        <div className="flex h-full w-full flex-col gap-2">
          <div className="flex-1 overflow-hidden rounded-md border border-border bg-bg">
            {children}
          </div>
          <p
            className="shrink-0 font-mono text-[10px] text-fg-subtle"
            role="note"
            aria-label="Source attribution"
          >
            Source: {chartId} · {SITE_DOMAIN}/embed/{chartId}
          </p>
        </div>
      )}
    </div>
  );
}

export { EmbedShell };
