// @vitest-environment node
import { describe, expect, it } from "vitest";

import { WHO_DON_FN_CONFIG, WHO_DON_POLL_EVENT } from "../who-don-config.js";

const EVENT_KEY_PATTERN = /^event\./;

describe("ingestWHODON function config", () => {
  it("throttle.key is event-data keyed (AGENTS.md rule 15: no in-process p-throttle)", () => {
    expect(WHO_DON_FN_CONFIG.throttle.key).toMatch(EVENT_KEY_PATTERN);
  });

  it("throttle.scope is 'account' (AGENTS.md rule 15: coordinates across instances)", () => {
    expect(WHO_DON_FN_CONFIG.throttle.scope).toBe("account");
  });

  it("throttle.limit is a positive integer", () => {
    expect(WHO_DON_FN_CONFIG.throttle.limit).toBeGreaterThan(0);
  });

  it("throttle.period is set", () => {
    expect(WHO_DON_FN_CONFIG.throttle.period).toBeTruthy();
  });

  it("concurrency.limit is 1 (single cron loop)", () => {
    expect(WHO_DON_FN_CONFIG.concurrency.limit).toBe(1);
  });

  it("WHO_DON_POLL_EVENT matches the Inngest event name used in manual triggers", () => {
    expect(WHO_DON_POLL_EVENT).toBe("ingest/who-don.poll");
  });
});
