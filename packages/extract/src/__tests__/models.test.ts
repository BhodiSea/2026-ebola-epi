import { describe, expect, it } from "vitest";

import { MODEL_HAIKU, MODEL_OPUS, MODEL_SONNET } from "../models.js";
import { MODEL } from "../run.js";

const CLAUDE_RE = /^claude-/;

describe("model constants", () => {
  it("MODEL_OPUS matches claude-opus family", () => {
    expect(MODEL_OPUS).toMatch(CLAUDE_RE);
    expect(MODEL_OPUS).toBe("claude-opus-4-7");
  });

  it("MODEL_SONNET matches claude-sonnet family", () => {
    expect(MODEL_SONNET).toMatch(CLAUDE_RE);
    expect(MODEL_SONNET).toBe("claude-sonnet-4-6");
  });

  it("MODEL_HAIKU matches claude-haiku family", () => {
    expect(MODEL_HAIKU).toMatch(CLAUDE_RE);
    expect(MODEL_HAIKU).toBe("claude-haiku-4-5-20251001");
  });

  it("back-compat MODEL alias equals MODEL_SONNET", () => {
    expect(MODEL).toBe(MODEL_SONNET);
  });

  it("all three model ids are distinct", () => {
    const ids = new Set([MODEL_HAIKU, MODEL_OPUS, MODEL_SONNET]);
    expect(ids.size).toBe(3);
  });
});
