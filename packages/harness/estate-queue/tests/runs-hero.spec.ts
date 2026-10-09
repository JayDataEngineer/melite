// runs-hero.spec.ts — THE DECLARED HERO (the mask hero defect,
// 2026-10-09): the history/preview hero is gallery[0] (engine
// completion order) — a card that saves secondary same-kind
// artifacts (the mask card's manifest photo beside mask_combined)
// declares its product stem on the DECL (primaryFile) and the
// match moves first. Pure arms only (declaredPrimaryFirst); the
// runOne glue reads the run's cardId against the cached defs.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { Context } from "@deepseek-ai/cordis";
import { ComfyUIHostService } from "@melite/comfyui-cordis";
import type { EngineJson, FlowResult, MergeRow } from "@melite/comfyui-cordis";
import type { EngineStageRow } from "@melite/engine-contract";
import type { RunRecord } from "../src/runsTypes.ts";
import type { RunId } from "../src/queueCore.ts";
import { declaredPrimaryFirst, runOne } from "../src/runsExecute.ts";

class FakeEngine extends ComfyUIHostService {
  onFlow: (
    rows: MergeRow[],
    runDir: string,
    inputNames: Record<string, Record<string, string>>,
    initials: Record<string, EngineJson>,
    opts: { shouldStop?: () => boolean; report?: (updates: Record<string, EngineJson>) => void },
  ) => Promise<FlowResult> = async () => ({ stages: {}, promptId: "p" });

  constructor(ctx: Context) {
    super(ctx, {});
  }

  override executeFlow(
    rows: MergeRow[],
    runDir: string,
    inputNames: Record<string, Record<string, string>>,
    initials: Record<string, EngineJson>,
    opts: { shouldStop?: () => boolean; report?: (updates: Record<string, EngineJson>) => void } = {},
  ): Promise<FlowResult> {
    return this.onFlow(rows, runDir, inputNames, initials, opts);
  }
}

const runWithCard = (cardId: string): RunRecord => ({
  // The fixture brands at its construction door; the id is a fixed
  // label, never minted.
  runId: "run-hero-00000000-00000000" as RunId,
  status: "queued",
  stages: [{ id: "s", name: "s", index: 0, status: "pending", outputs: {}, expected: {} }],
  skippedStages: [],
  artifacts: [],
  error: "",
  draftId: "d",
  dir: "/tmp/run-hero",
  testFlag: false,
  stopFlag: false,
  params: [{ workflow: { "1": { class_type: "X", inputs: {} } } }],
  outputNodes: [{}],
  initials: {},
  createdAt: 1,
  pipeline: "flow_inline",
  graphRows: [],
  cardId,
});

