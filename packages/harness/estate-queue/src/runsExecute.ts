// runsExecute.ts — the runs seat's execute truth (extracted from
// runsRegistry.ts, the god-file cut): one run through the merged
// path — the per-stage loop, per-stage harvest + result_outputs,
// the stop-gated terminal mapping. Explicit deps, no Service state.
import type { Context } from "@deepseek-ai/cordis";
import { CARD_PLANE_ENGINE } from "@melite/contracts/benchStage";
import { ComfyUIWiringService, loadCardDefs, needComfyUI, spliceWorkflow } from "@melite/comfyui-cordis";
import type { EngineJson, MergeRow, MergeStageResult } from "@melite/comfyui-cordis";
import type { EngineExecutor, EngineStageRow } from "@melite/engine-contract";
import { errText, runRel, type RunRecord, type RunStageRow } from "./runsTypes.ts";
import { notifyRunChanged } from "./runsChange.ts";
import { engineFilmName } from "./filmLead.ts";
import { needComfyUI as _ncu } from "@melite/comfyui-cordis";
type EngineCtx = Parameters<typeof _ncu>[0];

/** THE DECLARED HERO (the mask hero defect, 2026-10-09): the
 *  stage gallery leads with engine completion order — a card that
 *  saves secondary same-kind artifacts (the mask card's manifest
 *  photo beside mask_combined) declares its product stem on the
 *  DECL (primaryFile) and the match moves first. The name may carry
 *  a HARVEST PREFIX (the live seam-proof's catch, 2026-10-09: a
 *  subfoldered save prefix makes fetchOutputs save
 *  `SaveImage.1_mask_combined_00001_.png` — the stem is a bounded
 *  TOKEN, never a basename prefix). Token rule: start-or-underscore
 *  before the stem; after it — end, "." + extension, or "_" + DIGITS
 *  (the engine counter; a longer stem-sharing name like
 *  mask_combined_union is a different product, never the hero). No
 *  match (or no stem) = engine order, never a reorder into nothing.
 *  Pure (the film-mux walls pin the precedent: presentation order is
 *  the harness's only job). */
export function declaredPrimaryFirst(names: string[], stem: string | undefined): string[] {
  if (stem === undefined || stem === "") return names;
  const token: RegExp = new RegExp(
    "(^|_)" + stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(_[0-9]|\\.|$)",
  );
  const hero = names.find((n): boolean => {
    const base = n.slice(n.lastIndexOf("/") + 1);
    return token.test(base);
  });
  if (hero === undefined) return names;
  return [hero, ...names.filter((n): boolean => n !== hero)];
}

