// cards-run-row-truth.spec.ts — THE STUCK-RUN CLASS (the wall).
// @contract cards-run-row-truth
//
// THE BURN (operator, 2026-11-09 night): "download a model through
// the popup, hit run, the run gets stuck in running and I can't even
// stop it." The ledger holds run.completed for run-fcf9572a5ffb-5ba89b44
// (ts 1792539268, error ""), the run tree's _flow.json says completed,
// the film is on disk — and the row the operator watched claimed
// running, with a STOP press that changed nothing.
//
// THE LAW (two invariants, each with its own firing arm):
//  TRUTH — a polled row may never claim queued/running/stopping past
//    the run tree's settled verdict: the status door re-syncs a live
//    claim against the durable row (the settle's own _flow.json) and
//    serves the settled truth, marked.
//  STOP — a stop press on a row whose durable verdict is settled
//    resolves it honestly: the door names the row's true state and
//    clears the stale claim — never a silent `{error}` payload, never
//    an unreachable live word. A genuinely live row still stops as
//    before (its own arm — the resync must never swallow a real stop).
//
// THE WEDGE SEED: the divergence state any missed transition or
// rehydration husk produces — the live map holds a row claiming
// running while the run tree (the settle's own write) is terminal.
// The seed rides the map's own set seam; the arms judge the doors'
// answers, whatever produced the divergence. Reds on today's tree
// (status serves the stale claim; stop answers payloads no reader
// surfaces); greens only on the cure in runsRegistry.ts.
//
// Pre-registration: the registry row cards-run-row-truth is seated
// with the cure (canon: arms first, row + receipt at fix time).

import { describe, it, afterEach, vi } from "vitest";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context, Service } from "@deepseek-ai/cordis";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import { ComfyUIHostService } from "@melite/comfyui-cordis";
import { RunsRuntimeService } from "../../../../packages/harness/estate-queue/src/runsRegistry.ts";
import { QueueCore } from "../../../../packages/harness/estate-queue/src/queue.ts";
import { FlowsSeatService } from "../../../../packages/harness/estate-queue/src/flowsData.ts";
import type { RunRecord } from "../../../../packages/harness/estate-queue/src/runsTypes.ts";
import type { RunId } from "../../../../packages/harness/estate-queue/src/queueCore.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

interface Seat {
  svc: RunsRuntimeService;
  core: QueueCore;
  state: string;
}

let TMP = "";
afterEach(() => {
  if (TMP !== "") {
    for (const d of TMP.split(":")) rmSync(d, { recursive: true, force: true });
    TMP = "";
  }
});

const sig = (): AbortSignal => new AbortController().signal;

/** The runs seat over an isolated state root — the same rig shape
 *  runs-registry-doors.spec.ts boots (real core, structural seats). */
const seat = (): Seat => {
  const state = mkdtempSync(join(tmpdir(), "row-truth-"));
  TMP = TMP === "" ? state : TMP + ":" + state;
  const ctx = new Context();
  new FlowsSeatService(ctx);
  const core = new QueueCore();
  (ctx as unknown as { queue: unknown }).queue = {
    core,
    stateRoot: state,
    // the doors seat's shape: a GETTER (the doors walk it with
    // for..of — a plain function value is not iterable)
    get stateRoots(): string[] {
      return [state];
    },
  };
  (ctx as unknown as { draftsRemote: unknown }).draftsRemote = {
    get: async (id: string): Promise<unknown> => {
      throw new RemoteError("draft/not-found", "no doc", { draftId: id });
    },
  };
  const svc = new RunsRuntimeService(ctx as unknown as Context);
  return { svc, core, state };
};

/** The durable settled row — the byte shape the settle's own writer
 *  leaves (_flow.json: terminal status, one completed stage, an
 *  artifact on disk). */
const settleDiskRow = (state: string, runId: string): void => {
  const dir = join(state, "output", runId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "out.png"), "png");
  writeFileSync(
    join(dir, "_flow.json"),
    JSON.stringify({
      run_id: runId,
      status: "completed",
      error: "",
      stages: [
        { id: "s", name: "s", index: 0, status: "completed", outputs: {}, expected: {} },
      ],
      skipped_stages: [],
      artifacts: [join(dir, "out.png")],
      created_at: 1,
      draft_id: "d1",
      pipeline: "flow_inline",
    }),
  );
};

/** The divergence seed: a map row claiming running over the settled
 *  run tree (the missed-transition / rehydration-husk shape). */
