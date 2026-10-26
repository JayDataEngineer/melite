// cards-resource-observe.spec.ts — observeRunOutcome's poll law and
// reconcileBenchRuns' attribution (2026-09-16 burn-down).
// @contract cards-unknown-status-health
//
// THE ONE-LANE LAW (stroke 81): the poll rides the mounted
// namespaces through mountEstateFakes — no fetch stub answers an
// estate verb. runs/status scripts ride `runDocs` (served in order,
// the last lingering for poll loops); the file-era fallback rides
// `listRows`; refusals queue in `refusals` (one entry per refused
// call — the start read AND the poll each take one); transport
// deaths queue in `throws`. Outcome writes are the drafts/patch
// entries of fakes.calls ({draftId, stageId, patch, expectRev}).
//
// NOTE (deleted arm, type-level proof — was the trailing `return
// null`): observeRunOutcome's settle path is entered only when
// isTerminalRun(row.status), whose set is exactly {completed,
// failed, stopped}, and the terminal mapping sends those to
// {done, failed, stopped}, so the disjunction above the return is
// exhaustive — the null arm could never fire and is gone (the `as`
// narrows what the compiler cannot see).
import { afterEach, describe, expect, test, vi } from "vitest";
import { tileStatusFromVerdict } from "../src/client/cards-resource.ts";
import { unbindEstateRemote } from '@melite/card-base/client';
import { mountEstateFakes } from "./estate-harness.ts";
import type { EstateFakesOptions } from "./estate-harness.ts";
import {
  observeRunOutcome,
  reconcileBenchRuns,
} from "../src/client/cards-resource.ts";
import type { BenchStageView, CardsBenchValue } from "../src/client/cards-resource.ts";
import { draftIdOf } from '@melite/contracts/benchStage';

afterEach(() => {
  unbindEstateRemote();
  vi.unstubAllGlobals();
});

type Fakes = ReturnType<typeof mountEstateFakes>;

/** Mount the live-lane fakes for one poll test (unmounted by the caller). */
function stubEstate(opts: EstateFakesOptions = {}): Fakes {
  return mountEstateFakes(opts);
}

/** The drafts/patch arg bodies the observer wrote, in order. */
function patchesOf(fakes: Fakes): Array<Record<string, unknown>> {
  return fakes.calls
    .filter((c) => c.method === "drafts/patch")
    .map((c) => c.args);
}

const RUNNING = { run_id: "r_1", status: "running", stages: [] };

describe("observeRunOutcome — the start read binds the row first", () => {
  test("a queued start shows queued (never a lie about running)", async () => {
    // the script answers queued forever (the last doc lingers) —
    // abort to end the watch.
    const fakes = stubEstate({
      runDocs: [{ ...RUNNING, status: "queued" }],
    });
    try {
      const ctrl = new AbortController();
      const done = observeRunOutcome(draftIdOf("d_1"), "s_0", "r_1", ctrl.signal, () => {});
      // the first frame lands the queued patch — await it, not a
      // fixed 100ms, then abort to end the watch.
      await vi.waitFor(() => { expect(patchesOf(fakes).length).toBeGreaterThan(0); });
      ctrl.abort();
      await expect(done).resolves.toBeNull();
      expect(patchesOf(fakes)[0]).toMatchObject({
        draftId: "d_1", stageId: "s_0",
        patch: { runStatus: "queued", result: { run_id: "r_1" } },
      });
    } finally {
      fakes.unmount();
    }
  });

  test("a running start through terminal done returns done", async () => {
    const fakes = stubEstate({
      runDocs: [RUNNING, { run_id: "r_1", status: "completed", stages: [] }],
    });
    try {
      let touched = 0;
      await expect(observeRunOutcome(draftIdOf("d_1"), "s_0", "r_1", undefined, () => { touched++; }))
        .resolves.toBe("done");
      expect(fakes.calls.filter((c) => c.method === "runs/status")).toHaveLength(2);
      const patches = patchesOf(fakes);
      expect(patches).toHaveLength(2);
      expect(patches[0]).toMatchObject({ patch: { runStatus: "running", result: { run_id: "r_1" } } });
      expect(patches[1]).toMatchObject({ patch: { runStatus: "done", result: { run_id: "r_1" } } });
      expect(touched).toBe(2);
    } finally {
      fakes.unmount();
    }
  });

  test("a dead start read still binds running (transport is not a verdict)", async () => {
    const fakes = stubEstate({
      throws: [{ method: "runs/status", message: "door down" }],
    });
    try {
      const ctrl = new AbortController();
      ctrl.abort();
      await expect(observeRunOutcome(draftIdOf("d_1"), "s_0", "r_1", ctrl.signal)).resolves.toBeNull();
      expect(patchesOf(fakes)[0]).toMatchObject({ patch: { runStatus: "running" } });
    } finally {
      fakes.unmount();
    }
  });
});

