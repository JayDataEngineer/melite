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
// fetch is stubbed whole per method — the wire frame the tab posts
// is asserted, the canned server-response frames answer. React
// rendering (Modal drilldown, buttons) rides the live shell, not
// jsdom — the pure laws above are what pinned the regressions.
import { describe, expect, test, afterEach } from "vitest";
import { resetCardFamiliesCache } from "@melite-plugin/melite-run-wire";
import { resolveCardsAddress, groupStagesByCard, runCardStage, runBenchSequential } from "../src/client/CardsTab.tsx";
import { readRun, restoreRunToBench } from "../src/client/cards-resource.ts";
import type { BenchStageRow, CardsBenchValue, CardsRunValue } from "../src/client/cards-resource.ts";

function stage(over: Partial<BenchStageRow> & { id: string }): BenchStageRow {
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
    expect(readRun("r1", { status: "x", stages: [] }).draftId).toBeNull();
    expect(readRun("r1", { status: "x", draft_id: "", stages: [] }).draftId).toBeNull();
  });
});

// ── restore wire ──────────────────────────────────────────────

interface Call { method: string; args: Record<string, unknown> }

let calls: Call[] = [];
let routes: Record<string, (args: Record<string, unknown>, n: number) => { ok: boolean; value?: unknown; error?: string }> = {};
let seen: Record<string, number> = {};
let catalog: Record<string, unknown> = { cards: { "img-to-mesh": { families: ["trellis2-native"] } } };

function stubWire(): void {
  calls = [];
  seen = {};
  routes = {};
  (globalThis as Record<string, unknown>)["fetch"] = async (url: unknown, init?: { body?: unknown }): Promise<unknown> => {
    // the catalog arm (the family currency door — a GET, no frame)
    if (String(url) === "/v1/model-catalog") {
      return { ok: true, json: async () => catalog };
    }
    // the form-spec arm (the declared surface — GET /v1/form-spec?model=<card>)
    if (String(url).startsWith("/v1/form-spec")) {
      return { ok: true, json: async () => ({ form: "img-to-mesh", fields: [
        { name: "input_image", label: "Source image", type: "image" },
        { name: "resolution", label: "Resolution", type: "select", options: ["512", "1024", "1536"] },
      ] }) };
    }
    const frame = JSON.parse(String(init?.body)) as { rpcId: string; method: string; payload: { args: Record<string, unknown> } };
    calls.push({ method: frame.method, args: frame.payload.args });
    const n = (seen[frame.method] ?? 0) + 1;
    seen[frame.method] = n;
    const route = routes[frame.method];
    const out = route !== undefined
      ? route(frame.payload.args, n)
      : { ok: false as const, error: "unstubbed " + frame.method };
    return {
      ok: true,
      json: async () => ({
        type: "server-response",
        rpcId: frame.rpcId,
        result: out.ok ? { ok: true, value: out.value } : { ok: false, error: { message: out.error } },
      }),
    };
  };
}

const realFetch = globalThis.fetch;
afterEach(() => { (globalThis as Record<string, unknown>)["fetch"] = realFetch; });

function run(over: Partial<CardsRunValue> = {}): CardsRunValue {
  return { kind: "run", runId: "r1", status: "completed", draftId: "bench-main", stages: [], lastFrame: undefined, ...over };
}

