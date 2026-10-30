// stage-run-pure.spec.ts — THE PASS SUMMARY'S SENTENCE CONTRACT (the
// pure renderer, 2026-11-30): describePass reads a PassResult, and its
// sentence must stay grammatical across the type's own input space —
// a skip whose why is empty and a pass whose refused verdict is absent
// still name their stages, never render blanks or the null word. The
// builder-real faces (why from the cache-hit skip, refused from the
// door) ride the pass specs (cards-tab); these pin the renderer's
// grammar. Pure functions, exact strings — no fetch, no DOM.
import { describe, expect, test } from "vitest";
import { describePass } from "../src/client/stage-run.ts";
import type { PassResult, PassStageOutcome } from "../src/client/stage-run.ts";

function pass(outcomes: PassStageOutcome[], over: Partial<PassResult> = {}): PassResult {
  return { ran: [], stoppedAt: null, refused: null, outcomes, ...over };
}

describe("describePass — the summary over the type's own input space", () => {
  test("a skip whose why is empty renders the bare skip — no parenthetical", () => {
    // the parenthetical is the why's face: an outcome that carries no
    // why text still names the skipped stage, with nothing to say
    const res = pass([
      { stageId: "s_0", out: "skipped", why: "" },
      { stageId: "s_1", out: "ran", why: "run run-1" },
    ], { ran: ["s_1"] });
    expect(describePass(res)).toBe("run all: ran s_1 · skipped s_0");
  });

  test("a refused outcome with the verdict absent names the stage with the bare separator", () => {
    // refused is string | null on the type: a pass whose refusal
    // verdict is absent still names the refused stage, and the null
    // verdict never renders as the word "null"
    const res = pass([
      { stageId: "s_1", out: "refused", why: "the door refused the start" },
    ]);
    expect(describePass(res)).toBe("run all: ran nothing · refused at s_1 — ");
  });
});