describe("observeRunOutcome — THE TRANSPORT ESCALATION (CRITICAL-2: never 'running' forever)", () => {
  test("a downed gateway gets an 'unreachable' HEALTH word, then recovery clears it", async () => {
    // the fallback audit's CRITICAL-2: a 502 loop used to retry
    // forever with the tile stuck at 'running' — "a transport
    // failure became 'still live'". Ten consecutive transport
    // failures must patch an explicit transport word on the row's
    // HEALTH channel (LOW-23: never runStatus — a resource signal
    // is not run vocabulary), and the first successful poll must
    // clear it back to a plain live face.
    vi.useFakeTimers();
    let fakes: Fakes | undefined;
    try {
      // the start read (call 1) plus polls 2..11 all reject on the
      // wire; call 12 is the recovery — the live doc answers.
      fakes = stubEstate({
        throws: Array.from({ length: 11 }, (_, i) => ({
          method: "runs/status" as const,
          onCall: i + 1,
          message: "door down",
        })),
        runDocs: [RUNNING],
      });
      const ctrl = new AbortController();
      const done = observeRunOutcome(draftIdOf("d_1"), "s_0", "r_1", ctrl.signal);
      // run the fake clock through the whole backoff chain
      // (1.5s→10s cap across the failures and the recovery poll)
      await vi.advanceTimersByTimeAsync(120_000);
      ctrl.abort();
      await expect(done).resolves.toBeNull();
      const patches = patchesOf(fakes).map((p) => p["patch"] as Record<string, unknown>);
      // [0] the honest-optimism bind, [1] the escalation (the
      // transport word rides the HEALTH channel — runStatus is
      // absent from the body, the whole point of LOW-23), [2] the
      // corrective live patch on recovery (carries the health CLEAR
      // beside the live word)
      expect(patches[0]).toMatchObject({ runStatus: "running" });
      expect("runStatus" in patches[1]!).toBe(false);
      expect(patches[1]).toMatchObject({ health: "unreachable" });
      expect(patches[2]).toMatchObject({ runStatus: "running", health: null });
    } finally {
      vi.useRealTimers();
      fakes?.unmount();
    }
  });

  test("a terminal settle straight off the outage clears the health word with the outcome", async () => {
    // the outage arm's other exit: no live frame ever answers — the
    // first answered poll IS the terminal settle. The terminal patch
    // carries the health CLEAR beside the outcome (a settled run
    // answered the transport; no warning face outlives it).
    vi.useFakeTimers();
    let fakes: Fakes | undefined;
    try {
      // calls 1..11 die on the wire (escalation lands on 10); call
      // 12 answers the finished run.
      fakes = stubEstate({
        throws: Array.from({ length: 11 }, (_, i) => ({
          method: "runs/status" as const,
          onCall: i + 1,
          message: "door down",
        })),
        runDocs: [{ run_id: "r_1", status: "completed", stages: [] }],
      });
      const done = observeRunOutcome(draftIdOf("d_1"), "s_0", "r_1");
      await vi.advanceTimersByTimeAsync(120_000);
      await expect(done).resolves.toBe("done");
      const patches = patchesOf(fakes).map((p) => p["patch"] as Record<string, unknown>);
      expect(patches[1]).toMatchObject({ health: "unreachable" });
      expect(patches[2]).toMatchObject({ runStatus: "done", health: null });
    } finally {
      vi.useRealTimers();
      fakes?.unmount();
    }
  });

  test("a phantom cure after the escalation clears the health word with the verdict", async () => {
    // the third clear seat: the estate ANSWERS a refusal after the
    // outage (the registry restarted) — the phantom verdict's patch
    // carries the health CLEAR too (the refusal answered the
    // transport as surely as a live frame would have).
    vi.useFakeTimers();
    let fakes: Fakes | undefined;
    try {
      // calls 1..11 die on the wire; call 12 (the poll) and 13
      // (probeRunGone's status read) both refuse; the file-era list
      // is empty — gone from both maps.
      fakes = stubEstate({
        throws: Array.from({ length: 11 }, (_, i) => ({
          method: "runs/status" as const,
          onCall: i + 1,
          message: "door down",
        })),
        refusals: [
          { method: "runs/status", message: "no such run", onCall: 12 },
          { method: "runs/status", message: "no such run", onCall: 13 },
        ],
        listRows: [],
      });
      const done = observeRunOutcome(draftIdOf("d_1"), "s_0", "r_1");
      await vi.advanceTimersByTimeAsync(120_000);
      await expect(done).resolves.toBe("stopped");
      const patches = patchesOf(fakes).map((p) => p["patch"] as Record<string, unknown>);
      expect(patches[1]).toMatchObject({ health: "unreachable" });
      expect(patches[2]).toMatchObject({ runStatus: "stopped", health: null });
    } finally {
      vi.useRealTimers();
      fakes?.unmount();
    }
  });

  test("transient failures (under the threshold) never patch the unreachable face", async () => {
    vi.useFakeTimers();
    let fakes: Fakes | undefined;
    try {
      // three wire hiccups, then the live doc — a flap, not an outage
      fakes = stubEstate({
        throws: Array.from({ length: 3 }, (_, i) => ({
          method: "runs/status" as const,
          onCall: i + 1,
          message: "hiccup",
        })),
        runDocs: [RUNNING],
      });
      const ctrl = new AbortController();
      const done = observeRunOutcome(draftIdOf("d_1"), "s_0", "r_1", ctrl.signal);
      await vi.advanceTimersByTimeAsync(30_000);
      ctrl.abort();
      await expect(done).resolves.toBeNull();
      const statuses = patchesOf(fakes).map(
        (p) => (p["patch"] as { runStatus?: string; health?: string }).runStatus,
      );
      // a flap never escalates: no health word anywhere, and the
      // live word keeps flowing
      expect(patchesOf(fakes).every(
        (p) => (p["patch"] as Record<string, unknown>)["health"] === undefined)).toBe(true);
      expect(statuses.includes("unreachable")).toBe(false);
      expect(statuses[0]).toBe("running");
    } finally {
      vi.useRealTimers();
      fakes?.unmount();
    }
  });
});

