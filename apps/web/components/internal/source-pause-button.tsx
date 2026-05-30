"use client";

import { useAction } from "next-safe-action/hooks";

import { toggleSourcePauseAction } from "@/app/internal/sources/actions";

interface Props {
  paused: boolean;
  sourceId: string;
}

export function SourcePauseButton({ sourceId, paused }: Readonly<Props>) {
  const { execute, isPending } = useAction(toggleSourcePauseAction);

  return (
    <button
      type="button"
      disabled={isPending}
      aria-label={paused ? "Resume" : "Pause"}
      className="rounded px-1.5 py-0.5 font-mono text-[10px] text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-50"
      onClick={() => {
        execute({ sourceId, paused: !paused });
      }}
    >
      {paused ? "Resume" : "Pause"}
    </button>
  );
}
