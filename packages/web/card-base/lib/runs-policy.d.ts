/**
 * runs-policy.ts — the run verbs over THE ONE LANE (stroke 81; the
 * shared home, stroke 81b — beside estate-remote, for the same
 * singleton reason: sibling studio clients poll runs here).
 *
 * The run-wire package's policy laws, moved verbatim onto the
 * mounted runs namespace: status/list/start/stop are typed calls
 * through ctx.remote (the generated client — the Connection owns
 * transport, RPC ids, envelopes, cancellation; the hand-written
 * envelope lane is dead). Refusals resolve as RemoteResult error
 * branches and throw EstateRefusedError carrying the estate's
 * message verbatim (WireRefusedError's discrimination role — the
 * gone-verdict, the poll's file-era arms key on the CLASS, not the
 * words). The PURE laws (readRunStatus's normalize, toRunMediaUrl's
 * one rewrite, the terminal vocabulary, the list-row url law) stay
 * in the run-wire package — their ONE definition; only the
 * transport moved.
 */
import { type RunStatusRow } from '@melite-plugin/melite-run-wire';
/** Every start verb's outcome: the minted run, or the refusal text
 *  (the estate's own voice — never thrown past the gesture).
 *  refusedDetails rides the door's structured payload when it
 *  carried one (the lane-miss artifact, 2026-10-22). */
export type StartOutcome = {
    runId: string;
} | {
    refused: string;
    refusedCode?: string;
    refusedDetails?: Record<string, unknown>;
};
/** THE WIRE SPELLING OF THE INCOMPLETE-DRAFT CLASS (the wire-chain
 *  audit cure, 2026-10-18): one exported const for every client
 *  comparer — the tab's heal-vs-carry split, the run seat, the
 *  specs. The ENVELOPE spelling (card_compose_incomplete) stays
 *  server-side in RUNS_ERROR_CODES; this is what the wire answers
 *  and the only literal the client owns. */
export declare const WIRE_CARD_COMPOSE_INCOMPLETE = "runs/card-compose-incomplete";
/** THE WIRE SPELLING OF THE LANE-MISS CLASS (the missing-model
 *  popup, operator 2026-10-22): the refusal whose details name the
 *  missing artifact and its manager fetch URL — the tab opens the
 *  download popup on this literal, never on message prose. */
export declare const WIRE_LANE_INPUT_MISSING = "runs/lane-input-missing";
/** THE WIRE SPELLING OF THE TRANSIENT TEARDOWN CLASS (the lifecycle
 *  latch's press refusal, `010e3cde`): the engine is mid restart,
 *  free, or switch and the press answered 409. The row is not failed —
 *  the cure is a re-press once the teardown settles. The ENVELOPE
 *  spelling (lifecycle_inflight) stays server-side in
 *  RUNS_ERROR_CODES; this is what the wire answers and the only
 *  literal the client owns. */
export declare const WIRE_LIFECYCLE_INFLIGHT = "runs/lifecycle-inflight";
/** One runs/status read (normalized once — readRunStatus's law). */
export declare function fetchRunStatus(runId: string, signal?: AbortSignal): Promise<RunStatusRow>;
/** One runs/list row by run_id (the file-era face — runs/status only
 *  knows live runs; the list is the completed runs' SSOT). */
export declare function fetchListRow(runId: string, signal?: AbortSignal): Promise<Record<string, unknown> | null>;
/** THE SINGLE-STAGE FALLBACK: a one-stage run's only stage IS the
 *  asked stage — the {model:} door names its stage by the card's
 *  declared skeleton ('img-to-mesh'), not the bench row id ('s_1')
 *  the caller holds; matching ids first keeps multi-stage runs
 *  exact while single-stage card runs answer under any label.
 *  File-era arm: a REFUSED status (the run is not in the live
 *  map) falls back to the runs/list row's first artifact —
 *  completed runs answer here, not at the status door.
 *  Transport errors rethrow (the caller decides retry); a live
 *  answer with no url yet is null (the poll loop keeps going). */
