/**
 * draft.ts — the native card surface's data layer. The model half is
 * PURE (tests import it directly); the fetch half rides the estate's
 * mounted Typert namespaces (stroke 81's one-lane law — the
 * generated client through ctx.remote, never a hand-written
 * envelope; the parameter names ARE the wire fields):
 *   drafts.get(draftId)     → the draft doc (createdAt IS the version —
 *                             bumped on every server-side rewrite)
 *   runs.start({draft_id})  → {run_id} | RemoteError (doc carries the
 *                             draft_id the caller wants started)
 *   runs.status(runId)      → per-stage status + artifact urls
 *
 * Every function narrows untrusted JSON defensively — a malformed doc
 * throws with its own name at the call site, never in the render tree.
 */
/** One draft stage as the door serves it (superset tolerated). */
export interface DraftStage {
    id: string;
    title?: string;
    kind?: string;
    service?: string;
    params?: Record<string, unknown>;
    inputs?: unknown[];
    status?: string;
}
/** The draft doc (GET /v1/flows/drafts/<id>). */
export interface DraftDoc {
    draft_id: string;
    intent?: string;
    stages: DraftStage[];
    status?: string;
    createdAt?: number;
    /** THE BENCH BLOCK (the domain's own revision law — the draft doc
     *  carries it; the patch door bumps it on every write). The CAS
     *  fence's expect handle. */
    bench?: {
        rev: number;
        log: unknown[];
    };
}
/** Per-stage status from the run-status door. */
export interface RunStageStatus {
    id: string;
    status: string;
    url?: string;
}
/** GET /v1/flows/status/<run_id> (the fields the card surface reads). */
export interface RunStatusDoc {
    run_id: string;
    status: string;
    stages?: RunStageStatus[];
}
/** The events-bus frame — the run-event stream's wire type.
 * `stage` frames are
 * idempotent patches onto the run the 700ms poll owns; `run` frames
 * with a terminal status end the stream. */
export type FlowProgress = {
    value: number;
    max: number;
    node?: string;
};
export type FlowEventFrame = {
    type: 'run';
    status: string;
} | {
    type: 'stage';
    stage: string;
    index?: number;
    status?: string;
    progress?: FlowProgress;
    activity?: string;
    error?: string;
};
import { toRunMediaUrl } from '@melite-plugin/melite-run-wire';
import { type CardStatus } from '@melite/contracts/stageView';
/** The media URL seam — the run-wire package's ONE rewrite
 *  (toRunMediaUrl, the browser twin of @melite/estate-media's
 *  mediaUrl): bare run-relative names ride the estate's media
 *  route; urls that already carry a URL pass verbatim. Kept as a
 *  named export for this module's consumers — the definition lives
 *  in ONE package (the operator's DRY law). */
export { toRunMediaUrl as mediaUrl };
/** The draft doc; throws the door's own named refusal on failure. */
export declare function fetchDraft(draftId: string): Promise<DraftDoc>;
/** The draft's CURRENT bench rev — the CAS handle for a write the
 *  caller composed without one (the outcome observer holds no rev;
 *  a drill held its open-time rev while the agent moved the bench).
 *  Reads the served doc's own bench block; null when the door won't
 *  say (the caller then throws loud, never writes blind). */
export declare function fetchDraftRev(draftId: string): Promise<number | null>;
export interface StageWriteState {
    readonly pending: number;
    /** Param keys whose latest write FAILED and has not since landed
     *  (the audit's B2, 2026-09-23: a single lastError slot let ANY
     *  later success erase a real refusal while the UI still showed
     *  the failed value — failure memory is per-KEY, cleared only by
     *  that key landing). */
    readonly failedKeys: string[];
    readonly lastError: string | null;
    readonly confirmedRev: number | null;
}
/** The stage's write accountability snapshot — what the UI consults
 * before it lets anything compose from this doc. */
