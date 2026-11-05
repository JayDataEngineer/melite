/**
 * THE H3 CHAIN-STORE WRITE WALL — SESSION 1, THE HARVEST REGISTRAR
 * (plan dev_docs/agents/plans/2026-11-01-f35-chain-store-write.md §2.2,
 * qa8 F35): every chain-spine run leaves its per-scene checkpoints in
 * the engine's own `h3_chains/<run>/` store, but the estate never
 * learned WHICH store in any machine-readable place — the upscale
 * arm's only discovery advice was "check the run's own artifacts".
 *
 * THE WRITE-PATH LAW (§2.1): the estate never manufactures
 * `checkpoints/clip_%04d.<rev32>.json` sidecars — the pack's manager
 * verifies segment index, revision, run-name equality and sha256
 * lineage, so a hand-written sidecar is a counterfeit factory. The
 * registrar is therefore a READER: the completion row
 * (`h3_chain_top_level_complete`, carrying run_name/scene/end_clip)
 * is stamped onto the stage result as `chain_store`
 * {run_name, scenes, end_clip} — provenance only, the same
 * stamp-the-stage-result posture as the qvoice/loudness/freshness
 * receipts.
 *
 * Arms (each its own firing arm — the split-brain lesson):
 *   1. REGISTRAR-PARSE — a completion row yields the three scalars; a
 *      non-chain entry (and a still-owed requeue entry, and an entry
 *      with no outputs) yield null.
 *   2. SINGLE-PROMPT STAMP — executeSingleInner's outputs carry
 *      chain_store on a chain-complete entry, absent otherwise.
 *   3. MERGED PARITY — the merged path's per-stage results (what
 *      runsExecute.ts spreads onto `result_outputs`) carry the stamp
 *      on the stage whose subOutputs held the completion row.
 *   4. THE MERGED DOOR (F19 residual, 2026-11-13) — the merged submit
 *      resolves a CheckpointManager's bare store spelling into the
 *      parser's selection shape BEFORE POST /prompt (the card door's
 *      upscale arm rides executeFlowInner, where the resolver never
 *      rode — the engine died at branch_scope's json.loads on the
 *      bare name); a JSON-authored manager rides with zero route
 *      calls (the additive law, merge arm).
 */
import { describe, expect, it, vi } from "vitest";
import assert from "node:assert/strict";

type Json = Record<string, unknown>;

// ── fixtures ────────────────────────────────────────────────────────────────

/** The final entry of a three-scene chain: the pack's LoopEnd emits
 *  `h3_chain_top_level_complete` only when the last scene lands. */
const completeEntry = (): Json => ({
  status: { status_str: "success" },
  outputs: {
    "film::MiniMaxH3ChainLoopEnd.0": {
      h3_chain_top_level_complete: [{
        run_name: "swap_1b952dbeab", scene: 3, end_clip: 3,
        workflow_fingerprint: "fp", working_branch_id: "main",
      }],
    },
    "film::Segment": { images: ["/the-film.mp4"] },
  },
});

/** A plain single-pass film entry: no chain rows of any kind. */
const plainEntry = (): Json => ({
  status: { status_str: "success" },
  outputs: { "film::Segment": { images: ["/plain.mp4"] } },
});

// ── the shared transport fixtures (the merge-seat door wall's rig) ──────────

const submittedIds: string[] = [];
/** The exact /prompt bodies the merged path submitted (arm 4 asserts
 *  the resolved selection, not the bare store spelling). */
const submittedBodies: Array<Record<string, Json>> = [];
/** prompt id → its terminal history entry (seeded at submit: the
 *  engine "finishes" instantly; waitTerminal then reads /history). */
const history: Record<string, Json> = {};
/** The entry the NEXT submit will leave in history (arm 2 flips this
 *  between the chain-complete and plain-film presses). */
let nextEntry: () => Json = completeEntry;
/** The chain-checkpoints listing the door's route serves (arm 4). */
const chainListing: Json = {
  run_name: "run_alpha",
  scenes: [
    { scene: 1, revisions: ["a".repeat(32)], latest: "a".repeat(32) },
    { scene: 2, revisions: ["b".repeat(32)], latest: "b".repeat(32) },
  ],
};