describe("declaredPrimaryFirst (the declared hero)", () => {
  it("the declared stem moves first (the mask shape: manifest finished first, product leads)", () => {
    const out = declaredPrimaryFirst(
      ["mask/mask_manifest_00001_.png", "mask/mask_combined_00001_.png", "mask/instance_00001_.png"],
      "mask_combined",
    );
    assert.equal(out[0], "mask/mask_combined_00001_.png", "mask_combined leads the gallery");
    assert.deepEqual(
      [...out].sort(),
      ["mask/mask_combined_00001_.png", "mask/instance_00001_.png", "mask/mask_manifest_00001_.png"].sort(),
      "the reorder drops nothing",
    );
  });

  it("no stem (or an empty stem) keeps engine order (inline flows + undeclared cards)", () => {
    const names = ["b.png", "a.png"];
    assert.deepEqual(declaredPrimaryFirst(names, undefined), names, "undefined = engine order");
    assert.deepEqual(declaredPrimaryFirst(names, ""), names, "empty = engine order");
  });

  it("no match keeps engine order (never a reorder into nothing)", () => {
    const names = ["mask/mask_manifest_00001_.png", "mask/instance_00001_.png"];
    assert.deepEqual(declaredPrimaryFirst(names, "mask_combined"), names, "a missing hero changes nothing");
  });

  it("an exact or extension stem matches (stem + counter is the engine shape)", () => {
    assert.deepEqual(declaredPrimaryFirst(["b.png", "hero.png"], "hero"), ["hero.png", "b.png"], "exact stem");
    assert.deepEqual(declaredPrimaryFirst(["b.png", "herox_00001_.png"], "hero"), ["b.png", "herox_00001_.png"], "the underscore boundary holds (a longer stem never steals the hero)");
  });

  it("a same-stem figure never steals the product hero", () => {
    const out = declaredPrimaryFirst(
      ["mask/mask_figure_2_00001_.png", "mask/mask_combined_00001_.png"],
      "mask_combined",
    );
    assert.equal(out[0], "mask/mask_combined_00001_.png", "mask_figure_2 starts with mask_ but not mask_combined_");
  });

  it("THE AUDIT'S G8: a stem-sharing LONGER name (the union) never steals the hero — the counter must be digits", () => {
    const out = declaredPrimaryFirst(
      ["mask/mask_combined_union_00001_.png", "mask/mask_figure_1_00001_.png", "mask/mask_combined_00001_.png"],
      "mask_combined",
    );
    assert.equal(out[0], "mask/mask_combined_00001_.png", "mask_combined_union shares the stem but the char after 'mask_combined_' is 'u', not a digit — the exact product stays the hero even ordered LAST");
    assert.equal(out[1], "mask/mask_combined_union_00001_.png", "the union rides beside, never above");
    // and the digit rule still catches the engine counter shape
    const digits = declaredPrimaryFirst(["a.png", "mask/mask_combined_00002_.png"], "mask_combined");
    assert.equal(digits[0], "mask/mask_combined_00002_.png", "stem + digit counter still matches");
  });

  it("THE LIVE SEAM-PROOF'S CATCH (2026-10-09): HARVEST-PREFIXED names — a subfoldered save prefix makes the artifact 'SaveImage.1_mask_combined_00001_.png' — the stem is a bounded TOKEN, never a basename prefix", () => {
    const names = [
      "SaveImage.0_instance_00001_.png",
      "SaveImage.0_instance_00002_.png",
      "SaveImage.1_mask_combined_00001_.png",
    ];
    const out = declaredPrimaryFirst(names, "mask_combined");
    assert.equal(out[0], "SaveImage.1_mask_combined_00001_.png", "the productId leads even from behind a nodeId harvest prefix — engine order alone put the crops first (the defect the seam-proof caught live)");
    // the union stays rejected in the prefixed shape too
    const union = declaredPrimaryFirst(
      ["SaveImage.2_mask_combined_union_00001_.png", "SaveImage.1_mask_combined_00001_.png"],
      "mask_combined",
    );
    assert.equal(union[0], "SaveImage.1_mask_combined_00001_.png", "prefixed union never steals");
    // stem as a bare token still matches (no prefix, no counter)
    assert.equal(declaredPrimaryFirst(["x.png", "mask_combined.png"], "mask_combined")[0], "mask_combined.png", "bare stem + ext");
  });
});

describe("runOne declared-card artifact ordering", () => {
  it("a semantic output binding leads the gallery over engine completion order", async () => {
    const ctx = new Context();
    // J12: the engine submit threads the queue seat's stateRoots
    // manifest (config-named call data — no env seam); the hero rig
    // pins an empty manifest (no chained refs ride these runs).
    (ctx as unknown as { queue: unknown }).queue = { stateRoots: [] as string[] };
    const engine = new FakeEngine(ctx);
    engine.onFlow = async () => ({
      stages: {
        s: {
          outputs: { default: "/tmp/run-hero/film.mp4" },
          artifacts: ["/tmp/run-hero/mix.flac", "/tmp/run-hero/window.mp4", "/tmp/run-hero/film.mp4"],
        },
      },
      promptId: "p",
    });
    const run = runWithCard("h3-timeline");
    await runOne(run, ctx, () => undefined);
    assert.equal(run.status, "completed");
    assert.equal(run.stages[0]?.url, "film.mp4");
    assert.equal((run.stages[0]?.gallery as Array<{ name: string }>)[0]?.name, "film.mp4");
  });

  it("reads the card declaration when a run carries a card id", async () => {
    const ctx = new Context();
    // J12: the engine submit threads the queue seat's stateRoots
    // manifest (config-named call data — no env seam); the hero rig
    // pins an empty manifest (no chained refs ride these runs).
    (ctx as unknown as { queue: unknown }).queue = { stateRoots: [] as string[] };
    const engine = new FakeEngine(ctx);
    engine.onFlow = async () => ({
      stages: {
        s: {
          outputs: {},
          artifacts: ["mask_manifest_00001_.png", "mask_combined_00001_.png"],
        },
      },
      promptId: "p",
    });
    const run = runWithCard("mask");
    await runOne(run, ctx, () => undefined);
    assert.equal(run.status, "completed");
    assert.equal(run.stages[0]?.url, "mask_combined_00001_.png");
  });
});

