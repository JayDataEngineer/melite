import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol';
import { type ClientRemote } from '@deepseek-ai/dsh-api-gateway/client';
import { isTerminalRun } from '@melite-plugin/melite-run-wire';
import { fetchLatestRunForDraft, fetchRunStageUrl, fetchRunTerminal } from '@melite/card-base/client';
import { type BenchNamespace } from '@melite/card-base/client';
export type { BenchNamespace };
import type { FlowEventFrame } from './draft.js';
/** The cards resource's Remote failure code, merged into the
 *  protocol's one vocabulary (cookbook §2: declaration merging, next
 *  to the throw — the gateway/internal bucket died with the app). */
declare module '@deepseek-ai/dsh-typert-protocol' {
    interface RemoteErrorDetailsMap {
        /** The door's wire is untyped at this seam — the address prefixes
         *  the diagnostic. */
        'cards/unclassified': Record<string, never>;
    }
}
/** One bench stage as the door serves it (presentation extras ride —
 *  this is the USER-facing view; the runner projection strips them). */
export interface BenchStageView {
    id: string;
    engine?: string;
    card?: string;
    title?: string;
    params?: Record<string, unknown>;
    /** Named input bindings (the rewire door's truth):
     *  {source: {stage, output} | {initial}} — string[] was the dead
     *  flow-era shape. */
    inputs?: Record<string, unknown>;
    outputs?: string[];
    provenance?: string;
    runStatus?: string;
    /** THE TRANSPORT-HEALTH CHANNEL (LOW-23, 2026-10-12): the card
     *  plane's resource signal — 'unreachable' after the escalation
     *  threshold, absent otherwise, deleted on recovery. Never a
     *  runStatus value: a resource signal is not run vocabulary. */
    health?: string;
    result?: unknown;
    /** THE SERVED RESOLVED MAP (hour-26 stroke 15, the 1:1 run law):
     *  prepareCardParams' own stamped + lifted body, served by the
     *  drafts doors — the form layers it under the user layer. */
    resolved?: Record<string, unknown> | null;
    /** THE OUTPUT HISTORY (stroke 40): the stage's PREVIOUS results,
     *  newest first, estate-capped at 12 — archived server-side at
     *  every result overwrite (the live poll's progress faces never
     *  destroy a run's outputs; entries are unique by url set).
     *  Each entry may carry `params` — the snapshot of the params
     *  that MADE that generation, taken at result landing (the
     *  output-component stroke; entries archived before it carry
     *  none). */
    history?: unknown[];
    [key: string]: unknown;
}
/** Append-only log head rows (the revision trail's public voice). */
export interface BenchLogHead {
    rev: number;
    author?: string;
    kind?: string;
    [key: string]: unknown;
}
/** `dsh-resource://cards/bench`. */
export interface CardsBenchValue {
    kind: 'bench';
    draftId: string;
    rev: number;
    stages: BenchStageView[];
    log: BenchLogHead[];
    /** THE SESSION KEY (stroke 80 — the misaddressed-delete fix): the
     *  bench's own conversation key, carried ON the value so every
     *  mutation verb (remove/reorder/group/ungroup) addresses the doc
     *  the bar RENDERS. Before this, the wires hardcoded 'main' — a
     *  non-main bench's adds landed in its own draft (addStageWire
     *  already carried the key) while its deletes hit MAIN's doc and
     *  refused 'stage not found' against rows main never held. */
    sessionKey: string;
}
/** One run stage as the status door serves it — the run-wire
 *  package's row (re-exported: this module's public face is stable
 *  for the studio and the tests). */
export type { RunStageStatus } from '@melite-plugin/melite-run-wire';
import type { RunStageStatus } from '@melite-plugin/melite-run-wire';
/** `dsh-resource://cards/run/<runId>` — the hydrated status merged with
 *  every later events frame (last frame kept for the view). draftId is
 *  the card-back-into-flow key: the draft that produced the run
 *  (status serves it; null for runs that name none). */
