// claim-lane-yet-face.spec.ts — the claim-time lane re-probe's YET
// face, in its own file because the face's premise is process-scoped:
// the models table is lazy (tests/helpers/boot-models.ts owns the
// boot law) and this file deliberately never imports it, so the
// re-probe's getModel throws the TABLE's own refusal — the shape a
// still-booting engine answers with. The probe must stand down (no
// standing to refuse); the NEVER face — a booted table answering a
// real store miss — is pinned in runs-registry-doors.spec.ts.
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { it } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import { ComfyUIHostService } from "@melite/comfyui-cordis";
import type { FlowResult, MergeRow, EngineJson } from "@melite/comfyui-cordis";
import { RunsRuntimeService } from "../src/runsRegistry.ts";
import { QueueCore } from "../src/queue.ts";
import { FlowsSeatService } from "../src/flowsData.ts";

const sig = (): AbortSignal => new AbortController().signal;

class FakeEngine extends ComfyUIHostService {
  constructor(ctx: Context) {
    super(ctx as unknown as never, {});
  }
  override executeFlow(rows: MergeRow[]): Promise<FlowResult> {
    return Promise.resolve({
      stages: Object.fromEntries(rows.map((r) => [r.stageId, { outputs: {}, artifacts: [] }])),
      promptId: "p",
    });
  }
}

it("THE RE-PROBE'S YET FACE: an unbooted model table throws the table's own refusal at claim — the probe stands down and the run proceeds, never a false lane-refusal on a still-booting engine", async () => {
  // the gate ARMED (fixture endpoint, empty mount) — only the table's
  // boot state separates this face from the never face
  const dir = join(tmpdir(), "melite-claim-yet-" + process.pid);
  const cfgPath = join(dir, "endpoint.json");
  mkdirSync(dir, { recursive: true });
  writeFileSync(cfgPath, JSON.stringify({ url: "http://127.0.0.1:8188", model_base_path: dir }));
  const prevCfg = process.env["COMFYUI_ENDPOINT_CONFIG"];
  const prevSbx = process.env["INFERENCE_TEST_SANDBOX"];
  const prevRoot = process.env["MELITE_REPO_ROOT"];
  process.env["COMFYUI_ENDPOINT_CONFIG"] = cfgPath;
  delete process.env["INFERENCE_TEST_SANDBOX"];
  process.env["MELITE_REPO_ROOT"] = dir;
  try {
    const state = join(dir, "state");
    const ctx = new Context();
    new FlowsSeatService(ctx);
    const core = new QueueCore();
    (ctx as unknown as { queue: unknown }).queue = {
      core,
      stateRoot: state,
      get stateRoots(): string[] {
        return [state];
      },
    };
    (ctx as unknown as { draftsRemote: unknown }).draftsRemote = {
      get: async (id: string): Promise<unknown> => ({ id }),
    };
    (ctx as unknown as { cardRegistry: unknown }).cardRegistry = {
      objectInfo: (): unknown => null,
      defsSync: (): unknown => new Map(),
      modelFacts: (): unknown => ({}),
      resolveCardFamily: (mid: unknown): unknown => mid,
      modelMids: (): unknown => new Set<string>(),
      cardDecls: (): unknown => ({}),
      composeValidateCard: async (): Promise<unknown> => null,
      primeObjectInfo: async (): Promise<boolean> => true,
      phase1Card: async (): Promise<unknown> => ({
        mid: "z-image",
        fam: "z-image",
        card: "image-gen",
        spell: null,
        params: {},
      }),
      phase2Card: async (): Promise<unknown> => ({
        graph: { "9": { class_type: "EmptySD3LatentImage", inputs: {} } },
        outputs: {},
        outputNodes: { default: "9" },
      }),
      stateRoots: (): string[] => [state],
    };
    new FakeEngine(ctx);
    const svc = new RunsRuntimeService(ctx as unknown as Context);

    // the table's own refusal, named before the pump ever sees it:
    // the probe's raw voice is a PLAIN throw, never a
    // lane_input_missing CardArmError — that difference IS the
    // yet/never split the pump's catch rides
    const { lanePresenceRefusal } = await import("../src/cardsLanes.ts");
    let threw: unknown;
    try {
      lanePresenceRefusal("z-image");
    } catch (e) {
      threw = e;
    }
    assert.ok(threw !== undefined, "the unbooted table throws");
    assert.equal((threw as { name?: string }).name, "ModelError");
    assert.doesNotMatch(
      String((threw as Error).message),
      /lane_input_missing|no store copy exists/,
      "the table's refusal never wears the lane voice",
    );

    const ans = await svc.start(
      { draft_id: "d1", test: false, model: "z-image", params: {} },
      sig(),
    );
    for (let i = 0; i < 500; i++) {
      const row = core.runs.get(ans.run_id) as { status?: string; error?: string } | undefined;
      if (row !== undefined && row.status !== "queued" && !svc.pumping) {
        assert.notEqual(row.status, "failed", "yet never fails the run: " + String(row.error));
        assert.doesNotMatch(String(row.error ?? ""), /lane presence/);
        return;
      }
      await new Promise((r) => setTimeout(r, 10));
    }
    throw new Error("pump never settled " + ans.run_id);
  } finally {
    if (prevCfg === undefined) delete process.env["COMFYUI_ENDPOINT_CONFIG"];
    else process.env["COMFYUI_ENDPOINT_CONFIG"] = prevCfg;
    if (prevSbx === undefined) delete process.env["INFERENCE_TEST_SANDBOX"];
    else process.env["INFERENCE_TEST_SANDBOX"] = prevSbx;
    if (prevRoot === undefined) delete process.env["MELITE_REPO_ROOT"];
    else process.env["MELITE_REPO_ROOT"] = prevRoot;
    rmSync(dir, { recursive: true, force: true });
  }
});
