// merge-unload-boundary.spec.ts — THE PASS SEAM'S WALL (F41, 2026-11-01;
// registry row gates-merge-unload-boundary, gates tier).
//
// The contract: planMerge's pass 2.5 splices ONE MeliteBoundary per
// distinct FromStage producer onto every wired stage-A → stage-B
// seam, and the splice does NOTHING ELSE. The merged bench pass is
// ONE prompt (one POST /prompt), and ComfyUI executes only nodes
// reachable from output nodes — an unwired boundary between stages
// is pruned, never executed (the dead-island finding). The boundary
// therefore rides IN the tensor path: the downstream stage's
// consuming slot resolves THROUGH the boundary's wildcard `through`,
// so B's output-reachable subgraph pulls the boundary in and the DAG
// proves the eviction executes after every node the producer depends
// on and before every consumer of the seam tensor.
//
// OOM IS NOT A FINDING here: the boundary is the GRAPH's own memory
// policy (the film tail's law generalized), never an estate-driven
// eviction — no /free, no sequential submit; the VRAM headroom gate
// still owns the pre-submit proof. This wall judges the SPLICE, pure
// over EngineJson — it needs no engine, no object_info, no GPU.
//
// Arms (each fires on its OWN path — the split-brain lesson):
//   1 PRESENCE — the real wired door merges exactly one boundary.
//   2 POSITION — B's slot resolves THROUGH the boundary; the
//     boundary's through IS the producer.
//   3 SHAPE PURITY — the splice adds nodes, never edits one
//     (the no-addition law restated exactly where the seam comment
//     pre-authorized its restatement).
//   4 NO-VIBE — an unwired stage pair mints ZERO boundaries.
//   5 THE KNOB — boundary_unload_models rides from the DOWNSTREAM
//     stage's row params; absent = false.
//   6 THE JOURNEY (F-C, 2026-11-13) — the knob rides the REAL compose
//     door: estate start composes the card stages, the composed row's
//     params carry the reserved key (the carry is additive), and the
//     executor's own rows merge the boundary ARMED. The compose-plane
//     hop ARM 5's stand-in rows never crossed.
import { beforeEach, describe, expect, it } from "vitest";
import { planMerge } from "../../../../packages/engines/comfyui-cordis/src/comfyui-merge.ts";
import type { MergeRow } from "../../../../packages/engines/comfyui-cordis/src/comfyui-merge.ts";
import {
  addStageBench,
  ensureBench,
  getBench,
} from "../../../../packages/estate/drafts/src/bench.ts";
import { boot } from "../../../../packages/estate/drafts/tests/bench-helpers.ts";

/** The compose step, mirroring runsStart's translation (the same
 *  written-out shape bench-wire-chain.spec.ts carries — if the bench
 *  ever stores a third wiring shape, both files break together). */
const inputNamesOf = (
  stages: ReadonlyArray<Record<string, unknown>>,
): Record<string, Record<string, string>> => {
  const out: Record<string, Record<string, string>> = {};
  for (const st of stages) {
    const ins = st["inputs"];
    if (typeof ins !== "object" || ins === null || Array.isArray(ins)) continue;
    const names: Record<string, string> = {};
    for (const [name, ref] of Object.entries(ins as Record<string, unknown>)) {
      const r = ref as Record<string, unknown>;
      if (typeof r?.["stage"] === "string") {
        names[name] = String(r["stage"]) + "." + String(r["output"]);
      }
    }
    out[String(st["id"])] = names;
  }
  return out;
};

/** A compiled stand-in for one stage (the bench-wire-chain pattern):
 *  the Save that publishes the image, plus the consuming node when
 *  the stage is wired. The row's params ride VERBATIM — the knob is
 *  a row param, and the store is its truth home. The consuming
 *  class is deliberately NOT `Load*` (a producer link may only land
 *  in a tensor slot; the ROW-4 gate would measure instead of the
 *  seam). */
const compiled = (
  stageId: string,
  spelled: readonly string[],
  params: Record<string, unknown> = {},
): MergeRow =>
  ({
    stageId,
    workflow: {
      save: { class_type: "SaveImage", inputs: {} },
      ...(spelled.length === 0
        ? {}
        : {
            n: {
              class_type: "TensorSink",
              inputs: Object.fromEntries(spelled.map((s) => [s, "$" + s])),
            },
          }),
    },
    params,
    outputs: { image: "png" },
    outputNodes: {},
  }) as unknown as MergeRow;