// ── THE WIRING FENCE (2026-10-10, the operator's law: ON SUBMIT IS
// A HACK — the wall lives in the run seat's pre-flight, on the rows
// it built, before ANY engine action; never an opt threaded through
// one submit call). The behavioural proof: a graph naming a
// class_type the engine's own /object_info does not declare fails
// the run AT THE SEAT — the engine is never called. The doc is
// CONTEXT STATE (the second reseat): each test arms the wiring
// service on its OWN context — no module global, nothing leaks,
// and the fence's ungated walk (the audit's finding: the first cut
// walked only the seat-less path) is proven on the run seat
// itself.
describe("runOne's wiring fence (the schema plane, not a submit opt)", () => {
  it("an unknown class_type fails the run pre-submit, in the wall's voice, never reaching the engine", async () => {
    const { ComfyUIWiringService } = await import("@melite/comfyui-cordis");
    const ctx = new Context();
    // J12: the engine submit threads the queue seat's stateRoots
    // manifest (config-named call data — no env seam); the hero rig
    // pins an empty manifest (no chained refs ride these runs).
    (ctx as unknown as { queue: unknown }).queue = { stateRoots: [] as string[] };
    // arm the doc WITHOUT the run's class_type ("X")
    const wiring = new ComfyUIWiringService(ctx);
    wiring.arm(new Set(["KSampler"]), new Map());
    const engine = new FakeEngine(ctx);
    let submitted = 0;
    engine.onFlow = async () => {
      submitted++;
      return { stages: {}, promptId: "p" };
    };
    const run = runWithCard("flow_inline");
    await runOne(run, ctx, () => undefined);
    assert.equal(run.status, "failed", "the run fails at the fence");
    assert.equal(submitted, 0, "the engine was NEVER called — the refusal predates any action");
    assert.ok(
      String(run.error).includes("X"),
      "the refusal names the undeclared class_type: " + String(run.error),
    );
    assert.ok(
      String(run.stages[0]?.error ?? "").includes("X"),
      "the stage row carries the wall's voice",
    );
  });

  it("a declared class_type passes the fence and submits (the wall stands down for truth)", async () => {
    const { ComfyUIWiringService } = await import("@melite/comfyui-cordis");
    const ctx = new Context();
    // J12: the engine submit threads the queue seat's stateRoots
    // manifest (config-named call data — no env seam); the hero rig
    // pins an empty manifest (no chained refs ride these runs).
    (ctx as unknown as { queue: unknown }).queue = { stateRoots: [] as string[] };
    const wiring = new ComfyUIWiringService(ctx);
    wiring.arm(new Set(["X"]), new Map());
    const engine = new FakeEngine(ctx);
    let submitted = 0;
    engine.onFlow = async () => {
      submitted++;
      return { stages: { s: { outputs: {}, artifacts: [] } }, promptId: "p" };
    };
    const run = runWithCard("flow_inline");
    await runOne(run, ctx, () => undefined);
    assert.equal(submitted, 1, "the submit happened");
    assert.equal(run.status, "completed");
  });

  it("unarmed (no doc) the fence stands down — the standing law", async () => {
    const ctx = new Context();
    // J12: the engine submit threads the queue seat's stateRoots
    // manifest (config-named call data — no env seam); the hero rig
    // pins an empty manifest (no chained refs ride these runs).
    (ctx as unknown as { queue: unknown }).queue = { stateRoots: [] as string[] };
    const engine = new FakeEngine(ctx);
    let submitted = 0;
    engine.onFlow = async () => {
      submitted++;
      return { stages: { s: { outputs: {}, artifacts: [] } }, promptId: "p" };
    };
    const run = runWithCard("flow_inline");
    await runOne(run, ctx, () => undefined);
    assert.equal(submitted, 1, "no doc, no judgment — the submit proceeds");
    assert.equal(run.status, "completed");
  });
});

