// runsExecute.ts — the runs seat's execute truth (extracted from
// runsRegistry.ts, the god-file cut): one run through the merged
// path — the per-stage loop, per-stage harvest + result_outputs,
// the stop-gated terminal mapping. Explicit deps, no Service state.
import type { Context } from "@deepseek-ai/cordis";
import { executeFlow, needComfyUI, spliceWorkflow } from "@melite/comfyui-cordis";
import type { EngineJson, MergeRow, MergeStageResult } from "@melite/comfyui-cordis";
import type { EngineExecutor, EngineStageRow } from "@melite/engine-contract";
import { errText, runRel, type RunRecord, type StageRow } from "./runsTypes.ts";
import { engineFilmName, filmMuxPlan, muxWindows, probeDurationSec, shouldMuxWindows } from "./filmMux.ts";
import { join } from "node:path";
import { needComfyUI as _ncu } from "@melite/comfyui-cordis";
type EngineCtx = Parameters<typeof _ncu>[0];

export type SettleFn = (run: RunRecord) => void;

  /** One run through the merged path (door-verbatim: stages ->
   *  running + merged:true, splice rows, ONE executeFlow submit,
   *  per-stage harvest + result_outputs, the stop-gated terminal
   *  mapping, the settle persist). */
  export async function runOne(run: RunRecord, ctx: Context, settle: SettleFn): Promise<void> {
    run.status = "running";
    for (const stage of run.stages) {
      stage["status"] = "running";
      stage["merged"] = true;
    }
    const inputNames: Record<string, Record<string, string>> =
      run.inputNames ?? {};
    // THE ENGINE-GENERICS DISPATCH (stroke 53): the 'engines' seat
    // governs when mounted — the executor owns graph surgery
    // (splice inside the adapter), the tap, and the merged submit.
    // Seat-less boots (fixtures, walls) keep the pre-seam direct
    // path byte-for-byte. Runs stay single-engine today: the
    // single-stage gateway constraint means one run names one
    // engine; mixed-engine grouping arrives with the MCP executor
    // (docs/design/engine-generics-mcp.md).
    const enginesSeat: unknown = ctx.get("engines");
    let seatExecutor: EngineExecutor | null = null;
    if (
      enginesSeat !== undefined &&
      typeof (enginesSeat as { resolve?: unknown }).resolve === "function"
    ) {
      // resolve() throws LOUD on an unknown id (the contract's
      // miswire voice) — INSIDE the splice-catch scope so the run
      // settles failed and the pump SURVIVES: outside it, the throw
      // escaped runOne with activeId still held, and every future
      // tryDequeue returned null — all inference bricked until
      // restart (audit R1, stroke 82).
      try {
        seatExecutor = (enginesSeat as unknown as { resolve(id: string): { executor: EngineExecutor } }).resolve(
          runEngine(run),
        ).executor;
      } catch (exc: unknown) {
        const text: string = errText(exc);
        for (const stage of run.stages) {
          /* v8 ignore next */
          if (stage["status"] === "running") {
            stage["status"] = "failed";
            stage["error"] = text;
          }
        }
        run.status = "failed";
        run.error = text;
        settle(run);
        return;
      }
    }
    let rows: MergeRow[];
    try {
      rows = seatExecutor !== null ? [] : run.stages.map(
        (stage, i: number): MergeRow => ({
          stageId: stage.id,
          workflow: spliceWorkflow(run.params[i] as Record<string, EngineJson>),
          outputs: { ...(stage.outputs as Record<string, EngineJson>) },
          outputNodes: { ...(run.outputNodes[i] as Record<string, EngineJson>) },
          params: { ...(run.params[i] as Record<string, EngineJson>) },
        }),
      );
    } catch (exc: unknown) {
      // splice refusal pre-submit: the run fails with the
      // planner's text (the per-stage fallback loop is later
      // scope).
      const text: string = errText(exc);
      for (const stage of run.stages) {
        // (every stage reads running — runOne stamps them just
        // above, so the fence never filters.)
        /* v8 ignore next */
        if (stage["status"] === "running") {
          stage["status"] = "failed";
          stage["error"] = text;
        }
      }
      run.status = "failed";
      run.error = text;
      settle(run);
      return;
    }
    try {
      // THE PROGRESS TAP FOLD (2026-09-13, the operator's "forward
      // the comfyui progress webhooks like before"): the engine
      // drains its tap into this callback; the merged submit mints
      // ONE prompt, so every stage row shares the same live fold
      // (status serves stages VERBATIM — the poll rides the
      // existing door, no new wire verb). Hoisted for both paths.
      const report = (updates: Record<string, unknown>): void => {
        const act: unknown = updates["activity"];
        const prog: unknown = updates["progress"];
        const pRec: Record<string, unknown> | null =
          typeof prog === "object" && prog !== null && !Array.isArray(prog)
            ? (prog as Record<string, unknown>)
            : null;
        for (const stage of run.stages) {
          if (typeof act === "string" && act !== "") stage["activity"] = act;
          if (
            pRec !== null &&
            typeof pRec["value"] === "number" &&
            typeof pRec["max"] === "number"
          ) {
            stage["progress"] = { value: pRec["value"], max: pRec["max"] };
          }
        }
      };
      const shouldStop = (): boolean => run.stopFlag;
      let result: { stages: Record<string, MergeStageResult> };
      if (seatExecutor !== null) {
        // The seat path: engine-agnostic rows — the adapter splices
        // (its splice refusal lands in this same catch: the run
        // fails with the planner's text, stages failed, settled).
        const genericRows = run.stages.map(
          (stage, i: number): EngineStageRow => ({
            stageId: stage.id,
            outputs: { ...(stage.outputs as Record<string, EngineJson>) },
            params: { ...(run.params[i] as Record<string, EngineJson>) },
          }),
        );
        const outcome = await seatExecutor.executeStages(
          genericRows,
          run.dir,
          inputNames,
          { shouldStop, report },
        );
        result = {
          stages: Object.fromEntries(
            outcome.stages.map(
              (s): [string, MergeStageResult] => [
                s.stageId,
                { outputs: s.outputs, artifacts: [...s.artifacts] },
              ],
            ),
          ),
        };
      } else {
        const engine = needComfyUI(ctx as unknown as EngineCtx, "runsRemote worker");
        const nodeCount: number = rows.reduce(
          (n: number, r: MergeRow): number =>
            n + Object.keys(r.workflow).length,
          0,
        );
        for (const stage of run.stages) {
          stage["activity"] =
            "merged submit (" + rows.length + " stages, " + nodeCount + " nodes)";
        }
        result = await engine.executeFlow(rows, run.dir, inputNames, {}, {
          shouldStop,
          report,
        });
      }
      for (const stage of run.stages) {
        const row = result.stages[stage.id] ?? { outputs: {}, artifacts: [] };
        const arts: string[] = row.artifacts.filter(
          (a: string): boolean => a !== "",
        );
        run.artifacts.push(...arts);
        if (arts.length > 0) {
          // DIVERGENCE-BY-ORDER: run-relative names, no /v1 prefix
          // (the asset HTTP face died with the app).
          let names: string[] = arts.map((a: string): string =>
            runRel(run, a),
          );
          // THE FILM COMPLETION (2026-09-12, the 4s-stitch defect):
          // when the stitch is shorter than the windows' total, the
          // windows concat (stream copy) into film_video_mux.mp4 and
          // the FILM leads the names — the hero never lies about the
          // timeline. Any probe/mux failure keeps the engine's own
          // stitch (loud, never a fake film).
          // THE ENGINE FILM LEADS (2026-09-17): when the engine
          // composed the film (h3_t4_film), presentation order is the
          // harness's only job — film first, windows after. No mux:
          // composition belongs to the engine, never a shell ffmpeg.
          const engineFilm = engineFilmName(names);
          if (engineFilm !== null) {
            names = [engineFilm, ...names.filter((n): boolean => n !== engineFilm)];
          }
          const plan = filmMuxPlan(names);
          if (plan !== null) {
            if (plan.stitch === null) {
              // THE MERGED FILM (2026-09-17, the seam-wiring stroke):
              // no engine stitch exists — the TS card's windows ARE the
              // film; concat unconditionally so ONE film leads the
              // stage (loud on failure: the windows stay the truth).
              const muxed = muxWindows(run.dir, plan);
              if (muxed !== null) {
                names.unshift(plan.out);
                run.artifacts.push(muxed);
              }
            } else {
              const stitchSec = probeDurationSec(join(run.dir, plan.stitch));
              const windowSecs = plan.windows.map((w): number | null =>
                probeDurationSec(join(run.dir, w)));
              const decidable = stitchSec !== null
                && windowSecs.every((t): t is number => t !== null);
              if (decidable && shouldMuxWindows(stitchSec, windowSecs)) {
                const muxed = muxWindows(run.dir, plan);
                if (muxed !== null) {
                  names.unshift(plan.out);
                  run.artifacts.push(muxed);
                }
              }
            }
          }
          stage["url"] = names[0];
          stage["gallery"] = names.map(
            (n: string): EngineJson => ({ name: n }) as unknown as EngineJson,
          );
        }
        stage["result_outputs"] = { ...row.outputs } as unknown as EngineJson;
        stage["status"] = "completed";
        delete stage["progress"];
        delete stage["activity"];
      }
      run.status = run.stopFlag ? "stopped" : "completed";
      settle(run);
    } catch (exc: unknown) {
      const text: string = errText(exc);
      const stopped: boolean =
        run.stopFlag && text.toLowerCase().includes("stop");
      for (const stage of run.stages) {
        // (same fence as the splice-catch above — every stage is
        // still running here.)
        /* v8 ignore next */
        if (stage["status"] === "running") {
          stage["status"] = stopped ? "stopped" : "failed";
          stage["error"] = text;
        }
        delete stage["progress"];
        delete stage["activity"];
      }
      run.status = stopped ? "stopped" : "failed";
      if (!stopped) run.error = text;
      settle(run);
    }
  }

export function runEngine(run: RunRecord): string {
    const first: StageRow | undefined = run.stages[0];
    const engine: unknown = first?.["engine"];
    return typeof engine === "string" && engine !== "" ? engine : "comfyui";
  }
