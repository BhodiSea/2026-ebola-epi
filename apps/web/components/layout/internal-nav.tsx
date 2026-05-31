"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/internal/cost", label: "Cost" },
  { href: "/internal/pipeline", label: "Pipeline" },
  { href: "/internal/escalations", label: "Escalations" },
  { href: "/internal/quality", label: "Quality" },
  { href: "/internal/sources", label: "Sources" },
  { href: "/internal/audit", label: "Audit" },
  { href: "/internal/shadow", label: "Shadow" },
  { href: "/internal/backfill", label: "Backfill" },
] as const;

export function InternalNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Internal navigation"
      className="w-[180px] shrink-0 border-border border-r bg-(--color-surface-2) py-2"
    >
      {NAV_ITEMS.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-7 items-center px-4 font-mono text-xs transition-colors",
              active ? "bg-(--color-surface-3) text-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
