// comfyui-engine.spec.ts — the ComfyUI adapter onto the engines
// seat (stroke 53). Pins the mapping contract at the HOST boundary
// (executeFlow intercepted on the real host instance — the
// transport battery already owns executeFlow's own behavior):
// splice inside the adapter, outputNodes derived from params, the
// activity stamp on the tap, the outcome mapping, and the
// registration's effect-owned lifetime.
import { describe, expect, it, vi, onTestFinished } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { enginesContract } from "@melite/engine-contract";
import type {
  EnginesService,
  EngineStageRow,
} from "@melite/engine-contract";
import comfyuiHostProvider from "../src/entries/comfyui-host.ts";
import comfyuiWiring from "../src/entries/comfyui-wiring.ts";
import comfyuiEngine from "../src/entries/comfyui-engine.ts";
import { ComfyUIWiringService, type WiringInputSpec } from "../src/wiringWall.ts";
import type { ComfyUIHostService, FlowResult } from "../src/comfyui.ts";

/** Boot the real composition rows (contract + host + adapter) with
 * the host's executeFlow intercepted (a seam double at exactly the
 * engine boundary — no server, no HTTP). */
async function boot(
  executeFlow: NonNullable<unknown>,
): Promise<{ ctx: Context; seat: EnginesService; host: ComfyUIHostService; wiring: ComfyUIWiringService }> {
  const ctx = new Context();
  await ctx.plugin(enginesContract);
  // The estate bundle's row order: the wiring provider rides BEFORE
  // the host and the adapter, exactly as melite-estate mounts it.
  await ctx.plugin(comfyuiWiring);
  await ctx.plugin(comfyuiHostProvider, { url: "http://seat-stub:1" });
  await ctx.plugin(comfyuiEngine);
  const wiring = ctx.get("comfyuiWiring") as ComfyUIWiringService;
  const seat = ctx.get("engines") as EnginesService;
  // The fiber boots the host provider, so the 'comfyui' key IS a
  // ComfyUIHostService at runtime — but the static type is the
  // card plane's ComfyUIService augmentation, hence unknown-first.
  const host = ctx.get("comfyui") as unknown as ComfyUIHostService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (host as any).executeFlow = executeFlow;
  return { ctx, seat, host, wiring };
}

/** One legal stage row (a spliced workflow + output_nodes). */
function stageRow(): EngineStageRow {
  return {
    stageId: "s0",
    outputs: { default: "image" },
    params: {
      workflow: {
        "1": { class_type: "EmptyLatentImage", inputs: { width: 8, height: 8 } },
      },
      output_nodes: { default: "2" },
    },
  };
}

