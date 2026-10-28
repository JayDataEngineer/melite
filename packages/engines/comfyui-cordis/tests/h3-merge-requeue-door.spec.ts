/**
 * THE MERGE-SEAT H3 REQUEUE DOOR WALL (2026-10-28 retest gap 3: "an
 * estate bench run in requeue mode stops after scene 1 with the
 * handoff pending and nothing re-queues it").
 *
 * The driver (driveH3ChainRequeue) was born on the single-prompt
 * seat — but EVERY estate run rides the MERGED path
 * (executeFlowInner: runs → engines seat → host.executeFlow), which
 * harvested scene 1's terminal entry and declared the run complete
 * with the handoff still pending. The door is now wired at the merge
 * seam itself; this wall rides the REAL executeFlowInner, the REAL
 * submit/wait doors and the REAL driver — only the transport,
 * upload, outputs and config seams are mocked.
 *
 * Arms (each its own firing arm — the split-brain lesson):
 *   1. THE DOOR — a two-scene chain: scene 1's terminal hands off,
 *      the merge seat claims, patches the merged graph's LoopStart
 *      to the owed scene, re-submits, and the run resolves only on
 *      the FINAL entry (h3_chain_top_level_complete); the harvest
 *      reads the final film's outputs.
 *   2. THE ADDITIVE LAW — a non-chain merged graph submits once and
 *      touches no handoff route (the estate never sees the driver).
 */
import { describe, expect, it, vi } from "vitest";
import assert from "node:assert/strict";

type Json = Record<string, unknown>;

/** Every graph the submit door received — the patched re-submission
 *  is proven by inspection, not by trusting the route order. */
const submittedGraphs: Array<Record<string, Json>> = [];
const submittedIds: string[] = [];
/** Every handoff-route call, in order (path only — the driver's own
 *  wall already pins bodies and accepted_prompt_id). */
const handoffRoutes: string[] = [];
/** The outputs each stage harvest received, by call order — the
 *  FINAL-entry law (the film assembles only at the last scene). */
const harvestOutputs: Json[] = [];
let promptSeq = 0;
/** prompt id → its terminal history entry (populated at submit: the
 *  engine "finishes" instantly; waitTerminal then reads /history). */
const history: Record<string, Json> = {};

/** The scene-1 terminal entry: the requeue row the pack's Loop End
 *  emits on a top_level_requeue prompt. */
const sceneOneEntry = (): Json => ({
  status: { status_str: "success" },
  outputs: {
    "film::MiniMaxH3ChainLoopEnd.0": {
      h3_chain_top_level_requeue: [{
        run_name: "estate_door", handoff_id: "next_scene_0002_abcd",
        predecessor_scene: 1, scene: 2, end_clip: 2,
        workflow_fingerprint: "fp", transition_key: "tk",
      }],
    },
    "film::Segment": { images: ["/scene-1.mp4"] },
  },
});

/** The final entry: h3_chain_top_level_complete + the assembled film. */
const completeEntry = (): Json => ({
  status: { status_str: "success" },
  outputs: {
    "film::MiniMaxH3ChainLoopEnd.0": {
      h3_chain_top_level_complete: [{
        run_name: "estate_door", scene: 2, end_clip: 2,
        workflow_fingerprint: "fp", working_branch_id: "main",
      }],
    },
    "film::Segment": { images: ["/the-film.mp4"] },
  },
});

vi.mock("../src/comfyui-transport.ts", () => ({
  withBound: (work: () => Promise<unknown>): Promise<unknown> => work(),
  sdkClient: () => ({
    clientId: "merge-seat-client",
    queuePrompt: async (_n: number, body: { prompt?: unknown }): Promise<Json> => {
      submittedGraphs.push(body.prompt as Record<string, Json>);
      const id = "p-" + String(++promptSeq);
      submittedIds.push(id);
      // the engine executes instantly: the entry this prompt will
      // leave in history is fixed at submit time
      history[id] = id === "p-1" ? sceneOneEntry() : completeEntry();
      return { prompt_id: id };
    },
    fetchApi: async (path: string): Promise<{ json(): Promise<unknown> }> => {
      if (path === "/queue") {
        return { json: async () => ({ queue_running: [], queue_pending: [] }) };
      }
      if (path.startsWith("/history")) {
        return { json: async () => history };
      }
      if (path.includes("/minimax_h3_context_loop/handoffs/")) {
        handoffRoutes.push(path);
        if (path.endsWith("/handoffs/claim")) {
          return { json: async () => ({ handoff: {
            run_name: "estate_door", handoff_id: "next_scene_0002_abcd",
            scene: 2, start_clip: 2, scene_range: "2", end_clip: 2,
            status: "claimed",
          } }) };
        }
        return { json: async () => ({ handoff: { status: "ok" } }) };
      }
      return { json: async () => ({ error: "no route fixture for " + path }) };
    },
    interrupt: async (): Promise<void> => {},
    on: (): (() => void) => (): void => {},
    connect: async (): Promise<void> => {},
    close: (): void => {},
  }),
}));

