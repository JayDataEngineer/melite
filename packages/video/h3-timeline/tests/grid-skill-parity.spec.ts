// @contract cards-h3-grid-skill
// grid-skill-parity.spec.ts — the grid-authoring doc's derived half
// (friction report §14.3, 2026-11-13).
//
// THE BURN: `grid-authoring` is the doc whose NAME promises grid law,
// and it omitted the facts that decide a film: the `362` cap, the
// carried window's `17k` arithmetic (its 22 f head IS the seam, so a
// carried window contributes `span − 22` to the film), and the refusal's
// own words. An agent authored `90` for a carried window and got a seam
// it never asked for; the doc hedged where the contract is uniform.
//
// THE LAW: the numbers below are read off `timelineContract.ts`'s
// exports, never from the prose — move the grid and this doc must
// move with it.
import { describe, expect, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  GRID_BASE_FRAMES, GRID_MAX_FRAMES, GRID_STEP_FRAMES, SNAP_FLOOR_FRAMES,
} from "../../../models/h3/src/timelineContract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const md = readFileSync(
  join(HERE, "..", "src", "agents", "skills", "grid-authoring", "SKILL.md"),
  "utf-8",
);

describe("the grid skill is derived from the contract's own exports", () => {
  it("ARM 1 — the served grid arithmetic is the doc's arithmetic", () => {
    assert.equal(GRID_BASE_FRAMES, 22, "the base frame count is the code's");
    assert.equal(GRID_STEP_FRAMES, 17, "the step is the code's");
    assert.equal(GRID_MAX_FRAMES, 362, "the cap is the code's");
    assert.ok(md.includes(`${String(GRID_BASE_FRAMES)} + ${String(GRID_STEP_FRAMES)}k`),
      "the doc states the authored grid as the code spells it (22 + 17k)");
    const TICK = String.fromCharCode(96);
    assert.ok(md.includes(`THE CAP: ${TICK}GRID_MAX_FRAMES = ${String(GRID_MAX_FRAMES)}${TICK}`),
      `the doc states the cap as its own law (${String(GRID_MAX_FRAMES)}) — the largest single window`);
    assert.match(md, /largest single window/, "and names it the largest single window");
    if (GRID_MAX_FRAMES !== GRID_BASE_FRAMES + GRID_STEP_FRAMES * 20) {
      assert.fail("the doc's arithmetic (22 + 17 × 20) no longer reaches the cap — re-word the doc");
    }
  });

  it("ARM 2 — the carry arithmetic is stated: a carried window authors 17k and contributes span − 22", () => {
    assert.ok(md.includes("17k"), "the doc states the carried window's span");
    assert.match(md, /CONTRIBUTION to the film is\s+`span − 22`/,
      "the doc states what a carried window CONTRIBUTES (span − 22) — the fact the burn needed");
    assert.match(md, /22 f (?:head|seam)|22-frame seam/, "the doc names the 22 f head as the seam");
    assert.doesNotMatch(md, /not a promise of uniform acceptance/,
      "the doc no longer hedges where the contract is uniform");
  });

  it("ARM 3 — the snap law's own words ride the doc (an agent can recognise the door's voice)", () => {
    // (re-voiced 2026-11-21 — the brief's snap admission: off-grid
    // spans >= 24f admit UP onto the next rung with a reported
    // notice; only sub-floor spans or snaps past the cap refuse.)
    // THE DERIVED LAW: the floor comes from the engine's own
    // constant and the snap verbs from the door's voice below.
    assert.match(md, new RegExp(`authored range`, "i"), "the doc speaks of authored ranges");
    assert.match(md, /lands? (its|the) end UP|snaps .* end UP/i, "the doc teaches the snap-up");
    assert.match(md, /reported on (the )?run('|’)s status/i, "the snap notice rides run status, never silence");
    assert.match(md, new RegExp(`${SNAP_FLOOR_FRAMES}f\\s+snap floor|${SNAP_FLOOR_FRAMES} frames or more snaps?`, "i"),
      "the doc names the engine's own snap floor");
    assert.match(md, new RegExp(`${GRID_MAX_FRAMES}`, "i"), "the doc names the grid's ceiling");
    assert.match(md, /refuses?/, "the doc still names where refusal lives (sub-floor, past-cap)");
    assert.doesNotMatch(md, /there is no snapping path that silently accepts an off-grid span/,
      "the retired no-snap clause is gone");
    assert.doesNotMatch(md, /there is no silent snap/,
      "the retired no-snap voice is gone");
  });
});