vi.mock("../src/comfyui-transport.ts", () => ({
  withBound: (work: () => Promise<unknown>): Promise<unknown> => work(),
  sdkClient: () => ({
    clientId: "harvest-client",
    queuePrompt: async (_n: number, _body: unknown): Promise<Json> => {
      const id = "p-" + String(submittedIds.length + 1);
      submittedIds.push(id);
      submittedBodies.push(_body as Record<string, Json>);
      history[id] = nextEntry();
      return { prompt_id: id };
    },
    fetchApi: async (path: string): Promise<{ ok: boolean; status: number; json(): Promise<unknown> }> => {
      if (path === "/queue") {
        return { ok: true, status: 200, json: async () => ({ queue_running: [], queue_pending: [] }) };
      }
      if (path.startsWith("/history")) {
        return { ok: true, status: 200, json: async () => history };
      }
      if (path.startsWith("/melite/h3-chain-checkpoints")) {
        return { ok: true, status: 200, json: async () => chainListing };
      }
      return { ok: false, status: 404, json: async () => ({ error: "no route fixture for " + path }) };
    },
    interrupt: async (): Promise<void> => {},
    on: (): (() => void) => (): void => {},
    connect: async (): Promise<void> => {},
    close: (): void => {},
  }),
}));

vi.mock("../src/comfyui-upload.ts", () => ({
  spliceWorkflow: (params: Record<string, unknown>) => ({ graph: params, staged: true }),
  uploadReferenced: async (_c: unknown, graph: Record<string, Json>) => ({ graph }),
}));

vi.mock("../src/comfyui-outputs.ts", () => ({
  mapHistoryEntry: () => ({ kind: "completed" }),
  fetchOutputArtifacts: async (): Promise<[]> => [],
  fetchOutputs: async (): Promise<[]> => [],
  publishOutputChannels: (outputs: Json): Json => ({ ...outputs }),
  assertPublishedOutputChannels: (): void => {},
  qvoicePathsOf: (): string => "",
  loudnessOf: (): null => null,
  qvoiceFreshnessOf: (): null => null,
  normalizeTimeoutS: (v: unknown): number =>
    typeof v === "number" && v > 0 ? v : 2400,
}));

vi.mock("../src/comfyui-config.ts", () => ({
  resolveEngineBaseUrl: (): string => "http://harvest:8188",
}));

import {
  executeSingleInner,
  h3ChainStoreOf,
} from "../src/comfyui-execute.ts";
import { executeFlowInner } from "../src/comfyui-merge.ts";
import { ACTIVE } from "../src/comfyui-types.ts";
import type { EngineJson } from "../src/comfyui-types.ts";
import type { MergeRow } from "../src/comfyui-merge.ts";

const chainRow = (): MergeRow => ({
  stageId: "film",
  card: undefined,
  workflow: {
    "MiniMaxH3ChainLoopStart.0": {
      class_type: "MiniMaxH3ChainLoopStart",
      inputs: { start_clip: 1, scene_range: "", verify_resume_history: true },
    },
    "MiniMaxH3ChainLoopEnd.0": {
      class_type: "MiniMaxH3ChainLoopEnd",
      inputs: { execution_mode: "top_level_requeue" },
    },
    Segment: { class_type: "SegmentSave", inputs: {} },
  },
  outputs: {},
  outputNodes: {},
  params: {},
});

// ── arm 1: the registrar parse ──────────────────────────────────────────────

describe("h3 chain store — the registrar parse (arm 1)", () => {
  it("a completion row yields exactly the three scalars", () => {
    const stamp = h3ChainStoreOf(completeEntry()["outputs"] as EngineJson);
    assert.ok(stamp !== null, "the completion row must stamp");
    assert.deepEqual(stamp, { run_name: "swap_1b952dbeab", scenes: 3, end_clip: 3 });
  });

  it("a non-chain entry, a still-owed requeue entry and a bare entry read null", () => {
    expect(h3ChainStoreOf(plainEntry()["outputs"] as EngineJson)).toBeNull();
    const owed: Json = {
      outputs: {
        "film::MiniMaxH3ChainLoopEnd.0": {
          h3_chain_top_level_requeue: [{
            run_name: "swap_1b952dbeab", handoff_id: "next_scene_0002_ab",
            scene: 2, end_clip: 3,
          }],
        },
      },
    };
    expect(h3ChainStoreOf(owed["outputs"] as EngineJson)).toBeNull();
    expect(h3ChainStoreOf(undefined)).toBeNull();
  });

  it("a completion row without a usable run_name or end_clip earns no stamp", () => {
    const broken: Json = {
      outputs: {
        "x": { h3_chain_top_level_complete: [{ scene: 3 }] },
      },
    };
    expect(h3ChainStoreOf(broken["outputs"] as EngineJson)).toBeNull();
  });
});

// ── arm 2: the single-prompt stamp ──────────────────────────────────────────

