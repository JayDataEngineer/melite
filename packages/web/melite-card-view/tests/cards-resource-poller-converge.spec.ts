// @contract cards-poller-converge
//
// THE POLLER CONVERGENCE LAW: the tab-side poller and its armed-set
// bookkeeping must CONVERGE on the settled verdict — a poll that
// misses a transition catches up on a later pass, and a watch that
// ends without delivering never holds the armed claim. The pre-cure
// wedge: reconcileBenchRuns armed a key and never released it (the
// `armed` set only grew), so a watch that died mid-poll (tab closed,
// abort, transport death) left the stage:run key armed forever —
// every later refresh skipped the row at the armed check and the run's
// settled answer never landed. The row's "the next run rewrites the
// row" / "the row heals on a later refresh" comments were lies: there
// was no next run and no healing pass for a wedged key.
//
// Arms:
//   PC-1  the zombie wedge — an aborted watch keeps the key armed; the
//         next reconcile skips a run that has since settled (the burn).
//   PC-2  the settled read — a status row that ANSWERS terminal
//         delivers its full verdict in the reconcile's own tick
//         (exactly one runs/status call, no delegated poller).
//   PC-3  the release law — a watch that ends undelivered (abort)
//         releases its armed key; a delivered verdict keeps it.
//   PC-4  the refused delivery heals next tick — the reconcile's own
//         verdict patch refusing its delivery budget releases the key;
//         the next reconcile re-probes and lands the stopped verdict.
import { afterEach, describe, expect, test, vi } from "vitest";
import { unbindEstateRemote } from '@melite/card-base/client';
import { mountEstateFakes } from "./estate-harness.ts";
import type { EstateFakesOptions } from "./estate-harness.ts";
import { reconcileBenchRuns, observeRunOutcome } from "../src/client/cards-resource.ts";
import type { CardsBenchValue } from "../src/client/cards-resource.ts";

afterEach(() => {
  unbindEstateRemote();
  vi.unstubAllGlobals();
});

type Fakes = ReturnType<typeof mountEstateFakes>;

function stubEstate(opts: EstateFakesOptions = {}): Fakes {
  return mountEstateFakes(opts);
}

/** The drafts/patch arg bodies the reconcile wrote, in order. */
function patchesOf(fakes: Fakes): Array<Record<string, unknown>> {
  return fakes.calls
    .filter((c) => c.method === "drafts/patch")
    .map((c) => c.args);
}

/** The runs/status reads the reconcile (and anything it spawned) made. */
function statusCalls(fakes: Fakes): number {
  return fakes.calls.filter((c) => c.method === "runs/status").length;
}

const RUNNING = { run_id: "r_1", status: "running", stages: [] };
const COMPLETED = { run_id: "r_1", status: "completed", stages: [] };

/** A bench stamped live with the run the row carries. */
function bench(): CardsBenchValue {
  return {
    kind: "bench", draftId: "d_1", sessionKey: "main", rev: 3, log: [],
    stages: [{ id: "s_0", card: "image-gen", title: "s", runStatus: "running", params: {}, result: { run_id: "r_1" } }],
  } as unknown as CardsBenchValue;
}

