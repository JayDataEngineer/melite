// @contract gates-h3-chain-selection-door
/**
 * THE H3 CHAIN-SELECTION DOOR WALL (the F19 deferred-upscale seat,
 * 2026-11-12): a headless graph's MiniMaxH3ChainCheckpointManager
 * carries selection_json as a BARE RUN NAME — the estate's compose
 * door can't know each scene's saved revision ids (only the engine's
 * own chain store lists them, and the upstream pack serves no listing
 * route) — so the execute door resolves the name to the newest
 * per-scene lineage BEFORE submit, against the vendored
 * /melite/h3-chain-checkpoints route.
 *
 * Arms (each its own firing arm — the split-brain lesson):
 *   1. RESOLVE — the bare name becomes the parser's exact selection
 *      shape (contiguous lineage from 1, output_scope project); two
 *      managers naming one run make ONE call (distinct-name dedupe);
 *      the input graph object is never mutated.
 *   2. PASSTHROUGH — a browser-authored JSON spelling and a graph
 *      with no CheckpointManager both make ZERO route calls (the
 *      additive law).
 *   3. REFUSAL — an unknown run refuses loud naming the live runs
 *      (the route's own 404 body is the voice); a non-JSON error
 *      body refuses loud too.
 */
import { describe, expect, it } from "vitest";
import assert from "node:assert/strict";
import {
  chainSelectionOf,
  isBareChainRunName,
  resolveH3ChainSelections,
} from "../src/comfyui-execute.ts";
import type { EngineJson } from "../src/comfyui-types.ts";

type Json = Record<string, EngineJson>;

const REV_A = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const REV_B = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const routeBody = {
  run_name: "run_alpha",
  scenes: [
    { scene: 1, revisions: [REV_A], latest: REV_A },
    { scene: 2, revisions: [REV_B], latest: REV_B },
  ],
};

/** The fake client: answers the chain-checkpoints route from a canned
 * table; records every call. fetchApi is the only face the door
 * touches. */
function fakeClient(table: Record<string, { status: number; body: unknown }>): {
  client: unknown;
  paths: string[];
} {
  const paths: string[] = [];
  const client = {
    fetchApi: async (path: string): Promise<{ ok: boolean; status: number; json(): Promise<unknown> }> => {
      paths.push(path);
      const hit = table[path];
      if (hit === undefined) throw new Error(`no route fixture for ${path}`);
      return { ok: hit.status < 400, status: hit.status, json: async () => hit.body };
    },
  };
  return { client, paths };
}

const managerGraph = (selection: string): Json => ({
  "upscale::CheckpointManager.0": {
    class_type: "MiniMaxH3ChainCheckpointManager",
    inputs: { selection_json: selection },
  },
});

// ── arm 1: the resolve ──────────────────────────────────────────────────────

describe("h3 chain selection door — the resolve", () => {
  it("a bare run name becomes the parser's exact selection shape, one call per distinct name, staged graph untouched", async () => {
    const graph: Json = {
      ...managerGraph("run_alpha"),
      "upscale::UpscaleAdapter.0": {
        class_type: "MiniMaxH3ChainUpscaleAdapter",
        inputs: { source_manifest: ["upscale::CheckpointManager.0", 0] },
      },
      "other::Manager": {
        class_type: "MiniMaxH3ChainCheckpointManager",
        inputs: { selection_json: "run_alpha" },
      },
    };
    const { client, paths } = fakeClient({
      "/melite/h3-chain-checkpoints?run=run_alpha": { status: 200, body: routeBody },
    });
    const next = await resolveH3ChainSelections(client as never, graph);
    expect(paths).toEqual(["/melite/h3-chain-checkpoints?run=run_alpha"]);
    const selection = JSON.parse(
      String((next["upscale::CheckpointManager.0"] as { inputs: Json }).inputs["selection_json"]),
    ) as Json;
    expect(selection).toEqual({
      run_name: "run_alpha",
      lineage: [
        { scene: 1, revision: REV_A },
        { scene: 2, revision: REV_B },
      ],
      output_scope: "project",
    });
    expect((next["other::Manager"] as { inputs: Json }).inputs["selection_json"])
      .toBe(selection["run_name"] === "run_alpha"
        ? (next["upscale::CheckpointManager.0"] as { inputs: Json }).inputs["selection_json"]
        : "");
    // the input graph object is never mutated
    expect((graph["upscale::CheckpointManager.0"] as { inputs: Json }).inputs["selection_json"])
      .toBe("run_alpha");
  });

  it("chainSelectionOf writes contiguous scenes from 1 with project scope (the parser's contract)", () => {
    expect(JSON.parse(chainSelectionOf("r", [
      { scene: 1, latest: REV_A },
      { scene: 2, latest: REV_B },
    ]))).toEqual({
      run_name: "r",
      lineage: [{ scene: 1, revision: REV_A }, { scene: 2, revision: REV_B }],
      output_scope: "project",
    });
    expect(isBareChainRunName("run_x")).toBe(true);
    expect(isBareChainRunName(JSON.stringify({ run_name: "x" }))).toBe(false);
    expect(isBareChainRunName("")).toBe(false);
  });
});

// ── arm 2: the passthrough (the additive law) ───────────────────────────────

describe("h3 chain selection door — the passthrough", () => {
  it("an authored JSON spelling makes zero route calls and keeps its bytes", async () => {
    const authored = JSON.stringify({ run_name: "run_alpha", lineage: [{ scene: 1, revision: REV_A }] });
    const graph = managerGraph(authored);
    const { client, paths } = fakeClient({});
    const next = await resolveH3ChainSelections(client as never, graph);
    expect(paths).toEqual([]);
    expect(next).toBe(graph);
  });

  it("a graph with no CheckpointManager is returned as the same object, zero calls", async () => {
    const graph: Json = { s: { class_type: "Other", inputs: {} } };
    const { client, paths } = fakeClient({});
    const next = await resolveH3ChainSelections(client as never, graph);
    expect(paths).toEqual([]);
    expect(next).toBe(graph);
  });
});

// ── arm 3: the refusal ──────────────────────────────────────────────────────

describe("h3 chain selection door — the refusal", () => {
  it("an unknown run refuses loud naming the live runs (the route's own voice)", async () => {
    const { client } = fakeClient({
      "/melite/h3-chain-checkpoints?run=run_ghost": {
        status: 404,
        body: { error: "chain run 'run_ghost' holds no scene checkpoints", runs: [{ run_name: "run_alpha" }] },
      },
    });
    await assert.rejects(
      resolveH3ChainSelections(client as never, managerGraph("run_ghost")),
      /run_ghost.*live runs: run_alpha/s,
    );
  });

  it("a route error without a runs list still names the run and the error", async () => {
    const { client } = fakeClient({
      "/melite/h3-chain-checkpoints?run=run_broken": {
        status: 500,
        body: { error: "store unreadable" },
      },
    });
    await assert.rejects(
      resolveH3ChainSelections(client as never, managerGraph("run_broken")),
      /run_broken.*store unreadable/s,
    );
  });
});
