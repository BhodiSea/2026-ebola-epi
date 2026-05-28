import Link from "next/link";

import { SeverityPill } from "@/components/provenance/severity-pill";
import type { Outbreak } from "@/lib/queries/outbreaks";

interface OutbreakHeaderProps {
  outbreak: Outbreak;
}

type SeverityLevel = "alert" | "emergency" | "info" | "warn";

function daysSinceOnset(onsetDate: string): number {
  return Math.max(1, Math.floor((Date.now() - new Date(onsetDate).getTime()) / 86_400_000));
}

function OutbreakHeader({ outbreak }: Readonly<OutbreakHeaderProps>) {
  const days = daysSinceOnset(outbreak.onsetDate);
  const level = toSeverityLevel(outbreak.severityLevel);

  return (
    <header className="space-y-3">
      <nav className="font-mono text-[12px] text-fg-muted" aria-label="Breadcrumb">
        <Link href="/outbreaks" className="hover:text-fg">
          Outbreaks
        </Link>
        {" › "}
        <span>{outbreak.pathogenSlug ?? outbreak.pathogenIcd11}</span>
        {" › "}
        <span>{outbreak.countryIso3}</span>
        {" › "}
        <span>{outbreak.onsetDate}</span>
      </nav>
      <div className="flex items-start gap-3">
        <SeverityPill level={level} label={level.toUpperCase()} />
        <div>
          <h1 className="font-bold text-[32px] leading-tight">
            {outbreak.name ?? outbreak.pathogenSlug ?? outbreak.pathogenIcd11}
          </h1>
          <p className="mt-1 text-[18px] text-fg-muted">{outbreak.countryIso3}</p>
          <p className="mt-1 font-mono text-[13px] text-fg-muted">
            Onset {outbreak.onsetDate} · Day {days}
          </p>
        </div>
      </div>
    </header>
  );
}

function toSeverityLevel(raw: null | string): SeverityLevel {
  if (raw === "emergency" || raw === "alert" || raw === "warn") {
    return raw;
  }
  return "info";
}

export { OutbreakHeader };
