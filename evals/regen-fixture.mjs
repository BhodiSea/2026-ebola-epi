#!/usr/bin/env node

// Regenerates a gold-set response fixture by calling the extraction pipeline.
//
// Usage: pnpm --filter=@ituri/evals regen [slug]
//   slug defaults to "bundibugyo-ituri-2026-04-20"
//
// Requires ANTHROPIC_API_KEY in env.
//   export $(grep ANTHROPIC_API_KEY .env.local | head -1)
//   pnpm --filter=@ituri/evals regen
//
// This calls buildExtractionParams — the same function extract-document.ts calls
// via step.ai.wrap — and saves the raw API response as the fixture.
// Run whenever prompt.ts or source.txt changes and the offline F1 gate goes red.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Anthropic from "@anthropic-ai/sdk";
import { buildExtractionParams } from "@ituri/extract";

const GOLD_SET_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "gold-set");
const slug = process.argv[2] ?? "bundibugyo-ituri-2026-04-20";
const dir = path.join(GOLD_SET_DIR, slug);

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