describe("observeRunOutcome — THE PHANTOM CURE (refused status, file-era verdict)", () => {
  function phantom(listRows: Array<Record<string, unknown>>): Fakes {
    return stubEstate({
      // the start read, the poll, AND probeRunGone's internal read
      // each burn one refusal — the cure runs on the poll's refusal
      // and the verdict reads the list.
      refusals: [
        { method: "runs/status", message: "no such run" },
        { method: "runs/status", message: "no such run" },
        { method: "runs/status", message: "no such run" },
      ],
      listRows,
    });
  }

  test("absent from both maps: gone → stopped", async () => {
    const fakes = phantom([]);
    try {
      let touched = 0;
      await expect(observeRunOutcome(draftIdOf("d_1"), "s_0", "r_1", undefined, () => { touched++; }))
        .resolves.toBe("stopped");
      const patches = patchesOf(fakes);
      // [0] is the start binding (a refused start still binds running);
      // [1] is the phantom verdict.
      expect(patches[0]).toMatchObject({ patch: { runStatus: "running" } });
      expect(patches[1]).toMatchObject({ patch: { runStatus: "stopped", result: { run_id: "r_1" } } });
      expect(touched).toBe(2);
    } finally {
      fakes.unmount();
    }
  });

  test("the list's completed answer: done", async () => {
    const fakes = phantom([{ run_id: "r_1", status: "completed" }]);
    try {
      await expect(observeRunOutcome(draftIdOf("d_1"), "s_0", "r_1")).resolves.toBe("done");
      expect(patchesOf(fakes)[1]).toMatchObject({ patch: { runStatus: "done" } });
    } finally {
      fakes.unmount();
    }
  });

  test("a live verdict from the list keeps watching (returns null, never a fake terminal)", async () => {
    const fakes = phantom([{ run_id: "r_1", status: "running" }]);
    try {
      await expect(observeRunOutcome(draftIdOf("d_1"), "s_0", "r_1")).resolves.toBeNull();
      expect(patchesOf(fakes)[1]).toMatchObject({ patch: { runStatus: "running" } });
    } finally {
      fakes.unmount();
    }
  });

  test("a foreign list verdict is TRANSLATED into the tile's own vocabulary", async () => {
    // The old law rode the word verbatim. The file era answers
    // `success`/`unknown`/anything new, and a status no dot knows
    // leaves the tile looking idle FOREVER (the wire audit's H1):
    // the stamp now maps every verdict this client cannot render
    // onto a terminal one it can — the run finished, and the tile
    // must say so.
    const fakes = phantom([{ run_id: "r_1", status: "failed" }]);
    try {
      // 'failed' is not a tile status either: it becomes 'stopped'
      // (terminal, and renderable) rather than stamped raw.
      await expect(observeRunOutcome(draftIdOf("d_1"), "s_0", "r_1")).resolves.toBe("stopped");
      expect(patchesOf(fakes)[1]).toMatchObject({ patch: { runStatus: "stopped", result: { run_id: "r_1" } } });
    } finally {
      fakes.unmount();
    }
  });

  test("THE FILE-ERA WORDS ARE TERMINAL, NOT IDLE (the verdict map itself)", () => {
    // the law, pinned where it lives: a word this client can render
    // rides; a word it cannot becomes TERMINAL, never "still
    // running" (which is what left a finished run's tile idle
    // forever with a dot no one could draw).
    for (const [verdict, expected] of [
      ["live", "running"], ["running", "running"], ["queued", "running"],
      ["completed", "done"], ["success", "done"], ["succeeded", "done"], ["done", "done"],
      ["gone", "stopped"], ["stopped", "stopped"], ["failed", "stopped"],
      ["error", "stopped"], ["unknown", "stopped"], ["whatever-2030", "stopped"],
    ] as const) {
      expect(tileStatusFromVerdict(verdict), verdict).toBe(expected);
    }
  });

  test("an unknown verdict ENDS the observer (never an endless poll)", async () => {
    const fakes = phantom([{ run_id: "r_1", status: "whatever-2030" }]);
    try {
      expect(await observeRunOutcome(draftIdOf("d_1"), "s_0", "r_1")).toBe("stopped");
    } finally {
      fakes.unmount();
    }
  });
});

