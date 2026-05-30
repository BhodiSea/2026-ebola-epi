import "server-only";

import { IncomingWebhook } from "@slack/webhook";
import { z } from "zod";

import type { AnomalySignal } from "@/inngest/lib/anomaly";
import { env } from "@/lib/env";

// eslint-disable-next-line @typescript-eslint/naming-convention -- GitHub API uses snake_case
const githubUrlSchema = z.object({ html_url: z.string() });
const githubRefSchema = z.object({ object: z.object({ sha: z.string() }) });

export interface GithubIssueOpts {
  body: string;
  labels?: string[];
  title: string;
}

export interface GithubPROpts {
  fix: string;
  source: { diff: string; slug: string; url: string };
}

/**
 * Fire all anomaly escalation channels: Twilio SMS + Slack @channel.
 * No-op for each channel when its env vars are unset.
 */
export async function notifyAnomaly(outbreakId: string, signals: AnomalySignal[]): Promise<void> {
  const kinds = signals.map((s) => s.kind).join(", ");
  const text = `Anomaly detected for outbreak ${outbreakId}: ${kinds}`;
  await Promise.all([notifyTwilio(text), notifySlack(text, true)]);
}

/**
 * Notify Slack that the cost kill-switch fired.
 * Mentions @channel so on-call sees it immediately.
 */
export async function notifyKillSwitch(documentId: string): Promise<void> {
  await notifySlack(
    `Cost kill-switch fired — extraction paused for document ${documentId}. Resets at 00:00 UTC.`,
    true,
  );
}

/**
 * Send a Slack incoming-webhook message.
 * No-op when SLACK_WEBHOOK_URL is unset (dev / CI / test).
 *
 * @param text - Message text.
 * @param mentionChannel - Prepends <!channel> when true (use for anomaly / kill-switch alerts).
 */
export async function notifySlack(text: string, mentionChannel = false): Promise<void> {
  if (env.SLACK_WEBHOOK_URL === undefined) {
    return;
  }
  const body = mentionChannel ? `<!channel> ${text}` : text;
  const webhook = new IncomingWebhook(env.SLACK_WEBHOOK_URL);
  await webhook.send({ text: body });
}

/**
 * Send an SMS via the Twilio Messages REST API.
 * No-op when any required Twilio env var is unset.
 */
export async function notifyTwilio(body: string): Promise<void> {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, TWILIO_TO_NUMBER } = env;
  if (
    TWILIO_ACCOUNT_SID === undefined ||
    TWILIO_AUTH_TOKEN === undefined ||
    TWILIO_FROM_NUMBER === undefined ||
    TWILIO_TO_NUMBER === undefined
  ) {
    return;
  }
  const credentials = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
  const params = new URLSearchParams({
    Body: body,
    From: TWILIO_FROM_NUMBER,
    To: TWILIO_TO_NUMBER,
  });
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
}

/**
 * Open a GitHub issue via the REST API.
 * No-op (returns null) when GITHUB_TOKEN or GITHUB_REPO is unset.
 * Returns null when the API call fails.
 */
export async function openGithubIssue(opts: GithubIssueOpts): Promise<null | string> {
  const { GITHUB_TOKEN, GITHUB_REPO } = env;
  if (GITHUB_TOKEN === undefined || GITHUB_REPO === undefined) {
    return null;
  }
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title: opts.title, body: opts.body, labels: opts.labels }),
  });
  if (!res.ok) {
    return null;
  }
  const parsed = githubUrlSchema.safeParse(await res.json());
  return parsed.success ? parsed.data.html_url : null;
}

/**
 * Open a GitHub PR proposing a parser fix for an unhealthy source.
 * Creates a branch, writes a proposal doc, and opens the PR — no code is edited directly.
 * No-op (returns null) when GITHUB_TOKEN or GITHUB_REPO is unset.
 */
// eslint-disable-next-line max-statements -- sequential GitHub API chain: get SHA, create branch, write file, open PR
export async function openGithubPR(opts: GithubPROpts): Promise<null | string> {
  const { GITHUB_TOKEN, GITHUB_REPO } = env;
  if (GITHUB_TOKEN === undefined || GITHUB_REPO === undefined) {
    return null;
  }

  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };
  const api = `https://api.github.com/repos/${GITHUB_REPO}`;
  const today = new Date().toISOString().slice(0, 10);
  const branch = `maintenance/parser-fix-${opts.source.slug}-${today}`;

  // 1. Get default branch SHA
  const refRes = await fetch(`${api}/git/refs/heads/main`, { headers });
  if (!refRes.ok) {
    return null;
  }
  const refParsed = githubRefSchema.safeParse(await refRes.json());
  if (!refParsed.success) {
    return null;
  }
  const sha = refParsed.data.object.sha;

  // 2. Create branch
  const branchRes = await fetch(`${api}/git/refs`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
  });
  if (!branchRes.ok) {
    return null;
  }

  // 3. Write proposal doc on the branch
  const content = Buffer.from(
    `# Parser fix proposal: ${opts.source.slug}\n\nSource URL: ${opts.source.url}\n\n## Diff\n\`\`\`diff\n${opts.source.diff}\n\`\`\`\n\n## Suggested fix\n\n${opts.fix}\n`,
  ).toString("base64");
  const filePath = `docs/maintenance/parser-fix-${opts.source.slug}.md`;
  const fileRes = await fetch(`${api}/contents/${filePath}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: `maintenance: parser fix proposal for ${opts.source.slug}`,
      content,
      branch,
    }),
  });
  if (!fileRes.ok) {
    return null;
  }

  // 4. Open PR
  const prRes = await fetch(`${api}/pulls`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: `maintenance: parser fix for ${opts.source.slug}`,
      head: branch,
      base: "main",
      body: `Automated proposal from the weekly maintenance cron.\n\n${opts.fix}`,
    }),
  });
  if (!prRes.ok) {
    return null;
  }
  const prParsed = githubUrlSchema.safeParse(await prRes.json());
  return prParsed.success ? prParsed.data.html_url : null;
}
