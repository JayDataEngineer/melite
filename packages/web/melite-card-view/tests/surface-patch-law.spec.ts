// surface-patch-law.spec.ts — THE STRETCH CURE'S WALL (2026-10-15,
// the operator's "the card claims to have been rebuilt": stretching a
// call window in the video card fired onPatch per pointermove through
// the DIRECT door at one shared render-time rev — every writer in the
// burst collided with every other, the PATCH_ATTEMPTS budget
// exhausted, and the loud "bench moved under the patch" refusal
// painted a storm nobody typed). The surface seat rides the trailing
// whole-patch coalescer now (scheduleStagePatch): a gesture burst is
// ONE chained write riding confirmedRev at send time — a single
// author lands with ZERO collisions.
//
// THE TOGGLE PROOF: rewire the seat to the direct door (per-gesture
// patchStageParams at the shared rev) and every arm below reds — N
// door writes where one stood, a shared stale rev on each, CAS
// refusals in the ledger. The wall judges the REAL door (the fake's
// recorded drafts/patch calls + the ledger row), never a literal.
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  flushStageWrites, forgetStageWrites, resetStageWrites,
  scheduleStageParam, scheduleStagePatch,
  stageWriteState, unlandedWriteVoice,
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
  vi.useRealTimers();
});

interface PatchCall {
  params: Record<string, unknown>;
  expectRev: number | null;
}

function patchCalls(fakes: Fakes): PatchCall[] {
  return fakes.calls
    .filter((c) => c.method === "drafts/patch")
    .map((c) => {
      const args = c.args as { patch?: { params?: Record<string, unknown> }; expectRev?: number | null };
      return { params: (args.patch?.params ?? {}) as Record<string, unknown>, expectRev: args.expectRev ?? null };
    });
}

const callsOf = (end: number): Array<Record<string, unknown>> =>
  [{ text: "a", start_frame: 0, end_frame: end }];

describe("THE STRETCH BURST IS ONE WRITE (ten pointermoves, one door call, the final payload)", () => {
  afterEach(() => { vi.useRealTimers(); });
  test("ten same-rev patches coalesce trailing into a single write carrying the last gesture", async () => {
    vi.useFakeTimers();
    const fakes = wire({ patchAnswerRevs: [10] });
    // the bar's pointermove storm: every move states the whole calls
    // channel at the render-time rev — synchronously, no tick between
    const pending: Array<Promise<boolean>> = [];
    for (let i = 0; i < 10; i++) {
      pending.push(scheduleStagePatch("bench-s1", "s_0", { calls: callsOf(48 + i) }, 7));
    }
    await vi.advanceTimersByTimeAsync(400);
    const landed = await Promise.all(pending);
    // ONE write, not ten — and it carries the LAST gesture
    const writes = patchCalls(fakes);
    expect(writes.length).toBe(1);
    expect(writes[0]!.params['calls']).toEqual(callsOf(57));
    expect(writes[0]!.expectRev).toBe(7);
    // every waiter rode the one write's fate — all ten callers land
    expect(landed).toEqual(new Array(10).fill(true));
    // the ledger is clean: no failure memory, the answered rev recorded
    expect(stageWriteState("bench-s1", "s_0").failedKeys).toEqual([]);
    expect(stageWriteState("bench-s1", "s_0").confirmedRev).toBe(10);
  });
});

describe("THE SECOND BURST RIDES THE FIRST'S ANSWERED REV (zero single-author collisions)", () => {
  afterEach(() => { vi.useRealTimers(); });
  test("a burst scheduled after the first landed sends at confirmedRev, never the stale render rev", async () => {
    vi.useFakeTimers();
    const fakes = wire({ patchAnswerRevs: [10, 11] });
    const first = scheduleStagePatch("bench-s1", "s_0", { calls: callsOf(48) }, 7);
    await vi.advanceTimersByTimeAsync(400);
    await expect(first).resolves.toBe(true);
    // the snapshot has NOT refreshed (touchBench is async) — the next
    // burst still hands the dead render rev, and must not spend it
    const second = scheduleStagePatch("bench-s1", "s_0", { calls: callsOf(60) }, 7);
    await vi.advanceTimersByTimeAsync(400);
    await expect(second).resolves.toBe(true);
    const writes = patchCalls(fakes);
    expect(writes.length).toBe(2);
    expect(writes[0]!.expectRev).toBe(7);
    expect(writes[1]!.expectRev).toBe(10);
    expect(writes[1]!.params['calls']).toEqual(callsOf(60));
    expect(stageWriteState("bench-s1", "s_0").failedKeys).toEqual([]);
  });
});

