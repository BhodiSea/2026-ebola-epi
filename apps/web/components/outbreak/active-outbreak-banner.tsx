import { SeverityPill } from "@/components/provenance/severity-pill";
import type { Outbreak } from "@/lib/queries/outbreaks";

interface ActiveOutbreakBannerProps {
  confirmedQuoteId: null | string;
  lastIngestedAt?: null | string;
  outbreak: Outbreak;
}

type SeverityLevel = "alert" | "emergency" | "info" | "warn";

function ActiveOutbreakBanner({
  outbreak,
  confirmedQuoteId,
  lastIngestedAt,
}: Readonly<ActiveOutbreakBannerProps>) {
  const days = daysSinceOnset(outbreak.onsetDate);
  const level = toSeverityLevel(outbreak.severityLevel);
  const sitrep = lastIngestedAt == null ? null : daysSinceSitrep(lastIngestedAt);

  return (
    <div
      data-confirmed-quote={confirmedQuoteId}
      className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <SeverityPill level={level} label={level.toUpperCase()} />
        <span className="font-semibold">
          {outbreak.name ?? outbreak.pathogenSlug ?? outbreak.pathogenIcd11}
        </span>
        <span className="font-mono text-[13px] text-fg-muted">
          Day {days}
          {sitrep === null ? null : ` · last sitrep ${sitrep}`}
        </span>
      </div>
      <a
        href="/map"
        className="rounded px-3 py-1 font-mono text-[12px] text-fg-muted ring-1 ring-border hover:text-fg"
      >
        Open command center
      </a>
    </div>
  );
}

function daysSinceOnset(onsetDate: string): number {
  const onset = new Date(onsetDate);
  const now = new Date();
  return Math.max(1, Math.floor((now.getTime() - onset.getTime()) / 86_400_000));
}

function daysSinceSitrep(ingestedAt: string): string {
  const n = Math.floor((Date.now() - new Date(ingestedAt).getTime()) / 86_400_000);
  if (n <= 0) {
    return "today";
  }
  if (n === 1) {
    return "1 day ago";
  }
  return `${n} days ago`;
}

function toSeverityLevel(raw: null | string): SeverityLevel {
  if (raw === "emergency" || raw === "alert" || raw === "warn") {
    return raw;
  }
  return "info";
}

export { ActiveOutbreakBanner };
