"use client";

import dynamic from "next/dynamic";

export const CommandBarLoader = dynamic(
  async () => {
    const m = await import("@/components/layout/command-bar");
    return m.CommandBar;
  },
  { ssr: false },
);
