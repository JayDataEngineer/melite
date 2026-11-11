// runs-rename-output.spec.ts — THE OUTPUT-RENAME DOOR (queue 12
// Phase B): the user can rename a settled run's output AFTER the run
// lands — the Phase A mint (the output_name param at settle) named
// the rows once; this door owns every rename after. The patch
// rewrites exactly the addressed gallery row's `label`: the `name`
// (the machine file key the media route and every dedup law ride)
// never moves, siblings are never renumbered (a caller with several
// rows to rename patches each row it wants), and the sidecar
// rewrite persists the label so the disk fallback and every boot
// re-read spread it. Guards speak before any write: unknown run,
// a run still executing, an empty/whitespace label, an out-of-range
// stage or gallery index.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import { RunsRuntimeService } from "../src/runsRegistry.ts";
import { QueueCore } from "../src/queue.ts";
import { draftIdOf } from "@melite/contracts/benchStage";
import type { RunRecord } from "../src/runsTypes.ts";
import type { RunId } from "../src/queueCore.ts";

let TMP = "";
afterEach(async () => {
  if (TMP !== "") {
    for (const d of TMP.split(":")) {
      try {
        rmSync(d, { recursive: true, force: true });
      } catch {
        await new Promise((r) => setTimeout(r, 50));
        rmSync(d, { recursive: true, force: true });
      }
    }
    TMP = "";
  }
});
const tmp = (): string => {
  const d = mkdtempSync(join(tmpdir(), "runs-rename-"));
  TMP = TMP === "" ? d : TMP + ":" + d;
  return d;
};
const sig = (): AbortSignal => new AbortController().signal;
const dead = (): AbortSignal => {
  const c = new AbortController();
  c.abort();
  return c.signal;
};

interface Seat {
  svc: RunsRuntimeService;
  core: QueueCore;
  state: string;
}

const seat = (): Seat => {
  const state = tmp();
  const ctx = new Context();
  const core = new QueueCore();
  (ctx as unknown as { queue: unknown }).queue = {
    core,
    stateRoot: state,
    get stateRoots(): string[] { return [state]; },
  };
  const svc = new RunsRuntimeService(ctx as unknown as Context);
  return { svc, core, state };
};

/** A settled two-artifact row wearing Phase A's mint: the hero wears
 *  the stem bare, the sibling wears `stem · 2` — the exact rows the
 *  executor builds at settle (runsExecute's gallery map). */
const settled = (s: Seat, runId: string, over: Partial<RunRecord> = {}): string => {
  const row: RunRecord = {
    status: "completed",
    stages: [
      {
        id: "s",
        name: "s",
        index: 0,
        status: "completed",
        outputs: {},
        expected: {},
        url: "/melite-media/runs/" + runId + "/film.mp4",
        gallery: [
          { name: "film.mp4", label: "golden hour" },
          { name: "w1.mp4", label: "golden hour · 2" },
        ],
      },
    ],
    skippedStages: [],
    artifacts: [],
    error: "",
    draftId: draftIdOf("d"),
    dir: join(s.state, "output", runId),
    testFlag: false,
    stopFlag: false,
    params: [{}],
    createdAt: 1,
    pipeline: "flow_inline",
    graphRows: [],
    outputNodes: [],
    initials: {},
    ...over,
    runId: runId as RunId,
  };
  (s.core.runs as Map<string, RunRecord>).set(row.runId, row);
  mkdirSync(row.dir, { recursive: true });
  return row.runId;
};

const galleryOf = (row: Record<string, unknown>): Array<Record<string, unknown>> => {
  const stages = row["stages"] as Array<Record<string, unknown>>;
  return stages[0]?.["gallery"] as Array<Record<string, unknown>>;
};

