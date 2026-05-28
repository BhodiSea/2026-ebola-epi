import { cn } from "@/lib/utils";

type SourceTier = "tier-1" | "tier-2" | "tier-3";

const TIER_DOT: Record<SourceTier, string> = {
  "tier-1": "bg-red-5",
  "tier-2": "bg-red-3",
  "tier-3": "bg-fg-subtle",
};

interface ProvenanceBadgeProps {
  className?: string;
  publishedAt?: null | string;
  sourceName: string;
  tier: SourceTier;
}

function ProvenanceBadge({
  sourceName,
  tier,
  publishedAt,
  className,
}: Readonly<ProvenanceBadgeProps>) {
  return (
    <div className={cn("flex items-center gap-2 font-mono text-[12px] text-fg-muted", className)}>
      <span className={cn("size-2 shrink-0 rounded-full", TIER_DOT[tier])} aria-hidden />
      <span className="font-semibold">{sourceName}</span>
      {publishedAt !== null && publishedAt !== undefined ? (
        <span className="text-fg-subtle">
          ·{" "}
          {new Date(publishedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      ) : null}
    </div>
  );
}

function toTier(licenseTier: string): SourceTier {
  if (licenseTier === "open") {
    return "tier-1";
  }
  if (licenseTier === "noncommercial_verified") {
    return "tier-2";
  }
  return "tier-3";
}

export type { SourceTier };
export { ProvenanceBadge, toTier };
