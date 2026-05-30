"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

const SITE_DOMAIN = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://ituri-epi.com")
  .replace("https://", "")
  .replace("http://", "");

const CHARTS: Record<string, { label: string }> = {
  "cfr-trend": { label: "CFR Trend" },
  "epi-curve": { label: "Epi Curve" },
  "zone-map": { label: "Zone Map" },
};

export default function EmbedPage() {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- URL segment contains hyphen; cannot be renamed
  const params = useParams<{ "chart-id": string }>();
  const searchParams = useSearchParams();
  const chartId = params["chart-id"];
  const theme = searchParams.get("theme") === "dark" ? "dark" : "light";
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    function handleMessage(event: MessageEvent<unknown>) {
      if (typeof event.data !== "object" || event.data === null) {
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- narrowed to object; as unknown as Record is the accepted safe-cast idiom
      const msg = event.data as unknown as Record<string, unknown>;
      if (msg.type === "set-theme" && typeof msg.theme === "string") {
        document.documentElement.dataset.theme = msg.theme;
      }
    }
    // eslint-disable-next-line sonarjs/post-message -- embed intentionally accepts theme-sync from any parent frame
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const chart = CHARTS[chartId];

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-bg p-4" data-embed>
      {chart === undefined ? (
        <p className="font-mono text-[13px] text-fg-muted">Unknown chart: {chartId}</p>
      ) : (
        <div className="flex h-full w-full flex-col gap-2">
          <div className="flex-1 rounded-md border border-border bg-bg" ref={iframeRef}>
            <p className="p-4 font-mono text-[12px] text-fg-muted">Chart placeholder — {chartId}</p>
          </div>
          <p
            className="shrink-0 font-mono text-[10px] text-fg-subtle"
            role="note"
            aria-label="Source attribution"
          >
            Source: {chart.label} · {SITE_DOMAIN}/embed/{chartId}
          </p>
        </div>
      )}
    </div>
  );
}