const seedZombie = (s: Seat, runId: string): RunRecord => {
  settleDiskRow(s.state, runId);
  const row: RunRecord = {
    runId: runId as RunId,
    status: "running",
    stages: [],
    skippedStages: [],
    artifacts: [],
    error: "",
    draftId: "d1",
    dir: join(s.state, "output", runId),
    testFlag: false,
    stopFlag: false,
    params: [],
    createdAt: 1,
    pipeline: "flow_inline",
    graphRows: [],
    outputNodes: [],
    initials: {},
  };
  (s.core.runs as Map<string, RunRecord>).set(row.runId, row);
  return row;
};

describe("cards-run-row-truth: the row never outlives the run tree's verdict", () => {
  // ARM T-1 — TRUTH: the status door re-syncs a live claim past the
  // settled verdict. Reds today: the door serves the stale "running"
  // verbatim (the live row wins unjudged, runsRegistry status()).
  it("status on a live-claiming row whose run tree is settled answers the settled truth", async () => {
    const s = seat();
    const runId = "run-zombie-truth";
    seedZombie(s, runId);

    const got = await s.svc.status(runId, sig());
    assert.equal(
      got["status"],
      "completed",
      "the polled row served running past the durable settled verdict — the stuck-run class",
    );
    assert.equal(
      got["from_disk"],
      true,
      "the resynced answer names the durable row it served from",
    );
    // the resync CLEARS the stale claim, not just the answer
    assert.equal(
      (s.core.runs.get(runId) as RunRecord).status,
      "completed",
      "the map row kept claiming running after the read — the zombie survives the poll",
    );
  });

  // ARM T-2 — STOP resolves the zombie honestly: the press names the
  // row's true state and clears the stale claim. Reds today: the
  // door either flags a completed run "stopping" forever or answers a
  // payload no reader surfaces — never the settled truth.
  it("stop on a zombie row resyncs and names the settled state", async () => {
    const s = seat();
    const runId = "run-zombie-stop";
    seedZombie(s, runId);

    const ans = await s.svc.stop(runId, sig());
    assert.equal(
      ans["status"],
      "completed",
      "the stop press must name the row's true state, never a stop lie",
    );
    assert.equal(
      ans["run_id"],
      runId,
      "the honest verdict carries the row it resolved",
    );
    assert.equal(
      (s.core.runs.get(runId) as RunRecord).status,
      "completed",
      "the stop press left the map claiming live — the zombie survives the press",
    );
    assert.equal(
      ans["error"],
      undefined,
      "the resolved zombie is not an error payload — the door states the verdict",
    );
  });

  // ARM T-3 — STOP on a plainly terminal row refuses LOUD: the
  // silent `{error: "cannot stop run in state completed"}` payload is
  // the exact no-op the burn pressed (the client unwraps it as
  // success and nothing voices). The door must throw its own code.
  it("stop on a settled row throws runs/already-settled — never a silent payload", async () => {
    const s = seat();
    const runId = "run-plain-done";
    const row: RunRecord = {
      runId: runId as RunId,
      status: "completed",
      stages: [],
      skippedStages: [],
      artifacts: [],
      error: "",
      draftId: "d1",
      dir: join(s.state, "output", runId),
      testFlag: false,
      stopFlag: false,
      params: [],
      createdAt: 1,
      pipeline: "flow_inline",
      graphRows: [],
      outputNodes: [],
      initials: {},
    };
    (s.core.runs as Map<string, RunRecord>).set(row.runId, row);

    let threw: unknown = null;
    try {
      await s.svc.stop(runId, sig());
    } catch (e) {
      threw = e;
    }
    assert.ok(threw instanceof RemoteError, "a loud refusal, got a payload");
    const err = threw as RemoteError;
    assert.equal(err.code, "runs/already-settled");
    assert.match(err.message, /completed/, "the refusal names the true state");
  });

  // ARM T-4 — the resync never swallows a REAL stop: a genuinely
  // live row (map running, claim persist on disk — the real claim
  // state) stops as before. The own-path guard for T-1/T-2.
  it("a genuinely live row still stops — the resync rides divergence only", async () => {
    const s = seat();
    const runId = "run-actually-live";
    const dir = join(s.state, "output", runId);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "_flow.json"),
      JSON.stringify({ run_id: runId, status: "running", error: "", stages: [] }),
    );
    const row: RunRecord = {
      runId: runId as RunId,
      status: "running",
      stages: [],
      skippedStages: [],
      artifacts: [],
      error: "",
      draftId: "d1",
      dir,
      testFlag: false,
      stopFlag: false,
      params: [],
      createdAt: 1,
      pipeline: "flow_inline",
      graphRows: [],
      outputNodes: [],
      initials: {},
    };
    (s.core.runs as Map<string, RunRecord>).set(row.runId, row);

    const ans = await s.svc.stop(runId, sig());
    assert.deepEqual(ans, { run_id: runId, status: "stopping" });
    assert.equal((s.core.runs.get(runId) as RunRecord).stopFlag, true);
  });
});
