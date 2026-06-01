"use client";

import type { RegisteredSourceSlug } from "@ituri/ingest";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useRef, useState } from "react";

import { triggerIngestPollAction } from "@/app/internal/sources/actions";

type Status = "done" | "failed" | "idle" | "queued" | "running" | "timeout";

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 150;

const STATUS_LABELS: Record<Status, string> = {
  done: "Done",
  failed: "Failed",
  idle: "Run",
  queued: "Queued…",
  running: "Running…",
  timeout: "Timed out",
};

export function RunIngestButton({
  slug,
  disabled,
}: Readonly<{ disabled?: boolean; slug: RegisteredSourceSlug }>) {
  const [status, setStatus] = useState<Status>("idle");
  const [eventId, setEventId] = useState<null | string>(null);
  const pollCountRef = useRef(0);

  const { execute, isPending } = useAction(triggerIngestPollAction, {
    onError: () => {
      setStatus("failed");
    },
    onSuccess: ({ data }) => {
      setEventId(data.eventId ?? null);
      setStatus("queued");
    },
  });

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    if (eventId !== null) {
      pollCountRef.current = 0;
      const id = setInterval(() => {
        pollCountRef.current += 1;
        if (pollCountRef.current > MAX_POLLS) {
          clearInterval(id);
          setStatus("timeout");
          return;
        }
        void pollRun(
          eventId,
          () => {
            clearInterval(id);
          },
          setStatus,
        );
      }, POLL_INTERVAL_MS);
      cleanup = () => {
        clearInterval(id);
      };
    }
    return cleanup;
  }, [eventId]);

  return (
    <button
      type="button"
      disabled={isPending || disabled}
      className="rounded px-1.5 py-0.5 font-mono text-[10px] text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-50"
      onClick={() => {
        execute({ slug });
      }}
    >
      {STATUS_LABELS[status]}
    </button>
  );
}

async function pollRun(
  eventId: string,
  cancelInterval: () => void,
  onStatusChange: (s: Status) => void,
): Promise<void> {
  const res = await fetch(`/api/internal/ingest-runs/${eventId}`);
  if (!res.ok) {
    cancelInterval();
    onStatusChange("failed");
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- res.json() returns any; as unknown as T is the accepted safe-assertion idiom
  const body = (await res.json()) as unknown as { runs?: { status: string }[] };
  const run = body.runs?.[0];
  if (run === undefined) {
    return;
  }
  switch (run.status) {
    case "Completed": {
      cancelInterval();
      onStatusChange("done");
      break;
    }
    case "Failed": {
      cancelInterval();
      onStatusChange("failed");
      break;
    }
    case "Running": {
      onStatusChange("running");
      break;
    }
    default: {
      break;
    }
  }
}