describe("restoreRunToBench — the card back into a flow", () => {
  test("drafts/get → bench/get rev → per-stage add-stage as the user, rev chained", async () => {
    stubWire();
    routes["drafts/get"] = () => ({ ok: true, value: { stages: [
      { id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a sailboat" } },
      { id: "s_1", card: "tts", params: { text: "hi" } },
    ] } });
    routes["bench/get"] = () => ({ ok: true, value: { draft_id: "bench-main", rev: 21, stages: [], log: [] } });
    routes["bench/add-stage"] = (_args, n) => ({ ok: true, value: { draft_id: "bench-main", session: "main", rev: 21 + n, stage: "s" } });
    const report = await restoreRunToBench(run());
    expect(report).toEqual({ added: 2, skipped: 0, notes: [] });
    expect(calls.map((c) => c.method)).toEqual(["drafts/get", "bench/get", "bench/add-stage", "bench/add-stage"]);
    expect(calls[0]?.args).toEqual({ draftId: "bench-main" });
    expect(calls[1]?.args).toEqual({ sessionKey: "main" });
    // first add carries the bench rev + user authorship; the second
    // chains the first answer's rev (the CAS law).
    // add-stage args carry the remote's FULL signature — {sessionKey,
    // doc} (the gateway arg-law; the bare-doc shape was a latent 422).
    expect(calls[2]?.args).toMatchObject({ sessionKey: "main", doc: { card: "image-gen", engine: "comfyui", author: "user", expect_rev: 21, id: "s_0" } });
    expect(((calls[2]?.args["doc"] as Record<string, unknown>)["params"] as Record<string, unknown>)["prompt"]).toBe("a sailboat");
    expect(calls[3]?.args).toMatchObject({ sessionKey: "main", doc: { card: "tts", author: "user", expect_rev: 22, id: "s_1" } });
  });

  test("a run naming no draft throws before any fetch", async () => {
    stubWire();
    await expect(restoreRunToBench(run({ draftId: null }))).rejects.toThrow("names no draft");
    expect(calls).toEqual([]);
  });

  test("an unreadable draft throws with the door's text, bench untouched", async () => {
    stubWire();
    routes["drafts/get"] = () => ({ ok: false, error: "draft/gone: bench-main retired" });
    await expect(restoreRunToBench(run())).rejects.toThrow("producing draft is unreadable: draft/gone: bench-main retired");
    expect(calls.map((c) => c.method)).toEqual(["drafts/get"]);
  });

  test("cardless stages skip and count, the rest land", async () => {
    stubWire();
    routes["drafts/get"] = () => ({ ok: true, value: { stages: [{ id: "s_0" }, { id: "s_1", card: "image-gen" }] } });
    routes["bench/get"] = () => ({ ok: true, value: { rev: 3 } });
    routes["bench/add-stage"] = () => ({ ok: true, value: { rev: 4 } });
    const report = await restoreRunToBench(run());
    expect(report.added).toBe(1);
    expect(report.skipped).toBe(1);
    expect(calls.filter((c) => c.method === "bench/add-stage")).toHaveLength(1);
  });

  test("an id collision retries once without the id and notes it", async () => {
    stubWire();
    routes["drafts/get"] = () => ({ ok: true, value: { stages: [{ id: "s_0", card: "image-gen" }] } });
    routes["bench/get"] = () => ({ ok: true, value: { rev: 7 } });
    routes["bench/add-stage"] = (args) => {
      const doc = (args["doc"] ?? {}) as Record<string, unknown>;
      return doc["id"] === undefined
        ? { ok: true, value: { rev: 8 } }
        : { ok: false, error: "stage id already on the bench: s_0" };
    };
    const report = await restoreRunToBench(run());
    expect(report.added).toBe(1);
    expect(report.notes).toEqual(["s_0 was already on the bench — added under a fresh id"]);
    const adds = calls.filter((c) => c.method === "bench/add-stage");
    expect(adds).toHaveLength(2);
    const retryDoc = (adds[1]?.args["doc"] ?? {}) as Record<string, unknown>;
    expect(retryDoc["id"]).toBeUndefined();
    expect(retryDoc["expect_rev"]).toBe(7);
  });

  test("a real refusal stops the restore and names what landed", async () => {
    stubWire();
    routes["drafts/get"] = () => ({ ok: true, value: { stages: [
      { id: "s_0", card: "image-gen" },
      { id: "s_1", card: "tts" },
    ] } });
    routes["bench/get"] = () => ({ ok: true, value: { rev: 1 } });
    routes["bench/add-stage"] = (_args, n) => n === 1
      ? { ok: true, value: { rev: 2 } }
      : { ok: false, error: "bench/cas-conflict: stale rev" };
    await expect(restoreRunToBench(run())).rejects.toThrow("restore stopped after 1 stage(s): bench/cas-conflict: stale rev");
  });
});

// ── the run doors (the 2026-09-12 fix: single-card Run rides the
//    COMPOSING {model:} door — the flow_inline door cannot consume
//    cards and its executor demanded a workflow nobody emitted) ──

describe("runCardStage / runBenchSequential — the door contract", () => {
  test("one card stage starts through the composing {model:} door", async () => {
    stubWire();
    resetCardFamiliesCache();
    const realFetchRef = globalThis.fetch;
    // the catalog arm (families currency) + the wire arm in one stub
    (globalThis as Record<string, unknown>)["fetch"] = async (url: unknown, init?: { body?: unknown }): Promise<unknown> => {
      if (String(url) === "/v1/model-catalog") {
        return { ok: true, json: async () => ({ cards: { "img-to-mesh": { id: "img-to-mesh", families: ["trellis2-native", "pixal3d", "transfer_rig"] } } }) };
      }
      const frame = JSON.parse(String(init?.body)) as { rpcId: string; method: string; payload: { args: Record<string, unknown> } };
      calls.push({ method: frame.method, args: frame.payload.args });
      return { ok: true, json: async () => ({ type: "server-response", rpcId: frame.rpcId, result: { ok: true, value: { run_id: "run-9", status: "queued", queue_position: 0 } } }) };
    };
    const res = await runCardStage("bench-main", stage({
      card: "img-to-mesh",
      params: { input_image: "drop.png", resolution: "1024" },
    }));
    (globalThis as Record<string, unknown>)["fetch"] = realFetchRef;
    resetCardFamiliesCache();
    expect(res).toEqual({ runId: "run-9" });
    // THE FRESH-READ FIRST (2026-09-13): the composing door reads the
    // estate's row before starting (the drop law) — the read precedes
    // the start; the stub's answer carries no stages so the held row
    // composes.
    expect(calls[0]?.method).toBe("drafts/get");
    // THE CONTRACT: model = the DEFAULT FAMILY (the runs door resolves
    // neither card ids nor aliases), knobs TOP-LEVEL (the door's own
    // convention), draft under the bench, test explicit false.
    expect(calls[1]?.args).toEqual({ doc: {
      input_image: "drop.png",
      resolution: "1024",
      model: "trellis2-native",
      draft_id: "bench-main",
      test: false,
    } });
  });

  test("a stage naming no card refuses before the wire", async () => {
    stubWire();
    resetCardFamiliesCache();
    const res = await runCardStage("bench-main", stage({ params: {} }));
    expect(res).toEqual({ refused: "this stage names no card — nothing to compose" });
    expect(calls).toEqual([]);
    resetCardFamiliesCache();
  });

  test("a compose refusal rides the estate's own text, never a throw", async () => {
    stubWire();
    resetCardFamiliesCache();
    const realFetchRef = globalThis.fetch;
    (globalThis as Record<string, unknown>)["fetch"] = async (url: unknown, init?: { body?: unknown }): Promise<unknown> => {
      if (String(url) === "/v1/model-catalog") {
        return { ok: true, json: async () => ({ cards: { "img-to-mesh": { families: ["trellis2-native"] } } }) };
      }
      const frame = JSON.parse(String(init?.body)) as { rpcId: string; method: string; payload: { args: Record<string, unknown> } };
      return { ok: true, json: async () => ({ type: "server-response", rpcId: frame.rpcId, result: { ok: false, error: { message: "required param 'input_image' missing on the trellis2-native card — the 3D lift is image-conditioned (no text prompt rides this lane)" } } }) };
    };
    const res = await runCardStage("bench-main", stage({ card: "img-to-mesh", params: {} }));
    (globalThis as Record<string, unknown>)["fetch"] = realFetchRef;
    resetCardFamiliesCache();
    expect(res).toEqual({ refused: "required param 'input_image' missing on the trellis2-native card — the 3D lift is image-conditioned (no text prompt rides this lane)" });
  });

  // ── THE SEQUENTIAL PASS (the old runAll law, 2026-08-11): one run
  //  per card IN ORDER, skip done, stop on failure — never one flow
  //  run (the flow_inline door serves the chain/graph surface).
  test("Run ALL runs each card in order, one runs/start per card", async () => {
    stubWire();
    resetCardFamiliesCache();
    let n = 0;
    routes["runs/start"] = () => { n += 1; return { ok: true, value: { run_id: "run-" + n, status: "queued", queue_position: 0 } }; };
    routes["runs/status"] = (a: Record<string, unknown>) => {
      const rid = String(a["run_id"] ?? "");
      return { ok: true, value: { run_id: rid, status: "completed", stages: [{ id: "default", url: "/melite-media/runs/" + rid + "/out.png" }] } };
    };
    routes["drafts/patch"] = (a: Record<string, unknown>) => ({ ok: true, value: { draftId: a["draftId"], stageId: a["stageId"], delivered: true, patched: ["runStatus"] } });
    const bench: CardsBenchValue = { kind: "bench", draftId: "bench-main", rev: 5, log: [], stages: [
      stage({ id: "s_1", card: "image-gen", params: { prompt: "x" } }),
      stage({ id: "s_2", card: "img-to-mesh", params: { input_image: "/melite-media/runs/run-1/out.png" } }),
    ] };
    const res = await runBenchSequential(bench);
    expect(res).toEqual({ ran: ["s_1", "s_2"], stoppedAt: null, refused: null });
    // ONE run per card, in bench order
    const starts = calls.filter((c) => c.method === "runs/start");
    expect(starts.map((c) => c.args["doc"]["input_image"] ?? c.args["doc"]["prompt"])).toEqual(["x", "/melite-media/runs/run-1/out.png"]);
    resetCardFamiliesCache();
  });

  test("Run ALL skips done cards (the cache-hit skip) and stops at a failure", async () => {
    stubWire();
    resetCardFamiliesCache();
    let n = 0;
    routes["runs/start"] = () => { n += 1; return { ok: true, value: { run_id: "run-" + n, status: "queued", queue_position: 0 } }; };
    routes["runs/status"] = (a: Record<string, unknown>) => {
      const rid = String(a["runId"] ?? "");
      const failed = rid === "run-2";
      return { ok: true, value: { run_id: rid, status: failed ? "failed" : "completed", stages: failed ? [] : [{ id: "default", url: "/melite-media/runs/" + rid + "/out.png" }] } };
    };
    routes["drafts/patch"] = (a: Record<string, unknown>) => ({ ok: true, value: { draftId: a["draftId"], stageId: a["stageId"], delivered: true, patched: ["runStatus"] } });
    const bench: CardsBenchValue = { kind: "bench", draftId: "bench-main", rev: 5, log: [], stages: [
      stage({ id: "s_0", card: "image-gen", params: { prompt: "done already" }, runStatus: "done" }),
      stage({ id: "s_1", card: "image-gen", params: { prompt: "fails" } }),
      stage({ id: "s_2", card: "img-to-mesh", params: { input_image: "/melite-media/runs/run-2/out.png" } }),
    ] };
    const res = await runBenchSequential(bench);
    // s_0 skipped (cache-hit); s_1 ran + done; s_2 ran + FAILED → the
    // pass stops there (a stopped card still RAN — it's in the list)
    expect(res).toEqual({ ran: ["s_1", "s_2"], stoppedAt: "s_2", refused: null });
    expect(calls.filter((c) => c.method === "runs/start").length).toBe(2); // s_0 never started
    resetCardFamiliesCache();
  });

  test("Run ALL surfaces a typed refusal and stops the pass there", async () => {
    stubWire();
    resetCardFamiliesCache();
    routes["runs/start"] = () => ({ ok: false, error: "required param 'input_image' missing on the trellis2-native card — the 3D lift is image-conditioned" });
    const bench: CardsBenchValue = { kind: "bench", draftId: "bench-main", rev: 5, log: [], stages: [
      stage({ id: "s_1", card: "img-to-mesh", params: {} }),
      stage({ id: "s_2", card: "image-gen", params: { prompt: "never reached" } }),
    ] };
    const res = await runBenchSequential(bench);
    expect(res.stoppedAt).toBe("s_1");
    expect(String(res.refused)).toContain("input_image");
    expect(calls.filter((c) => c.method === "runs/start").length).toBe(1);
    resetCardFamiliesCache();
  });

  // ── THE PARAM IS THE WIRE (2026-09-12, the two-month law
  //  restored): the slot's picked value — an upload's estate path or
  //  an upstream output's media-route url — rides the start doc
  //  VERBATIM; no client-side edge resolution exists.
  test("a picked upstream output rides the start doc verbatim", async () => {
    stubWire();
    resetCardFamiliesCache();
    routes["runs/start"] = () => ({ ok: true, value: { run_id: "run-9", status: "queued", queue_position: 0 } });
    const res = await runCardStage("bench-main", stage({
      id: "s_1",
      card: "img-to-mesh",
      params: { input_image: "/melite-media/runs/run-8/img/gen_00001_.png", resolution: "1024" },
    }));
    expect(res).toEqual({ runId: "run-9" });
    const doc = (calls.find((c) => c.method === "runs/start")?.args["doc"] ?? {}) as Record<string, unknown>;
    expect(doc["input_image"]).toBe("/melite-media/runs/run-8/img/gen_00001_.png");
    expect(doc["model"]).toBe("trellis2-native");
    resetCardFamiliesCache();
  });

  test("a legacy numeric select value rides the spec's declared option spelling", async () => {
    stubWire();
    resetCardFamiliesCache();
    routes["runs/start"] = () => ({ ok: true, value: { run_id: "run-9", status: "queued", queue_position: 0 } });
    await runCardStage("bench-main", stage({
      id: "s_1",
      card: "img-to-mesh",
      params: { input_image: "data/input/36039.jpg", resolution: 1024 },
    }));
    const doc = (calls.find((c) => c.method === "runs/start")?.args["doc"] ?? {}) as Record<string, unknown>;
    expect(doc["resolution"]).toBe("1024");
    resetCardFamiliesCache();
  });

  test("an upload's estate path rides verbatim too — no rewriting at the seam", async () => {
    stubWire();
    resetCardFamiliesCache();
    routes["runs/start"] = () => ({ ok: true, value: { run_id: "run-9", status: "queued", queue_position: 0 } });
    const res = await runCardStage("bench-main", stage({
      id: "s_1",
      card: "img-to-mesh",
      params: { input_image: "data/input/36039.jpg" },
    }));
    expect(res).toEqual({ runId: "run-9" });
    const doc = (calls.find((c) => c.method === "runs/start")?.args["doc"] ?? {}) as Record<string, unknown>;
    expect(doc["input_image"]).toBe("data/input/36039.jpg");
    resetCardFamiliesCache();
  });
});