export declare function fetchRunStageUrl(runId: string, stageId: string, signal?: AbortSignal): Promise<string | null>;
/** A run's terminal read (stops poll loops). */
export declare function fetchRunTerminal(runId: string, signal?: AbortSignal): Promise<boolean>;
/** THE GONE-VERDICT (2026-09-13 phantom-running incident): for a run
 *  the live registry no longer knows (an estate restart wiped the
 *  in-memory map). The file-era law: a refused id may still answer
 *  from runs/list (the completed runs' SSOT); absent from both, the
 *  run is GONE — nothing will ever write its terminal, so the caller
 *  stamps 'stopped'. Transport errors rethrow (not a verdict — the
 *  caller retries or leaves the row alone). */
export declare function probeRunGone(runId: string, signal?: AbortSignal): Promise<'live' | 'gone' | string>;
/** The draft's newest run (runs/list adoption — the reload-proof
 *  bridge: the estate is the SSOT, never the client's memory).
 *  NOTE the list's ordering: media-bearing runs first, then
 *  newest-first — scan the wide tail, newest by created_at. */
export declare function fetchLatestRunForDraft(draftId: string, signal?: AbortSignal): Promise<string | null>;
/** runs/stop — the cancel door (the registry seat's flag +
 *  interrupt). Refusals throw the estate's text. */
export declare function stopRun(runId: string, signal?: AbortSignal): Promise<void>;
/** THE CARD DOOR — the one that composes. `model` is the FAMILY id
 *  ('trellis2-native' — the runs door resolves neither card ids nor
 *  aliases, unlike form-spec's card-id arm; fetchCardFamilies
 *  carries the card→families currency). `params` are the card's
 *  declared knobs, sent TOP-LEVEL beside the envelope keys — the
 *  door's own convention (CARD_ENVELOPE_KEYS strip; a nested
 *  `params` stanza is the CLI compat arm and merges UNDER the
 *  stamped siblings, so stanza values lose to the family
 *  defaults). */
export interface StartCardRunInput {
    model: string;
    params: Record<string, unknown>;
    draftId: string;
    /** Default false — a real run. */
    test?: boolean;
}
/** Start ONE card through the composing door (the bench drill's
 *  Run, a studio's Run — every single-card gesture rides this). */
export declare function startCardRun(input: StartCardRunInput, signal?: AbortSignal): Promise<StartOutcome>;
/** THE FLOW DOOR — pre-composed stages only: each stage's params must
 *  already carry `workflow` (card= stages are refused unported by the
 *  gateway; the compose door is startCardRun's). */
export interface StartFlowInlineInput {
    flowId: string;
    stages: Array<Record<string, unknown>>;
    draftId: string;
    /** Default false — a real run. */
    test?: boolean;
}
/** Start pre-composed stages through the flow door (whole-bench Run —
 *  honest refusal when the stages carry no workflow or the bench is
 *  multi-stage: the single-stage policy is the estate's). */
export declare function startFlowInlineRun(input: StartFlowInlineInput, signal?: AbortSignal): Promise<StartOutcome>;
/** pollRunStageUrl's knobs. */
export interface PollStageOpts {
    /** Fires exactly once when the stage's artifact url lands. */
    onUrl(url: string): void;
    /** Default 1500ms (the run pump's own observation granularity). */
    intervalMs?: number;
}
/** THE ARTIFACT POLL (the old pollFlowRun law, moved verbatim onto
 *  the mounted runs namespace — stroke 81 dropped it by accident and
 *  the img-to-mesh studio's import caught the hole): the run is the
 *  SSOT — check the stage's url immediately, then on the cadence
 *  until it lands (onUrl once, resolve), the run settles without
 *  one (resolve silent — the caller's empty state is honest), or
 *  signal aborts.
 *
 *  THE TWO ERROR CLASSES settle differently:
 *  - TRANSPORT failures (the wire is down) are swallowed: the next
 *    poll may recover.
 *  - REFUSALS (EstateRefusedError — the estate answered) on
 *    runs/status prove the run is NOT in the live map: nothing is
 *    executing for it. The file-era arm then consults the runs/list
 *    row ONCE and settles from it — its artifact url when it
 *    carries one, silent otherwise (file-era rows never update, so
 *    waiting would be the lie); no row at all settles silent the
 *    same way. A transport-failed list read keeps the poll alive
 *    (the answer may land next cadence). */
export declare function pollRunStageUrl(runId: string, stageId: string, opts: PollStageOpts, signal?: AbortSignal): Promise<void>;
//# sourceMappingURL=runs-policy.d.ts.map
