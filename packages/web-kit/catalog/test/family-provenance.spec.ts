// family-provenance.spec.ts — the run→family fold and the tile relative
// time formatter.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { familyProvenance, formatLastRun } from "../src/familyProvenance.ts";
import type { MediaRun } from "@melite/contracts";

const run = (over: Record<string, unknown> = {}): MediaRun =>
  ({
    status: "done",
    families: ["f"],
    created_at: 1000,
    ...over,
  }) as unknown as MediaRun;

describe("familyProvenance", () => {
  it("counts only artifact-carrying runs (the fold's done family), once per family per run", () => {
    // The estate settles success as 'completed' and the cache stamps
    // 'cached'/'reused' — all count (2026-10-01, the status fold).
    // 'interrupted' folds to stopped and still excludes.
    const out = familyProvenance([
      run({ families: ["a", "a", "b"], created_at: 100 }),
      run({ status: "running", families: ["a"], created_at: 200 }),
      run({ status: "interrupted", families: ["b"], created_at: 300 }),
      run({ status: "completed", families: ["a"], created_at: 800 }),
      run({ status: "cached", families: ["c"], created_at: 150 }),
      run({ families: [], created_at: 400 }),
      run({ families: undefined, created_at: 500 }),
      run({ families: ["", "c"], created_at: 600 }),
      run({ families: ["a"], created_at: 700 }),
      run({ families: ["b"], created_at: "later" }),
    ]);
    assert.equal(out["a"].count, 3);
    assert.equal(out["a"].lastRunAt, 800_000);
    assert.equal(out["b"].count, 2);
    // The string-created_at run contributes count but no timestamp bump.
    assert.equal(out["b"].lastRunAt, 100_000);
    assert.equal(out["c"].count, 2);
    assert.equal(out["c"].lastRunAt, 600_000);
    assert.ok(!("running" in out));
    assert.ok(!("" in out));
  });

  it("keeps the max timestamp across runs", () => {
    const out = familyProvenance([
      run({ families: ["a"], created_at: 900 }),
      run({ families: ["a"], created_at: 100 }),
    ]);
    assert.deepEqual(out["a"], { count: 2, lastRunAt: 900_000 });
  });

  it("an unreadable status word contributes nothing and never throws (2026-10-12 follow-through)", () => {
    // A listed MediaRun.status is a wire word no door validated; the
    // view-side read folds it to no-information — no provenance, no
    // throw through the barrel (the classifier's refusal is not this
    // seat's contract).
    const out = familyProvenance([
      run({ status: "unreachable", families: ["a"], created_at: 100 }),
      run({ status: "weird", families: ["a"], created_at: 200 }),
    ]);
    assert.deepEqual(out, {});
  });
});

describe("formatLastRun", () => {
  it("renders the compact relative buckets", () => {
    assert.equal(formatLastRun(0), "never");
    const now = Date.now();
    assert.equal(formatLastRun(now - 5_000), "just now");
    assert.equal(formatLastRun(now - 5 * 60_000), "5m ago");
    assert.equal(formatLastRun(now - 3 * 3_600_000), "3h ago");
    assert.equal(formatLastRun(now - 2 * 86_400_000), "2d ago");
    assert.equal(typeof formatLastRun(now - 30 * 86_400_000), "string");
  });
});
