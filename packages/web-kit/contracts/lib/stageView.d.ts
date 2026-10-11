/** stageView.ts — the keyed `cards.stage.view` slot's OWNER currency
 *  (the ui-tool law verbatim): everything the bench host hands a card's
 *  stage surface. This is the CONTRACT a card package's own client
 *  entry programs against — the host (the card-view plugin) and every
 *  self-registering card studio import it from here, never from the
 *  host package (a card must not depend on the bench that hosts it:
 *  adding a card never touches the host, the DSH plugin contract).
 *
 *  The view is a pure function of what the bench already knows, plus
 *  the host callbacks the drill owns. Keyed by CARD name; an unclaimed
 *  key falls back to the generic form-spec card. */
import type { CardGenre, CardResult, CardStage, CardStatus } from './card.ts';
/** Re-exported for the seats that judge status words through this
 *  module (the vocabulary's owner route — see statusOf below). */
export type { CardStatus } from './card.ts';
export interface StageViewOwnerProps {
    /** Bench stage identity (stable across param edits). */
    stageId: string;
    /** Wire card name — the keyed dispatch value. */
    cardName: string;
    /** Frozen bench row (params/inputs/outputs as the SSOT holds them).
     *  `resolved` (when present) is the estate's SERVED compose input —
     *  prepareCardParams' own stamps, what the next run will see — the
     *  1:1 run law's served truth; the studio layers it under its user
     *  state (resolveValue's base arm). */
    row: Record<string, unknown>;
    /** The estate's own runStatus field ('' when never run). */
    runStatus: string;
    /** Patch stage params through drafts/patch (the slot's own door). */
    onPatch: (patch: Record<string, unknown>) => void;
    onWireSlot?: (slotKey: string, upstreamId: string | null, outputName?: string | null) => void;
    /** Start the run for THIS stage (the single-stage gateway). */
    onRun: () => void;
    /** THE GESTURE REGISTRATION (hour-26, the 1:1 law): a studio that
     *  must PATCH ITS DOMAIN FIRST binds its run verb here — the frame's
     *  top-bar pill calls the bound verb, never a bare onRun that would
     *  start past un-flushed domain state. */
    bindRun?: (run: () => void) => void;
    /** Cancel a live run (runs/stop). */
    onStop: () => void;
    /** Remove the stage from the bench. */
    onRemove: () => void;
    /** Host verb: report the envelope's size class (the zoom card
     *  frame listens — 'huge' grows the card; '' = the default). */
    onSurface: (size: string) => void;
    /** The other stages' LATEST OUTPUTS (the picker's candidates —
     *  the slot is the wire: picking one writes this row's param). */
    upstream: Array<{
        id: string;
        title: string;
        url: string;
    }>;
    /** The draft's last started run (client memory until the estate
     *  serves draft→run; the studio polls runs/status for artifacts). */
    runId: string | null;
    effective?: {
        model?: string;
        params?: Record<string, unknown>;
        inputSlots?: string[];
    };
    priorStageIds?: string[];
}
export interface StageViewProjectionOptions {
    kind?: string;
    service?: string;
    genre?: CardGenre;
    result?: (row: Record<string, unknown>, result: CardResult | null) => CardResult | null;
}
export interface UpstreamStageProjectionOptions {
    kind?: string;
    service?: string;
    genre?: CardGenre;
}
/** THE STATUS FOLD — the one owner of "what does this raw status word
 *  mean" (2026-10-13, the card-UI duplication audit: five seats folded
 *  the same words privately and disagreed — 'cached' rendered as `done`
 *  in one and a failure-looking `stopped` in another, and a stage the
 *  estate settles as 'completed' matched no branch at all in one of
 *  them). Every seat asks THIS. */
export declare function statusOf(value: string): CardStatus;
/** THE TERMINAL JUDGEMENT — the other half of the same question ("is
 *  this run finished?"), which five seats also spelled privately with
 *  DISAGREEMENT: one set treated `unknown` as terminal and `error` as
 *  live, the other the reverse, so a run in either word never stopped
 *  a poller on one plane. The estate's own vocabulary is the node
 *  truth (`RunStatus = queued|running|completed|failed|stopped|
 *  stopping`, estate-queue/src/runsTypes.ts); `error` and `unknown`
 *  additionally ride the wire (melite-run-wire documents `error` as
 *  the run record's own failure stamp; runStatusContract lists
 *  `unknown` as a schema value), so both belong on the terminal side
 *  here. */
export declare function isTerminalStatus(value: string): boolean;
/** The terminal word set, exported so a seat that needs to SHOW it
 *  (a poll's stop condition, a doc) reads the same list. Reconciled
 *  with the backend's RUN_STATUSES (catalog/src/runStatusContract.ts)
 *  2026-10-01: `interrupted` joined, and the file-era done words
 *  (`succeeded`, `success`) became terminal — a poller handed either
 *  previously ran to its ceiling. The card-plane words (done, cached,
 *  reused, skipped, stale) stay out: runs are never stamped with
 *  them; they describe artifacts, not run lifecycle. */
export declare const TERMINAL_RUN_STATUSES: ReadonlySet<string>;
export declare function isLiveRunStatus(value: string): boolean;
/** The fold's whole input domain — every run-level word `statusOf` and
 * the terminal/live judgements branch on, in ONE list. Boundary readers
 * (readRunStatus) throw on words outside it: garbage must fail loud at
 * the read, never fold to 'pending' or pass through raw (the
 * schema-strictness audit's fix 3, 2026-10-01). Kept in lockstep with
 * statusOf's case list by the walls spec (a word in one and not the
 * other fails the test). */
export declare const RUN_STATUS_WORDS: ReadonlySet<string>;
/** THE VIEW-SIDE READ (the shared seam, 2026-10-12): a projection
 *  answers "what should this row show", and a word outside the
 *  vocabulary has no answer to show — it is the no-information home,
 *  not a crash. `statusOf` above stays the strict classifier (it
 *  refuses, because a caller asking it for a classification deserves
 *  the truth); every view seat reads through THIS so the membership
 *  law lives once instead of per seat. Absence ('') folds the same
 *  way, which is why it needs no case of its own downstream. */
export declare function statusOrPendingOf(value: string): CardStatus;
export declare function cardResultFromRecord(value: unknown): CardResult | null;
export declare function projectStageView(owner: StageViewOwnerProps, options?: StageViewProjectionOptions): CardStage;
export declare function projectUpstreamStages(owner: Pick<StageViewOwnerProps, 'upstream'>, options?: UpstreamStageProjectionOptions): CardStage[];
//# sourceMappingURL=stageView.d.ts.map