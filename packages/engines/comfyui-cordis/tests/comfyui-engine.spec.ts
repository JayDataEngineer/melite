// comfyui-engine.spec.ts — the ComfyUI adapter onto the engines
// seat (stroke 53). Pins the mapping contract at the HOST boundary
// (executeFlow intercepted on the real host instance — the
// transport battery already owns executeFlow's own behavior):
// splice inside the adapter, outputNodes derived from params, the
// activity stamp on the tap, the outcome mapping, and the
// registration's effect-owned lifetime.
import { describe, expect, it, vi } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import { enginesContract } from "@melite/engine-contract";
import type {
  EnginesService,
  EngineStageRow,
} from "@melite/engine-contract";
import comfyuiHostProvider from "../src/entries/comfyui-host.ts";
import comfyuiEngine from "../src/entries/comfyui-engine.ts";
import type { ComfyUIHostService, FlowResult } from "../src/comfyui.ts";

/** Boot the real composition rows (contract + host + adapter) with
 * the host's executeFlow intercepted (a seam double at exactly the
 * engine boundary — no server, no HTTP). */
async function boot(
  executeFlow: NonNullable<unknown>,
): Promise<{ ctx: Context; seat: EnginesService; host: ComfyUIHostService }> {
  const ctx = new Context();
  await ctx.plugin(enginesContract as never);
  await ctx.plugin(comfyuiHostProvider as never, { url: "http://seat-stub:1" });
  await ctx.plugin(comfyuiEngine as never);
  const seat = ctx.get("engines") as EnginesService;
  const host = ctx.get("comfyui") as ComfyUIHostService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (host as any).executeFlow = executeFlow;
  return { ctx, seat, host };
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
    const [rows, runDir, inputNames, initials, opts] = flow.mock.calls[0] as [
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
    seen = flow.mock.calls[0]?.[4] as { shouldStop?: () => boolean };
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
    const [rows, runDir, gotNames, initials, opts] = flow.mock.calls[0] as [
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
