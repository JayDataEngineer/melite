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
//  HOLE 3 (2026-10-11, the audit's mid-force finding) — A KEYSTROKE
//       DURING THE FLUSH: one forced sweep snapshotted the pending
//       keys, drained inflight, and the gate answered CLEAN with a
//       write that registered mid-force still riding its timer — the
//       press composed a row the studio no longer showed. The flush
//       LOOPS until the stage is quiet — pinned as: a write scheduled
//       inside the force's own patch call lands before the gate
//       answers, and the answer carries no pending.
//
//  W5 (2026-10-11, the same-tick send collision) — TWO TIMERS, ONE
//       TICK: two keys scheduled in the same trailing tick fired as
//       two independent sends; both read the same (still-null)
//       confirmedRev and collided at the render-time rev. The timer
//       arm rides the SAME serialized send chain as the force —
//       pinned as: two same-tick keys land at DISTINCT revs, the
//       second riding the rev the first's landing answered.
//
//  HOLE 4 (2026-10-11, the ghost's other face) — THE DECLARED GHOST:
//       reconciliation dropped any failed key the held row no longer
//       carried — but a key the DECLARATION demands (required on the
//       lane) is refused for existing, not for being held, and the
//       ghost sweep erased a LIVE, curable refusal the moment the
//       operator blanked the field. The sweep keeps a failed key that
//       is declared on the lane even when nobody holds it — pinned
//       both ways in one press (the undeclared half drops, the
//       declared half stays).
//
//  Q3 — THE GHOST REFUSAL: a failed key stays in the ledger forever;
//       after the drill closed and reopened, the studio showed the
//       field empty while the run gate kept refusing naming a key
//       nobody held (the cure invisible, the refusal a lie).
//       reconcileStageWriteFailures drops what nobody carries —
//       pinned both ways (the ghost drops; the LIVE failure stays).
import { afterEach, describe, expect, test, vi } from "vitest";
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

// ---------------------------------------------------------------------------
// HOLE 3 — the mid-force keystroke lands before the gate answers
// ---------------------------------------------------------------------------
describe('THE FLUSH LOOPS UNTIL THE STAGE IS QUIET (the 2026-10-11 mid-force finding)', () => {
  test('a write registered DURING the force\'s own patch call lands before the gate answers — the answer carries no pending', async () => {
    // fires once, at the FIRST drafts/patch call — that call IS the
    // force's first write in flight (the hook runs synchronously
    // inside the await the force is holding open)
    let scheduledMidForce = false;
    const fakes = wire({
      patchAnswerRevs: [10, 11],
      onPatchCall: () => {
        if (!scheduledMidForce) {
          scheduledMidForce = true;
          void scheduleStageParam('bench-s1', 's_0', { seed: 42 }, 7);
        }
      },
    });
    void scheduleStageParam('bench-s1', 's_0', { prompt: 'a blue cloak' }, 7);
    const state = await flushStageWrites('bench-s1', 's_0');
    // the gate answered QUIET: the mid-force write is not still riding
    expect(state.pending).toBe(0);
    expect(state.failedKeys).toEqual([]);
    // both writes LANDED — the second on the rev the first answered
    // (the wire patch nests the keys under `params`: patchStageParams
    // owns the door's doc shape, the flat vocabulary is client-side)
    const patches = fakes.calls
      .filter((c) => c.method === 'drafts/patch')
      .map((c) => ((c.args['patch'] as { params?: Record<string, unknown> }).params ?? {}));
    expect(patches.some((p) => 'prompt' in p)).toBe(true);
    expect(patches.some((p) => 'seed' in p)).toBe(true);
    const revs = fakes.calls
      .filter((c) => c.method === 'drafts/patch')
      .map((c) => c.args['expectRev']);
    expect(revs).toEqual([7, 10]);
  });
});