describe("observeRunOutcome — the live fold (progress rides the row)", () => {
  test("percent + activity patch only when they move (no CAS churn)", async () => {
    const stage = (extra: Record<string, unknown> = {}) => ({
      id: "other", status: "running", url: "",
      ...extra,
    });
    const fakes = stubEstate({
      runDocs: [
        RUNNING,
        // single-stage fallback: the id never matches, the one stage answers
        { run_id: "r_1", status: "running", stages: [stage({ activity: "sampling" })] },
        { run_id: "r_1", status: "running", stages: [stage({ activity: "sampling" })] },
        { run_id: "r_1", status: "completed", stages: [stage()] },
      ],
    });
    try {
      await expect(observeRunOutcome(draftIdOf("d_1"), "s_0", "r_1")).resolves.toBe("done");
      // start + activity-only + terminal (the repeat poll patches NOTHING)
      expect(patchesOf(fakes).map((p) => p["patch"])).toEqual([
        { runStatus: "running", result: { run_id: "r_1" } },
        { runStatus: "running", result: { run_id: "r_1", activity: "sampling" } },
        { runStatus: "done", result: { run_id: "r_1" } },
      ]);
    } finally {
      fakes.unmount();
    }
  });

  test("integer percent rides with the progress body", async () => {
    const fakes = stubEstate({
      runDocs: [
        RUNNING,
        { run_id: "r_1", status: "running", stages: [
          { id: "s_0", progress: { value: 1, max: 4 }, activity: "" },
        ] },
        { run_id: "r_1", status: "completed", stages: [] },
      ],
    });
    try {
      await expect(observeRunOutcome(draftIdOf("d_1"), "s_0", "r_1")).resolves.toBe("done");
      expect(patchesOf(fakes)[1]).toMatchObject({
        patch: { runStatus: "running", result: { run_id: "r_1", progress: { value: 1, max: 4 } } },
      });
    } finally {
      fakes.unmount();
    }
  });

  test("a resultless live flip patches bare (never a padded result)", async () => {
    const fakes = stubEstate({
      runDocs: [
        RUNNING,
        // queued with progress-less, activity-less rows: the move
        // patches, but the result stays off
        { run_id: "r_1", status: "queued", stages: [{ id: "s_0" }] },
        { run_id: "r_1", status: "completed", stages: [] },
      ],
    });
    try {
      await expect(observeRunOutcome(draftIdOf("d_1"), "s_0", "r_1")).resolves.toBe("done");
      expect(patchesOf(fakes).map((p) => p["patch"])).toEqual([
        { runStatus: "running", result: { run_id: "r_1" } },
        { runStatus: "queued" },
        { runStatus: "done", result: { run_id: "r_1" } },
      ]);
    } finally {
      fakes.unmount();
    }
  });

  test("a transport blip mid-poll sleeps and recovers (the last ok value stays)", async () => {
    const fakes = stubEstate({
      runDocs: [RUNNING, { run_id: "r_1", status: "completed", stages: [] }],
      // the blip lands mid-poll (the 2nd status call): the start read
      // ok'd, the blip sleeps through one cadence with the last ok
      // value staying, the next poll recovers to terminal.
      throws: [{ method: "runs/status", message: "blip", onCall: 2 }],
    });
    try {
      await expect(observeRunOutcome(draftIdOf("d_1"), "s_0", "r_1")).resolves.toBe("done");
      expect(fakes.calls.filter((c) => c.method === "runs/status")).toHaveLength(3);
      expect(patchesOf(fakes)).toHaveLength(2);
    } finally {
      fakes.unmount();
    }
  });
});

