/** stage-run.ts — the card stage's run doors: ONE stage through the
 * composing {model:} door (card stages) or the FLOW door (the
 * generic MCP card — a standalone-subagent spawn), and the bench's
 * sequential pass (extracted from CardsTab.tsx hour 15). */
import type { CardsBenchValue, BenchStageView } from './cards-resource.js';
/** Run ONE card stage through its composing door (the run-wire
 *  package's startCardRun — the {model:} arm) — EXCEPT the engine
 *  stage (the generic MCP card), which runs through the FLOW door
 *  (startMcpStage below). The flow_inline door
 *  this gesture rode before cannot consume cards ("card= stages are
 *  unported on this gateway") and its executor demanded a pre-composed
 *  params.workflow nobody emitted — the Sep 11 bench runs' "node
 *  carries no inline workflow". The {model:} door composes the card's
 *  arms estate-side; `model` is the card's DEFAULT FAMILY from the
 *  catalog, and — the Run-press law, 2026-10-08 — a family-less
 *  card rides its OWN id (defaultFamilyForCard's documented
 *  fallback): the door's card-unit arm composes the card verbatim
 *  (prepareCardParams' card-unit arm; no family overlay).
 *  THE PARAM IS THE WIRE (the two-month law): whatever the stage's
 *  slot holds — an upload's estate path or a picked upstream output's
 *  media-route url — rides the start doc VERBATIM; the engine stages
 *  it under its runs-root arm. No client-side edge resolution exists.
 *  Exported for the tab seam's door-contract spec. */
export declare function runCardStage(draftId: string, row: BenchStageView): Promise<{
    runId: string;
} | {
    refused: string;
}>;
/** THE SEQUENTIAL PASS — Run ALL, the old system's composer law
 *  verbatim (flowExecuteSlice runAll, 2026-08-11): execute the
 *  stages IN ORDER, one run per card (the SAME single-stage door the
 *  drill's Run uses — a typed composer bench is never one graph
 *  run; the flow_inline door serves the chain/graph surface, not
 *  this one). Skip stages already done (the cache-hit skip). A
 *  failed or refused stage STOPS the pass — fail loud, never a
 *  doomed downstream run. The per-card observer patches each row as
 *  it goes (running → terminal), so the tiles flip one by one and
 *  the bench is never taken over. Exported for the door-contract
 *  spec. */
export declare function runBenchSequential(bench: CardsBenchValue, hooks?: {
    onCardStarted?: (runId: string, ran: {
        draftId: string;
        stageId: string;
    }) => void;
    onTouched?: () => void;
    signal?: AbortSignal;
}): Promise<{
    ran: string[];
    stoppedAt: string | null;
    refused: string | null;
}>;
//# sourceMappingURL=stage-run.d.ts.map