const stagesOf = (bench: unknown): Array<Record<string, unknown>> =>
  (bench as { stages: Array<Record<string, unknown>> }).stages;

const boundaryKeysOf = (wf: Record<string, unknown>): string[] =>
  Object.keys(wf).filter((k) => k.startsWith("__unload$"));

describe("THE PASS SEAM'S WALL (F41): the merged plan carries the unload boundary, and only where the DAG states a seam", () => {
  let drafts: Awaited<ReturnType<typeof boot>>;

  beforeEach(async () => {
    drafts = await boot();
  });

  it("ARM 1 PRESENCE: the real wired door merges to EXACTLY one MeliteBoundary keyed __unload$0 — the key set is the namespaced union + the boundaries", async () => {
    await ensureBench(drafts, { session: "s" });
    await addStageBench(drafts, "s", { card: "image-gen", expect_rev: 0 });
    await addStageBench(drafts, "s", {
      card: "image-edit",
      expect_rev: 1,
      params: { prompt: "zoom out", image1: "$image" },
      inputs: { image: { stage: "s_0", output: "image" } },
    });
    const stages = stagesOf(getBench(drafts, "s"));
    const plan = planMerge(
      [compiled("s_0", []), compiled("s_1", ["image"])],
      {},
      inputNamesOf(stages),
    );
    const keys = Object.keys(plan.workflow);
    const boundaries = boundaryKeysOf(plan.workflow);
    expect(
      boundaries,
      "no MeliteBoundary at the s_0→s_1 seam — the splice is out (or it minted nothing on a wired plan)",
    ).toEqual(["__unload$0"]);
    const boundary = plan.workflow["__unload$0"] as Record<string, unknown>;
    expect(boundary["class_type"]).toBe("MeliteBoundary");
    // the STAGE keys stay exactly the namespaced union — the splice
    // grew the graph, it did not rename or swallow a stage node
    expect(keys.filter((k) => !k.startsWith("__unload$")).sort()).toEqual(
      ["s_0::save", "s_1::n", "s_1::save"].sort(),
    );
    expect(keys.length).toBe(4);
  });

  it("ARM 2 POSITION: the eviction executes after every node the producer depends on and before every consumer of the seam tensor — B's consuming slot's link source IS __unload$0 and the boundary's through IS [s_0::save, 0]", async () => {
    await ensureBench(drafts, { session: "s" });
    await addStageBench(drafts, "s", { card: "image-gen", expect_rev: 0 });
    await addStageBench(drafts, "s", {
      card: "image-edit",
      expect_rev: 1,
      params: { prompt: "zoom out", image1: "$image" },
      inputs: { image: { stage: "s_0", output: "image" } },
    });
    const stages = stagesOf(getBench(drafts, "s"));
    const plan = planMerge(
      [compiled("s_0", []), compiled("s_1", ["image"])],
      {},
      inputNamesOf(stages),
    );
    const sink = (plan.workflow["s_1::n"] as Record<string, { inputs: Record<string, unknown> }>)
      .inputs;
    expect(
      sink["image"],
      "s_1::n.image resolves [s_0::save, 0] directly — the seam carries no boundary, " +
        "so the eviction is either absent or a pruned dead island (never executed)",
    ).toEqual(["__unload$0", 0]);
    expect(
      (plan.workflow["__unload$0"] as Record<string, { inputs: Record<string, unknown> }>).inputs[
        "through"
      ],
      "the boundary's through lost the producer — the seam's eviction would not sit after stage A's compute",
    ).toEqual(["s_0::save", 0]);
  });

  it("ARM 3 SHAPE PURITY: the splice adds nodes, never edits one — every STAGE node keeps its source's keys/class_type/_meta verbatim, and no boundary sits inside a stage namespace", async () => {
    await ensureBench(drafts, { session: "s" });
    await addStageBench(drafts, "s", { card: "image-gen", expect_rev: 0 });
    await addStageBench(drafts, "s", {
      card: "image-edit",
      expect_rev: 1,
      params: { prompt: "zoom out", image1: "$image" },
      inputs: { image: { stage: "s_0", output: "image" } },
    });
    const stages = stagesOf(getBench(drafts, "s"));
    const rows = [
      compiled("s_0", []),
      compiled("s_1", ["image"], { prompt: "zoom out", image1: "$image" }),
    ];
    const plan = planMerge(rows, {}, inputNamesOf(stages));
    for (const r of rows) {
      for (const [nid, srcNode] of Object.entries(
        r.workflow as Record<string, Record<string, unknown>>,
      )) {
        const key = `${r.stageId}::${nid}`;
        const mergedNode = plan.workflow[key] as Record<string, unknown>;
        expect(mergedNode, `${key} vanished`).toBeTruthy();
        expect(
          Object.keys(mergedNode).sort(),
          `${key}: the splice edited a stage node's top-level keys`,
        ).toEqual(Object.keys(srcNode).sort());
        expect(mergedNode["class_type"], `${key}: class_type edited`).toBe(
          srcNode["class_type"],
        );
        const mergedInputs = (mergedNode["inputs"] ?? {}) as Record<string, unknown>;
        const srcInputs = (srcNode["inputs"] ?? {}) as Record<string, unknown>;
        expect(
          Object.keys(mergedInputs).sort(),
          `${key}: the splice edited a stage node's input keys`,
        ).toEqual(Object.keys(srcInputs).sort());
      }
    }
    // the boundary keys live ONLY in the reserved namespace — a
    // boundary keyed inside a stage namespace ("s_1::__unload$0",
    // any "::"-carrying key) is the splice editing a stage's
    // namespace, and this arm reds on it
    for (const key of Object.keys(plan.workflow)) {
      if (key.includes("::")) {
        expect(
          (plan.workflow[key] as Record<string, unknown>)["class_type"],
          `${key}: a MeliteBoundary keyed inside a stage namespace — the splice edited a stage's namespace`,
        ).not.toBe("MeliteBoundary");
      }
    }
    for (const key of boundaryKeysOf(plan.workflow)) {
      expect(key).toMatch(/^__unload\$\d+$/);
      expect(Object.keys((plan.workflow[key] as Record<string, { inputs: Record<string, unknown> }>).inputs).sort())
        .toEqual(["through", "unload_models"]);
    }
  });

  it("ARM 4 NO-VIBE BOUNDARIES: an unwired two-stage plan carries ZERO boundaries — the DAG states the seam; a splice on vibes reds", async () => {
    await ensureBench(drafts, { session: "s" });
    await addStageBench(drafts, "s", { card: "image-gen", expect_rev: 0 });
    await addStageBench(drafts, "s", { card: "image-edit", expect_rev: 1 });
    const stages = stagesOf(getBench(drafts, "s"));
    expect(stages[1]!["inputs"]).toEqual({});
    const plan = planMerge(
      [compiled("s_0", []), compiled("s_1", [])],
      {},
      inputNamesOf(stages),
    );
    expect(
      boundaryKeysOf(plan.workflow),
      "an unwired stage pair grew a boundary — there is NO provable seam for it to sit in, " +
        "so it would prune (dead island) or evict at an unprovable position",
    ).toEqual([]);
    expect(Object.keys(plan.workflow).sort()).toEqual(["s_0::save", "s_1::save"]);
  });

  it("ARM 5 THE KNOB: boundary_unload_models:true on the DOWNSTREAM stage's row rides the boundary's inputs.unload_models; absent = false", async () => {
    await ensureBench(drafts, { session: "s" });
    await addStageBench(drafts, "s", { card: "image-gen", expect_rev: 0 });
    // the stage that starves declares its entry gate on its own row
    // (the store is the param's truth home — read back off disk)
    await addStageBench(drafts, "s", {
      card: "image-edit",
      expect_rev: 1,
      params: { prompt: "zoom out", image1: "$image", boundary_unload_models: true },
      inputs: { image: { stage: "s_0", output: "image" } },
    });
    const stages = stagesOf(getBench(drafts, "s"));
    expect(
      (stages[1]!["params"] as Record<string, unknown>)["boundary_unload_models"],
      true,
    );
    const downstreamParams = stages[1]!["params"] as Record<string, unknown>;
    const wired = planMerge(
      [compiled("s_0", []), compiled("s_1", ["image"], downstreamParams)],
      {},
      inputNamesOf(stages),
    );
    expect(
      (wired.workflow["__unload$0"] as Record<string, { inputs: Record<string, unknown> }>).inputs[
        "unload_models"
      ],
      "the downstream row's knob did not ride the boundary — the trellis-class relief never arms",
    ).toBe(true);
    // absent = false: the film path's own default (soft cache only)
    const quiet = planMerge(
      [compiled("s_0", []), compiled("s_1", ["image"])],
      {},
      inputNamesOf(stages),
    );
    expect(
      (quiet.workflow["__unload$0"] as Record<string, { inputs: Record<string, unknown> }>).inputs[
        "unload_models"
      ],
    ).toBe(false);
    // and the UPSTREAM stage's knob is NOT the knob — the entry gate
    // belongs to the stage that starves
    const wrongSide = planMerge(
      [compiled("s_0", [], { boundary_unload_models: true }), compiled("s_1", ["image"])],
      {},
      inputNamesOf(stages),
    );
    expect(
      (wrongSide.workflow["__unload$0"] as Record<string, { inputs: Record<string, unknown> }>).inputs[
        "unload_models"
      ],
      "the upstream stage's knob armed the seam — the gate reads the DOWNSTREAM row",
    ).toBe(false);
  });

  it("ARM 6 THE JOURNEY (F-C, 2026-11-13): the knob rides the REAL compose door — the estate start composes the card stages, the composed row's params carry the reserved key beside the graph, and the executor's own rows merge the boundary at unload_models=true", { timeout: 240_000 }, async (itCtx) => {
    const ctxSkip = (): void => itCtx.skip();
    // THE UNCOVERED HOP, CLOSED (the F-C finding): ARM 5 feeds
    // planMerge STAND-IN rows whose params carry the knob verbatim —
    // it never crosses the compose plane between the bench store and
    // the merge. The live P7 press died exactly there, twice: the
    // card admission refused the knob as an unknown CARD param, and
    // composeCardStageRow replaced the row's params with
    // {workflow, output_nodes}, dropping the row's own bag. The cure
    // lifts the STAGE-RESERVED keys out of the card walk and carries
    // them onto the composed row additively. THIS arm rides the real
    // doors end to end — engine-less, the executor faked at the seat
    // the worker calls: draftsRemote answers a wired bench doc → the
    // draft door composes BOTH card stages through the REAL admission
    // → the worker maps run.params into MergeRows → those rows reach
    // planMerge. Toggling the reserved-key carry OUT reds THIS arm
    // (the admission refusal the live press caught, verbatim voice)
    // while ARM 5 stays green — that contrast is the receipt.
    const { Context } = await import("@deepseek-ai/cordis");
    const { ComfyUIHostService, planMerge: planMergeReal } = await import(
      "../../../../packages/engines/comfyui-cordis/src/comfyui.ts"
    );
    const { CardRegistryService } = await import(
      "../../../../packages/harness/estate-queue/src/cardsRegistry.ts"
    );
    const { RunsRuntimeService } = await import(
      "../../../../packages/harness/estate-queue/src/runsRegistry.ts"
    );
    const { QueueCore } = await import("../../../../packages/harness/estate-queue/src/queue.ts");
    const { FlowsSeatService } = await import(
      "../../../../packages/harness/estate-queue/src/flowsData.ts"
    );
    const { loadCardDefs } = await import(
      "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts"
    );
    const { installLaneStoreOverlay } = await import("../../../helpers/lane-store-overlay.ts");
    const { mkdtempSync, rmSync, writeFileSync, mkdirSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");

    const dir = mkdtempSync(join(tmpdir(), "merge-boundary-journey-"));
    const cfgPath = join(dir, "endpoint.json");
    // the standing dev engine (the same address the e2e gate owns) —
    // the census the REAL compose judges
    writeFileSync(cfgPath, JSON.stringify({ url: "http://127.0.0.1:8188", model_base_path: dir }));
    const prevCfg = process.env["COMFYUI_ENDPOINT_CONFIG"];
    const prevSbx = process.env["INFERENCE_TEST_SANDBOX"];
    process.env["COMFYUI_ENDPOINT_CONFIG"] = cfgPath;
    process.env["INFERENCE_TEST_SANDBOX"] = "1";
    const captured: Array<Record<string, unknown>> = [];
    let capturedInputNames: Record<string, Record<string, string>> = {};
    try {
      const ctx = new Context();
      new FlowsSeatService(ctx);
      const core = new QueueCore();
      const state = join(dir, "state");
      mkdirSync(state, { recursive: true });
      (ctx as unknown as { queue: unknown }).queue = {
        core,
        stateRoot: state,
        get stateRoots(): string[] {
          return [state];
        },
      };
      // THE WIRED BENCH DOC: rig auto → rig auto (the one card that
      // composes keylessly — its lanes build their own facts), the
      // downstream row declaring the reserved knob ON ITS PARAMS —
      // the seat F41's contract names.
      const benchDoc = {
        id: "bench-journey",
        stages: [
          { id: "s_0", card: "rig", params: { mesh_glb: join(dir, "producer-mesh.glb") } },
          {
            id: "s_1",
            card: "rig",
            inputs: { mesh_glb: { stage: "s_0", output: "default" } },
            expected: { mesh_glb: "mesh" },
            params: { mesh_glb: "$mesh_glb", boundary_unload_models: true },
          },
        ],
      };
      (ctx as unknown as { draftsRemote: unknown }).draftsRemote = {
        get: async (): Promise<unknown> => benchDoc,
      };
      const regSvc = new CardRegistryService(ctx);
      await regSvc.prime();
      await loadCardDefs();
      installLaneStoreOverlay();
      // THE LIVE CENSUS (the extension law — the compose refuses
      // closed without it, and a frozen doc would lie): this arm
      // primes the seat's census off the standing dev engine and
      // SKIPS LOUD when the seat's engine is down — arms 1-5 stay
      // engine-less; the journey is the one arm that rides the real
      // served door.
      if (!(await regSvc.primeObjectInfo(10_000))) {
        console.warn("ARM 6 skipped loud: the seat's engine is down — the live census cannot arm");
        ctxSkip();
        return;
      }

      class FakeEngine extends ComfyUIHostService {
        constructor(c: Context) {
          super(c as unknown as never, {});
        }
        override executeFlow(
          rows: Array<Record<string, unknown>>,
          _runDir: string,
          inputNames: Record<string, Record<string, string>>,
        ): Promise<unknown> {
          captured.push(...rows);
          capturedInputNames = inputNames;
          return Promise.resolve({
            stages: Object.fromEntries(rows.map((r) => [String(r["stageId"]), { outputs: {}, artifacts: [] }])),
            promptId: "p",
          });
        }
      }
      new FakeEngine(ctx);
      const svc = new RunsRuntimeService(ctx);

      // the producer's source path is a verified run source — real
      // bytes on disk, never rendered (the fake engine executes
      // nothing)
      writeFileSync(join(dir, "producer-mesh.glb"), "glb-placeholder\n");
      const ans = await svc.start({ draft_id: "d1", test: false } as never, new AbortController().signal);
      let settled = false;
      for (let i = 0; i < 500; i++) {
        const row = core.runs.get(ans.run_id) as { status?: string; error?: string } | undefined;
        if (row !== undefined && row.status !== "queued" && row.status !== "running") {
          settled = true;
          expect(row.status, "the journey run settles completed: " + String(row.error ?? "")).toBe("completed");
          break;
        }
        await new Promise((r) => setTimeout(r, 10));
      }
      expect(settled, "the journey run settles").toBe(true);
      expect(captured.length).toBe(2);
      const downstream = captured.find((r) => r["stageId"] === "s_1") as {
        params: Record<string, unknown>;
      };
      // THE KNOB SURVIVED COMPOSITION: beside the composed graph, not
      // eaten by the params replacement, never refused by admission.
      expect(
        downstream.params["boundary_unload_models"],
        "the composed row dropped the reserved key — the carry is toggled out (the F-C red)",
      ).toBe(true);
      expect(Object.keys(downstream.params).sort()).toEqual(
        ["boundary_unload_models", "output_nodes", "workflow"],
        "the carry is ADDITIVE — the composed bag carries the graph, its outputs, and the reserved key, nothing else",
      );
      // THE FULL JOURNEY: the executor's own rows reach planMerge and
      // the boundary splices ARMED.
      const wired = planMergeReal(
        captured as unknown as Parameters<typeof planMergeReal>[0],
        {},
        capturedInputNames,
      );
      const boundary = wired.workflow["__unload$0"] as { class_type: string; inputs: Record<string, unknown> };
      expect(boundary.class_type).toBe("MeliteBoundary");
      expect(
        boundary.inputs["unload_models"],
        "the merged boundary armed — the knob reached the node through the REAL compose door",
      ).toBe(true);
    } finally {
      if (prevCfg === undefined) delete process.env["COMFYUI_ENDPOINT_CONFIG"];
      else process.env["COMFYUI_ENDPOINT_CONFIG"] = prevCfg;
      if (prevSbx === undefined) delete process.env["INFERENCE_TEST_SANDBOX"];
      else process.env["INFERENCE_TEST_SANDBOX"] = prevSbx;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