describe("reconcileBenchRuns — the poller converges on the settled verdict", () => {
  test("PC-1: a dead watch's key does not wedge the row — the next reconcile lands the settled verdict", async () => {
    // reconcile #1 arms the observer on a live row; the watch dies
    // undelivered (the tab session's signal pre-aborted it — it binds
    // the row and exits null before its first poll). The run settles
    // after. reconcile #2 — same persistent armed set, a fresh
    // refresh — must re-probe and deliver `done`; the pre-cure armed
    // check skipped it forever (the zombie wedge).
    const fakes = stubEstate({ runDocs: [RUNNING, COMPLETED] });
    try {
      const armed = new Set<string>();
      const ctrl = new AbortController();
      ctrl.abort();
      await reconcileBenchRuns(bench(), { armed, signal: ctrl.signal });
      // the observer bound the row running before dying (the watch
      // floats off the reconcile — await its write, not a fixed flush)
      await vi.waitFor(() => { expect(patchesOf(fakes)[0]).toMatchObject({ patch: { runStatus: "running" } }); });
      await vi.waitFor(() => { expect(armed.has("s_0:r_1")).toBe(false); });
      // reconcile #2 rides a FRESH estate read: the door now answers
      // completed (the script's lingering tail).
      await reconcileBenchRuns(bench(), { armed });
      const done = patchesOf(fakes).find((p) => (p["patch"] as Record<string, unknown>)["runStatus"] === "done");
      expect(done, "the wedged key never re-probed — the settled run's verdict never landed").toMatchObject({
        draftId: "d_1", stageId: "s_0",
        patch: { runStatus: "done", result: { run_id: "r_1" } },
      });
    } finally {
      fakes.unmount();
    }
  });

  test("PC-2: a status row that answers terminal delivers in the reconcile's own tick — one status read, no delegated poller", async () => {
    // the run settled between the bench snapshot and this refresh:
    // the row snapshot says running, the door's answer is completed.
    // The reconcile reads the row ITSELF and writes the full verdict
    // synchronously — it never hands a settled run to a fresh poller
    // (the pre-cure probe folded every answered status to 'live' and
    // spawned an observer: two status reads, an async verdict).
    const fakes = stubEstate({ runDocs: [COMPLETED] });
    try {
      const armed = new Set<string>();
      await reconcileBenchRuns(bench(), { armed });
      expect(statusCalls(fakes), "the settled run was re-polled by a delegated observer").toBe(1);
      const patches = patchesOf(fakes);
      expect(patches, "the verdict did not land in the reconcile's own tick").toHaveLength(1);
      expect(patches[0]).toMatchObject({
        draftId: "d_1", stageId: "s_0",
        patch: { runStatus: "done", result: { run_id: "r_1" } },
      });
      // a delivered verdict SPENT the transition — the claim stays
      // (later refreshes skip the settled row at the armed check)
      expect(armed.has("s_0:r_1")).toBe(true);
    } finally {
      fakes.unmount();
    }
  });

  test("PC-3: a watch that ends undelivered releases its armed key — a delivered verdict keeps it", async () => {
    // the release law's both faces: the dead watch (the pre-aborted
    // signal — it binds and exits null) frees the key; the delivered
    // verdict (the next reconcile lands it) keeps it — the armed set
    // is a LIVE-WATCH claim, not a spent probe.
    const fakes = stubEstate({ runDocs: [RUNNING, COMPLETED] });
    try {
      const armed = new Set<string>();
      const ctrl = new AbortController();
      ctrl.abort();
      await reconcileBenchRuns(bench(), { armed, signal: ctrl.signal });
      await vi.waitFor(() => { expect(armed.has("s_0:r_1"), "the dead watch still holds the armed claim").toBe(false); });
      // the delivered face: a fresh reconcile on the settled door
      // delivers and the claim persists
      await reconcileBenchRuns(bench(), { armed });
      expect(armed.has("s_0:r_1")).toBe(true);
    } finally {
      fakes.unmount();
    }
  });

  test("PC-4: the reconcile's refused verdict delivery releases the key — the next refresh heals the row", async () => {
    // reconcile #1's probe reads a gone run (status refuses, the
    // file-era list is empty) and its stopped verdict refuses to land
    // — the whole delivery budget dies (admission refusals: no CAS
    // rebase, each attempt dies straight). The key must release so a
    // later refresh retries; the pre-cure swallow kept the key armed
    // and the row wedged at 'running' forever.
    const fakes = stubEstate({
      runDocs: [RUNNING],
      refusals: [
        { method: "runs/status", message: "no such run" },
        { method: "drafts/patch", message: "admission: nope" },
        { method: "drafts/patch", message: "admission: nope" },
        { method: "drafts/patch", message: "admission: nope" },
        { method: "runs/status", message: "no such run" },
      ],
    });
    try {
      const armed = new Set<string>();
      await reconcileBenchRuns(bench(), { armed });
      expect(armed.has("s_0:r_1"), "the undelivered verdict kept the armed claim").toBe(false);
      // the next refresh: the probe's gone verdict lands this time —
      // "the row heals on a later refresh" becomes true
      await reconcileBenchRuns(bench(), { armed });
      const stopped = patchesOf(fakes).find((p) => (p["patch"] as Record<string, unknown>)["runStatus"] === "stopped");
      expect(stopped, "the wedged row never healed on the later refresh").toMatchObject({
        draftId: "d_1", stageId: "s_0",
        patch: { runStatus: "stopped", result: { run_id: "r_1" } },
      });
    } finally {
      fakes.unmount();
    }
  });

  test("PC-5: the observer's refused terminal delivery releases the single-flight claim — the next observe re-polls and lands", async () => {
    // THE OBSERVER'S MISSED COMPLETION (the zombie's other parent, the
    // long-poll half PC-4's refresh half does not cover): the observer
    // READ the settled verdict (runs/status answered completed) but the
    // terminal patch refused its whole delivery budget (3 admission
    // refusals, no CAS rebase). The pre-cure swallow returned the
    // terminal as if it had landed — the tile kept spinning on a
    // verdict the door had ANSWERED, and the caller's armed-set claim
    // (armWatch keeps the key whenever the verdict is non-null) was
    // spent on a verdict that never landed: every later refresh
    // skipped the row at the armed check. The cure returns null so the
    // claim releases; the next observe re-polls and lands `done`.
    const RUNNING5 = { run_id: "r_5", status: "running", stages: [] };
    const COMPLETED5 = { run_id: "r_5", status: "completed", stages: [] };
    const fakes = stubEstate({
      runDocs: [RUNNING5, COMPLETED5],
      refusals: [
        { method: "drafts/patch", message: "admission: nope", onCall: 2 },
        { method: "drafts/patch", message: "admission: nope", onCall: 3 },
        { method: "drafts/patch", message: "admission: nope", onCall: 4 },
      ],
    });
    try {
      // call 1 is the start stamp (lands); calls 2-4 are the terminal
      // delivery budget dying undelivered.
      const first = await observeRunOutcome("d_5", "s_5", "r_5");
      expect(first, "the undelivered terminal must release the claim as null — never a fake-delivered verdict").toBeNull();
      // the claim released: the next observe re-polls the (lingering
      // completed) door and lands the verdict this tick. Had the
      // single-flight entry survived, this would ride the first
      // promise and answer null again.
      const second = await observeRunOutcome("d_5", "s_5", "r_5");
      expect(second, "the released claim never re-probed — the settled verdict never landed").toBe("done");
      const done = patchesOf(fakes).find((p) => (p["patch"] as Record<string, unknown>)["runStatus"] === "done");
      expect(done, "no terminal patch landed on the second pass").toMatchObject({
        draftId: "d_5", stageId: "s_5",
        patch: { runStatus: "done", result: { run_id: "r_5" } },
      });
    } finally {
      fakes.unmount();
    }
  });

  test("PC-6: the observer's refused phantom verdict releases the claim — the next observe re-probes the gone run and lands stopped", async () => {
    // THE PHANTOM HALF (auditor finding 2, 2026-10-21): the observer's
    // estate-refusal branch (the phantom cure) reads its verdict through
    // probeRunGone ('gone' — the status door refuses, the file-era list
    // is empty) and its delivery budget dies on refusals. The pre-cure
    // swallow returned 'stopped' as if delivered — armWatch kept the
    // armed-set key on the fake verdict and the row wedged (the zombie
    // wedge, refused-status face). The cure returns null; the next
    // observe re-probes and lands 'stopped' for real.
    const fakes = stubEstate({
      refusals: [
        { method: "runs/status", message: "no such run" },
        { method: "runs/status", message: "no such run" },
        { method: "runs/status", message: "no such run" },
        { method: "runs/status", message: "no such run" },
        { method: "runs/status", message: "no such run" },
        { method: "runs/status", message: "no such run" },
        { method: "drafts/patch", message: "admission: nope", onCall: 2 },
        { method: "drafts/patch", message: "admission: nope", onCall: 3 },
        { method: "drafts/patch", message: "admission: nope", onCall: 4 },
      ],
    });
    try {
      // observe #1: the start stamp lands (patch call 1), the status
      // door refuses throughout (the registry restarted), the phantom
      // probe reads 'gone', the stopped verdict's delivery budget dies
      // (patch calls 2-4) — the exit must be null, never a fake
      // delivered 'stopped'.
      const first = await observeRunOutcome("d_6", "s_6", "r_6");
      expect(first, "the undelivered phantom verdict must release the claim as null — never a fake-delivered stopped").toBeNull();
      // observe #2 (the released claim): the budget's refusals are
      // spent, so the stopped verdict lands this pass.
      const second = await observeRunOutcome("d_6", "s_6", "r_6");
      expect(second, "the released claim never re-probed — the phantom verdict never landed").toBe("stopped");
      const stopped = patchesOf(fakes).find((p) => (p["patch"] as Record<string, unknown>)["runStatus"] === "stopped");
      expect(stopped, "no stopped patch landed on the second pass").toMatchObject({
        draftId: "d_6", stageId: "s_6",
        patch: { runStatus: "stopped", result: { run_id: "r_6" } },
      });
    } finally {
      fakes.unmount();
    }
  });
});