describe("h3 chain store — the single-prompt stamp (arm 2)", () => {
  it("executeSingleInner outputs carry chain_store on a chain-complete entry", async () => {
    submittedIds.length = 0;
    nextEntry = completeEntry;
    const result = await executeSingleInner(
      "/runs/harvest", {}, {}, {}, "http://harvest:8188", ACTIVE,
    );
    assert.deepEqual(result.outputs["chain_store"],
      { run_name: "swap_1b952dbeab", scenes: 3, end_clip: 3 });
  });

  it("a plain film entry carries no chain_store (the additive law)", async () => {
    submittedIds.length = 0;
    nextEntry = plainEntry;
    const result = await executeSingleInner(
      "/runs/harvest-plain", {}, {}, {}, "http://harvest:8188", ACTIVE,
    );
    expect("chain_store" in result.outputs).toBe(false);
  });
});

// ── arm 3: the merged parity ────────────────────────────────────────────────

describe("h3 chain store — the merged parity (arm 3)", () => {
  it("the merged stage result (runsExecute's result_outputs source) carries the stamp", async () => {
    submittedIds.length = 0;
    nextEntry = completeEntry;
    history["p-1"] = completeEntry();
    const result = (await executeFlowInner(
      [chainRow()], "/runs/harvest-merged", {}, {}, {}, "http://harvest:8188", ACTIVE,
    )) as unknown as {
      stages: Record<string, { outputs: Json; artifacts: string[] }>;
      promptId: string;
    };
    const stage = result.stages["film"];
    assert.ok(stage !== undefined, "one stage, one result");
    assert.deepEqual(stage.outputs["chain_store"],
      { run_name: "swap_1b952dbeab", scenes: 3, end_clip: 3 });
  });

  it("a non-chain merged graph stamps nothing (the additive law)", async () => {
    submittedIds.length = 0;
    nextEntry = plainEntry;
    const plain = chainRow();
    delete (plain.workflow as Json)["MiniMaxH3ChainLoopEnd.0"];
    // The stage face the arm reads: each stage row carries its
    // outputs record (Json), so the `in` probe judges a typed object.
    const result = (await executeFlowInner(
      [plain], "/runs/harvest-merged-plain", {}, {}, {}, "http://harvest:8188", ACTIVE,
    )) as unknown as { stages: Record<string, { outputs: Json }> };
    expect("chain_store" in result.stages["film"]!.outputs).toBe(false);
  });
});

// ── arm 4: the merged door (the upscale arm rides the flow path) ────────────

const upscaleRow = (selection: string): MergeRow => ({
  stageId: "upscale",
  card: undefined,
  workflow: {
    "MiniMaxH3ChainCheckpointManager.0": {
      class_type: "MiniMaxH3ChainCheckpointManager",
      inputs: { selection_json: selection },
    },
    Segment: { class_type: "SegmentSave", inputs: {} },
  },
  outputs: {},
  outputNodes: {},
  params: {},
});

describe("h3 chain store — the merged door (arm 4)", () => {
  it("the merged submit carries the resolved lineage, never the bare store spelling", async () => {
    submittedIds.length = 0;
    submittedBodies.length = 0;
    nextEntry = plainEntry;
    await executeFlowInner(
      [upscaleRow("run_alpha")], "/runs/harvest-merged-door", {}, {}, {}, "http://harvest:8188", ACTIVE,
    );
    assert.equal(submittedBodies.length, 1, "one merged submit");
    const prompt = submittedBodies[0]!["prompt"] as Json;
    const manager = prompt["upscale::MiniMaxH3ChainCheckpointManager.0"] as { inputs: Json };
    const selection = JSON.parse(String(manager.inputs["selection_json"])) as Json;
    assert.deepEqual(selection, {
      run_name: "run_alpha",
      lineage: [
        { scene: 1, revision: "a".repeat(32) },
        { scene: 2, revision: "b".repeat(32) },
      ],
      output_scope: "project",
    });
  });

  it("a JSON-authored manager rides the merged path with zero route calls (the additive law)", async () => {
    submittedIds.length = 0;
    submittedBodies.length = 0;
    nextEntry = plainEntry;
    const authored = JSON.stringify({
      run_name: "run_alpha",
      lineage: [{ scene: 1, revision: "a".repeat(32) }],
      output_scope: "project",
    });
    await executeFlowInner(
      [upscaleRow(authored)], "/runs/harvest-merged-door-authored", {}, {}, {}, "http://harvest:8188", ACTIVE,
    );
    assert.equal(submittedBodies.length, 1, "one merged submit");
    const prompt = submittedBodies[0]!["prompt"] as Json;
    const manager = prompt["upscale::MiniMaxH3ChainCheckpointManager.0"] as { inputs: Json };
    expect(manager.inputs["selection_json"]).toBe(authored);
  });
});
