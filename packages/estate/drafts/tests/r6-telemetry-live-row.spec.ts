// r6-telemetry-live-row.spec.ts — THE TELEMETRY LIVE-ROW CONTRACT
// (R6, round-14 race audit `round14-race-benchmutate-2026-10-22.md`).
//
// The audit's window: the patch section resolved the stage row at
// its TOP and the telemetry write landed at the section's END — a
// remove_stage landing in between left the write mutating a
// DETACHED row (the outcome persisted nowhere, or worse, re-rode a
// re-added row by cache alias). The cure is structural: the write
// takes the row as its PARAM and the call site re-resolves the LIVE
// row from the doc's stages immediately before the write.
//
// The window has NO await that opens it in-process today (the whole
// section is one resume), so the cure is prophylactic — which is
// exactly why this wall pins the SOURCE CONTRACT instead of a
// behavior: the day an await lands inside the section, this wall is
// what keeps the re-resolve from being "simplified" back to the
// top-resolved row. It reds on the revert with the audit's name.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REMOTE_SRC = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "src", "remote.ts",
);

const src = readFileSync(REMOTE_SRC, "utf8");

describe("the telemetry write owns the LIVE row (R6, round-14 race audit)", () => {
  it("the deferred write takes the row as its PARAM — never the section's outer binding", () => {
    // The param-taking closure is the cure's first half: the write
    // writes WHAT IT IS GIVEN, so it can never silently mutate a
    // row resolved at a different time.
    assert.match(
      src,
      /const writeTelemetry = \(stage: Record<string, unknown>\): void => \{/,
      "writeTelemetry must take the row as its parameter (the R6 cure) — " +
      "reverting to the outer-binding closure reopens the detached-row window",
    );
  });

  it("the call site re-resolves the LIVE row immediately before the write", () => {
    // The cure's second half: the section's TOP-resolved row must not
    // be the row the write lands in — the live row is found in the
    // CURRENT doc["stages"] at call time, and a row that left the
    // doc skips the write entirely.
    const reResolve = src.indexOf("R6 CURE (round-14 race audit");
    assert.ok(reResolve > 0, "the R6 CURE comment names the contract at the call site");
    const window = src.slice(reResolve, reResolve + 900);
    assert.match(
      window,
      /const liveStage = \(doc\["stages"\] as unknown\[\]\)\.find\(/,
      "the call site must re-resolve the live row from the CURRENT stages array",
    );
    assert.match(
      window,
      /if \(liveStage !== undefined\) writeTelemetry\(liveStage\);/,
      "the write rides the re-resolved row and SKIPS when the row left the doc — " +
      "a removed row's next poll reads the honest delivered:false",
    );
  });
});
