// cards-tab.spec.ts — the sidebar Cards tab's three restorations
// (2026-09-11, operator-caught regressions):
//
//   address    — resolveCardsAddress serves the bench for any address
//                no cards provider claims (the `loading
//                sidebar://cards…` hang: the shell's navigation
//                address is the shell's, never a cards address).
//   categories — groupStagesByCard groups bench stages by card,
//                first-appearance order, none dropped.
//   restore    — restoreRunToBench turns a card back into a flow
//                (drafts/get → bench/get rev → per-stage
//                bench/add-stage as the user, CAS-chained).
//
// Estate verbs ride mountEstateFakes (the one-lane seam); fetch
// answers ONLY the /v1 discovery doors (catalog, form-spec). React
// rendering (Modal drilldown, buttons) rides the live shell, not
// jsdom — the pure laws above are what pinned the regressions.
import { describe, expect, test, afterEach, vi } from "vitest";
import { resetCardFamiliesCache } from "@melite-plugin/melite-run-wire";
import { resolveCardsAddress, groupStagesByCard, runCardStage, runBenchSequential } from "../src/client/CardsTab.tsx";
import { schemaEnvelope } from '@melite/card-base/client';
import { readRun, restoreRunToBench } from "../src/client/cards-resource.ts";
import type { BenchStageView, CardsBenchValue, CardsRunValue } from "../src/client/cards-resource.ts";
import { mountEstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from '@melite/card-base/client';

function stage(over: Partial<BenchStageView> & { id: string }): BenchStageView {
  return { engine: "comfyui", ...over };
}

describe("resolveCardsAddress — the tab never hangs on a foreign address", () => {
  test("cards addresses pass through untouched", () => {
    expect(resolveCardsAddress("dsh-resource://cards/bench")).toBe("dsh-resource://cards/bench");
    expect(resolveCardsAddress("dsh-resource://cards/run/abc")).toBe("dsh-resource://cards/run/abc");
  });
  test("the shell's own addresses serve the bench", () => {
    expect(resolveCardsAddress("sidebar://cards")).toBe("dsh-resource://cards/bench");
    expect(resolveCardsAddress("")).toBe("dsh-resource://cards/bench");
    expect(resolveCardsAddress("dsh-resource://other/thing")).toBe("dsh-resource://cards/bench");
  });
});

describe("groupStagesByCard — the categories", () => {
  test("groups by card in first-appearance order", () => {
    const groups = groupStagesByCard([
      stage({ id: "s_0", card: "image-gen" }),
      stage({ id: "s_1", card: "tts" }),
      stage({ id: "s_2", card: "image-gen" }),
    ]);
    expect(groups.map((g) => g.card)).toEqual(["image-gen", "tts"]);
    expect(groups[0]?.rows.map((s) => s.id)).toEqual(["s_0", "s_2"]);
    expect(groups[1]?.rows.map((s) => s.id)).toEqual(["s_1"]);
  });
  test("cardless stages gather under uncategorized, never dropped", () => {
    const groups = groupStagesByCard([stage({ id: "s_0" }), stage({ id: "s_1", card: "x" })]);
    expect(groups.map((g) => g.card)).toEqual(["uncategorized", "x"]);
    expect(groups[0]?.rows).toHaveLength(1);
  });
});

describe("readRun — the draft key rides the value", () => {
  test("draft_id is kept for the restore path", () => {
    const v = readRun("r1", { status: "completed", draft_id: "bench-main", stages: [] });
    expect(v.draftId).toBe("bench-main");
  });
  test("a run naming no draft restores nothing (null, never '')", () => {
    expect(readRun("r1", { status: "completed", stages: [] }).draftId).toBeNull();
    expect(readRun("r1", { status: "completed", draft_id: "", stages: [] }).draftId).toBeNull();
  });
  test("the graph receipt rides the value (the purge P1 — the run face's chip reads this)", () => {
    const receipt = {
      nodes: 2,
      populated: ["guidance", "prompt"],
      carried: ["guidance", "prompt"],
      dropped: [],
      verdict: "complete",
      stages: [
        { stage: "s_0", nodes: 2, populated: ["guidance", "prompt"], carried: ["guidance", "prompt"], dropped: [], verdict: "complete" },
      ],
    };
    const v = readRun("r1", { status: "completed", draft_id: "bench-main", stages: [], graph_receipt: receipt });
    expect(v.graphReceipt).toEqual(receipt);
    // absent stays absent — inline runs stamp none, the face stays silent
    expect(readRun("r1", { status: "completed", stages: [] }).graphReceipt).toBeUndefined();
  });
});

// ── restore wire ──────────────────────────────────────────────

interface Call { method: string; args: Record<string, unknown> }

let fakes: { calls: Call[]; unmount: () => void } | null = null;

// THE CATALOG'S CARD ROWS (the writer-mint cut, 2026-11-08): the run
// seat resolves a stage's default family from the /v1/model-catalog
// cards section and REFUSES an uncarried card — never mints the card
// id as its own family. The stub carries the rows the stages below
// run: image-gen's real boarded atoms (boarded[0] = the default
// family the start doc rides), img-to-mesh's 3D lift.
function stubCatalogFetch(catalog: Record<string, unknown> = { cards: {
  "image-gen": { families: ["krea-2", "z-image", "anima", "qwen-img-21", "flux-klein", "moss-image"] },
  "img-to-mesh": { families: ["trellis2-native"] },
} }): void {
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path === "/v1/model-catalog") {
      return new Response(JSON.stringify(catalog), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path.startsWith("/v1/form-spec")) {
      return new Response(JSON.stringify({ form: "img-to-mesh", schema: schemaEnvelope({
        input_image: { type: "string", meta: { description: "Source image", extra: { wtype: "image" } } },
        resolution: { consts: ["512", "1024", "1536"], meta: { description: "Resolution" } },
      }) }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    throw new Error("estate door on the fetch lane: " + path);
  });
}

function mountFakes(opts: Parameters<typeof mountEstateFakes>[0] = {}): { calls: Call[] } {
  fakes?.unmount();
  const estate = mountEstateFakes(opts);
  fakes = estate;
  return { calls: estate.calls };
}

afterEach(() => {
  fakes?.unmount();
  fakes = null;
  unbindEstateRemote();
  vi.unstubAllGlobals();
  resetCardFamiliesCache();
});

function run(over: Partial<CardsRunValue> = {}): CardsRunValue {
  return { kind: "run", runId: "r1", status: "completed", draftId: "bench-main", stages: [], lastFrame: undefined, ...over };
}

describe("restoreRunToBench — the card back into a flow", () => {
  test("drafts/get → bench/get rev → ONE bench/add-stages as the user (the restore law, 2026-10-21)", async () => {
    const { calls } = mountFakes({
      draftStages: [
        { id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a sailboat" } },
        { id: "s_1", card: "tts", params: { text: "hi" } },
      ],
      benchDoc: { draft_id: "bench-main", rev: 21, stages: [], log: [] },
    });
    const report = await restoreRunToBench(run(), 'main');
    // carried 0 — this run's stage rows are empty (no outcome to
    // ride), and since the previews cure (2026-11-12) each miss is
    // VOICED, never a silent carried-0
    expect(report).toEqual({
      added: 2, skipped: 0, carried: 0,
      notes: [
        "could not carry s_0's outcome: no run stage names it (run stages: )",
        "could not carry s_1's outcome: no run stage names it (run stages: )",
      ],
    });
    expect(calls.map((c) => c.method)).toEqual(["drafts/get", "bench/get", "bench/add-stages"]);
    expect(calls[0]?.args).toEqual({ draftId: "bench-main" });
    expect(calls[1]?.args).toEqual({ sessionKey: "main" });
    // the ONE batch write carries every row + the bench rev + user
    // authorship (the door chains the per-row CAS server-side).
    expect(calls[2]?.args).toMatchObject({
      sessionKey: "main",
      doc: {
        stages: [
          { card: "image-gen", engine: "comfyui", id: "s_0", params: { prompt: "a sailboat" } },
          { card: "tts", id: "s_1", params: { text: "hi" } },
        ],
        author: "user",
        expect_rev: 21,
      },
    });
  });

  test("a run naming no draft throws before any fetch", async () => {
    const { calls } = mountFakes();
    await expect(restoreRunToBench(run({ draftId: null }), 'main')).rejects.toThrow("names no draft");
    expect(calls).toEqual([]);
  });

  test("an unreadable draft throws with the door's text, bench untouched", async () => {
    const { calls } = mountFakes({
      refusals: [{ method: "drafts/get", message: "draft/gone: bench-main retired" }],
    });
    await expect(restoreRunToBench(run(), 'main')).rejects.toThrow("producing draft is unreadable: draft/gone: bench-main retired");
    expect(calls.map((c) => c.method)).toEqual(["drafts/get"]);
  });

  test("cardless stages skip and count client-side, the rest land in the ONE batch", async () => {
    const { calls } = mountFakes({
      draftStages: [{ id: "s_0" }, { id: "s_1", card: "image-gen" }],
      benchDoc: { draft_id: "bench-main", rev: 3, stages: [], log: [] },
    });
    const report = await restoreRunToBench(run(), 'main');
    expect(report.added).toBe(1);
    expect(report.skipped).toBe(1);
    const batches = calls.filter((c) => c.method === "bench/add-stages");
    expect(batches).toHaveLength(1);
    expect((batches[0]?.args["doc"] as Record<string, unknown>)["stages"])
      .toEqual([{ card: "image-gen", id: "s_1" }]);
  });

  test("an id the bench holds rides id-less and notes it (never a retry round trip)", async () => {
    const { calls } = mountFakes({
      draftStages: [{ id: "s_0", card: "image-gen" }],
      benchDoc: { draft_id: "bench-main", rev: 7, stages: [{ id: "s_0", card: "x" }], log: [] },
    });
    const report = await restoreRunToBench(run(), 'main');
    expect(report.added).toBe(1);
    expect(report.notes).toEqual([
      "s_0 was already on the bench — added under a fresh id",
      "could not carry s_0's outcome: no run stage names it (run stages: )",
    ]);
    const batches = calls.filter((c) => c.method === "bench/add-stages");
    expect(batches).toHaveLength(1);
    const doc = (batches[0]?.args["doc"] ?? {}) as Record<string, unknown>;
    const rows = doc["stages"] as Array<Record<string, unknown>>;
    expect(rows[0]?.["id"]).toBeUndefined();
    expect(doc["expect_rev"]).toBe(7);
  });

  test("a real batch refusal stops the restore whole (nothing half-lands)", async () => {
    const { calls } = mountFakes({
      draftStages: [
        { id: "s_0", card: "image-gen" },
        { id: "s_1", card: "tts" },
      ],
      benchDoc: { draft_id: "bench-main", rev: 1, stages: [], log: [] },
      refusals: [{ method: "bench/add-stages", message: "bench/cas-conflict: stale rev" }],
    });
    await expect(restoreRunToBench(run(), 'main')).rejects.toThrow("restore stopped after 0 stage(s): bench/cas-conflict: stale rev");
    expect(calls.filter((c) => c.method === "bench/add-stages")).toHaveLength(1);
  });

  // ── THE PREVIEWS CURE (operator 2026-11-12: "when I hit the reload
  // from history button, the preview images all inaccurate") — the
  // ID-DEAD RESTORE CARRY. Card-composed runs mint stage ids from the
  // card SKELETON ('h3-film'), a namespace the producing draft never
  // heard of (its row is 's_0'), so the id-keyed outcome carry found
  // nothing and every restored tile landed result-less — silently
  // (carried 0, no note). The registry's identity seam
  // (RunStageRow.benchStageId, 2026-10-22) addresses new runs; the
  // POSITION join heals history runs that predate the stamp; a join
  // that finds nothing is VOICED, never silent.
  test("a card-skeleton run stage carries onto its draft row by POSITION (the history heal — ids never matched)", async () => {
    const { calls } = mountFakes({
      draftStages: [{ id: "s_0", card: "h3-film" }],
      benchDoc: { draft_id: "bench-main", rev: 2, stages: [], log: [] },
    });
    const report = await restoreRunToBench(run({
      stages: [{ id: "h3-film", status: "completed", url: "h3-film/seg.mp4" }],
    }), 'main');
    expect(report.carried).toBe(1);
    expect(report.notes).toEqual([]);
    const patches = calls.filter((c) => c.method === "drafts/patch");
    expect(patches).toHaveLength(1);
    expect(patches[0]?.args).toMatchObject({
      draftId: "bench-main", stageId: "s_0",
      patch: { runStatus: "done", result: { run_id: "r1", url: "h3-film/seg.mp4" } },
    });
  });

  test("a run stage carrying the registry's benchStageId stamp joins by the STAMP (new runs)", async () => {
    const { calls } = mountFakes({
      draftStages: [{ id: "s_0", card: "h3-film" }, { id: "s_1", card: "sfx" }],
      benchDoc: { draft_id: "bench-main", rev: 2, stages: [], log: [] },
    });
    const report = await restoreRunToBench(run({
      stages: [
        { id: "h3-film", benchStageId: "s_0", status: "completed", url: "h3-film/a.mp4" },
        { id: "sfx", benchStageId: "s_1", status: "completed", url: "sfx/b.mp4" },
      ],
    }), 'main');
    expect(report.carried).toBe(2);
    const patches = calls.filter((c) => c.method === "drafts/patch");
    expect(patches.map((p) => p.args["stageId"])).toEqual(["s_0", "s_1"]);
  });

  // THE STAMP FIRES ALONE (previews audit F2, 2026-11-12): the arm
  // above has MATCHING counts — the position join carried it even
  // with the stamp tier stripped (the audit's proof: 79/79 green with
  // the join arm out). This arm's counts MISMATCH (2 draft rows, 1
  // run row) — position is dead by construction, so ONLY the stamp
  // tier can carry s_1; s_0 voices the miss. Strip the stamp join and
  // THIS arm reds on its own (§2: each invariant fires its own arm).
  test("the stamp tier carries WITHOUT the position join (count-mismatched — the stamp fires alone)", async () => {
    const { calls } = mountFakes({
      draftStages: [{ id: "s_0", card: "h3-film" }, { id: "s_1", card: "sfx" }],
      benchDoc: { draft_id: "bench-main", rev: 2, stages: [], log: [] },
    });
    const report = await restoreRunToBench(run({
      stages: [{ id: "sfx", benchStageId: "s_1", status: "completed", url: "sfx/b.mp4" }],
    }), 'main');
    expect(report.carried).toBe(1);
    expect(report.notes.length).toBe(1);
    expect(report.notes[0]).toMatch(/s_0.*no run stage/);
    const patches = calls.filter((c) => c.method === "drafts/patch");
    expect(patches).toHaveLength(1);
    expect(patches[0]?.args).toMatchObject({
      draftId: "bench-main", stageId: "s_1",
      patch: { runStatus: "done", result: { run_id: "r1", url: "sfx/b.mp4" } },
    });
  });

  test("a join that finds nothing is VOICED — carried 0 never silent (the burn's silent class)", async () => {
    const { calls } = mountFakes({
      draftStages: [{ id: "s_0", card: "h3-film" }, { id: "s_1", card: "sfx" }],
      benchDoc: { draft_id: "bench-main", rev: 2, stages: [], log: [] },
    });
    // one run stage naming neither draft id, neither stamp, and a
    // count that kills the position join (2 draft rows ≠ 1 run row)
    const report = await restoreRunToBench(run({
      stages: [{ id: "ghost", status: "completed", url: "ghost/x.mp4" }],
    }), 'main');
    expect(report.carried).toBe(0);
    expect(report.notes.length).toBe(2);
    expect(report.notes[0]).toMatch(/s_0.*no run stage/);
    expect(calls.filter((c) => c.method === "drafts/patch")).toHaveLength(0);
  });
});

// ── the run doors (the 2026-09-12 fix: single-card Run rides the
//    COMPOSING {model:} door — the flow_inline door cannot consume
//    cards and its executor demanded a workflow nobody emitted) ──

describe("runCardStage / runBenchSequential — the door contract", () => {
  test("one card stage starts through the composing {model:} door", async () => {
    const { calls } = mountFakes({
      startDocs: [{ run_id: "run-9", status: "queued", queue_position: 0 }],
    });
    stubCatalogFetch({ cards: { "img-to-mesh": { id: "img-to-mesh", families: ["trellis2-native", "pixal3d", "transfer-rig"] } } });
    resetCardFamiliesCache();
    const res = await runCardStage("bench-main", stage({
      // a fresh drop, not yet on the bench (s_0 is the stub bench's
      // own row — its id would merge the estate's params into the
      // composed doc through the fresh-read law below).
      id: "s_9", card: "img-to-mesh",
      params: { input_image: "drop.png", resolution: "1024" },
    }));
    expect(res).toEqual({ runId: "run-9" });
    // THE FRESH-READ FIRST (2026-09-13): the composing door reads the
    // estate's row before starting (the drop law) — the read precedes
    // the start; the stub's answer carries no stages so the held row
    // composes.
    expect(calls[0]?.method).toBe("drafts/get");
    // THE CONTRACT: model = the DEFAULT FAMILY (the runs door resolves
    // neither card ids nor aliases), knobs TOP-LEVEL (the door's own
    // convention), draft under the bench, test explicit false.
    // THE PRESS KEY rides every start doc (the one-press law): one
    // mint per press, a transport retry replays the SAME doc — the
    // wall pins presence and stringness, never the uuid value.
    expect(calls[1]?.args).toEqual({ doc: {
      input_image: "drop.png",
      resolution: "1024",
      model: "trellis2-native",
      draft_id: "bench-main",
      test: false,
      press_key: expect.any(String),
    } });
  });

  test("a stage naming no card refuses before the wire", async () => {
    const { calls } = mountFakes();
    stubCatalogFetch();
    resetCardFamiliesCache();
    const res = await runCardStage("bench-main", stage({ id: "s_9", params: {} }));
    expect(res).toEqual({ refused: "this stage names no card — nothing to compose" });
    expect(calls).toEqual([]);
  });

  // P7-C1 — THE UNREADABLE-ROW REFUSAL (purge P7: the stale-held-row
  // run seat). The fresh-read law (stage-run.ts) composes the
  // ESTATE's row — but `?? row` collapses a FAILED read into "compose
  // the open-time snapshot" and the run fires on it silently (the
  // music-prompt-drop shape on the read-failure path). A failed
  // fresh read must REFUSE naming the unread row — never compose
  // held params. The arm below reds while the fallback lives.
  test("a failed bench read refuses naming the unread row (never composes the held snapshot)", async () => {
    const { calls } = mountFakes({
      throws: [{ method: "drafts/get", message: "boom: the bench is unreachable" }],
      startDocs: [{ run_id: "run-9", status: "queued", queue_position: 0 }],
    });
    stubCatalogFetch({ cards: { "img-to-mesh": { families: ["trellis2-native"] } } });
    resetCardFamiliesCache();
    const res = await runCardStage("bench-main", stage({
      id: "s_9", card: "img-to-mesh",
      params: { input_image: "drop.png", resolution: "1024" },
    }));
    // the door TRIED the estate read (the attempt is the law's
    // witness) and refused — no runs/start carries held params.
    expect(calls.map((c) => c.method)).toEqual(["drafts/get"]);
    expect(res).toEqual({ refused: 'the bench row for stage "s_9" is unreadable — running would compose the open-time row, not the bench\'s stated state' });
  });

  // P7-C1 absent-row leg — THE FRESH-DROP LAW (the door contract's
  // standing shape, re-pinned here so the refusal above cannot widen
  // to it): a successful read that answers WITHOUT the row composes
  // the held row — the bench never saw the drop, the held params are
  // the only truth. The residual (a row deleted elsewhere between
  // flush and read) is indistinguishable at this door and stays open.
  test("a bench row absent from the estate answer composes the held row (the fresh-drop law)", async () => {
    const { calls } = mountFakes({
      draftStages: [{ id: "s_0", card: "image-gen", params: {} }],
      startDocs: [{ run_id: "run-9", status: "queued", queue_position: 0 }],
    });
    stubCatalogFetch({ cards: { "img-to-mesh": { families: ["trellis2-native"] } } });
    resetCardFamiliesCache();
    const res = await runCardStage("bench-main", stage({
      id: "s_9", card: "img-to-mesh",
      params: { input_image: "drop.png", resolution: "1024" },
    }));
    expect(res).toEqual({ runId: "run-9" });
    expect(calls.map((c) => c.method)).toEqual(["drafts/get", "runs/start"]);
    expect(calls[1]?.args).toEqual({ doc: {
      input_image: "drop.png",
      resolution: "1024",
      model: "trellis2-native",
      draft_id: "bench-main",
      test: false,
      press_key: expect.any(String),
    } });
  });

  test("a compose refusal rides the estate's own text, never a throw", async () => {
    mountFakes({
      refusals: [{ method: "runs/start", message: "required param 'input_image' missing on the trellis2-native card — the 3D lift is image-conditioned (no text prompt rides this lane)" }],
    });
    stubCatalogFetch({ cards: { "img-to-mesh": { families: ["trellis2-native"] } } });
    resetCardFamiliesCache();
    const res = await runCardStage("bench-main", stage({ id: "s_9", card: "img-to-mesh", params: {} }));
    expect(res).toEqual({ refused: "required param 'input_image' missing on the trellis2-native card — the 3D lift is image-conditioned (no text prompt rides this lane)" });
  });

  // ── THE SEQUENTIAL PASS (the old runAll law, 2026-08-11): one run
  //  per card IN ORDER, skip done, stop on failure — never one flow
  //  run (the flow_inline door serves the chain/graph surface).
  test("Run ALL runs each card in order, one runs/start per card", async () => {
    const completed = (rid: string): Record<string, unknown> => ({
      run_id: rid, status: "completed",
      stages: [{ id: "default", url: "/melite-media/runs/" + rid + "/out.png" }],
    });
    const { calls } = mountFakes({
      runDocs: [completed("run-1")],
    });
    stubCatalogFetch();
    resetCardFamiliesCache();
    const bench: CardsBenchValue = { kind: "bench", draftId: "bench-main", sessionKey: "main", rev: 5, log: [], stages: [
      stage({ id: "s_1", card: "image-gen", params: { prompt: "x" } }),
      stage({ id: "s_2", card: "img-to-mesh", params: { input_image: "/melite-media/runs/run-1/out.png" } }),
    ] };
    const res = await runBenchSequential(bench);
    expect(res).toEqual({ ran: ["s_1", "s_2"], stoppedAt: null, refused: null });
    // ONE run per card, in bench order
    const starts = calls.filter((c) => c.method === "runs/start");
    expect(starts.map((c) => (c.args["doc"] as Record<string, unknown>)["input_image"] ?? (c.args["doc"] as Record<string, unknown>)["prompt"])).toEqual(["x", "/melite-media/runs/run-1/out.png"]);
  });

  test("Run ALL skips done cards (the cache-hit skip) and stops at a failure", async () => {
    const completed = (rid: string): Record<string, unknown> => ({
      run_id: rid, status: "completed",
      stages: [{ id: "default", url: "/melite-media/runs/" + rid + "/out.png" }],
    });
    const failed = (rid: string): Record<string, unknown> => ({ run_id: rid, status: "failed" as const, stages: [] });
    const { calls } = mountFakes({
      // two reads per run (open + poll): the first run burns two
      // completed docs, the second lingers on failed.
      runDocs: [completed("run-1"), completed("run-1"), failed("run-2")],
    });
    stubCatalogFetch();
    resetCardFamiliesCache();
    const bench: CardsBenchValue = { kind: "bench", draftId: "bench-main", sessionKey: "main", rev: 5, log: [], stages: [
      stage({ id: "s_0", card: "image-gen", params: { prompt: "done already" }, runStatus: "done" }),
      stage({ id: "s_1", card: "image-gen", params: { prompt: "fails" } }),
      stage({ id: "s_2", card: "img-to-mesh", params: { input_image: "/melite-media/runs/run-2/out.png" } }),
    ] };
    const res = await runBenchSequential(bench);
    // s_0 skipped (cache-hit); s_1 ran + done; s_2 ran + FAILED → the
    // pass stops there (a stopped card still RAN — it's in the list)
    expect(res).toEqual({ ran: ["s_1", "s_2"], stoppedAt: "s_2", refused: null });
    expect(calls.filter((c) => c.method === "runs/start").length).toBe(2); // s_0 never started
  });

  test("Run ALL surfaces a typed refusal and stops the pass there", async () => {
    const { calls } = mountFakes({
      refusals: [{ method: "runs/start", message: "required param 'input_image' missing on the trellis2-native card — the 3D lift is image-conditioned" }],
    });
    stubCatalogFetch();
    resetCardFamiliesCache();
    const bench: CardsBenchValue = { kind: "bench", draftId: "bench-main", sessionKey: "main", rev: 5, log: [], stages: [
      stage({ id: "s_1", card: "img-to-mesh", params: {} }),
      stage({ id: "s_2", card: "image-gen", params: { prompt: "never reached" } }),
    ] };
    const res = await runBenchSequential(bench);
    expect(res.stoppedAt).toBe("s_1");
    expect(String(res.refused)).toContain("input_image");
    expect(calls.filter((c) => c.method === "runs/start").length).toBe(1);
  });

  test("the refusal's details bag rides the batch outcome (the lane popup's row)", async () => {
    const { calls } = mountFakes({
      refusals: [{
        method: "runs/start",
        message: "the diffusion slot names a model this lane does not serve",
        code: "runs/lane-input-missing",
        details: { family: "krea-2", slot: "diffusion", missing: "krea-2.safetensors", folders: ["checkpoints"], kind: "model" },
      }],
    });
    stubCatalogFetch();
    resetCardFamiliesCache();
    const bench: CardsBenchValue = { kind: "bench", draftId: "bench-main", sessionKey: "main", rev: 5, log: [], stages: [
      stage({ id: "s_1", card: "image-gen", params: { prompt: "x" } }),
      stage({ id: "s_2", card: "img-to-mesh", params: { input_image: "next.png" } }),
    ] };
    const res = await runBenchSequential(bench);
    expect(res.stoppedAt).toBe("s_1");
    expect(res.refusedCode).toBe("runs/lane-input-missing");
    // THE DETAILS RIDE (the batch spread arm): the pass outcome
    // carries the SAME structured row the single-stage paths read —
    // the missing-model popup keys family/slot/missing off it,
    // never off the message prose.
    expect(res.refusedDetails).toEqual({ family: "krea-2", slot: "diffusion", missing: "krea-2.safetensors", folders: ["checkpoints"], kind: "model" });
    expect(calls.filter((c) => c.method === "runs/start").length).toBe(1);
  });

  test("an abort landing during the observe's wait null-observes — no settle hook, the pass stops", async () => {
    const completed = (rid: string): Record<string, unknown> => ({
      run_id: rid, status: "completed",
      stages: [{ id: "default", url: "/melite-media/runs/" + rid + "/out.png" }],
    });
    let releaseStatus: (() => void) | undefined;
    const { calls } = mountFakes({
      runDocs: [completed("run-1")],
      // the START answers; the first STATUS poll parks — the window
      // where an operator Stop lands mid-observe
      verbGates: { "runs/status": [new Promise<void>((resolve) => { releaseStatus = resolve; })] },
    });
    stubCatalogFetch();
    resetCardFamiliesCache();
    const controller = new AbortController();
    const settled: string[] = [];
    const bench: CardsBenchValue = { kind: "bench", draftId: "bench-main", sessionKey: "main", rev: 5, log: [], stages: [
      stage({ id: "s_1", card: "image-gen", params: { prompt: "x" } }),
      stage({ id: "s_2", card: "img-to-mesh", params: { input_image: "next.png" } }),
    ] };
    const passing = runBenchSequential(bench, {
      signal: controller.signal,
      onCardSettled: (runId, ran) => { settled.push(runId + "@" + ran.stageId); },
    });
    await new Promise((r) => setTimeout(r, 20));
    if (calls.filter((c) => c.method === "runs/status").length !== 1) throw new Error("status poll not parked yet");
    controller.abort(); // the operator's Stop lands while the poll is parked
    releaseStatus?.();
    const res = await passing;
    // the run STARTED (it is live server-side) but the aborted
    // observe answers null — the pass stops at this card, the settle
    // hook never fires (the mapping stays seated so the orphaned run
    // stays stoppable), and the refusal lane stays null.
    expect(res).toEqual({ ran: ["s_1"], stoppedAt: "s_1", refused: null });
    expect(settled).toEqual([]);
    expect(calls.filter((c) => c.method === "runs/start").length).toBe(1);
  });

  // ── THE PARAM IS THE WIRE (2026-09-12, the two-month law
  //  restored): the slot's picked value — an upload's estate path or
  //  an upstream output's media-route url — rides the start doc
  //  VERBATIM; no client-side edge resolution exists.
  test("a picked upstream output rides the start doc verbatim", async () => {
    const { calls } = mountFakes({
      startDocs: [{ run_id: "run-9", status: "queued", queue_position: 0 }],
    });
    stubCatalogFetch();
    resetCardFamiliesCache();
    const res = await runCardStage("bench-main", stage({
      id: "s_1",
      card: "img-to-mesh",
      params: { input_image: "/melite-media/runs/run-8/img/gen_00001_.png", resolution: "1024" },
    }));
    expect(res).toEqual({ runId: "run-9" });
    const doc = (calls.find((c) => c.method === "runs/start")?.args["doc"] ?? {}) as Record<string, unknown>;
    expect(doc["input_image"]).toBe("/melite-media/runs/run-8/img/gen_00001_.png");
    expect(doc["model"]).toBe("trellis2-native");
  });

  test("a legacy numeric select value rides the spec's declared option spelling", async () => {
    const { calls } = mountFakes({
      startDocs: [{ run_id: "run-9", status: "queued", queue_position: 0 }],
    });
    stubCatalogFetch();
    resetCardFamiliesCache();
    await runCardStage("bench-main", stage({
      id: "s_1",
      card: "img-to-mesh",
      params: { input_image: "data/input/36039.jpg", resolution: 1024 },
    }));
    const doc = (calls.find((c) => c.method === "runs/start")?.args["doc"] ?? {}) as Record<string, unknown>;
    expect(doc["resolution"]).toBe("1024");
  });

  test("an upload's estate path rides verbatim too — no rewriting at the seam", async () => {
    const { calls } = mountFakes({
      startDocs: [{ run_id: "run-9", status: "queued", queue_position: 0 }],
    });
    stubCatalogFetch();
    resetCardFamiliesCache();
    const res = await runCardStage("bench-main", stage({
      id: "s_1",
      card: "img-to-mesh",
      params: { input_image: "data/input/36039.jpg" },
    }));
    expect(res).toEqual({ runId: "run-9" });
    const doc = (calls.find((c) => c.method === "runs/start")?.args["doc"] ?? {}) as Record<string, unknown>;
    expect(doc["input_image"]).toBe("data/input/36039.jpg");
  });

  // ── THE GENERIC MCP CARD'S RUN LEG (2026-09-21, the operator's
  //  law: "ALWAYS spawn a completely standalone DSH subagent"): the
  //  card's run IS an AGENT stage on the FLOW door (the subagent
  //  loop) — the params ride VERBATIM (bag entries folded
  //  engine-side by the executor's gate, never re-parsed
  //  client-side); an empty Task refuses AT THE PRESS, never a
  //  zombie run.
  test("an mcp stage starts the subagent spawn through the FLOW door, engine 'agent', params verbatim", async () => {
    const { calls } = mountFakes({
      startDocs: [{ run_id: "run-mcp", status: "queued", queue_position: 0 }],
    });
    stubCatalogFetch({ cards: { mcp: { id: "mcp", label: "MCP", families: [] } } });
    resetCardFamiliesCache();
    const res = await runCardStage("bench-main", stage({
      id: "s_3",
      card: "mcp",
      engine: "agent",
      params: {
        task: "rig the character",
        mcps: [{ server: "blender" }, "unity"],
        skills: [],
        inputs: [{ name: "mesh", value: "data/input/char.glb" }],
      },
    }));
    expect(res).toEqual({ runId: "run-mcp" });
    const doc = (calls.find((c) => c.method === "runs/start")?.args["doc"] ?? {}) as Record<string, unknown>;
    expect(doc["flow_inline"]).toEqual({
      id: "mcp",
      stages: [{
        id: "s_3",
        engine: "agent",
        params: {
          task: "rig the character",
          mcps: [{ server: "blender" }, "unity"],
          skills: [],
          inputs: [{ name: "mesh", value: "data/input/char.glb" }],
        },
        outputs: { default: "text" },
      }],
    });
    expect(doc["draft_id"]).toBe("bench-main");
    expect(doc["test"]).toBe(false);
  });

  test("an empty Task refuses AT THE PRESS (the subagent spawns with no brief otherwise)", async () => {
    const { calls } = mountFakes();
    stubCatalogFetch({ cards: { mcp: { id: "mcp", families: [] } } });
    resetCardFamiliesCache();
    const noBrief = await runCardStage("bench-main", stage({
      id: "s_3", card: "mcp", engine: "agent", params: { mcps: [{ server: "blender" }] },
    }));
    expect(String((noBrief as { refused: string }).refused)).toMatch(/write the Task first/);
    const blankBrief = await runCardStage("bench-main", stage({
      id: "s_3", card: "mcp", engine: "agent", params: { task: "   " },
    }));
    expect(String((blankBrief as { refused: string }).refused)).toMatch(/write the Task first/);
    expect(calls.filter((c) => c.method === "runs/start")).toEqual([]);
  });

  // ── THE BRAIN TRANSLATION (2026-09-21, the operator's dropdown
  //  of known routes): the face fields it `brain`, the engine's
  //  contract key IS `model` — the seam stamps it. A picked brain
  //  rides as the per-stage override; blank rides ABSENT (the
  //  lane's seated brain serves); `brain` itself never crosses.
  test("a picked Brain stamps the engine's model key and never crosses itself", async () => {
    const { calls } = mountFakes({
      startDocs: [{ run_id: "run-brain", status: "queued", queue_position: 0 }],
    });
    stubCatalogFetch({ cards: { mcp: { id: "mcp", label: "MCP", families: [] } } });
    resetCardFamiliesCache();
    const res = await runCardStage("bench-main", stage({
      id: "s_3",
      card: "mcp",
      engine: "agent",
      params: { task: "rig it", brain: "opencode-go/muse-spark-1.3-contributor", mcps: [] },
    }));
    expect(res).toEqual({ runId: "run-brain" });
    const doc = (calls.find((c) => c.method === "runs/start")?.args["doc"] ?? {}) as Record<string, unknown>;
    const params = ((doc["flow_inline"] as { stages: Array<{ params: Record<string, unknown> }> }).stages[0]!.params);
    expect(params["model"]).toBe("opencode-go/muse-spark-1.3-contributor");
    expect("brain" in params).toBe(false);
  });

  test("a blank Brain rides absent (the seated brain serves — never an empty override)", async () => {
    const { calls } = mountFakes({
      startDocs: [
        { run_id: "run-seat-1", status: "queued", queue_position: 0 },
        { run_id: "run-seat-2", status: "queued", queue_position: 0 },
        { run_id: "run-seat-3", status: "queued", queue_position: 0 },
      ],
    });
    stubCatalogFetch({ cards: { mcp: { id: "mcp", label: "MCP", families: [] } } });
    resetCardFamiliesCache();
    const ids = ["run-seat-1", "run-seat-2", "run-seat-3"];
    let n = 0;
    for (const brain of [undefined, "", "   "]) {
      const params: Record<string, unknown> = { task: "rig it", mcps: [] };
      if (brain !== undefined) params["brain"] = brain;
      const res = await runCardStage("bench-main", stage({
        id: "s_3", card: "mcp", engine: "agent", params,
      }));
      expect(res).toEqual({ runId: ids[n]! });
      n += 1;
    }
    const docs = calls.filter((c) => c.method === "runs/start").map((c) => c.args["doc"] as Record<string, unknown>);
    expect(docs.length).toBe(3);
    for (const doc of docs) {
      const params = ((doc["flow_inline"] as { stages: Array<{ params: Record<string, unknown> }> }).stages[0]!.params);
      expect("model" in params).toBe(false);
      expect("brain" in params).toBe(false);
    }
  });
});