export type SettleFn = (run: RunRecord) => void | Promise<void>;

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
    // (dev_docs/design/engine-generics-mcp.md).
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
        await settle(run);
        return;
      }
    }
    let rows: MergeRow[];
    try {
      rows = seatExecutor !== null ? [] : run.stages.map(
        (stage, i: number): MergeRow => ({
          stageId: stage.id,
          card:
            typeof stage["card"] === "string" && stage["card"] !== ""
              ? stage["card"]
              : typeof run.cardId === "string" && run.cardId !== ""
                ? run.cardId
                : undefined,
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
      await settle(run);
      return;
    }
    // THE WIRING FENCE (2026-10-10, the operator's law: ON SUBMIT
    // IS A HACK — a check threaded as an option through ONE engine
    // call is a wall someone remembered to build, not the schema
    // system). The rows are BUILT here, in the run seat, before any
    // engine action — so the doc-walk judges HERE, in the same
    // fence as the splice refusal above: every stage's graph names
    // only class_types and inputs the engine's own /object_info
    // declares, in the run's voice, before the first wire moves.
    // (The merge that follows namespaces ids and resolves $spells
    // into link VALUES — it adds no names, so the rows' name
    // surface is the engine's.) The judge is the wiring service's
    // own wall — ONE owner (wiringWall.ts), the same walk the
    // card-compose seat has always had, now at the seat every path
    // (start, restore, queue replay) already walks. NO SEAT-BRANCH
    // GATE (the audit's finding: the first cut walked only when
    // seatExecutor was null, and production ALWAYS takes the seat
    // path — the wall was dead on the lane).
    //
    // AND THE CLAIM WAS FALSE UNTIL NOW (the coverage audit's HIGH
    // finding, proven live by two independent probes: seat-mounted +
    // armed doc + a graph naming an undeclared class_type → the run
    // COMPLETED and the engine was submitted). `rows` is `[]` on the
    // seat path, so this loop iterated ZERO times in production while
    // the comment above claimed "the rows walk on BOTH paths here".
    // The adapter's post-splice walk caught the poison anyway, which
    // is why nobody saw it — but the run seat's own voice (naming the
    // STAGE, before the engine is ever touched) never fired on the
    // lane, and a composition without the adapter would submit poison
    // with the suite green.
    //
    // The fence therefore judges ONE GRAPH per stage on BOTH paths:
    // the spliced rows where the seat path already built them, and
    // the SEAT path's own splice of the stage params HERE — because
    // the compiled params are the ENVELOPE {workflow, output_nodes},
    // not the graph. The first cut walked the envelope raw and every
    // object-valued param became a PHANTOM NODE: an armed doc
    // refused every seat-path run as "card 'flow' built node
    // 'workflow' with no class_type — the graph is not addressable"
    // (the operator's face, 2026-10-10 — a card that COULD run,
    // refused by a wall judging its own envelope). The same cut
    // named the card from a stage row that carries none, falling
    // back to the invented 'flow'. The walk now names the REAL
    // card: the stage's own card when stamped, the record's cardId
    // (registration's own law: stamped for card runs, absent for
    // inline — never a guess), the stage id last.
    // Unarmed (no wiring service in the composition): the wall
    // stands down — the standing law.
    const wiring = ctx.get("comfyuiWiring") as ComfyUIWiringService | undefined;
    // UNARMED, THE WHOLE FENCE STANDS DOWN — splice included (the
    // second audit, 2026-10-11: the cut below spliced outside the
    // wall's own stand-down, so a lane whose /object_info fetch
    // failed — wall disarmed, judgment forbidden — still refused
    // runs with the SPLICE's compose voice. A/B: an unarmed
    // mcp:blender run completed before the cut and failed after,
    // the executor never called. armed() mirrors the wall's own
    // doc-null stand-down; assert() re-checks it inside.)
    if (wiring !== undefined && wiring.armed()) {
      for (let i = 0; i < run.stages.length; i++) {
        const stage = run.stages[i]!;
        // THE WALK IS A COMFY-GRAPH LAW: the stage's OWN engine token
        // is the discriminator (runEngine's rule, per stage). Absent
        // or card-plane → the compiled params are the comfy envelope;
        // anything else is a foreign lane (mcp/craft/agent) whose tool
        // params are NOT a graph — its seats own its voices, and this
        // wall never judges it, armed or not.
        const eng: unknown = stage["engine"];
        if (
          rows.length === 0 &&
          typeof eng === "string" &&
          eng !== "" &&
          eng !== CARD_PLANE_ENGINE
        ) {
          continue;
        }
        try {
          const graph =
            rows.length > 0
              ? rows[i]!.workflow
              : spliceWorkflow(
                  (run.params[i] ?? {}) as Record<string, EngineJson>,
                );
          wiring.assert(String(stage["card"] ?? run.cardId ?? stage.id), graph);
        } catch (exc: unknown) {
          const text: string = errText(exc);
          for (const st of run.stages) {
            /* v8 ignore next */
            if (st["status"] === "running") {
              st["status"] = "failed";
              st["error"] = text;
            }
          }
          run.status = "failed";
          run.error = text;
          await settle(run);
          return;
        }
      }
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
            // the card label for the adapter's walk voice — the
            // SAME preference chain the estate fence above uses
            // (stage's own card, then the run's, then the stage id
            // for flow stages that never had one)
            card:
              typeof stage["card"] === "string" && stage["card"] !== ""
                ? stage["card"]
                : typeof run.cardId === "string" && run.cardId !== ""
                  ? run.cardId
                  : undefined,
            outputs: { ...(stage.outputs as Record<string, EngineJson>) },
            params: { ...(run.params[i] as Record<string, EngineJson>) },
          }),
        );
        const outcome = await seatExecutor.executeStages(
          genericRows,
          run.dir,
          inputNames,
          { shouldStop, report },
          // The run's request initials ride every engine submit: the
          // gate-blessed values the start door extracted for this
          // flow's declared initials, so `$spell` params resolve at
          // the engine's merge. Engines whose param dialect has no
          // `$spells` ignore the record.
          run.initials,
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
        // Same law as the seat path above: the run's request initials
        // resolve the `$spells` at this merge.
        result = await engine.executeFlow(rows, run.dir, inputNames, run.initials, {
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
        notifyRunChanged(run.runId);
        if (arts.length > 0) {
          // DIVERGENCE-BY-ORDER: run-relative names, no /v1 prefix
          // (the asset HTTP face died with the app).
          let names: string[] = arts.map((a: string): string =>
            runRel(run, a),
          );
          // THE ENGINE FILM LEADS (2026-09-17; re-affirmed 2026-09-22
          // when the disk-stitch valve died): when the engine
          // composed the film (h3_t4_film), presentation order is the
          // harness's only job — film first, windows after. No mux,
          // no mix, never a shell ffmpeg: composition belongs to the
          // engine (the film-assemble stage's model-free workflow).
          const semanticNames = new Set(
            Object.values(row.outputs)
              .filter((value): value is string => typeof value === 'string' && value !== '')
              .map((value): string => runRel(run, value)),
          );
          const semantic = names.find((name): boolean => semanticNames.has(name));
          if (semantic !== undefined) {
            names = [semantic, ...names.filter((name): boolean => name !== semantic)];
          }
          const engineFilm = engineFilmName(names);
          if (engineFilm !== null && names[0] !== engineFilm) {
            names = [engineFilm, ...names.filter((name): boolean => name !== engineFilm)];
          }
          const stem = run.cardId !== undefined
            ? (await loadCardDefs()).get(run.cardId)?.primaryFile
            : undefined;
          names = declaredPrimaryFirst(names, stem);
          // (THE DISK-STITCH VALVE DIED, 2026-09-22, the operator's
          // provenance law: every artifact traces to a composition
          // of cards — no harness ffmpeg ever owned the film. The
          // film is assembled IN-GRAPH (the film-assemble stage's
          // model-free workflow: MeliteLoadVideo + the Melite audio
          // chain + CreateVideo/SaveVideo h3_t4_film); the harness's
          // only job here is presentation order.)
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
      await settle(run);
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
      await settle(run);
    }
  }

export function runEngine(run: RunRecord): string {
    const first: RunStageRow | undefined = run.stages[0];
    const engine: unknown = first?.["engine"];
    // the card plane engine is the contract value (one owner per token)
    return typeof engine === "string" && engine !== "" ? engine : CARD_PLANE_ENGINE;
  }
