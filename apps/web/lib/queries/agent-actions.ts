import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 50;

/* eslint-disable @typescript-eslint/naming-convention */
const AgentActionRow = z.object({
  action: z.string(),
  agent: z.string(),
  id: z.number(),
  subject_id: z.string().nullable(),
  ts: z.string(),
});
/* eslint-enable @typescript-eslint/naming-convention */

export type AgentAction = z.infer<typeof AgentActionRow>;

interface AgentActionFilters {
  action?: string | undefined;
  agent?: string | undefined;
  subject?: string | undefined;
}

export async function listAgentActions(
  filters: AgentActionFilters = {},
  page = 0,
): Promise<AgentAction[]> {
  const supabase = await createClient();

  let q = supabase.from("agent_actions").select("id, agent, action, subject_id, ts");

  if (filters.agent !== undefined) {
    q = q.eq("agent", filters.agent);
  }
  if (filters.action !== undefined) {
    q = q.eq("action", filters.action);
  }
  if (filters.subject !== undefined) {
    q = q.eq("subject_id", filters.subject);
  }

  const { data, error } = await q
    .order("ts", { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  if (error !== null) {
    return [];
  }

  const parsed = z.array(AgentActionRow).safeParse(data);
  return parsed.success ? parsed.data : [];
}

export { PAGE_SIZE as AGENT_ACTIONS_PAGE_SIZE };