export declare function stageWriteState(draftId: string, stageId: string): StageWriteState;
/** Register an authoring edit: the value rides the row on the
 *  trailing delay. The promise settles when the door ANSWERED —
 *  also when a later edit superseded this one (the waiters ride the
 *  newest write's fate: one key, one write, every waiter hears it)
 *  and when the run gate forced the write out of band. The ledger
 *  owns the failure memory either way. */
export declare function scheduleStageParam(draftId: string, stageId: string, 
/** ONE key — the trailing coalescer's unit is a single typed
 *  field. This signature is the 2026-10-12 construction fix: the
 *  old Record<string, unknown> ACCEPTED a multi-key marriage patch
 *  and silently split it per key, so a variant pick that did
 *  everything right still produced half-switch writes the compose
 *  door refused ('stated cfg 3.5 is OUTSIDE the route envelope for
 *  variant "turbo"'). Multi-key writes are CONTRACTS, not typing:
 *  they can only reach patchStageParams — ONE door write, judged
 *  against the state they describe. */
name: string, value: unknown, expectRev?: number): Promise<void>;
/** Await every authoring write still in flight for the stage (the
 * run gate's flush). Never throws — the caller reads the settled
 * state and refuses the run on any failure. */
export declare function flushStageWrites(draftId: string, stageId: string): Promise<StageWriteState>;
/** THE RUN GATE'S VOICE (the one-press/one-engine law) — the ONE
 * seat every run verb rides (runCardStage, the chat tile, every
 * future caller): flush the stage's authoring writes, then refuse
 * with the naming message when a key's latest write has not landed.
 * Null = the press may compose. Never throws. */
export declare function refuseForUnlandedWrite(draftId: string, stageId: string): Promise<string | null>;
/** Drop the whole ledger (spec isolation ONLY — same discipline as
 * unbindEstateRemote: specs share draft/stage ids across tests, and
 * a refusal recorded by one test must not refuse the next test's
 * run. Production NEVER calls this: the ledger's memory is the
 * law). */
export declare function resetStageWrites(): void;
/** Reconcile the failure memory against what the studio NOW shows
 * (the write-seat audit's dead-end finding, 2026-10-10): a key whose
 * write FAILED stays in failedKeys forever — but after the drill
 * closes and REOPENS, the edit state reseeds from the HELD row, so
 * the studio shows the field empty while the run gate still refuses
 * naming a key nobody holds anymore (a GHOST: the cure — "retype the
 * field" — is invisible, the refusal looks like a lie). A failed key
 * is dead weight from a prior session of the form only when NOBODY
 * can show it: the held row does not carry it, the freshly seeded
 * edit state does not carry it, AND the form does not DECLARE it
 * (the second audit's live-drop finding, 2026-10-11: seedUser seeds
 * only held keys + axis rows, but the form RENDERS every declared
 * field — a declared-but-never-written 'prompt' shows an empty field
 * the operator can retype, so its refusal is live and curable, not
 * a ghost). A key any of the three still carries KEEPS its refusal
 * — that failure is live and the gate must voice it. */
export declare function reconcileStageWriteFailures(draftId: string, stageId: string, heldParams: Record<string, unknown>, seededParams: Record<string, unknown>, declaredKeys?: ReadonlySet<string>): void;
/** Edit one stage's params — the REAL door, reborn 2026-09-11: the
 *  drafts remote's `drafts/patch` write arm over the drafts domain
 *  (the gateway-era PATCH /v1/flows/drafts/:id/stages/:sid died with
 *  the app; stroke L stubbed this to a loud throw — the shared-state
 *  door is back, same per-key merge semantics server-side). Throws
 *  the door's named refusal; delivered:false lands as a named throw
 *  (never a lying success). Null params values ride VERBATIM —
 *  the door's JSON Merge Patch arm deletes those keys (the unset
 *  path's domain half). */
