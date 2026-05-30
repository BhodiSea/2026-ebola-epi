"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "@/lib/nav-items";
import { cn } from "@/lib/utils";

const MOBILE_ITEMS = NAV_ITEMS.filter((item) => item.mobileVisible);

export function BottomTabNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Bottom navigation"
      data-bottom-tab-nav=""
      className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-center justify-around border-border border-t bg-bg md:hidden"
    >
      {MOBILE_ITEMS.map(({ href, label, icon }) => {
        const TabIcon = icon;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 px-2 font-medium text-[10px] transition-colors",
              active ? "text-fg" : "text-fg-muted",
            )}
          >
            <span className="relative flex items-center justify-center">
              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute -top-1 h-1 w-4 rounded-full bg-emergency"
                />
              ) : null}
              <TabIcon aria-hidden="true" size={22} strokeWidth={1.5} />
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