describe("observeRunOutcome — the terminal carry", () => {
  async function terminal(status: string, doc: Record<string, unknown>): Promise<{ patches: Array<Record<string, unknown>>; fakes: Fakes }> {
    const fakes = stubEstate({
      runDocs: [RUNNING, { run_id: "r_1", status, ...doc }],
    });
    await observeRunOutcome(draftIdOf("d_1"), "s_0", "r_1");
    return { patches: patchesOf(fakes).map((p) => p["patch"] as Record<string, unknown>), fakes };
  }

  test("the stage's own error rides a failed run", async () => {
    const { patches, fakes } = await terminal("failed", { stages: [{ id: "s_0", error: "node 3 blew up" }] });
    try {
      expect(patches[1]).toMatchObject({
        runStatus: "failed", result: { run_id: "r_1", error: "node 3 blew up" },
      });
    } finally {
      fakes.unmount();
    }
  });

  test("the run-level text is the fallback reason", async () => {
    const { patches, fakes } = await terminal("failed", { error: "gpu gone", stages: [] });
    try {
      expect(patches[1]).toMatchObject({
        runStatus: "failed", result: { run_id: "r_1", error: "gpu gone" },
      });
    } finally {
      fakes.unmount();
    }
  });

  test("no reason anywhere carries no error key (never an empty lie)", async () => {
    const { patches, fakes } = await terminal("failed", { stages: [] });
    try {
      expect(patches[1]).toEqual({ runStatus: "failed", result: { run_id: "r_1" } });
    } finally {
      fakes.unmount();
    }
  });

  test("gallery names rewrite onto the media route (empties filter out; ONE key per file — the legacy 'video' stamp is dead)", async () => {
    const { patches, fakes } = await terminal("completed", {
      stages: [{ id: "s_0", status: "succeeded", url: "out/flat.mp4", gallery: [{ name: "" }, { name: "a.png" }] }],
    });
    try {
      expect(patches[1]).toEqual({
        runStatus: "done",
        result: {
          run_id: "r_1",
          url: "/melite-media/runs/r_1/out/flat.mp4",
          artifacts: {
            "a.png": "/melite-media/runs/r_1/a.png",
          },
          assetUrls: ["/melite-media/runs/r_1/out/flat.mp4", "/melite-media/runs/r_1/a.png"],
        },
      });
    } finally {
      fakes.unmount();
    }
  });

  test("a bare stage url carries no video key (never an empty artifact)", async () => {
    const { patches, fakes } = await terminal("completed", {
      stages: [{ id: "s_0", status: "succeeded", url: "", gallery: [{ name: "a.png" }] }],
    });
    try {
      expect(patches[1]).toEqual({
        runStatus: "done",
        result: {
          run_id: "r_1",
          artifacts: { "a.png": "/melite-media/runs/r_1/a.png" },
          assetUrls: ["/melite-media/runs/r_1/a.png"],
        },
      });
    } finally {
      fakes.unmount();
    }
  });

  test("stopped returns stopped", async () => {
    const fakes = stubEstate({
      runDocs: [RUNNING, { run_id: "r_1", status: "stopped", stages: [] }],
    });
    try {
      await expect(observeRunOutcome(draftIdOf("d_1"), "s_0", "r_1")).resolves.toBe("stopped");
      expect(patchesOf(fakes)[1]).toMatchObject({ patch: { runStatus: "stopped" } });
    } finally {
      fakes.unmount();
    }
  });
});