vi.mock("../src/comfyui-upload.ts", () => ({
  // the staged graph IS the merged graph — the patch must ride the
  // graph the merge actually submits
  uploadReferenced: async (_c: unknown, graph: Record<string, Json>) => ({ graph }),
}));

vi.mock("../src/comfyui-outputs.ts", () => ({
  mapHistoryEntry: () => ({ kind: "completed" }),
  fetchOutputArtifacts: async (
    _d: unknown, _s: unknown, opts: { outputs?: unknown },
  ): Promise<[]> => {
    harvestOutputs.push((opts.outputs ?? {}) as Json);
    return [];
  },
  publishOutputChannels: (outputs: Json): Json => ({ ...outputs }),
  assertPublishedOutputChannels: (): void => {},
  qvoicePathsOf: (): string => "",
  loudnessOf: (): null => null,
  qvoiceFreshnessOf: (): null => null,
  normalizeTimeoutS: (v: unknown): number =>
    typeof v === "number" && v > 0 ? v : 2400,
  fetchOutputs: async (): Promise<[]> => [],
}));

vi.mock("../src/comfyui-config.ts", () => ({
  resolveEngineBaseUrl: (): string => "http://merge-seat:8188",
}));

import { executeFlowInner } from "../src/comfyui-merge.ts";
import { ACTIVE } from "../src/comfyui-types.ts";
import type { EngineJson, MergeRow } from "../src/comfyui-types.ts";

const chainRow = (): MergeRow => ({
  stageId: "film",
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

async function runFlow(rows: MergeRow[]): Promise<{
  stages: Record<string, { outputs: Json; artifacts: string[] }>;
  promptId: string;
  replaySuspect: boolean;
}> {
  return executeFlowInner(
    rows, "/runs/estate-door", {}, {}, {}, "http://merge-seat:8188", ACTIVE,
  ) as unknown as Promise<{
    stages: Record<string, { outputs: Json; artifacts: string[] }>;
    promptId: string;
    replaySuspect: boolean;
  }>;
}

describe("the merge-seat H3 requeue door (estate runs finish the chain)", () => {
  it("drives a two-scene chain to the complete entry and harvests the final film", async (): Promise<void> => {
    const result = await runFlow([chainRow()]);
    // TWO prompts: scene 1's terminal + the owed scene's — the estate
    // run resolves only after the second
    assert.equal(submittedIds.length, 2, "scene 1's handoff must re-queue scene 2: " + JSON.stringify(submittedIds));
    // the choreography rode the pack's own routes: claim, queued, consumed
    const routes = handoffRoutes.map((p) => p.split("/").pop());
    assert.deepEqual(routes, ["claim", "transition", "transition"],
      "claim → queued → consumed in order: " + JSON.stringify(routes));
    // the re-submitted graph is the MERGED graph, patched at LoopStart
    const second = submittedGraphs[1]!;
    const startKey = Object.keys(second).find((k) => k.endsWith("MiniMaxH3ChainLoopStart.0"));
    assert.ok(startKey !== undefined, "the merged LoopStart survives namespacing");
    const startClip = (second[startKey]!["inputs"] as Json)["start_clip"];
    assert.equal(startClip, 2, "the owed scene (2) must ride start_clip, got " + String(startClip));
    assert.equal((second[startKey]!["inputs"] as Json)["scene_range"], "2");
    const endKey = Object.keys(second).find((k) => k.endsWith("MiniMaxH3ChainLoopEnd.0"));
    assert.ok(endKey !== undefined, "the merged LoopEnd survives namespacing");
    // the harvest read the FINAL entry — the film, not scene 1 (the
    // merge strips the stage prefix when slicing subOutputs)
    assert.equal(harvestOutputs.length, 1, "one stage, one harvest");
    const images = (harvestOutputs[0]!["Segment"] as Json)["images"];
    assert.deepEqual(images, ["/the-film.mp4"],
      "the estate run's artifacts are the assembled film's");
    // the run's engine ref stays the ORIGIN prompt (the run seat's law)
    assert.equal(result.promptId, "p-1");
    assert.ok(Object.keys(result.stages).includes("film"));
  });

  it("leaves non-chain merged graphs untouched (the additive law)", async (): Promise<void> => {
    handoffRoutes.length = 0;
    const before = submittedIds.length;
    const plain = chainRow();
    delete (plain.workflow as Json)["MiniMaxH3ChainLoopEnd.0"];
    history["p-" + String(promptSeq + 1)] = {
      status: { status_str: "success" },
      outputs: { "film::Segment": { images: ["/plain.mp4"] } },
    };
    await runFlow([plain]);
    assert.equal(submittedIds.length, before + 1, "one submit, no requeue");
    assert.deepEqual(handoffRoutes, [], "no handoff route may fire for a non-chain graph");
  });
});
