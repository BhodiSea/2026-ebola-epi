"use client";

import type { RegisteredSourceSlug } from "@ituri/ingest";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";

import { triggerIngestPollAction } from "@/app/internal/sources/actions";

type Status = "done" | "failed" | "idle" | "queued" | "running" | "timeout";

const INITIAL_POLL_MS = 2000;
const MAX_POLL_MS = 30_000;
const POLL_TIMEOUT_MS = 15 * 60 * 1000;

const INNGEST_EVENT_BASE = "https://app.inngest.com/env/production/events";

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
  const [actionStatus, setActionStatus] = useState<Status>("idle");
  const [eventId, setEventId] = useState<null | string>(null);

  const { execute, isPending } = useAction(triggerIngestPollAction, {
    onError: () => {
      setActionStatus("failed");
    },
    onSuccess: ({ data }) => {
      setEventId(data.eventId ?? null);
      setActionStatus("queued");
    },
  });

  const pollStatus = useIngestPoll(eventId);
  const status = pollStatus ?? actionStatus;

  return (
    <>
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
      {status === "timeout" && eventId !== null ? (
        <a
          href={`${INNGEST_EVENT_BASE}/${eventId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 font-mono text-[10px] text-fg-muted underline hover:text-fg"
        >
          Inngest
        </a>
      ) : null}
    </>
  );
}

async function pollRun(
  eventId: string,
  cancelPoll: () => void,
  onStatusChange: (s: Status) => void,
): Promise<void> {
  const res = await fetch(`/api/internal/ingest-runs/${eventId}`);
  if (!res.ok) {
    onStatusChange("failed");
    cancelPoll();
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
      onStatusChange("done");
      cancelPoll();
      break;
    }
    case "Failed": {
      onStatusChange("failed");
      cancelPoll();
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

function useIngestPoll(eventId: null | string): null | Status {
  const [pollStatus, setPollStatus] = useState<null | Status>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    if (eventId !== null) {
      const startMs = Date.now();
      let intervalMs = INITIAL_POLL_MS;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      let active = true;

      // Prevent any in-flight pollRun from overriding a terminal state.
      const guardedSet = (s: Status) => {
        if (active) {
          setPollStatus(s);
        }
      };

      const tick = () => {
        if (!active) {
          return;
        }
        if (Date.now() - startMs >= POLL_TIMEOUT_MS) {
          active = false;
          setPollStatus("timeout");
          return;
        }
        const scheduleNext = () => {
          if (!active) {
            return;
          }
          intervalMs = Math.min(intervalMs * 2, MAX_POLL_MS);
          timeoutId = setTimeout(tick, intervalMs);
        };
        void pollRun(
          eventId,
          () => {
            active = false;
          },
          guardedSet,
        ).then(scheduleNext, scheduleNext);
      };

      timeoutId = setTimeout(tick, intervalMs);

      cleanup = () => {
        active = false;
        clearTimeout(timeoutId);
      };
    }
    return cleanup;
  }, [eventId]);

  return pollStatus;
}
