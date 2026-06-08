#!/usr/bin/env node

// Regenerates a gold-set response fixture by calling the extraction or triage pipeline.
//
// Usage:
//   pnpm --filter=@ituri/evals regen [slug]         # extraction (default)
//   pnpm --filter=@ituri/evals regen --triage [slug] # triage
//
//   slug defaults to "bundibugyo-ituri-2026-04-20" (extraction) or
//   "who-don-bundibugyo" (triage).
//
// Requires ANTHROPIC_API_KEY in env.
//   export $(grep ANTHROPIC_API_KEY .env.local | head -1)
//   pnpm --filter=@ituri/evals regen
//
// This calls buildExtractionParams / buildTriageParams — the same functions
// used by extract-document.ts / triage-document — and saves the raw API
// response as the fixture.
// Run whenever the prompt or source.txt changes and the offline gate goes red.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Anthropic from "@anthropic-ai/sdk";
import { buildExtractionParams, buildTriageParams } from "@ituri/extract";

const args = process.argv.slice(2);
const isTriageMode = args.includes("--triage");
const slugArgs = args.filter((a) => !a.startsWith("--"));

const BASE_DIR = path.dirname(fileURLToPath(import.meta.url));

if (isTriageMode) {
  const slug = slugArgs[0] ?? "who-don-bundibugyo";
  const dir = path.join(BASE_DIR, "triage-gold-set", slug);

  const src = readFileSync(path.join(dir, "source.txt"), "utf8");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  process.stdout.write(`regen-fixture: calling triage API for ${slug}...\n`);
  const msg = await client.messages.create(buildTriageParams(src));

  const fixture = { content: msg.content, usage: msg.usage };
  writeFileSync(path.join(dir, "response-fixture.json"), `${JSON.stringify(fixture, null, 2)}\n`);

  process.stdout.write(
    `regen-fixture: done. tokens: input=${msg.usage.input_tokens} output=${msg.usage.output_tokens}` +
      ` cache_read=${msg.usage.cache_read_input_tokens ?? 0} cache_creation=${msg.usage.cache_creation_input_tokens ?? 0}\n`,
  );
} else {
  const slug = slugArgs[0] ?? "bundibugyo-ituri-2026-04-20";
  const dir = path.join(BASE_DIR, "gold-set", slug);

  const src = readFileSync(path.join(dir, "source.txt"), "utf8");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  process.stdout.write(`regen-fixture: calling extraction API for ${slug}...\n`);
  const msg = await client.messages.create(buildExtractionParams(src));

  const fixture = { content: msg.content, usage: msg.usage };
  writeFileSync(path.join(dir, "response-fixture.json"), `${JSON.stringify(fixture, null, 2)}\n`);

  process.stdout.write(
    `regen-fixture: done. tokens: input=${msg.usage.input_tokens} output=${msg.usage.output_tokens}` +
      ` cache_read=${msg.usage.cache_read_input_tokens ?? 0} cache_creation=${msg.usage.cache_creation_input_tokens ?? 0}\n`,
  );
}