describe("the comfyui adapter (engine id 'comfyui' on the seat)", () => {
  it("registers and resolves through the seat", async () => {
    const { ctx, seat } = await boot(vi.fn());
    expect(seat.has("comfyui")).toBe(true);
    expect(seat.ids()).toContain("comfyui");
    void ctx;
  });

  it("splices inside, derives outputNodes from params, and maps the outcome", async () => {
    const flow = vi.fn(async (): Promise<FlowResult> => ({
      stages: { s0: { outputs: { default: "run-x/a.png" }, artifacts: ["a.png"] } },
      promptId: "prompt-1",
    }));
    const { ctx, seat, host } = await boot(flow);
    const record = seat.resolve("comfyui");
    const report = vi.fn();
    const outcome = await record.executor.executeStages(
      [stageRow()],
      "/tmp/run-x",
      {},
      { shouldStop: (): boolean => false, report },
    );
    // ONE merged submit through the host, with the spliced graph.
    expect(flow).toHaveBeenCalledTimes(1);
    // The stub vi.fn declares no params, so its call tuple is [] —
    // the unknown-first cast recovers the executeFlow seam shape
    // (rows, runDir, inputNames, initials, opts).
    const [rows, runDir, inputNames, initials, opts] = flow.mock.calls[0] as unknown as [
      Array<{ stageId: string; workflow: Record<string, unknown>; outputNodes: Record<string, unknown> }>,
      string,
      Record<string, Record<string, string>>,
      Record<string, unknown>,
      { shouldStop: () => boolean; report: unknown },
    ];
    expect(rows[0]?.stageId).toBe("s0");
    expect(rows[0]?.workflow["1"]).toEqual({
      class_type: "EmptyLatentImage",
      inputs: { width: 8, height: 8 },
    });
    expect(rows[0]?.outputNodes).toEqual({ default: "2" });
    expect(runDir).toBe("/tmp/run-x");
    expect(inputNames).toEqual({});
    expect(initials).toEqual({});
    expect(typeof opts.shouldStop).toBe("function");
    // The activity stamp rides the tap (merged-submit voice).
    expect(report).toHaveBeenCalledWith({
      activity: "merged submit (1 stages, 1 nodes)",
    });
    // The outcome is engine-agnostic.
    expect(outcome.stages).toEqual([
      { stageId: "s0", outputs: { default: "run-x/a.png" }, artifacts: ["a.png"] },
    ]);
    expect(outcome.engineRef).toBe("prompt-1");
    void host;
  });

  it("forwards the executor's replay verdict onto the outcome (D11 — the seat witnesses, the adapter relays)", async () => {
    const flow = vi.fn(async (): Promise<FlowResult> => ({
      stages: { s0: { outputs: { default: "run-x/a.png" }, artifacts: ["a.png"] } },
      promptId: "prompt-9",
      replaySuspect: true,
    }));
    const { seat } = await boot(flow);
    const record = seat.resolve("comfyui");
    const outcome = await record.executor.executeStages(
      [stageRow()],
      "/tmp/run-x",
      {},
      { shouldStop: (): boolean => false, report: vi.fn() },
    );
    expect(outcome.engineRef).toBe("prompt-9");
    expect(outcome.replaySuspect).toBe(true);
  });

  it("fails with the planner's refusal when a stage carries no workflow (splice inside, loud)", async () => {
    const flow = vi.fn(async (): Promise<FlowResult> => {
      throw new Error("unreachable");
    });
    const { ctx, seat } = await boot(flow);
    const record = seat.resolve("comfyui");
    await expect(
      record.executor.executeStages(
        [{ stageId: "s0", outputs: {}, params: {} }],
        "/tmp/run-x",
        {},
        { shouldStop: (): boolean => false, report: vi.fn() },
      ),
    ).rejects.toThrow(/no inline workflow/);
    expect(flow).not.toHaveBeenCalled();
  });

  it("threads shouldStop into the host options", async () => {
    let seen: { shouldStop?: () => boolean } = {};
    const flow = vi.fn(async (): Promise<FlowResult> => ({
      stages: {},
      promptId: "p",
    }));
    const { ctx, seat } = await boot(flow);
    const record = seat.resolve("comfyui");
    await record.executor.executeStages(
      [stageRow()],
      "/tmp/run-x",
      {},
      { shouldStop: (): boolean => true, report: vi.fn() },
    );
    seen = (flow.mock.calls[0] as unknown as unknown[])[4] as unknown as { shouldStop?: () => boolean };
    expect(seen.shouldStop?.()).toBe(true);
    void ctx;
  });

  it("forwards non-empty inputNames, report identity, across two stages", async () => {
    const flow = vi.fn(async (): Promise<FlowResult> => ({
      stages: {
        s0: { outputs: { default: "run-x/a.png" }, artifacts: ["a.png"] },
        s1: { outputs: { default: "run-x/b.png" }, artifacts: ["b.png"] },
      },
      promptId: "prompt-2",
    }));
    const { seat } = await boot(flow);
    const record = seat.resolve("comfyui");
    const report = vi.fn();
    const row1: EngineStageRow = {
      stageId: "s1",
      outputs: { default: "image" },
      params: {
        workflow: {
          "1": { class_type: "EmptyLatentImage", inputs: { width: 8, height: 8 } },
        },
        output_nodes: { default: "3" },
      },
    };
    const inputNames = { s1: { pic: "s0.default" } };
    const outcome = await record.executor.executeStages(
      [stageRow(), row1],
      "/tmp/run-x",
      inputNames,
      { shouldStop: (): boolean => false, report },
    );
    expect(flow).toHaveBeenCalledTimes(1);
    // Same seam-shape recovery as above (the stub's call tuple is []).
    const [rows, runDir, gotNames, initials, opts] = flow.mock.calls[0] as unknown as [
      Array<{ stageId: string; workflow: Record<string, unknown>; outputNodes: Record<string, unknown> }>,
      string,
      Record<string, Record<string, string>>,
      Record<string, unknown>,
      { shouldStop: () => boolean; report: unknown },
    ];
    expect(rows.length).toBe(2);
    expect(rows[0]?.stageId).toBe("s0");
    expect(rows[1]?.stageId).toBe("s1");
    expect(rows[1]?.outputNodes).toEqual({ default: "3" });
    expect(runDir).toBe("/tmp/run-x");
    expect(gotNames).toEqual(inputNames);
    expect(initials).toEqual({});
    expect(opts.report).toBe(report);
    expect(report).toHaveBeenCalledWith({
      activity: "merged submit (2 stages, 2 nodes)",
    });
    expect(outcome.stages).toEqual([
      { stageId: "s0", outputs: { default: "run-x/a.png" }, artifacts: ["a.png"] },
      { stageId: "s1", outputs: { default: "run-x/b.png" }, artifacts: ["b.png"] },
    ]);
    expect(outcome.engineRef).toBe("prompt-2");
  });

  it("a stage without output_nodes maps to an empty output map", async () => {
    const flow = vi.fn(async (): Promise<FlowResult> => ({ stages: {}, promptId: "p" }))
    const { seat } = await boot(flow)
    // EngineStageRow.params is Readonly — rebuild the row without
    // output_nodes instead of deleting through the index signature.
    const full = stageRow()
    const { output_nodes: _dropped, ...params } = full.params
    const row: EngineStageRow = { ...full, params }
    await seat.resolve("comfyui").executor.executeStages(
      [row], "/tmp/run-x", {}, { shouldStop: () => false, report: vi.fn() },
    )
    // calls[0] is the arg tuple; its [0] is the MergeRow array the
    // adapter built (the stub's call tuple is [] — recover via unknown).
    const rows = (flow.mock.calls[0] as unknown as Array<Array<{ outputNodes: Record<string, unknown> }>> | undefined)?.[0]
    expect(rows?.[0]?.outputNodes).toEqual({})
  })

  it("host-rejects → executeStages rejects", async () => {
    const flow = vi.fn(async (): Promise<FlowResult> => {
      throw new Error("host down");
    });
    const { seat } = await boot(flow);
    const record = seat.resolve("comfyui");
    await expect(
      record.executor.executeStages(
        [stageRow()],
        "/tmp/run-x",
        {},
        { shouldStop: (): boolean => false, report: vi.fn() },
      ),
    ).rejects.toThrow(/host down/);
    expect(flow).toHaveBeenCalledTimes(1);
  });
});