export interface CardsRunValue {
    kind: 'run';
    runId: string;
    status: string;
    draftId: string | null;
    stages: RunStageStatus[];
    lastFrame: FlowEventFrame | undefined;
}
export type CardsValue = CardsBenchValue | CardsRunValue | CardsDraftValue;
/**
 * `dsh-resource://cards/draft/<draftId>/<stageId>` — ONE stage of a
 * flow draft, the conversation card's studio target (the old embed's
 * law, restored: the chat card opens the authoring surface — the
 * studio claims `cards.stage.view` inside the Cards tab — never a
 * params form). The value carries the WHOLE draft's stages so the
 * drill's input picker (the slot-is-the-wire law) sees siblings'
 * latest outputs exactly as the bench view does.
 */
export interface CardsDraftValue {
    kind: 'draft';
    draftId: string;
    stageId: string;
    intent: string;
    stages: BenchStageView[];
    /** the draft doc's bench revision (0 when the doc carries no bench
     *  block) — the CAS fence's expect handle for param writes. */
    rev: number;
}
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface ResourceProtocolMap {
        /** The Melite cards tab: the shared bench and live runs. */
        cards: CardsValue;
    }
}
/** The bench address (the legacy bare form serves 'main' — the
 *  pre-session key records resolve unchanged). */
export declare const CARDS_BENCH_ADDRESS = "dsh-resource://cards/bench";
import { benchSessionOf } from '@melite/contracts/benchStage';
export { benchSessionOf as benchSessionKey };
/** The bench address for one session key. */
export declare function benchAddressOf(sessionKey: string): string;
/** The session key a bench address carries (the bare legacy address
 *  and every non-bench address resolve to 'main'). */
export declare function benchSessionOfAddress(address: string): string;
/** The run address (the wand's target, plan §5). */
export declare function cardsRunAddress(runId: string): string;
/** The draft-stage address — the conversation card's studio target
 *  (the old embed's law; both segments encode, either may carry the
 *  separators the bare grammar refuses). */
export declare function cardsDraftStageAddress(draftId: string, stageId: string): string;
/** Parse a cards address; null when the path is not one of ours. */
export declare function parseCardsAddress(address: string): {
    bench: true;
} | {
    run: string;
} | {
    draft: string;
    stage: string;
} | null;
/** Defensive row readers — the door's wire is untyped at this seam. */
/** THE CARD BIRTH LAW, ONE PLACE (2026-10-10, the wire audit's
 *  CRITICAL-1): a chat-born bench's stage arrives with NO `card` —
 *  its identity survives on the DRAFT INTENT alone. The law was
 *  written out three times (readBench, the chat consult, and NOT at
 *  all in freshStageRow), so a tile could RENDER a card and then
 *  refuse to run: the drill read the re-attached row, the run read
 *  the raw one. One function, every reader: a single-stage
 *  card-born bench takes its identity from the intent; a
 *  user-authored multi-stage bench carries `card` per row and never
 *  takes this arm. */
export declare function deriveCardForRow(stages: BenchStageView[], intent: string): BenchStageView[];
/** THE PROBE VERDICT, TRANSLATED (2026-10-10, the wire audit's
 *  H1): a file-era sidecar can answer `success` or `unknown` (the
 *  runs list admits both, and probeRunGone returns them verbatim).
 *  The tile's vocabulary has neither — so the stage was stamped with
 *  a status no dot knows, the observer stopped, and the tile looked
 *  idle FOREVER though its run had finished. The map is here, once:
 *  a verdict this client cannot render becomes a terminal one it
 *  can, never an unknown word stamped onto a row. */
export declare function tileStatusFromVerdict(verdict: string): 'running' | 'done' | 'stopped';
export declare function readBench(doc: Record<string, unknown>, sessionKey: string): CardsBenchValue;
/** A missing bench is a FRESH conversation's honest zero state, not a
 *  failure (stroke 44): a conversation's bench is born by its first
 *  write; reading before that serves the empty bench — rev 0, so the
 *  birth (rev 1) lands as a FRESH frame and the spotlight reveals
 *  the very first card. */
export declare function emptyBench(sessionKey: string): CardsBenchValue;
/** Re-read one conversation's bench — the consumer's reload
 *  after its own edits (the provider's bench stream is a single
 *  snapshot; same-address navigation does not re-run it). */
export declare function fetchBench(sessionKey: string, signal?: AbortSignal): Promise<CardsBenchValue>;
/** media/list — the runs-tree library (moved beside the bind it
 *  rides: @melite/card-base/client — re-exported here so the
 *  tab's existing import keeps working). */
