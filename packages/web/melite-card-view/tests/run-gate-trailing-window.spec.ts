// run-gate-trailing-window.spec.ts — SD-9's engine-side hold, judged
// at its own seat (2026-11-08 purge census). The 300ms trailing
// ledger (scheduleStageParam) loses a keystroke the operator presses
// inside its window unless the run gate FORCES every pending write
// before composing — and voices LOUD when a write did not land. The
// ledger machinery's own laws (CAS serialization, rev chaining, the
// quiet loop) are pinned in write-ledger-law.spec.ts; this wall pins
// the GATE'S OWN CONTRACT: flush-before-compose, then refuse-
// unlanded-named. The tab-close half of the trailing window (the
// operator closes the tab inside the 300ms; no beforeunload/beacon
// exists) stays UNCOVERED by declaration: the estate lane is the
// api-gateway's ONE WebSocket, which pagehide tears down, and a
// keepalive fetch would be a hand-rolled second transport with no
// server door to receive it.
import { afterEach, describe, expect, test } from "vitest";
import {
  refuseForUnlandedWrite, resetStageWrites, scheduleStageParam,
  stageWriteState,
} from "../src/client/draft.ts";
import { mountEstateFakes, type EstateFakesOptions } from "./estate-harness.ts";
import { draftIdOf } from "@melite/contracts/benchStage";

type Fakes = ReturnType<typeof mountEstateFakes>;
let active: Fakes | null = null;

function wire(opts: EstateFakesOptions = {}): Fakes {
  active?.unmount();
  active = mountEstateFakes(opts);
  return active;
}

afterEach(() => {
  active?.unmount();
  active = null;
  resetStageWrites();
});

describe("THE RUN GATE FLUSHES THE TRAILING WINDOW BEFORE COMPOSE AND REFUSES UNLANDED LOUD (SD-9): the drill-close half is witnessed; the tab-close half stays uncovered by declaration — the estate lane is the api-gateway's one WebSocket and a pagehide beacon has no second transport to ride", () => {
  test("a keystroke still inside its 300ms trailing window lands through the real door when the gate flushes — the press composes the value the studio shows, never a half-doc", async () => {
    const fakes = wire({ patchAnswerRevs: [10] });
    // the operator typed and pressed inside the window: the timer has
    // NOT fired, the write exists only as a pending schedule
    void scheduleStageParam(draftIdOf("bench-s1"), "s_0", "prompt", "a red cloak", 7);
    const gate = await refuseForUnlandedWrite(draftIdOf("bench-s1"), "s_0");
    // null = the press may compose — but only because the write
    // FORCED first: the door saw exactly the value the studio shows
    expect(gate).toBeNull();
    const patches = fakes.calls.filter((c) => c.method === "drafts/patch");
    expect(patches.length).toBe(1);
    expect(patches[0]!.args["patch"]).toEqual({ params: { prompt: "a red cloak" } });
    expect(stageWriteState(draftIdOf("bench-s1"), "s_0").failedKeys).toEqual([]);
  });

  test("a write the door refuses keeps the run OUT of the engine — the gate's refusal names the unlanded key and states nothing was sent", async () => {
    wire({ patchFailures: [{ delivered: false, reason: "bench/stale-window" }] });
    void scheduleStageParam(draftIdOf("bench-s1"), "s_0", "prompt", "doomed", 7);
    const gate = await refuseForUnlandedWrite(draftIdOf("bench-s1"), "s_0");
    // THE LOUD VOICE, verbatim shape: the run never composes over a
    // doc the studio does not show
    expect(gate).toContain("THE WRITE DID NOT LAND — run refused:");
    expect(gate).toContain("bench/stale-window");
    expect(gate).toContain("(unlanded keys: prompt)");
    expect(gate).toContain("nothing was sent to the engine");
    expect(stageWriteState(draftIdOf("bench-s1"), "s_0").failedKeys).toEqual(["prompt"]);
  });
});
