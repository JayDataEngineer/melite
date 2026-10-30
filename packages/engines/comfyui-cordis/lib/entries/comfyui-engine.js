import { needComfyUI, spliceWorkflow, } from "../comfyui.js";
/** Splice + merge the engine-agnostic rows into MergeRows (the
 * door-validated params are the graph carrier; spliceWorkflow
 * throws the planner's refusal on a bad stage — the run fails
 * with that text, exactly as the pre-seam worker's splice catch
 * did). outputNodes derives from params["output_nodes"] — the
 * owning engine's derivation, not the consumer's (the worker did
 * the same extraction pre-seam; the door never strips the key). */
function toMergeRows(rows) {
    return rows.map((row) => ({
        stageId: row.stageId,
        card: typeof row.card === "string" && row.card !== "" ? row.card : undefined,
        workflow: spliceWorkflow(row.params),
        outputs: { ...row.outputs },
        outputNodes: {
            ...(row.params["output_nodes"] ?? {}),
        },
        params: { ...row.params },
    }));
}
/** The executor: merged submit through the host service. The ctx
 * rides in for ONE reason: the wiring walk below resolves the
 * wiring service AT WALK TIME (a doc that lands after this plugin
 * mounts still judges every later submit — resolve-at-apply would
 * freeze the unarmed state of a late-armed lane). */
export function comfyuiExecutor(ctx, host) {
    return {
        async executeStages(rows, runDir, inputNames, options, initials = {}) {
            const mergeRows = toMergeRows(rows);
            const nodeCount = mergeRows.reduce((n, r) => n + Object.keys(r.workflow).length, 0);
            // THE THIRD WALK SEAT (the audit's finding: production ALWAYS
            // submits through this adapter, and the run seat's fence —
            // before this reseat — was the only one, gated to the
            // seat-less path, so the lane never walked a graph). This is
            // the POST-SPLICE graph: exactly the object the engine will
            // receive, walked before the first wire moves. The run seat
            // already judged the pre-splice rows in its own voice; this
            // walk adds the final-graph judgment — splice, $spells and
            // all — through the SAME judge (wiringWall), same doc. An
            // unknown class or an undeclared input refuses HERE, in the
            // estate's voice, never at the engine. The refusal rides the
            // run seat's existing catch (the splice refusal's path):
            // stages failed, run settled, nothing submitted.
            const wiring = ctx.get("comfyuiWiring");
            if (wiring !== undefined) {
                for (const row of mergeRows) {
                    // the VOICE names the composer (the audit's F-2): the
                    // card when the run was card-commissioned — the estate
                    // fence's own preference chain — never the stage id
                    // dressed as a card name
                    wiring.assert(row.card ?? row.stageId, row.workflow);
                }
            }
            options.report({
                activity: "merged submit (" + mergeRows.length + " stages, " + nodeCount + " nodes)",
            });
            const result = await host.executeFlow(mergeRows, runDir, inputNames, 
            // THE REQUEST INITIALS: the run's $spells resolve against
            // this record at planMerge — an empty record refuses any
            // stage whose params spell an initial the flow declared.
            initials, {
                shouldStop: options.shouldStop,
                report: options.report,
                stateRoots: options.stateRoots,
            });
            const stages = Object.entries(result.stages).map(([stageId, outcome]) => ({
                stageId,
                outputs: outcome.outputs,
                artifacts: outcome.artifacts,
            }));
            // THE BRAND MINT (F3, 2026-11-05): the one site the raw wire
            // prompt_id becomes the contract's EngineRef — the producer
            // brands (the RunId convention), the consumer and the ledger
            // read the branded id, never a bare string past this seam.
            return { stages, engineRef: result.promptId, replaySuspect: result.replaySuspect };
        },
    };
}
/** The adapter row: engine-comfyui-adapter. inject declares the
 * 'engines' seat (load-order gate — the contract row rides
 * first); the host service resolves by needComfyUI (LOUD on a
 * miswire, the one-cast-site law). */
export const comfyuiEngine = {
    name: "engine-comfyui-adapter",
    inject: ["engines"],
    apply(ctx) {
        const seat = ctx.get("engines");
        const host = needComfyUI(ctx, "engine-comfyui-adapter");
        ctx.effect(() => seat.register("comfyui", { executor: comfyuiExecutor(ctx, host) }));
    },
};
export { comfyuiEngine as default };
//# sourceMappingURL=comfyui-engine.js.map