export { fetchMediaLibrary } from '@melite/card-base/client';
/** CardsTab's visibility contract: true while the bench surface is
 *  the mounted tab body, false the moment it unmounts (another tab
 *  took the pane, or the column collapsed its body away). */
export declare function markCardsSurface(live: boolean): void;
/** Whether the spotlight should reveal given the seat's own state
 *  (exported for the wall battery: the flag + the column's expanded
 *  face decide together — a collapsed column shows the rail, not the
 *  flow, so it still reveals). */
export declare function shouldSpotlight(isExpanded: boolean): boolean;
/** THE SPOTLIGHT WATCHER, STREAM EDITION (2026-09-15, the mux swap —
 *  the heartbeat poll is DEAD): consume `bench/subscribe` for the
 *  ACTIVE session key — every estate write pushes one item, so the
 *  reveal fires at write time, not at the next tick. On a rev drift
 *  whose fresh log entries carry author "agent", fire onAgentLand
 *  once. The FIRST item of each key is hydration — history never
 *  yanks the user forward on load or on a conversation switch (the
 *  per-key baseline map survives re-keys, so returning to a key
 *  never replays its past).
 *
 *  RE-KEY WITHOUT A TIMER: the session source's observable
 *  (HostObservable.subscribe — push, no polling) trips a latch the
 *  consumption loop races against the pending item; a key change
 *  disposes the stream and reopens on the new key. Without the
 *  subscription seam the watcher still re-keys on the next item (a
 *  quiet switch delays only its own reveals, never the active
 *  stream's).
 *
 *  A terminal stream failure ends the watcher best-effort (logged —
 *  the watcher owns no rendered truth, the tab tail does; its
 *  swallow can hide nothing). Returns the stop function (the
 *  plugin's effect disposer). */
export declare function watchBenchLands(getSession: () => string, onAgentLand: (sessionKey: string) => void, signal: AbortSignal | undefined, remote: ClientRemote | undefined, benchNs: BenchNamespace | undefined, subscribeSession: ((fn: () => void) => () => void) | undefined): () => void;
export declare function observeRunOutcome(draftId: string, stageId: string, runId: string, signal?: AbortSignal, onTouched?: () => void): Promise<'done' | 'failed' | 'stopped' | null>;
/** THE PHANTOM RECONCILE (2026-09-13): rows stamped running/queued
 *  whose run the restarted estate no longer knows flip to their
 *  honest terminal (the file-era list's answer, else stopped) — the
 *  observer that would have written it died with the session that
 *  started the run. Live rows arm a tab-side observer so terminal
 *  always lands even when the starting session is gone. Idempotent
 *  per stage:run key (the `armed` set is the caller's, kept across
 *  bench refreshes). */
export declare function reconcileBenchRuns(bench: CardsBenchValue, hooks?: {
    signal?: AbortSignal;
    onTouched?: () => void;
    armed?: Set<string>;
}): Promise<void>;
/** THE TERMINAL OUTCOME BUILDER (pure, under CONTRACT — the
 * operator's law, 2026-09-20). Turns a terminal runs/status row
 * into the bench patch's result + runStatus. The row it returns
 * satisfies `benchResultDefects` (the bench stage result contract)
 * — the observer writes lawful rows only, and the walls drive THIS
 * builder against the real status shape (never a hand-claimed
 * fixture).
 *
 * ONE FILE, ONE KEY (the doubled-rowset cure): the artifacts map
 * carries each file EXACTLY ONCE, keyed by its gallery name. The
 * legacy hardcoded 'video' stamp wrote the stage url — which IS
 * gallery[0] — under a second key, so every image-gen result
 * rendered the same picture twice (hero + a phantom rest-thumb
 * row). The h3 timeline (the stamp's only reader) backfills its
 * own artifacts.video when absent — no consumer needs the stamp.
 * The primary `url` field may name a file that also lives in the
 * map (it is the primary POINTER, not a second key). */
export declare function terminalOutcomeOf(runId: string, status: string, stage: {
    url?: unknown;
    gallery?: unknown;
    error?: unknown;
    reports?: unknown;
} | undefined, runError: string | undefined): {
    result: Record<string, unknown>;
    terminal: 'done' | 'failed' | 'stopped';
};
export declare function readRun(runId: string, doc: Record<string, unknown>): CardsRunValue;
/**
 * Normalize a `drafts/get` doc into the draft-stage value. The row
 * shape is the bench's own (DraftRecord stages carry id/card/params/
 * result extras verbatim); the defensive filter keeps rows with a
 * string id, mirroring readBench — the door's wire is untyped at this
 * seam and a malformed row must not break the whole view.
 */
