// C3 (promgen handoff, 2026-11-16): the laws list once skipped 7 —
// a law was retired and the numbering never closed, so readers
// suspected missing content (6 → 8 → 9 → 10). The cure renumbered
// the list contiguous; this wall keeps it that way forever: the
// numbered list must run 1..N with no gaps and no duplicates.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AGENT_MD = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "src", "agents", "AGENT.md"), "utf8");

describe("C3 — the laws list is contiguous", () => {
  it("every numbered law row runs 1..N (no skips, no duplicates)", () => {
    const nums = [...AGENT_MD.matchAll(/^(\d+)\. /gm)].map((m) => Number(m[1]));
    assert.ok(nums.length >= 9, `the laws list rides (${nums.length} rows; a collapsed parse must not green silently)`);
    assert.deepEqual(nums, nums.map((_, i) => i + 1), `the numbering must be contiguous 1..${String(nums.length)} — the old 6→8 skip was the defect`);
  });
});