describe("THE WHOLE-BODY LAW (a multi-key patch fires as one door write)", () => {
  afterEach(() => { vi.useRealTimers(); });
  test("a layerA-style set lands in a single params body — never split per key", async () => {
    vi.useFakeTimers();
    const fakes = wire({ patchAnswerRevs: [10] });
    const landed = await (async () => {
      const p = scheduleStagePatch("bench-s1", "s_0", { fps: 30, seed: 9 }, 7);
      await vi.advanceTimersByTimeAsync(400);
      return p;
    })();
    expect(landed).toBe(true);
    const writes = patchCalls(fakes);
    expect(writes.length).toBe(1);
    expect(writes[0]!.params).toEqual({ fps: 30, seed: 9 });
  });

  test("a newer patch merges newest-per-key over the pending body", async () => {
    vi.useFakeTimers();
    const fakes = wire({ patchAnswerRevs: [10] });
    const first = scheduleStagePatch("bench-s1", "s_0", { calls: callsOf(48), fps: 24 }, 7);
    const second = scheduleStagePatch("bench-s1", "s_0", { calls: callsOf(60) }, 7);
    await vi.advanceTimersByTimeAsync(400);
    expect(await Promise.all([first, second])).toEqual([true, true]);
    const writes = patchCalls(fakes);
    expect(writes.length).toBe(1);
    expect(writes[0]!.params).toEqual({ calls: callsOf(60), fps: 24 });
  });
});

describe("A REFUSED PATCH RESOLVES FALSE AND THE LEDGER REMEMBERS (the ghost's fuel, named)", () => {
  afterEach(() => { vi.useRealTimers(); });
  test("CAS past the rebase budget lands its keys in failedKeys with the door's voice", async () => {
    vi.useFakeTimers();
    const fakes = wire({
      refusals: [
        { method: "drafts/patch", code: "bench/cas-conflict", message: "bench moved under the patch (expect_rev 7, current 8) — re-read and re-apply" },
        { method: "drafts/patch", code: "bench/cas-conflict", message: "bench moved under the patch (expect_rev 7, current 8) — re-read and re-apply" },
        { method: "drafts/patch", code: "bench/cas-conflict", message: "bench moved under the patch (expect_rev 7, current 8) — re-read and re-apply" },
      ],
    });
    const pending = scheduleStagePatch("bench-s1", "s_0", { calls: callsOf(48) }, 7);
    await vi.advanceTimersByTimeAsync(400);
    // false, never a throw — the ledger owns the memory, the boolean
    // owns the optimistic overlay's retraction
    await expect(pending).resolves.toBe(false);
    expect(patchCalls(fakes).length).toBe(3);
    const state = stageWriteState("bench-s1", "s_0");
    expect(state.failedKeys).toEqual(["calls"]);
    expect(state.lastError).toContain("bench moved under the patch");
    // the one-home voice: prefix, the door's words, the unlanded key
    const voice = unlandedWriteVoice("bench-s1", "s_0");
    expect(voice).toContain("THE WRITE DID NOT LAND");
    expect(voice).toContain("calls");
  });
});

describe("THE RUN GATE FORCES THE TRAILING PATCH (a press composes what the studio shows)", () => {
  afterEach(() => { vi.useRealTimers(); });
  test("a patch still inside its trailing window fires whole on flush", async () => {
    vi.useFakeTimers();
    const fakes = wire({ patchAnswerRevs: [10] });
    const pending = scheduleStagePatch("bench-s1", "s_0", { calls: callsOf(60) }, 7);
    await flushStageWrites("bench-s1", "s_0");
    await expect(pending).resolves.toBe(true);
    const writes = patchCalls(fakes);
    expect(writes.length).toBe(1);
    expect(writes[0]!.params['calls']).toEqual(callsOf(60));
    expect(stageWriteState("bench-s1", "s_0").failedKeys).toEqual([]);
  });
});

describe("A FORM EDIT RACING A STUDIO GESTURE SERIALIZES (the same-tick chain, both seats)", () => {
  afterEach(() => { vi.useRealTimers(); });
  test("param entry and patch entry land one-by-one, the second riding the first's answered rev", async () => {
    vi.useFakeTimers();
    const fakes = wire({ patchAnswerRevs: [10, 11] });
    void scheduleStageParam("bench-s1", "s_0", "prompt", "hi", 7);
    void scheduleStagePatch("bench-s1", "s_0", { calls: callsOf(48) }, 7);
    await vi.advanceTimersByTimeAsync(400);
    const writes = patchCalls(fakes);
    expect(writes.length).toBe(2);
    // insertion order, chained: the prompt first at the render rev,
    // the calls riding the rev the prompt's landing answered
    expect(writes.map((w) => w.expectRev)).toEqual([7, 10]);
    expect(stageWriteState("bench-s1", "s_0").failedKeys).toEqual([]);
  });
});

describe("THE TRIVIAL AND TERMINAL ARMS (empty, teardown, forget)", () => {
  afterEach(() => { vi.useRealTimers(); });
  test("an empty patch sends nothing and lands vacuously true", async () => {
    const fakes = wire();
    await expect(scheduleStagePatch("bench-s1", "s_0", {}, 7)).resolves.toBe(true);
    expect(patchCalls(fakes).length).toBe(0);
  });

  test("tearing down the ledger settles a pending patch FALSE (it never fired, nothing landed)", async () => {
    vi.useFakeTimers();
    wire();
    const pending = scheduleStagePatch("bench-s1", "s_0", { calls: callsOf(48) }, 7);
    resetStageWrites();
    await expect(pending).resolves.toBe(false);
  });

  test("forgetting the stage settles a pending patch FALSE (the cancelled write never lands)", async () => {
    vi.useFakeTimers();
    wire();
    const pending = scheduleStagePatch("bench-s1", "s_0", { calls: callsOf(48) }, 7);
    forgetStageWrites("bench-s1", ["s_0"]);
    await expect(pending).resolves.toBe(false);
  });
});