// ── THE SEAT-PATH FENCE (2026-10-10, the operator's live face:
// "Error: card 'flow' built node 'workflow' with no class_type —
// the graph is not addressable" — "can't run cards.... the entire
// contract has been violated as it allowed me to make a card that
// could not run"). Production ALWAYS takes the seat path (the
// engines seat — the same dispatch the doors spec pins), and the
// fence's first cut walked that path's RAW stage params: the
// compiled ENVELOPE {workflow, output_nodes}, not the graph. The
// envelope's own 'workflow' key judged as a PHANTOM NODE, so an
// armed doc refused every seat-path run — a card that COULD run,
// killed by a wall judging its own envelope — and the refusal named
// a card the same cut INVENTED (the stage row carries no card; the
// fallback guessed 'flow'). The pins below drive the real seat path
// with the envelope a compiled card run actually carries.
describe("runOne's wiring fence on the SEAT path (production's path)", () => {
  /** ctx with the REAL 'engines' seat (the contract's own service —
   * ctx.get reads the isolate registry, so a literal assignment is
   * invisible) carrying ONE fake comfyui record whose executor
   * counts its executeStages calls: exactly the dispatch production
   * resolves, stroke 53's law. */
  const seatCtx = async (): Promise<{ ctx: Context; calls: { n: number } }> => {
    const { EnginesService } = await import("@melite/engine-contract");
    const ctx = new Context();
    // J12: the engine submit threads the queue seat's stateRoots
    // manifest (config-named call data — no env seam); the hero rig
    // pins an empty manifest (no chained refs ride these runs).
    (ctx as unknown as { queue: unknown }).queue = { stateRoots: [] as string[] };
    const seat = new EnginesService(ctx);
    const calls = { n: 0 };
    seat.register("comfyui", {
      executor: {
        executeStages: async (): Promise<{
          stages: Array<{ stageId: string; outputs: Record<string, EngineJson>; artifacts: string[] }>;
        }> => {
          calls.n++;
          return { stages: [{ stageId: "s", outputs: {}, artifacts: [] }] };
        },
      },
    });
    return { ctx, calls };
  };

  it("THE OPERATOR'S FACE, CURED: an envelope-params card run on the seat path SUBMITS against an armed doc", async () => {
    const { ComfyUIWiringService } = await import("@melite/comfyui-cordis");
    const { ctx, calls } = await seatCtx();
    // armed WITH the run's class ("X") — the wall stands for truth
    const wiring = new ComfyUIWiringService(ctx);
    wiring.arm(new Set(["X"]), new Map());
    const run = runWithCard("flow_inline");
    await runOne(run, ctx, () => undefined);
    assert.equal(calls.n, 1, "the seat executor submitted — the envelope is not a graph, its 'workflow' key is not a node");
    assert.equal(run.status, "completed", "a card that CAN run, runs");
    assert.equal(run.error, "", "no phantom-node refusal");
  });

  it("the seat path's refusal names the UNDECLARED CLASS, not the envelope's own keys — and never reaches the executor", async () => {
    const { ComfyUIWiringService } = await import("@melite/comfyui-cordis");
    const { ctx, calls } = await seatCtx();
    const wiring = new ComfyUIWiringService(ctx);
    wiring.arm(new Set(["KSampler"]), new Map());
    const run = runWithCard("flow_inline");
    await runOne(run, ctx, () => undefined);
    assert.equal(calls.n, 0, "the engine was NEVER called — the refusal predates any action");
    assert.equal(run.status, "failed");
    assert.ok(
      String(run.error).includes("wired node class 'X'"),
      "the refusal names the undeclared class: " + String(run.error),
    );
    assert.ok(
      !String(run.error).includes("no class_type"),
      "the phantom-node face is dead: " + String(run.error),
    );
  });

  it("the refusal names the run's REAL card (the record's cardId), never an invented one", async () => {
    const { ComfyUIWiringService } = await import("@melite/comfyui-cordis");
    const { ctx, calls } = await seatCtx();
    const wiring = new ComfyUIWiringService(ctx);
    wiring.arm(new Set(["KSampler"]), new Map());
    // cardId is registration's own law: stamped for card runs, never
    // a guess — the fixture's stage row carries none, exactly like a
    // real compiled run.
    const run = runWithCard("image-gen");
    await runOne(run, ctx, () => undefined);
    assert.equal(calls.n, 0);
    assert.ok(
      String(run.error).includes("card 'image-gen'"),
      "the wall names the record's card: " + String(run.error),
    );
    assert.ok(
      !String(run.error).includes("card 'flow'"),
      "the invented card name is dead: " + String(run.error),
    );
  });

  it("a seat-path stage whose params carry no graph refuses in the splice's own voice, pre-submit", async () => {
    const { ComfyUIWiringService } = await import("@melite/comfyui-cordis");
    const { ctx, calls } = await seatCtx();
    const wiring = new ComfyUIWiringService(ctx);
    wiring.arm(new Set(["X"]), new Map());
    const run: RunRecord = {
      ...runWithCard("flow_inline"),
      params: [{ prompt: "typed words with nowhere to compose" }],
    };
    await runOne(run, ctx, () => undefined);
    assert.equal(calls.n, 0, "no submit for a graphless stage");
    assert.equal(run.status, "failed");
    assert.ok(
      String(run.error).includes("compose must emit the graph"),
      "the splice's own voice: " + String(run.error),
    );
  });

  it("a seat-path stage with NO params row refuses in the compose voice, not a raw TypeError (the F-1 audit)", async () => {
    const { ComfyUIWiringService } = await import("@melite/comfyui-cordis");
    const { ctx, calls } = await seatCtx();
    const wiring = new ComfyUIWiringService(ctx);
    wiring.arm(new Set(["X"]), new Map());
    const run: RunRecord = {
      ...runWithCard("flow_inline"),
      params: [undefined as unknown as Record<string, EngineJson>],
    };
    await runOne(run, ctx, () => undefined);
    assert.equal(calls.n, 0);
    assert.equal(run.status, "failed");
    assert.ok(
      String(run.error).includes("compose must emit the graph"),
      "no TypeError face — the compose voice: " + String(run.error),
    );
    assert.ok(
      !String(run.error).includes("Cannot read properties"),
      "the raw TypeError is dead: " + String(run.error),
    );
  });

  it("a FOREIGN engine's stage is not a comfy graph — armed, the wall never judges its tool params (HOLE 2)", async () => {
    const { ComfyUIWiringService } = await import("@melite/comfyui-cordis");
    const { EnginesService } = await import("@melite/engine-contract");
    const { ctx } = await seatCtx();
    // a second executor on the shared 'engines' seat — the mcp lane's
    // own dispatch, exactly the audit's probe shape
    // InstanceType spelling: the tier's tsc (5.7) refuses the bare
    // class-as-type through the dynamic import (TS2749); 5.9 takes
    // it — this spelling is legal on both, and the wall is the law.
    const seat = ctx.get("engines") as InstanceType<typeof EnginesService>;
    let foreign = 0;
    seat.register("mcp:blender", {
      executor: {
        executeStages: async (): Promise<{
          stages: Array<{ stageId: string; outputs: Record<string, EngineJson>; artifacts: string[] }>;
        }> => {
          foreign++;
          return { stages: [{ stageId: "s", outputs: {}, artifacts: [] }] };
        },
      },
    });
    // ARMED with a class the tool params will never name — the wall
    // is live and would refuse any phantom walk
    const wiring = new ComfyUIWiringService(ctx);
    wiring.arm(new Set(["X"]), new Map());
    const run: RunRecord = {
      ...runWithCard("mcp:blender"),
      stages: [
        {
          id: "s",
          name: "s",
          index: 0,
          status: "pending",
          outputs: {},
          expected: {},
          engine: "mcp:blender",
        },
      ],
      params: [
        { tool: "blender.render", scene: "hero", options: { samples: 8 } },
      ],
    };
    await runOne(run, ctx, () => undefined);
    assert.equal(foreign, 1, "the foreign executor ran — its tool params are not a graph");
    assert.equal(run.status, "completed");
    assert.equal(run.error, "");
  });

  it("UNARMED, the splice stands down WITH the wall — no compose refusal from a fence forbidden to judge (HOLE 2)", async () => {
    const { ComfyUIWiringService } = await import("@melite/comfyui-cordis");
    const { ctx, calls } = await seatCtx();
    // mounted, NEVER armed: the doc-owner's fetch failed — judgment
    // is forbidden, and the pre-fix splice refused anyway
    new ComfyUIWiringService(ctx);
    const run: RunRecord = {
      ...runWithCard("flow_inline"),
      params: [{ prompt: "typed words with nowhere to compose" }],
    };
    await runOne(run, ctx, () => undefined);
    assert.equal(calls.n, 1, "the seat executor submitted — the unarmed fence judged nothing");
    assert.equal(run.status, "completed");
    assert.equal(run.error, "");
  });
});