describe("reconcileBenchRuns — the attribution half", () => {
  // The reconcile reads draftId + running rows only; stages ride as
  // view rows (id plus the runStatus/result the tests pin) and the
  // bench carries the main session key.
  const bench = (stages: Array<BenchStageView>): CardsBenchValue => ({
    kind: "bench" as const, draftId: draftIdOf("d_1"), rev: 1, stages, log: [], sessionKey: "main",
  });

  test("idle rows and runless rows are skipped silently", async () => {
    const fakes = stubEstate();
    try {
      await reconcileBenchRuns(bench([
        { id: "s_0", runStatus: "done", result: { run_id: "r_1" } },
        { id: "s_1", runStatus: "running" },
        { id: "s_2", runStatus: "running", result: null },
      ]));
      expect(patchesOf(fakes)).toEqual([]);
    } finally {
      fakes.unmount();
    }
  });

  test("an already-armed key is skipped (the set is the caller's)", async () => {
    const fakes = stubEstate();
    try {
      await reconcileBenchRuns(bench([
        { id: "s_0", runStatus: "running", result: { run_id: "r_1" } },
      ]), { armed: new Set(["s_0:r_1"]) });
      expect(patchesOf(fakes)).toEqual([]);
    } finally {
      fakes.unmount();
    }
  });

  test("a transport verdict disarms (a later refresh retries)", async () => {
    const fakes = stubEstate({
      throws: [{ method: "runs/status", message: "blip" }],
    });
    try {
      const armed = new Set<string>();
      await reconcileBenchRuns(bench([
        { id: "s_0", runStatus: "running", result: { run_id: "r_1" } },
      ]), { armed });
      expect(armed.has("s_0:r_1")).toBe(false);
      expect(patchesOf(fakes)).toEqual([]);
    } finally {
      fakes.unmount();
    }
  });

  test("a live row arms an observer (the start binds running first)", async () => {
    const fakes = stubEstate({
      runDocs: [RUNNING],
    });
    try {
      const ctrl = new AbortController();
      ctrl.abort();
      await reconcileBenchRuns(bench([
        { id: "s_0", runStatus: "running", result: { run_id: "r_1" } },
      ]), { signal: ctrl.signal });
      // the observer floats (void) — await its write, not a 100ms flush.
      await vi.waitFor(() => { expect(patchesOf(fakes).length).toBeGreaterThan(0); });
      expect(patchesOf(fakes)[0]).toMatchObject({ patch: { runStatus: "running" } });
    } finally {
      fakes.unmount();
    }
  });

  test("a gone row flips stopped", async () => {
    const fakes = stubEstate({
      refusals: [{ method: "runs/status", message: "no such run" }],
    });
    try {
      let touched = 0;
      await reconcileBenchRuns(bench([
        { id: "s_0", runStatus: "queued", result: { run_id: "r_1" } },
      ]), { onTouched: () => { touched++; } });
      expect(patchesOf(fakes)[0]).toMatchObject({ patch: { runStatus: "stopped" } });
      expect(touched).toBe(1);
    } finally {
      fakes.unmount();
    }
  });

  test("a listed completed row flips done", async () => {
    const fakes = stubEstate({
      refusals: [{ method: "runs/status", message: "no such run" }],
      listRows: [{ run_id: "r_1", status: "completed" }],
    });
    try {
      await reconcileBenchRuns(bench([
        { id: "s_0", runStatus: "running", result: { run_id: "r_1" } },
      ]));
      expect(patchesOf(fakes)[0]).toMatchObject({ patch: { runStatus: "done" } });
    } finally {
      fakes.unmount();
    }
  });

  test("a listed foreign verdict is TRANSLATED (a word no dot knows is an idle tile forever)", async () => {
    const fakes = stubEstate({
      refusals: [{ method: "runs/status", message: "no such run" }],
      listRows: [{ run_id: "r_1", status: "failed" }],
    });
    try {
      await reconcileBenchRuns(bench([
        { id: "s_0", runStatus: "running", result: { run_id: "r_1" } },
      ]));
      expect(patchesOf(fakes)[0]).toMatchObject({ patch: { runStatus: "stopped" } });
    } finally {
      fakes.unmount();
    }
  });
});

