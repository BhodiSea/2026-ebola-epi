import "server-only";

import { mohDRCAdapter } from "@ituri/ingest";

import { inngest } from "../client";
import { notifySlack } from "@/lib/notify";

export const SYNTHETIC_MOH_DRC_SELECTOR_EVENT = "synthetic.moh-drc-selector" as const;

export const syntheticMohDrcSelector = inngest.createFunction(
  { id: "synthetic-moh-drc-selector", retries: 0 },
  [{ cron: "0 5 * * 1" }, { event: SYNTHETIC_MOH_DRC_SELECTOR_EVENT }],
  async ({ step }) => {
    const items = await step.run("poll-moh-drc", async () => mohDRCAdapter.poll());

    if (items.length === 0) {
      await step.run("notify-empty", async () =>
        notifySlack("MoH DRC selector probe: poll() returned [] — site may have restructured"),
      );
      throw new Error("moh_drc_selector_empty — poll returned no items");
    }

    return { itemCount: items.length };
  },
);