// ── THE THIRD WALK SEAT (the audit's finding, 2026-10-10: the run
// seat's fence was gated to the seat-less path and production
// ALWAYS takes this adapter — the wall was dead on the lane). This
// is the POST-SPLICE graph: exactly what the engine receives,
// walked before the first wire moves. The proof boots the REAL
// composition rows (contract + wiring + host + adapter) and arms
// the wiring service exactly as the estate registry's prime does.
describe("the adapter's post-splice wiring walk (production's submit path)", () => {
  it("armed without the class: the walk refuses BEFORE executeFlow — the engine is never called", async () => {
    const flow = vi.fn(async (): Promise<FlowResult> => ({ stages: {}, promptId: "p" }));
    const { seat, wiring } = await boot(flow);
    // the doc names a class the row does not carry
    wiring.arm(new Set(["KSampler"]), new Map());
    const record = seat.resolve("comfyui");
    await expect(
      record.executor.executeStages(
        [stageRow()],
        "/tmp/run-x",
        {},
        { shouldStop: (): boolean => false, report: vi.fn() },
      ),
    ).rejects.toThrow(/EmptyLatentImage/);
    expect(flow).not.toHaveBeenCalled();
  });

  it("armed with the class: the walk stands down for truth and the submit proceeds", async () => {
    const flow = vi.fn(async (): Promise<FlowResult> => ({
      stages: { s0: { outputs: { default: "run-x/a.png" }, artifacts: ["a.png"] } },
      promptId: "prompt-1",
    }));
    const { seat, wiring } = await boot(flow);
    wiring.arm(new Set(["EmptyLatentImage"]), new Map());
    const record = seat.resolve("comfyui");
    await record.executor.executeStages(
      [stageRow()],
      "/tmp/run-x",
      {},
      { shouldStop: (): boolean => false, report: vi.fn() },
    );
    expect(flow).toHaveBeenCalledTimes(1);
  });

  it("an undeclared INPUT on a declared class refuses with the input gate's voice", async () => {
    const flow = vi.fn(async (): Promise<FlowResult> => ({ stages: {}, promptId: "p" }));
    const { seat, wiring } = await boot(flow);
    const declared = new Map<string, ReadonlyMap<string, WiringInputSpec>>();
    declared.set(
      "EmptyLatentImage",
      new Map([
        ["width", { required: true }],
        ["height", { required: true }],
      ]),
    );
    wiring.arm(new Set(["EmptyLatentImage"]), declared);
    const row = stageRow();
    // splice carries params.workflow verbatim — smuggle an input
    // the node does not declare
    const wf = row.params.workflow as Record<
      string,
      { class_type: string; inputs: Record<string, unknown> }
    >;
    wf["1"]!.inputs["no_such_knob"] = 1;
    const record = seat.resolve("comfyui");
    await expect(
      record.executor.executeStages(
        [row],
        "/tmp/run-x",
        {},
        { shouldStop: (): boolean => false, report: vi.fn() },
      ),
    ).rejects.toThrow(/EmptyLatentImage\.no_such_knob/);
    expect(flow).not.toHaveBeenCalled();
  });

  // THE VOICE NAMES THE COMPOSER (the audit's F-2): card id when the
  // run was card-commissioned, the stage id when it was not — never
  // a stage id dressed as a card, never a card the row never carried
  it("a card-commissioned row refuses in the CARD's name (F-2)", async () => {
    const flow = vi.fn(async (): Promise<FlowResult> => ({ stages: {}, promptId: "p" }));
    const { seat, wiring } = await boot(flow);
    wiring.arm(new Set(["KSampler"]), new Map());
    const record = seat.resolve("comfyui");
    await expect(
      record.executor.executeStages(
        [{ ...stageRow(), card: "krea-gen" }],
        "/tmp/run-x",
        {},
        { shouldStop: (): boolean => false, report: vi.fn() },
      ),
    ).rejects.toThrow(/card 'krea-gen' wired node class 'EmptyLatentImage'/);
    expect(flow).not.toHaveBeenCalled();
  });

  it("a stage-commissioned row names the STAGE in the composer slot (the honest fallback)", async () => {
    const flow = vi.fn(async (): Promise<FlowResult> => ({ stages: {}, promptId: "p" }));
    const { seat, wiring } = await boot(flow);
    wiring.arm(new Set(["KSampler"]), new Map());
    const record = seat.resolve("comfyui");
    await expect(
      record.executor.executeStages(
        [stageRow()],
        "/tmp/run-x",
        {},
        { shouldStop: (): boolean => false, report: vi.fn() },
      ),
    ).rejects.toThrow(/card 's0' wired node class 'EmptyLatentImage'/);
    expect(flow).not.toHaveBeenCalled();
  });
});