// ── THE CARD-LABEL PREFERENCE CHAIN (2026-10-16, the coverage
// queue's runsExecute batch): both row builders read the SAME chain
// — the stage's own card, then the record's cardId, then nothing (the
// merged rows) or the stage id (the fence's name). A stage whose
// `card` is PRESENT BUT EMPTY is the chain's middle case: it is not
// the stage's own card, so the record's cardId answers. The arms
// below pin the empty-string leg on BOTH builders and the fence's
// last leg (a card-less record + a card-less stage = the stage id).
describe("runOne's card-label chain (the stage's own card, the empty stage card)", () => {
  /** A stage row carrying its composer name — "" is the cleared
   *  picker, a name is the stage's own card. */
  const stageWithCard = (card: string): RunRecord["stages"][number] => ({
    id: "s",
    name: "s",
    index: 0,
    status: "pending",
    outputs: {},
    expected: {},
    card,
  });

  /** The seat path with a capturing executor: the rows the run seat
   *  built are what the chain is read from. */
  const captureSeat = async (): Promise<{ ctx: Context; seen: EngineStageRow[] }> => {
    const { EnginesService } = await import("@melite/engine-contract");
    const ctx = new Context();
    // J12: the engine submit threads the queue seat's stateRoots
    // manifest (config-named call data — no env seam); the hero rig
    // pins an empty manifest (no chained refs ride these runs).
    (ctx as unknown as { queue: unknown }).queue = { stateRoots: [] as string[] };
    const seat = new EnginesService(ctx);
    const seen: EngineStageRow[] = [];
    seat.register("comfyui", {
      executor: {
        executeStages: async (rows: EngineStageRow[]): Promise<{
          stages: Array<{ stageId: string; outputs: Record<string, EngineJson>; artifacts: string[] }>;
        }> => {
          seen.push(...rows);
          return { stages: [{ stageId: "s", outputs: {}, artifacts: [] }] };
        },
      },
    });
    return { ctx, seen };
  };

  it("the MERGED row builder: the stage's OWN card leads the record's cardId", async () => {
    const ctx = new Context();
    // J12: the engine submit threads the queue seat's stateRoots
    // manifest (config-named call data — no env seam); the hero rig
    // pins an empty manifest (no chained refs ride these runs).
    (ctx as unknown as { queue: unknown }).queue = { stateRoots: [] as string[] };
    const engine = new FakeEngine(ctx);
    let seen: MergeRow[] = [];
    engine.onFlow = async (rows) => {
      seen = rows;
      return { stages: { s: { outputs: {}, artifacts: [] } }, promptId: "p" };
    };
    const run: RunRecord = {
      ...runWithCard("h3-timeline"),
      stages: [stageWithCard("mask")],
    };
    await runOne(run, ctx, () => undefined);
    assert.equal(run.status, "completed");
    assert.equal(
      seen[0]?.card,
      "mask",
      "the stage's own composer names the graph — the record's cardId is the fallback, never the lead",
    );
  });

  it("the MERGED row builder: an empty stage card falls through to the run's cardId", async () => {
    const ctx = new Context();
    // J12: the engine submit threads the queue seat's stateRoots
    // manifest (config-named call data — no env seam); the hero rig
    // pins an empty manifest (no chained refs ride these runs).
    (ctx as unknown as { queue: unknown }).queue = { stateRoots: [] as string[] };
    const engine = new FakeEngine(ctx);
    let seen: MergeRow[] = [];
    engine.onFlow = async (rows) => {
      seen = rows;
      return { stages: { s: { outputs: {}, artifacts: [] } }, promptId: "p" };
    };
    const run: RunRecord = {
      ...runWithCard("h3-timeline"),
      stages: [stageWithCard("")],
    };
    await runOne(run, ctx, () => undefined);
    assert.equal(run.status, "completed");
    assert.equal(
      seen[0]?.card,
      "h3-timeline",
      "the record's card answers — an empty stage card names no composer",
    );
  });

  it("the SEAT row builder: the stage's OWN card leads the run's cardId", async () => {
    const { ctx, seen } = await captureSeat();
    const run: RunRecord = {
      ...runWithCard("h3-timeline"),
      stages: [stageWithCard("mask")],
    };
    await runOne(run, ctx, () => undefined);
    assert.equal(run.status, "completed");
    assert.equal(
      seen[0]?.card,
      "mask",
      "the adapter's walk voice names the stage's own card first",
    );
  });

  it("the SEAT row builder: an empty stage card falls through to the run's cardId (the same chain, the other builder)", async () => {
    const { ctx, seen } = await captureSeat();
    const run: RunRecord = {
      ...runWithCard("h3-timeline"),
      stages: [stageWithCard("")],
    };
    await runOne(run, ctx, () => undefined);
    assert.equal(run.status, "completed");
    assert.equal(
      seen[0]?.card,
      "h3-timeline",
      "the adapter's walk voice names the record's card, not the empty stage field",
    );
  });

  it("the FENCE's last name: a card-less record on a card-less stage names the STAGE ID", async () => {
    const { ComfyUIWiringService } = await import("@melite/comfyui-cordis");
    const ctx = new Context();
    // J12: the engine submit threads the queue seat's stateRoots
    // manifest (config-named call data — no env seam); the hero rig
    // pins an empty manifest (no chained refs ride these runs).
    (ctx as unknown as { queue: unknown }).queue = { stateRoots: [] as string[] };
    // armed WITHOUT the run's class ("X") — the fence refuses, and the
    // refusal names whoever composed the graph
    const wiring = new ComfyUIWiringService(ctx);
    wiring.arm(new Set(["KSampler"]), new Map());
    const engine = new FakeEngine(ctx);
    let submitted = 0;
    engine.onFlow = async () => {
      submitted++;
      return { stages: { s: { outputs: {}, artifacts: [] } }, promptId: "p" };
    };
    // registration's own law: cardId absent for an inline/flow run —
    // and the stage row carries NO card key at all (the fence's chain
    // is nullish-based, so an absent key falls through; it falls
    // through to the stage id, never to a guess)
    const run: RunRecord = {
      ...runWithCard("unused"),
      cardId: undefined,
      stages: [{ id: "s", name: "s", index: 0, status: "pending", outputs: {}, expected: {} }],
    };
    await runOne(run, ctx, () => undefined);
    assert.equal(submitted, 0, "the refusal predates any engine action");
    assert.equal(run.status, "failed");
    assert.ok(
      String(run.error).includes("card 's'"),
      "the wall names the stage id when neither card answers: " + String(run.error),
    );
  });
});