export declare function patchStageParams(draftId: string, stageId: string, params: Record<string, unknown>, expectRev?: number): Promise<void>;
/** Report a stage's RUN OUTCOME onto the bench row — the same
 *  shared-state door (runStatus + result keys of the fixed patch
 *  set). This is the chain's attribution half: the estate names
 *  runs by DRAFT only (every bench stage runs under the shared
 *  bench draft), so the tab — the one that knows WHICH stage ran —
 *  writes the outcome the wire edge later reads. result.url rides
 *  the media-route currency (renders in tiles AND stages verbatim
 *  as the next run's chained input). health is the transport
 *  channel (LOW-23): `health: 'unreachable'` escalates, `health:
 *  null` clears on recovery — the status word itself never carries
 *  a resource signal. At least one of runStatus/health/result
 *  rides every body this helper sends. */
export declare function patchStageOutcome(draftId: string, stageId: string, outcome: {
    runStatus?: string;
    health?: string | null;
    result?: Record<string, unknown>;
}, expectRev?: number): Promise<void>;
/** Start the run; returns the run_id or throws the door's named refusal. */
export declare function startDraft(draftId: string): Promise<string>;
/** The terminal statuses — the tail's stop condition must match the
 *  stream's, or a dropped socket rides forever / an unknown run stops
 *  early. */
export declare function runFinished(status: string): boolean;
/** One card row in the chat tile: the stage distilled for listing. */
export interface CardRow {
    stageId: string;
    title: string;
    kind: string;
    service: string | null;
    prompt: string | null;
    /** Status precedence: live run status > draft stage status > never
     *  ran. THE ONE VOCABULARY (2026-10-01): the private five-word union
     *  (which dropped success/stopped/unknown/live/stale/skipped/reused
     *  into a 'ready' that reads never-ran) is dead — the row carries
     *  the fold's CardStatus. The estate's queued-for-start stage word
     *  ('pending') folds to 'queued' — the waiting face — so a live
     *  run's yet-to-start stages read waiting, not never-ran. The
     *  'pending' home is the no-information face: '' and words outside
     *  the vocabulary land there through the view-side read (no dot,
     *  not running — never a thrown render). */
    status: CardStatus;
    thumbUrl: string | null;
}
/** Distill the draft (+ optional live run status) into card rows. */
export declare function cardRows(doc: DraftDoc, live?: RunStatusDoc | null): CardRow[];
/** Fold one events-bus frame onto the live status doc — an idempotent
 *  patch onto the same store the poll writes. Stage frames patch
 *  positionally by index; terminal run frames set the run status. */
export declare function foldFrame(prev: RunStatusDoc | null, runId: string, frame: FlowEventFrame): RunStatusDoc;
/** One editable param field (the form model — v1 atoms bind these). */
export interface ParamField {
    key: string;
    value: string | number | boolean;
    /** The ui-primitives atom the field binds: Input (text/number) or Switch. */
    atom: 'text' | 'number' | 'switch';
}
/** Project a stage's params into editable fields (in key order). */
export declare function paramFields(params: Record<string, unknown>): ParamField[];
/** Coerce an edited atom value back to the param's wire type. The
 *  numeric leg delegates to the spec owner's parseNumericInput —
 *  an unparseable or emptied input keeps the field's current value
 *  (the owner's own law; clearing the box is not a zero edit). */
export declare function coerceEdit(field: ParamField, next: string): string | number | boolean;
/** The edit map: RAW values as typed (strings for Input fields,
 *  booleans for Switch) — coercion happens once, at patch time, so
 *  typing "1." keeps its dot mid-keystroke. */
export type EditMap = ReadonlyMap<string, string | boolean>;
/** The PATCH body for one stage: only the keys whose coerced value
 *  actually changed (a "1." retyped back to the original number is NOT
 *  an edit). */
export declare function editPatch(fields: ParamField[], edits: EditMap): Record<string, unknown> | null;
//# sourceMappingURL=draft.d.ts.map