// ── THE ENGINEREF BRAND (F3, nativity audit 2026-11-05) ───────────
// The executor seam's opaque cross-boundary id (ComfyUI's promptId)
// rode a bare `string` in the contract — the dsh-brand law's exact
// crime class ("opaque cross-boundary ids are branded, never bare
// string"; RunId is the estate's own mirror). Three arms, one per
// invariant: the CONTRACT states the brand, the ADAPTER mints
// through it, and the type system REFUSES a bare string (the
// negative-compile probe — the arm that fires if the brand is ever
// toggled back out, because the probe then COMPILES).
describe("the EngineRef brand (the executor seam's opaque id)", () => {
  const read = (p: string): string => readFileSync(join(import.meta.dirname, p), "utf8");

  it("the contract declares engineRef as the branded EngineRef, not a bare string", () => {
    const types = read("../../../engines/contract/src/types.ts");
    // the branded carrier (the RunId mirror); the brand rides a
    // unique symbol — a plain string intersection is not a brand
    expect(types).toMatch(/export type EngineRef = Branded<"EngineRef">/u);
    expect(types).toMatch(/unique symbol/u);
    // EngineRunOutcome.engineRef carries the brand, never `string`
    expect(types).toMatch(/readonly engineRef\?: EngineRef;/u);
    // and the barrel exports it (the consumers mint by name)
    const index = read("../../../engines/contract/src/index.ts");
    expect(index).toMatch(/EngineRef,/u);
  });

  it("the adapter is the mint — the wire prompt_id becomes EngineRef at the seam, once", () => {
    const adapter = read("../src/entries/comfyui-engine.ts");
    // the outcome's engineRef mints through the brand at the
    // boundary's producer
    expect(adapter).toMatch(/engineRef: result\.promptId as EngineRef/u);
    // the transport's internal promptId stays raw (pre-boundary);
    // the mint must live HERE, not spread through the transport
    const execute = read("../src/comfyui-execute.ts");
    // one mint, at the seam — the transport keeps the raw wire id
    expect(execute).not.toMatch(/as EngineRef/u);
  });

  it("a bare string does not typecheck as engineRef (the negative-compile probe)", { timeout: 60_000 }, () => {
    // The firing proof: toggle the brand out (engineRef?: string)
    // and this probe COMPILES — the wall reds. The probe compiles a
    // one-liner against the contract's REAL src through the same
    // settings the package tsconfig uses (minus the node types —
    // the probe imports nothing from node).
    const tsconfig = read("../../../engines/contract/tsconfig.json");
    const probeDir = mkdtempSync(join(tmpdir(), "engineref-probe-"));
    onTestFinished(() => rmSync(probeDir, { recursive: true, force: true }));
    const probeTsconfig = JSON.parse(tsconfig);
    delete probeTsconfig.compilerOptions.types;
    probeTsconfig.include = [
      join(import.meta.dirname, "../../../engines/contract/src/types.ts"),
      "./probe.ts",
    ];
    writeFileSync(join(probeDir, "tsconfig.json"), JSON.stringify(probeTsconfig));
    writeFileSync(join(probeDir, "probe.ts"), [
      `import type { EngineRunOutcome } from ${JSON.stringify(join(import.meta.dirname, "../../../engines/contract/src/types.ts"))};`,
      `const bad: EngineRunOutcome = { stages: [], engineRef: "bare" };`,
    ].join("\n"));
    const tsc = join(import.meta.dirname, "../../../engines/contract/node_modules/typescript/bin/tsc");
    const res = spawnSync(process.execPath, [tsc, "-p", join(probeDir, "tsconfig.json")], { encoding: "utf8" });
    expect(res.status, `the bare string must be refused by the compiler (got: ${res.stdout} ${res.stderr})`).toBe(2);
    expect(res.stdout + res.stderr).toMatch(/Type '"bare"' is not assignable to type 'EngineRef'|Type 'string' is not assignable to type/u);
  });
});
