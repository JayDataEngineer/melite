// entries/comfyui-engine.ts — the ComfyUI adapter onto the engines
// seat (stroke 53, the engine-generics seam): registers engine id
// 'comfyui' whose executor keeps the MERGED single-graph law
// entirely inside this package. The runs lane (the sole Consumer)
// hands over engine-agnostic stage rows; the adapter splices each
// stage's params into its workflow (spliceWorkflow — the graph
// surgery the consumer must never know), merges, and submits ONE
// prompt through the host service exactly as the worker did
// before the seam. The activity stamp ("merged submit (N stages,
// M nodes)") rides the progress tap — one code path, same voice.
//
// Mount AFTER engine-contract (the 'engines' seat) and the host
// provider (engine-comfyui) — the estate bundle's row order. The
// registration is effect-owned: fiber unload removes the row.
import type { Context, Plugin } from "@deepseek-ai/cordis";
import type {
  EngineExecutor,
  EngineRunOptions,
  EngineRunOutcome,
  EngineStageRow,
  EnginesService,
} from "@melite/engine-contract";
import {
  needComfyUI,
  spliceWorkflow,
} from "../comfyui.ts";
import type { ComfyUIHostService, EngineJson, MergeRow } from "../comfyui.ts";

/** Splice + merge the engine-agnostic rows into MergeRows (the
 * door-validated params are the graph carrier; spliceWorkflow
 * throws the planner's refusal on a bad stage — the run fails
 * with that text, exactly as the pre-seam worker's splice catch
 * did). outputNodes derives from params["output_nodes"] — the
 * owning engine's derivation, not the consumer's (the worker did
 * the same extraction pre-seam; the door never strips the key). */
function toMergeRows(rows: readonly EngineStageRow[]): MergeRow[] {
  return rows.map(
    (row: EngineStageRow): MergeRow => ({
      stageId: row.stageId,
      workflow: spliceWorkflow(row.params as Record<string, EngineJson>),
      outputs: { ...(row.outputs as Record<string, EngineJson>) },
      outputNodes: {
        ...((row.params["output_nodes"] ?? {}) as Record<string, EngineJson>),
      },
      params: { ...(row.params as Record<string, EngineJson>) },
    }),
  );
}

/** The executor: merged submit through the host service. */
export function comfyuiExecutor(host: ComfyUIHostService): EngineExecutor {
  return {
    async executeStages(
      rows: readonly EngineStageRow[],
      runDir: string,
      inputNames: Readonly<Record<string, Readonly<Record<string, string>>>>,
      options: EngineRunOptions,
    ): Promise<EngineRunOutcome> {
      const mergeRows: MergeRow[] = toMergeRows(rows);
      const nodeCount: number = mergeRows.reduce(
        (n: number, r: MergeRow): number => n + Object.keys(r.workflow).length,
        0,
      );
      options.report({
        activity:
          "merged submit (" + mergeRows.length + " stages, " + nodeCount + " nodes)",
      });
      const result = await host.executeFlow(
        mergeRows,
        runDir,
        inputNames as Record<string, Record<string, string>>,
        {},
        {
          shouldStop: options.shouldStop,
          report: options.report,
        },
      );
      const stages = Object.entries(result.stages).map(
        ([stageId, outcome]): {
          stageId: string;
          outputs: Record<string, EngineJson>;
          artifacts: string[];
        } => ({
          stageId,
          outputs: outcome.outputs,
          artifacts: outcome.artifacts,
        }),
      );
      return { stages, engineRef: result.promptId };
    },
  };
}

/** The adapter row: engine-comfyui-adapter. inject declares the
 * 'engines' seat (load-order gate — the contract row rides
 * first); the host service resolves by needComfyUI (LOUD on a
 * miswire, the one-cast-site law). */
export const comfyuiEngine: Plugin = {
  name: "engine-comfyui-adapter",
  inject: ["engines"],
  apply(ctx: Context): void {
    const seat = ctx.get("engines") as EnginesService;
    const host = needComfyUI(ctx, "engine-comfyui-adapter");
    ctx.effect(() => seat.register("comfyui", { executor: comfyuiExecutor(host) }));
  },
};

export { comfyuiEngine as default };