describe("THE OUTPUT-RENAME DOOR (queue 12 Phase B — the post-run label patch)", () => {
  it("patches exactly the addressed row: the label moves, the name never does, siblings keep their mint", async () => {
    const s = seat();
    const id = settled(s, "run-rename-1");
    const answer = await s.svc.renameOutput(id, 0, 0, "second take", sig());
    // the receipt names the address, the untouched machine key, and
    // the words the row now wears
    assert.deepEqual(
      { run_id: answer["run_id"], stage: answer["stage"], gallery: answer["gallery"], name: answer["name"], label: answer["label"] },
      { run_id: id, stage: 0, gallery: 0, name: "film.mp4", label: "second take" },
    );
    const row = s.svc.status(id, sig());
    // THE PATCHED PAIR: the hero wears the new label; the sibling
    // keeps its minted `stem · 2` — no renumbering, no auto-repair
    // (a caller with two rows to rename patches each row it wants).
    assert.deepEqual(galleryOf(await row), [
      { name: "film.mp4", label: "second take" },
      { name: "w1.mp4", label: "golden hour · 2" },
    ], "the addressed row alone moved");
  });

  it("persists across a re-read: the sidecar carries the label and a FRESH registry serves it from disk", async () => {
    const s = seat();
    const id = settled(s, "run-rename-2");
    await s.svc.renameOutput(id, 0, 1, "window two", sig());
    // THE DURABLE HALF: the sidecar's gallery row carries the new
    // label beside its unchanged file name
    const disk = JSON.parse(readFileSync(join(s.state, "output", "run-rename-2", "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.deepEqual((disk["stages"] as Array<Record<string, unknown>>)[0]?.["gallery"], [
      { name: "film.mp4", label: "golden hour" },
      { name: "w1.mp4", label: "window two" },
    ], "the durable row keeps the rename");
    // THE RE-READ: a fresh seat (empty live map — the registry
    // restarted) answers from disk, and the label-first serve
    // carries the patched label
    const freshCtx = new Context();
    (freshCtx as unknown as { queue: unknown }).queue = {
      core: new QueueCore(),
      stateRoot: s.state,
      get stateRoots(): string[] { return [s.state]; },
    };
    const fresh = new RunsRuntimeService(freshCtx as unknown as Context);
    const served = await fresh.status(id, sig());
    assert.equal(served["from_disk"], true, "the fresh seat answers from the durable record");
    assert.deepEqual(galleryOf(served)[1], { name: "w1.mp4", label: "window two" });
  });

  it("refuses a run still executing with the door's own voice — THE SETTLE GUARD (the toggle arm)", async () => {
    const s = seat();
    const id = settled(s, "run-rename-live", { status: "running" });
    // THE GUARD: the gallery is the settle's own build — a rename
    // pressed mid-execution refuses and names the wait. The toggle
    // proof pins THIS guard: with the settled check commented out
    // the call lands and this arm reds.
    await assert.rejects(
      s.svc.renameOutput(id, 0, 0, "early label", sig()),
      (e: unknown) => {
        assert.ok(e instanceof RemoteError);
        assert.equal(e.code, "runs/invalid-request");
        assert.ok(e.message.includes("still executing — rename waits for settle"), e.message);
        return true;
      },
    );
    // nothing landed: the live row's gallery still wears the mint
    const row = (s.core.runs as Map<string, RunRecord>).get(id) as RunRecord;
    assert.deepEqual(row.stages[0]?.["gallery"], [
      { name: "film.mp4", label: "golden hour" },
      { name: "w1.mp4", label: "golden hour · 2" },
    ], "a refused rename writes nothing");
  });

  it("refuses an empty or whitespace label — a gallery row needs display words", async () => {
    const s = seat();
    const id = settled(s, "run-rename-empty");
    for (const label of ["", "   ", "\t\n"]) {
      await assert.rejects(
        s.svc.renameOutput(id, 0, 0, label, sig()),
        (e: unknown) => {
          assert.ok(e instanceof RemoteError);
          assert.equal(e.code, "runs/invalid-request");
          assert.ok(e.message.includes("the label is empty"), e.message);
          return true;
        },
        "the empty-label arm must fire for " + JSON.stringify(label),
      );
    }
  });

  it("refuses an out-of-range stage or gallery index, and a stage with no gallery", async () => {
    const s = seat();
    const id = settled(s, "run-rename-range");
    await assert.rejects(
      s.svc.renameOutput(id, 5, 0, "x", sig()),
      (e: unknown) => {
        assert.ok(e instanceof RemoteError);
        assert.ok(e.message.includes("stage index 5 out of range"), e.message);
        return true;
      },
    );
    await assert.rejects(
      s.svc.renameOutput(id, 0, 9, "x", sig()),
      (e: unknown) => {
        assert.ok(e instanceof RemoteError);
        assert.ok(e.message.includes("gallery index 9 out of range"), e.message);
        return true;
      },
    );
    // a settled row whose stage never built a gallery (no artifacts
    // landed) has nothing to rename
    const bare = settled(s, "run-rename-bare", {
      stages: [{ id: "s", name: "s", index: 0, status: "completed", outputs: {}, expected: {} }],
    });
    await assert.rejects(
      s.svc.renameOutput(bare, 0, 0, "x", sig()),
      (e: unknown) => {
        assert.ok(e instanceof RemoteError);
        assert.ok(e.message.includes("carries no gallery"), e.message);
        return true;
      },
    );
  });

  it("refuses an unknown run and a dead signal — the same voices the other doors speak", async () => {
    const s = seat();
    await assert.rejects(
      s.svc.renameOutput("run-x", 0, 0, "x", sig()),
      (e: unknown) => {
        assert.ok(e instanceof RemoteError);
        assert.equal(e.code, "runs/run-unknown");
        return true;
      },
    );
    const id = settled(s, "run-rename-dead");
    await assert.rejects(s.svc.renameOutput(id, 0, 0, "x", dead()));
  });
});
