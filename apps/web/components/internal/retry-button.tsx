"use client";

import { useTransition } from "react";

import { retryInngestRunAction } from "@/app/internal/pipeline/actions";

export function RetryButton({ runId }: Readonly<{ runId: string }>) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await retryInngestRunAction({ runId });
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="font-mono text-[11px] text-accent hover:underline disabled:opacity-50"
    >
      {isPending ? "…" : "Retry"}
    </button>
  );
}
