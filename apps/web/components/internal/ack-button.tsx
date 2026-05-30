"use client";

import { useAction } from "next-safe-action/hooks";
import { useTransition } from "react";

import { ackIncidentAction } from "@/app/internal/escalations/actions";

interface Props {
  incidentId: string;
}

export function AckButton({ incidentId }: Readonly<Props>) {
  const { execute, isPending } = useAction(ackIncidentAction);
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      aria-label="Acknowledge incident"
      className="mt-1 rounded px-1.5 py-0.5 font-mono text-[10px] text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-50"
      onClick={() => {
        startTransition(() => {
          execute({ incidentId });
        });
      }}
    >
      Ack
    </button>
  );
}