// ---------------------------------------------------------------------------
// W5 — two same-tick timers ride one serialized send chain
// ---------------------------------------------------------------------------
describe('TWO TIMERS IN ONE TICK LAND AT DISTINCT REVS (the 2026-10-11 send-collision fix)', () => {
  test('the second trailing write rides the rev the first\'s landing answered — never the shared render-time rev', async () => {
    const fakes = wire({ patchAnswerRevs: [10, 11] });
    // two keys scheduled in the SAME tick — both timers fire together
    void scheduleStageParam('bench-s1', 's_0', { steps: 8 }, 7);
    void scheduleStageParam('bench-s1', 's_0', { seed: 42 }, 7);
    // let the natural trailing window elapse (no force — the TIMER
    // arm is the seat under test)
    await new Promise((r) => setTimeout(r, 600));
    const revs = fakes.calls
      .filter((c) => c.method === 'drafts/patch')
      .map((c) => c.args['expectRev']);
    expect(revs).toEqual([7, 10]);
    // the LAW: no two same-tick writers share a rev — a shared rev IS
    // the collision the CAS fence exists to refuse
    expect(new Set(revs).size).toBe(revs.length);
    expect(stageWriteState('bench-s1', 's_0').failedKeys).toEqual([]);
  });
});

// W5 — the KILLER face: the force's write is HELD in flight past a
// second write's whole trailing window, so the second write's
// NATURAL timer fires while the first is still unanswered — the
// exact same-tick collision the chain exists to serialize. Under a
// bare send the timer's write reads the still-null confirmedRev and
// collides at the shared render-time rev; on the chain it queues
// behind the held write and lands on the rev it answered.
describe('A TIMER FIRING MID-FORCE RIDES THE CHAIN (the W5 killer face)', () => {
  afterEach(() => { vi.useRealTimers(); });
  test('the mid-force timer queues behind the held write and lands on the rev it answered', async () => {
    vi.useFakeTimers();
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => { release = r; });
    const fakes = wire({
      patchAnswerRevs: [10, 11],
      patchGate: () => gate,
    });
    // A scheduled and FORCED immediately (the gate holds its patch
    // open); B lands in the schedule MID-FORCE (after the snapshot)
    // and its whole trailing window elapses while A is still held
    void scheduleStageParam('bench-s1', 's_0', { prompt: 'held' }, 7);
    const flushP = flushStageWrites('bench-s1', 's_0');
    await vi.advanceTimersByTimeAsync(0); // A's patch reaches the gate
    // B registers mid-force (the HOLE 3 state), trailing window armed
    void scheduleStageParam('bench-s1', 's_0', { seed: 42 }, 7);
    // the window elapses WITH A STILL HELD — B's natural timer fires
    // mid-force (under the bare send it wrote at the stale rev 7)
    await vi.advanceTimersByTimeAsync(300);
    release(); // the door finally answers A at rev 10
    await flushP;
    await vi.advanceTimersByTimeAsync(0); // let the chain's B link settle
    const revs = fakes.calls
      .filter((c) => c.method === 'drafts/patch')
      .map((c) => c.args['expectRev']);
    expect(revs).toEqual([7, 10]);
    expect(new Set(revs).size).toBe(revs.length);
    const state = stageWriteState('bench-s1', 's_0');
    expect(state.pending).toBe(0);
    expect(state.failedKeys).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// HOLE 4 — the declared ghost keeps its refusal
// ---------------------------------------------------------------------------
describe('RECONCILIATION KEEPS A FAILED KEY THE DECLARATION DEMANDS (the 2026-10-11 declared-ghost fix)', () => {
  test('the undeclared half drops, the declared half stays — blanking a required field never silences the ledger', async () => {
    // one write whose key the lane DECLARES, one whose key nothing
    // declares — both refused at the door
    wire({
      patchFailures: [
        { delivered: false, reason: 'bench/stale-window' },
        { delivered: false, reason: 'bench/stale-window' },
      ],
    });
    await patchStageParams('bench-s1', 's_2', { prompt: 'x' }, 7).catch(() => {});
    await patchStageParams('bench-s1', 's_2', { input_image: 'y' }, 7).catch(() => {});
    expect(new Set(stageWriteState('bench-s1', 's_2').failedKeys))
      .toEqual(new Set(['prompt', 'input_image']));
    // the operator blanked both fields (the row holds neither, the
    // form shows neither) but the lane DECLARES 'prompt' — the sweep
    // may drop the ghost, never the declared demand
    reconcileStageWriteFailures(
      'bench-s1', 's_2',
      {}, // the held row carries neither key
      {}, // the form shows neither key
      new Set(['prompt']), // the DECLARATION demands prompt on this lane
    );
    expect(stageWriteState('bench-s1', 's_2').failedKeys)
      .toEqual(['prompt']);
    expect(stageWriteState('bench-s1', 's_2').lastError).toContain('bench/stale-window');
  });
});