// ── THE SINGLE-FLIGHT LAW (2026-09-21, the operator's catch: the
// bench log carried PAIRS of identical result/runStatus patches —
// two observers per run, double writes per state move, a re-render
// storm mid-run): ONE observer per draft:stage:run, in-process.
test("SINGLE FLIGHT: a second observe on the same run RIDES the first — one patch sequence, never two", async () => {
  const fakes = stubEstate({
    runDocs: [RUNNING, { run_id: "r_1", status: "completed", stages: [{ id: "s_0", status: "succeeded", url: "/r/a.png", gallery: [{ name: "a.png" }] }] }],
  });
  try {
    // BOTH run paths fire: the sequential pass's await AND the tab's
    // onStarted arm — same tick, same run
    const [a, b] = await Promise.all([
      observeRunOutcome(draftIdOf("d_1"), "s_0", "r_1"),
      observeRunOutcome(draftIdOf("d_1"), "s_0", "r_1"),
    ]);
    expect(a).toBe("done");
    expect(b).toBe("done");
    const statuses = patchesOf(fakes).map((p) => String((p["patch"] as Record<string, unknown>)["runStatus"]));
    // ONE start patch, ONE terminal patch — the pair disease is dead
    expect(statuses).toEqual(["running", "done"]);
    // the registry seat is FREE after settle: a fresh observe runs
    // again (a retry after a terminal is a new observer)
    const c = await observeRunOutcome(draftIdOf("d_1"), "s_0", "r_1");
    expect(c).toBe("done");
  } finally {
    fakes.unmount();
  }
});

test("SINGLE FLIGHT keys by run: a DIFFERENT run on the same stage observes independently", async () => {
  const fakes = stubEstate({
    runDocs: [
      { run_id: "r_1", status: "completed", stages: [] },
      { run_id: "r_2", status: "completed", stages: [] },
    ],
  });
  try {
    const [a, b] = await Promise.all([
      observeRunOutcome(draftIdOf("d_1"), "s_0", "r_1"),
      observeRunOutcome(draftIdOf("d_1"), "s_0", "r_2"),
    ]);
    expect(a).toBe("done");
    expect(b).toBe("done");
    const runs = patchesOf(fakes).map((p) => ((p["patch"] as Record<string, unknown>)["result"] as Record<string, unknown>)["run_id"]);
    expect(runs).toContain("r_1");
    expect(runs).toContain("r_2");
  } finally {
    fakes.unmount();
  }
});
