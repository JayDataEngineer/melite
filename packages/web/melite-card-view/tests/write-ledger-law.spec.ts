// write-ledger-law.spec.ts — the write seat's own laws, pinned at the
// unit seam after the four-agent audit of li-bs (2026-10-10). The
// run-gate spec pins the gate's FACE through the tile; this file pins
// the LEDGER MACHINERY the gate rides, in the draft-doors idiom (real
// draft.ts, mountEstateFakes, the recorded call log — fakes, never
// module mocks).
//
// THE AUDIT'S VIOLATIONS, ONE PIN EACH:
//
//  Q1 — THE CAS FAN-OUT: forceScheduledWrites fired every pending key
//       CONCURRENTLY at one shared render-time rev; every writer
//       collided, each retry round eliminated exactly one, and the
//       rebase budget (PATCH_ATTEMPTS=3) exhausted at four-plus keys
//       into a SPURIOUS refusal the operator never typed. The force
//       arm is SERIALIZED now and rides the door's ANSWERED rev —
//       pinned here as the rev SEQUENCE (no two forced writes share a
//       rev; under the fan-out every call carried the same stale one).
//
//  Q2 — THE ORPHANED PROMISE: a superseded schedule's promise never
//       settled (its timer was cleared and nobody resolved it) — a
//       caller awaiting "the door answered" hung forever. The waiters
//       ride the newest write's fate now — pinned as BOTH promises
//       settling.
//
//  Q3 — THE GHOST REFUSAL: a failed key stays in the ledger forever;
//       after the drill closed and reopened, the studio showed the
//       field empty while the run gate kept refusing naming a key
//       nobody held (the cure invisible, the refusal a lie).
//       reconcileStageWriteFailures drops what nobody carries —
//       pinned both ways (the ghost drops; the LIVE failure stays).
import { afterEach, describe, expect, test } from "vitest";
import {
  flushStageWrites, patchStageParams, reconcileStageWriteFailures,
  resetStageWrites, scheduleStageParam, stageWriteState,
} from "../src/client/draft.ts";
import { mountEstateFakes, type EstateFakesOptions } from "./estate-harness.ts";

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

describe("THE FORCED WRITE IS SERIALIZED ON THE DOOR'S ANSWERED REV (the audit's Q1)", () => {
  test("four pending keys land one-by-one, each riding the rev the door just answered — no two writers collide", async () => {
    // the door answers a fresh rev per landing write (the confirmed-
    // write law's currency); the seed the first write fetches is 7.
    const fakes = wire({ patchAnswerRevs: [10, 11, 12, 13] });
    // four keys coalesced in the trailing window — the audit's exact
    // storm shape (the old concurrent fan-out refused here spuriously)
    void scheduleStageParam("bench-s1", "s_0", { prompt: "a red cloak" }, 7);
    void scheduleStageParam("bench-s1", "s_0", { steps: 8 }, 7);
    void scheduleStageParam("bench-s1", "s_0", { turbo: true }, 7);
    void scheduleStageParam("bench-s1", "s_0", { seed: 42 }, 7);
    const state = await flushStageWrites("bench-s1", "s_0");
    // every write landed; the ledger holds no refusal
    expect(state.failedKeys).toEqual([]);
    const revs = fakes.calls
      .filter((c) => c.method === "drafts/patch")
      .map((c) => c.args["expectRev"]);
    expect(revs).toEqual([7, 10, 11, 12]);
    // the LAW, not the example: no two forced writers share a rev —
    // a shared rev IS the collision the CAS fence exists to refuse
    expect(new Set(revs).size).toBe(revs.length);
  });

  test("the trailing write that fires AFTER an earlier one landed rides the fresh rev (the amplifier finding)", async () => {
    const fakes = wire({ patchAnswerRevs: [10, 11] });
    // one key lands through its timer, then a later edit to another
    // key fires — the render-time rev (7) is STALE by then, and the
    // old code collided with it by construction.
    void scheduleStageParam("bench-s1", "s_0", { prompt: "first" }, 7);
    await new Promise((r) => setTimeout(r, 360));
    void scheduleStageParam("bench-s1", "s_0", { steps: 4 }, 7);
    await new Promise((r) => setTimeout(r, 360));
    const state = await flushStageWrites("bench-s1", "s_0");
    expect(state.failedKeys).toEqual([]);
    const revs = fakes.calls
      .filter((c) => c.method === "drafts/patch")
      .map((c) => c.args["expectRev"]);
    // the second write rides the ANSWERED rev (10), not the stale 7
    expect(revs).toEqual([7, 10]);
  });
});

describe("A SUPERSEDED WRITE'S PROMISE STILL SETTLES (the audit's Q2)", () => {
  test("the first caller hears the answer through the newest write — nobody hangs", async () => {
    wire();
    const first = scheduleStageParam("bench-s1", "s_1", { prompt: "draft one" }, 7);
    const second = scheduleStageParam("bench-s1", "s_1", { prompt: "draft two" }, 7);
    // one key, one write: exactly ONE patch leaves, carrying the NEWEST
    // value (latest-wins coalescing — the proven contract, untouched)
    await Promise.all([first, second]);
    const patches = active!.calls.filter((c) => c.method === "drafts/patch");
    expect(patches).toHaveLength(1);
    const params = (patches[0]!.args["patch"] as Record<string, unknown>)["params"] as Record<string, unknown>;
    expect(params["prompt"]).toBe("draft two");
  });

  test("the run gate's FORCE settles the waiters too (out-of-band fire, same answer)", async () => {
    wire();
    const scheduled = scheduleStageParam("bench-s1", "s_1", { steps: 12 }, 7);
    // the gate fires the pending write out of band — the schedule's
    // own promise must still settle (the old code orphaned it)
    await flushStageWrites("bench-s1", "s_1");
    expect(stageWriteState("bench-s1", "s_1").pending).toBe(0);
    await expect(scheduled).resolves.toBeUndefined();
  });
});

describe("THE GHOST REFUSAL RECONCILES AT REOPEN (the audit's Q3 dead end)", () => {
  test("a failed key nobody carries anymore drops; one the held row still carries KEEPS its refusal", async () => {
    wire({
      patchFailures: [{ delivered: false, reason: "bench/stale-window" }],
    });
    await patchStageParams("bench-s1", "s_2", { input_image: "x" }, 7)
      .catch(() => { /* the ledger records the named refusal */ });
    let state = stageWriteState("bench-s1", "s_2");
    expect(state.failedKeys).toEqual(["input_image"]);
    expect(state.lastError).toContain("bench/stale-window");
    // REOPEN: the held row never landed the key, the seeded form does
    // not carry it — the refusal is a GHOST and must not outlive the
    // session of the form that recorded it
    reconcileStageWriteFailures("bench-s1", "s_2", {}, { prompt: "" });
    state = stageWriteState("bench-s1", "s_2");
    expect(state.failedKeys).toEqual([]);
    expect(state.lastError).toBeNull();
    // the LIVE half: a key the held row CARRIES keeps its refusal —
    // reconciliation may never erase a failure the bench still owes
    wire({
      patchFailures: [{ delivered: false, reason: "bench/stale-window" }],
    });
    await patchStageParams("bench-s1", "s_2", { input_image: "x" }, 7)
      .catch(() => {});
    reconcileStageWriteFailures(
      "bench-s1", "s_2",
      { input_image: "x" }, // the held row carries the key
      { input_image: "x" }, // and the form shows it
    );
    expect(stageWriteState("bench-s1", "s_2").failedKeys).toEqual(["input_image"]);
  });
});
