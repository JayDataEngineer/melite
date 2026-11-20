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
import { LifecycleLatch } from "../../../../packages/harness/estate-queue/src/lifecycleLatch.ts";
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
        lifecycleLatch: new LifecycleLatch(),
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

  it("ARM 7 THE WRITE DOOR (the F41 re-press unblock, 2026-11-14): the reserved stage-policy keys AUTHOR — the bench add door's admission lifts them out of the card walk, the stored row keeps the bag verbatim, the judge keeps its teeth on every non-reserved unknown, and a declared reserved key stays judged", { timeout: 120_000 }, async () => {
    // THE UNCOVERED HOP, CLOSED (the F41 re-press finding): ARM 6
    // seats its knob-carrying doc through a STUBBED draftsRemote —
    // the compose plane was walled, the WRITE plane never was. Every
    // authored bench row (add, add-stages, patch, load) funnels
    // through admitStageRelations, whose dry card compose judged the
    // reserved keys as undeclared card params: the knob could be
    // COMPOSED but never AUTHORED — the live trellis re-press died at
    // each write door with the unknown-param refusal while the
    // validate walk admitted the same row. The cure lifts the
    // STAGE-RESERVED set (minus a card's own declared reserved key)
    // out of the judged view at the same predicate the run carry
    // rides (cardsFacts stageReservedKeyLifts). THIS arm crosses the
    // real write door end to end: BenchRemoteService over the drafts
    // domain with the REAL booted card registry — the row lands in
    // storage or the wall is a lie. Toggling the lift OUT of
    // admitStageRelations reds the first assertion with the live
    // press's own voice (bench/lane-refusal, the compose-door
    // unknown-param text) while ARM 6 stays green — that contrast is
    // the receipt.
    const { Context } = await import("@deepseek-ai/cordis");
    const { CardRegistryService } = await import(
      "../../../../packages/harness/estate-queue/src/cardsRegistry.ts"
    );
    const { FlowsSeatService } = await import(
      "../../../../packages/harness/estate-queue/src/flowsData.ts"
    );
    const { cardAdmits, stageReservedKeyLifts } = await import(
      "../../../../packages/harness/estate-queue/src/cardsFacts.ts"
    );
    const { loadCardDefs } = await import("@melite/comfyui-cordis");
    const { installLaneStoreOverlay, restoreLaneStoreOverlay } = await import(
      "../../../helpers/lane-store-overlay.ts"
    );
    const { bootCtx, sig } = await import(
      "../../../../packages/estate/drafts/tests/bench-helpers.ts"
    );
    const { BenchRemoteService } = await import("@melite/estate-drafts");
    const { mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");

    const { ctx } = await bootCtx();
    new FlowsSeatService(ctx);
    (ctx as unknown as { queue: unknown }).queue = {
      stateRoot: mkdtempSync(join(tmpdir(), "boundary-write-door-")),
      stateRoots: [] as string[],
    };
    const reg = new CardRegistryService(ctx);
    await reg.prime();
    await loadCardDefs();
    installLaneStoreOverlay();
    const session = "boundary-write-door";
    try {
      const bench = new BenchRemoteService(ctx);
      await bench.ensure({ session, author: "agent" }, sig);
      const rev = (await bench.get(session, sig)).rev as number;

      // THE KNOB AUTHORS through the real add door (rig — the
      // journey arm's own keyless card; the lift is card-generic).
      const row = await bench.addStage(session, {
        card: "rig",
        params: { boundary_unload_models: true, vram_budget_mb: 2048 },
        expect_rev: rev,
      }, sig);
      expect(row.stage, "the knob row lands").toBe("s_0");

      // THE STORE IS ITS TRUTH HOME: the stored doc keeps the
      // reserved bag verbatim — admission's judged copy sheds the
      // policy keys, storage never does.
      const stored = ((await bench.get(session, sig)).stages as Array<Record<string, unknown>>)
        .find((s) => s["id"] === "s_0") as { params: Record<string, unknown> };
      expect(stored.params["boundary_unload_models"], "the knob rides the stored row verbatim").toBe(true);
      expect(stored.params["vram_budget_mb"], "the whole reserved set authors, not a key list").toBe(2048);
      const rev2 = (await bench.get(session, sig)).rev as number;

      // THE JUDGE KEEPS ITS TEETH: a NON-reserved unknown (the knob,
      // mistyped) refuses with the live press's own voice — the lift
      // is the reserved set, never a blind pass.
      const refusal = await bench.addStage(session, {
        card: "rig",
        params: { boundary_unload_modles: true },
        expect_rev: rev2,
      }, sig).then(
        () => null,
        (e: unknown) => e as { code?: string; message?: string },
      );
      expect(refusal, "the non-reserved unknown still refuses").not.toBeNull();
      expect(refusal?.code, "the write door's refusal code").toBe("bench/lane-refusal");
      expect(String(refusal?.message ?? "")).toMatch(/unknown param\(s\) on the rig card: boundary_unload_modles/);
      expect(
        ((await bench.get(session, sig)).stages as unknown[]).length,
        "the refused row never lands",
      ).toBe(1);

      // THE DECLARED-KEY SPARING (the predicate's own truth, the run
      // carry's mirror): h3-timeline DECLARES output_name on its own
      // carrier, so that reserved key is the card's param — it does
      // NOT lift and stays judged — while the undeclared policy keys
      // keep lifting on the same card (the live press's row class).
      const h3Decl = reg.cardDecls()["h3-timeline"];
      expect(h3Decl, "the h3-timeline decl projects").toBeDefined();
      expect(cardAdmits(h3Decl, new Set(), "output_name"),
        "the sparing arm cannot pass vacuously — h3 declares output_name (queue 12's file plane)").toBe(true);
      expect(stageReservedKeyLifts(h3Decl, "output_name"),
        "a declared reserved key is the card's own param — judged, never lifted").toBe(false);
      expect(stageReservedKeyLifts(h3Decl, "boundary_unload_models"),
        "the undeclared knob lifts on the live press's own card").toBe(true);
    } finally {
      restoreLaneStoreOverlay();
    }
  });

  it("ARM 7b THE PRE-MINT GATE (the F41 re-press finding's second seat): with the runs seat LIVE the bench add door's compose gate (composeVerdictOf → the validate walk's phase1Card) lifts the reserved keys too — the knob row lands through BOTH write-door judges", { timeout: 240_000 }, async (itCtx) => {
    // The live press's second refusal: with the lane admission cured
    // the add door STILL refused — bench/compile-refused, the
    // pre-mint compose gate riding the validate walk, which judged
    // the RAW bag while the run compose lifts before its own
    // phase1Card. The registry-less boot of ARM 7 never crosses this
    // seat (composeVerdictOf returns undefined with no runs seat) —
    // this arm seats the runs service like the live lane. Toggling
    // the lift OUT of runsValidateArms reds the landing assertion
    // with the live press's second voice (bench/compile-refused,
    // card_compose phase 1) — the seat-naming receipt.
    const ctxSkip = (): void => itCtx.skip();
    const { Context } = await import("@deepseek-ai/cordis");
    const { CardRegistryService } = await import(
      "../../../../packages/harness/estate-queue/src/cardsRegistry.ts"
    );
    const { FlowsSeatService } = await import(
      "../../../../packages/harness/estate-queue/src/flowsData.ts"
    );
    const { RunsRuntimeService } = await import(
      "../../../../packages/harness/estate-queue/src/runsRegistry.ts"
    );
    const { QueueCore } = await import("../../../../packages/harness/estate-queue/src/queue.ts");
    const { ComfyUIHostService } = await import(
      "../../../../packages/engines/comfyui-cordis/src/comfyui.ts"
    );
    const { loadCardDefs } = await import("@melite/comfyui-cordis");
    const { installLaneStoreOverlay, restoreLaneStoreOverlay } = await import(
      "../../../helpers/lane-store-overlay.ts"
    );
    const { bootCtx, sig } = await import(
      "../../../../packages/estate/drafts/tests/bench-helpers.ts"
    );
    const { BenchRemoteService } = await import("@melite/estate-drafts");
    const { mkdtempSync, mkdirSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");

    const dir = mkdtempSync(join(tmpdir(), "boundary-premint-"));
    const { ctx } = await bootCtx();
    new FlowsSeatService(ctx);
    const core = new QueueCore();
    const state = join(dir, "state");
    mkdirSync(state, { recursive: true });
    (ctx as unknown as { queue: unknown }).queue = {
      core,
      stateRoot: state,
      get stateRoots(): string[] { return [state]; },
    };
    class FakeEngine extends ComfyUIHostService {
      constructor(c: Context) {
        super(c as unknown as never, {});
      }
    }
    new FakeEngine(ctx);
    const reg = new CardRegistryService(ctx);
    await reg.prime();
    await loadCardDefs();
    installLaneStoreOverlay();
    // THE LIVE CENSUS (ARM 6's own law): the dry compose refuses
    // closed without it; skip loud when the seat's engine is down.
    if (!(await reg.primeObjectInfo(10_000))) {
      console.warn("ARM 7b skipped loud: the seat's engine is down — the live census cannot arm");
      restoreLaneStoreOverlay();
      ctxSkip();
      return;
    }
    new RunsRuntimeService(ctx);
    const session = "boundary-premint";
    try {
      const bench = new BenchRemoteService(ctx);
      await bench.ensure({ session, author: "agent" }, sig);
      const rev = (await bench.get(session, sig)).rev as number;
      // the producer's source path is a verified run source — real
      // bytes on disk, never rendered (the fake engine executes
      // nothing; ARM 6's own law)
      const { writeFileSync } = await import("node:fs");
      writeFileSync(join(dir, "producer-mesh.glb"), "glb-placeholder\n");
      const row = await bench.addStage(session, {
        card: "rig",
        params: { mesh_glb: join(dir, "producer-mesh.glb"), boundary_unload_models: true },
        expect_rev: rev,
      }, sig);
      expect(row.stage, "the knob row lands through BOTH judges — the lane admission and the pre-mint compose gate").toBe("s_0");
      const stored = ((await bench.get(session, sig)).stages as Array<Record<string, unknown>>)
        .find((s) => s["id"] === "s_0") as { params: Record<string, unknown> };
      expect(stored.params["boundary_unload_models"], "the stored row keeps the knob verbatim past the pre-mint gate").toBe(true);
    } finally {
      restoreLaneStoreOverlay();
    }
  });
});
