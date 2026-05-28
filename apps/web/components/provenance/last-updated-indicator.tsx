"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type Freshness = "fresh" | "neutral" | "stale" | "very-stale";

function freshness(updatedAt: Date, now: number): Freshness {
  const ageHours = (now - updatedAt.getTime()) / 3_600_000;
  if (ageHours < 6) {
    return "fresh";
  }
  if (ageHours < 24) {
    return "neutral";
  }
  if (ageHours < 72) {
    return "stale";
  }
  return "very-stale";
}

const DISC_COLOR: Record<Freshness, string> = {
  fresh: "bg-emerald-500",
  neutral: "bg-fg-subtle",
  stale: "bg-warn",
  "very-stale": "bg-emergency",
};

const LABEL_SUFFIX: Record<Freshness, string> = {
  fresh: "",
  neutral: "",
  stale: " ⚠",
  "very-stale": " ⚠⚠",
};

interface LastUpdatedIndicatorProps {
  className?: string;
  updatedAt: Date | string;
}

function LastUpdatedIndicator({ updatedAt, className }: Readonly<LastUpdatedIndicatorProps>) {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, 30_000);
    return () => {
      clearInterval(id);
    };
  }, []);

  const date = typeof updatedAt === "string" ? new Date(updatedAt) : updatedAt;
  const level = freshness(date, now);
  const diffMs = date.getTime() - now;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const absMins = Math.abs(Math.round(diffMs / 60_000));

  let relative: string;
  if (absMins < 60) {
    relative = rtf.format(Math.round(diffMs / 60_000), "minute");
  } else if (absMins < 24 * 60) {
    relative = rtf.format(Math.round(diffMs / 3_600_000), "hour");
  } else {
    relative = rtf.format(Math.round(diffMs / 86_400_000), "day");
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[12px] text-fg-muted",
        className,
      )}
      title={date.toISOString()}
    >
      <span
        className={cn(
          "size-1.5 rounded-full motion-reduce:animate-none",
          DISC_COLOR[level],
          level === "fresh" && "animate-pulse",
        )}
        style={level === "fresh" ? { animationDuration: "1.6s" } : undefined}
        aria-hidden
      />
      {relative}
      {LABEL_SUFFIX[level]}
    </span>
  );
}

export { LastUpdatedIndicator };