/** THE FRESH-READ LAW (2026-09-13 incident): the run composes the
 *  ESTATE's row — read back AFTER the drill's patch — never the
 *  client's stale render row. The drill patches the bench, then Run
 *  reads; composing the clicked-open row object drops every param
 *  typed between open and Run (the music prompt refusal: typed, Run,
 *  compose saw nothing). Returns null when the estate read fails or
 *  the row is gone — the caller composes its held row and the door
 *  refuses honestly. */
export declare function freshStageRow(draftId: string, stageId: string, signal?: AbortSignal): Promise<BenchStageView | null>;
export declare function readDraft(draftId: string, stageId: string, doc: Record<string, unknown>): CardsDraftValue;
/** The card-back-into-flow report — counts, never throws for
 *  per-stage skips (a refusal STOPS the restore and throws: a half
 *  flow with a silent hole would be the lie). */
export interface RestoreReport {
    added: number;
    skipped: number;
    carried: number;
    notes: string[];
}
/** Card-back-into-flow: restore a run's producing draft onto the
 *  shared bench — drafts/get (the draft holds the full
 *  card/engine/params stages) then per-stage bench/add-stage as the
 *  USER (the CAS law: bench/get first, each add carries expect_rev,
 *  chained from the previous answer's rev). A stage with no card is
 *  SKIPPED and counted (add-stage requires one); an id collision
 *  retries once without the id (the bench auto-ids s_<n>) and notes
 *  it. Any other refusal throws with the door's own text — the bench
 *  keeps whatever landed before it, and the report says so.
 *
 *  THE OUTCOME CARRY (2026-10-02, the resume law's run-view half):
 *  the run's own stage rows hold the terminal outcome a bare
 *  re-admission loses — the add-stage door authors params only and
 *  refuses result/runStatus by its own law, so the outcome rides the
 *  same drafts patch door the live observer writes, stamped by the
 *  same builder (terminalOutcomeOf). Matching is by stage id (the
 *  run executed this very draft's rows); a draft edited since keeps
 *  its surviving ids' outcomes and simply has none for new rows. */
export declare function restoreRunToBench(run: CardsRunValue, sessionKey: string, signal?: AbortSignal): Promise<RestoreReport>;
/** Merge one events frame into a run value (stage rows upserted by id;
 *  run-status frames replace the status; the frame is kept for the view). */
export declare function mergeRunFrame(value: CardsRunValue, frame: FlowEventFrame): CardsRunValue;
/** The provider registration body: `ctx.resources.register({ protocol:
 *  'cards', open })`. The bench tail rides the mounted remote face
 *  (bench/subscribe over the mux — the client entry passes the live
 *  ctx.remote here); abort ends the stream per the contract. */
export declare function openCardsResource(address: string, ctx: {
    signal: AbortSignal;
}, remote: ClientRemote | undefined, benchNs: BenchNamespace | undefined): AsyncIterable<RemoteResult<CardsValue>>;
/** Bind the run-frames carrier (the client entry, once, after mounts).
 *
 * @param remote the live remote face ($stream included); undefined
 *   unbinds (tests reset between mounts) */
export declare function bindRunFramesRemote(remote: ClientRemote | undefined): void;
/** The sidebar conversation card's live tail — run frames by run id
 *  (the run view's resource, same address, same carrier law).
 *
 * @param runId the started run
 * @param signal abort disposes the stream and ends the tail
 * @returns the run resource's frames: one hydrate, then movement */
export declare function subscribeRunFrames(runId: string, signal: AbortSignal): AsyncIterable<RemoteResult<CardsRunValue>>;
/** The stage's artifact URL from its run (the studio's output half)
 *  — the run-wire package's verb, re-exported (public face stable).
 *  Carries the SINGLE-STAGE FALLBACK: a one-stage run's stage IS the
 *  asked stage ({model:} runs name stages by the card's skeleton). */
export { fetchRunStageUrl, fetchRunTerminal, fetchLatestRunForDraft };
/** isTerminalRun re-export (the run-view stream's terminal law). */
export { isTerminalRun as isTerminal };
//# sourceMappingURL=cards-resource.d.ts.map
