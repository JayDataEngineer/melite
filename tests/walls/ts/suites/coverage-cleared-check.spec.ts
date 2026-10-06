// coverage-cleared-check.spec.ts — the scoped-clearing honesty
// gate's own laws (ROADMAP "a scoped run's cleared record is not
// coverage"). Batch 17's shape is the wall's spine: a scoped
// reporter can DROP a record while the raw count stays 0 — the
// checker reads the RAW file and refuses the clear.

import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { clearedVerdicts, type RawCoverage } from "../../../../scripts/coverage-cleared-check.ts";

// The batch-17 lesion, distilled: line 893's statements exist,
// carry count 0, and a scoped run reported the record CLEARED by
// omitting it. Line 901 is the honest clear (count 2). Line 904
// spans two statements (3 + 0) — a branch half-hit still clears
// because the RAW count is non-zero.
const COVERAGE: RawCoverage = {
  "/box/repo/packages/web/card-base/src/cardsRegistry.ts": {
    statementMap: {
      "17": { start: { line: 893 }, end: { line: 893 } },
      "24": { start: { line: 901 }, end: { line: 901 } },
      "25": { start: { line: 904 }, end: { line: 904 } },
      "26": { start: { line: 904 }, end: { line: 906 } },
    },
    s: { "17": 0, "24": 2, "25": 3, "26": 0 },
  },
};

const ARM = "packages/web/card-base/src/cardsRegistry.ts";

describe("clearedVerdicts — the raw-count law", () => {
  it("a zero-count arm the scoped reporter omitted is REFUSED (the batch-17 lesion)", () => {
    const [v] = clearedVerdicts(COVERAGE, [ARM + ":893"]);
    assert.ok(!v.ok);
    assert.match(v.detail, /raw count 0/);
    assert.match(v.detail, /not a clear/);
  });

  it("a non-zero count clears and names the count", () => {
    const [v] = clearedVerdicts(COVERAGE, [ARM + ":901"]);
    assert.ok(v.ok);
    assert.match(v.detail, /raw count 2/);
  });

  it("statements spanning the line SUM (a half-hit branch clears)", () => {
    const [v] = clearedVerdicts(COVERAGE, [ARM + ":904"]);
    assert.ok(v.ok);
    assert.match(v.detail, /raw count 3/);
  });

  it("a line no statement spans is not coverage", () => {
    const [v] = clearedVerdicts(COVERAGE, [ARM + ":899"]);
    assert.ok(!v.ok);
    assert.match(v.detail, /no statement spans/);
  });

  it("a file the run never measured is named, never passed", () => {
    const [v] = clearedVerdicts(COVERAGE, ["packages/nowhere/src/x.ts:5"]);
    assert.ok(!v.ok);
    assert.match(v.detail, /never measured/);
  });

  it("the arm's path spelling is not negotiated — suffix match, longest key wins", () => {
    const both: RawCoverage = {
      "/a/src/impl.ts": { statementMap: { "1": { start: { line: 3 }, end: { line: 3 } } }, s: { "1": 0 } },
      "/a/deep/src/impl.ts": { statementMap: { "1": { start: { line: 3 }, end: { line: 3 } } }, s: { "1": 4 } },
    };
    const [v] = clearedVerdicts(both, ["deep/src/impl.ts:3"]);
    assert.ok(v.ok, "the longer (nested) key owns the arm");
  });

  it("a malformed arm is refused, not guessed", () => {
    for (const arm of ["noline", ":12", "a.ts:x", "a.ts:0"]) {
      const [v] = clearedVerdicts(COVERAGE, [arm]);
      assert.ok(!v.ok, arm);
      assert.match(v.detail, /not a file:line arm/);
    }
  });
});

describe("the CLI door", () => {
  it("exit 1 + REFUSED lines when any arm is a false clear; exit 0 when all clear", () => {
    const dir = mkdtempSync(join(tmpdir(), "cleared-check-"));
    const cov = join(dir, "coverage-final.json");
    writeFileSync(cov, JSON.stringify(COVERAGE));
    const run = (arms: string[]): { status: number, text: string } => {
      try {
        const text = execFileSync("node", ["--experimental-strip-types",
          join("scripts", "coverage-cleared-check.ts"),
          "--coverage", cov, ...arms.flatMap((a) => ["--arm", a])],
          { encoding: "utf8" });
        return { status: 0, text };
      } catch (error: unknown) {
        const e = error as { status: number, stdout: string };
        return { status: e.status, text: e.stdout };
      }
    };
    const bad = run([ARM + ":893"]);
    assert.equal(bad.status, 1);
    assert.match(bad.text, /REFUSED {2}.*:893 — raw count 0/);
    assert.match(bad.text, /is not coverage/);
    const good = run([ARM + ":901"]);
    assert.equal(good.status, 0);
    assert.match(good.text, /CLEARED {2}.*:901 — raw count 2/);
  });
});
