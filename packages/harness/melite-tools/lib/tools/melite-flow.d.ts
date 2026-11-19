import { type DraftId } from '@melite/contracts/benchStage';
import type { Estate } from '../estate.js';
import type { ToolDefinition } from '../types.js';
/** THE OUTCOME OBSERVER, agent-side (observeRunOutcome's law, the
 *  attribution half): poll the run to terminal, writing every flip
 *  onto the stage row (runStatus + result) through the DRAFTS
 *  stage-patch door — `/v1/flows/drafts/<draftId>/stages/<stageId>`
 *  (THE SKIP-DONE HOLE, transcript-011's duplicate GPU runs, fixed
 *  2026-09-24: the old arm posted runStatus/result to the BENCH
 *  patch verb, whose law REFUSES run outcomes — "run outcomes ride
 *  the drafts/patch door" — so every agent-side attribution was
 *  refused and swallowed as bookkeeping; done marks never landed
 *  and the next bench pass re-ran completed stages. The UI's
 *  observer always used this door — that is why the user's Run All
 *  skipped and the agent's never did). Patches remain bookkeeping —
 *  a refusal is swallowed (the run's own outcome is the answer) —
 *  but the door is now the one the law names, so the swallow only
 *  ever sees transport, never a wired-in refusal. The url rides the
 *  estate's media route: run-RELATIVE names prefix
 *  /melite-media/runs/<runId>/, urls that carry a scheme or lead
 *  with / pass verbatim (the ONE rewrite — the run-wire law,
 *  mirrored). */
export declare function observeAndAttribute(estate: Estate, draftId: DraftId, stageId: string, runId: string, signal: AbortSignal, test: boolean, budgetMs?: number, rearms?: number, inputRuns?: Record<string, string>): Promise<{
    status: string;
    url: string;
    artifacts: string[];
    asset_urls: string[];
    host_paths: string[];
    stamp_note?: string;
    attribution?: string;
}>;
export declare function meliteFlow(estate: Estate): ToolDefinition;
//# sourceMappingURL=melite-flow.d.ts.map
