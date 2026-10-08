import type { Context } from "@deepseek-ai/cordis";
import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { STAGE_PATCH_KEYS, type StagePatchKey } from "@melite/contracts/benchStage";
export { STAGE_PATCH_KEYS, type StagePatchKey };
import type { BenchEnsureRow, BenchGetRow, BenchPatchRow, BenchReorderRow, BenchRewireRow, BenchClearRow, BenchStageRow, BenchUndoRow } from "./bench.js";
export type { BenchEnsureRow, BenchGetRow, BenchPatchRow, BenchReorderRow, BenchRewireRow, BenchStageRow, BenchUndoRow, } from "./bench.js";
/** Endpoint `drafts/patch` answer — the old door's delivered envelope:
 *  a missing doc/stage is delivered:false + reason (a DOMAIN outcome,
 *  never an error); a landing patch reports the patched key set and
 *  the bench revision it landed at (the CAS law's re-read handle). */
export interface DraftPatchRow {
    draftId: string;
    stageId: string;
    delivered: boolean;
    reason?: string;
    patched?: string[];
    rev?: number;
}
/** draft_id_ok: 1..96 chars of [A-Za-z0-9_-] (the composer mint). */
/** One listed draft — the index row (recency-ordered by the caller). */
export interface DraftListRow {
    readonly draft_id: string;
    readonly model: string;
    readonly name: string;
}
/** The list result: rows capped at 600, count total pre-cap. */
export interface DraftListResult {
    readonly count: number;
    readonly drafts: readonly DraftListRow[];
}
/** JSON at the wire — the constrained face of every open doc. The
 *  Typert generator's boundary law refuses unconstrained `unknown`
 *  data in @Remote signatures (assertRemoteJsonType: "Remote
 *  boundary contains unconstrained unknown data"); open card
 *  payloads (stage params, results, history) are honestly JSON all
 *  the way down, so the wire face says exactly that. */
/** The WIRE plane's JSON tree — same deliberate readonly spelling as
 *  estate-runs' (the remote doc is a persisted record); the writer
 *  plane (card-kit graph.ts) spells it mutable. DRY sweep J13
 *  decision, 2026-10-18: variance recorded, not merged.
 *  @mode host */
export type JsonValue = string | number | boolean | null | JsonValue[] | {
    readonly [key: string]: JsonValue;
};
/** Endpoint `drafts/get` answer — the stored draft doc (open,
 *  card-authored) with its stages resolved for the wire. */
export type DraftGetRow = {
    readonly [key: string]: JsonValue;
};
/** Endpoint `drafts/patch` body — the door's FIXED key set (unknown
 *  keys refuse at admission with the old door's voice; STAGE_PATCH_KEYS).
 *  Optional: presence IS the write; a null params value is the
 *  merge-patch DELETE (the layered-params law); a null health value
 *  is the same DELETE (the recovery clear, LOW-23). */
export type DraftStagePatch = {
    params?: JsonValue;
    result?: JsonValue;
    runStatus?: JsonValue;
    health?: JsonValue;
    inputs?: JsonValue;
    inputOutputs?: JsonValue;
};
/** The bench verbs' wire body — an open JSON doc (each verb's
 *  admission law constrains its own keys at the door: stage,
 *  expect_rev, index, binding, …). */
export type BenchDoc = {
    readonly [key: string]: JsonValue;
};
/** The drafts' Remote failure codes, merged into the protocol's one
 *  vocabulary (cookbook §2: declaration merging, next to the throw). */
declare module "@deepseek-ai/dsh-typert-protocol" {
    interface RemoteErrorDetailsMap {
        /** The id fails the [A-Za-z0-9_-]{1,96} draft law. */
        "draft/bad-id": {
            readonly draftId: string;
        };
        /** No stored draft carries that id. */
        "draft/not-found": {
            readonly draftId: string;
        };
        /** The storage open refused an otherwise valid call. */
        "draft/store-failed": Record<string, never>;
        /** The stage id is empty/non-string (the patch door). */
        "draft/bad-stage-id": {
            readonly stageId: string;
        };
        /** The patch body is not a plain object (the patch door). */
        "draft/bad-patch": Record<string, never>;
        /** Keys outside the door's fixed set (the old voice names them). */
        "draft/patch-unknown-keys": {
            readonly unknown: readonly string[];
        };
        /** The domain write refused (put failed at the medium). */
        "draft/cannot-persist": Record<string, never>;
    }
}
declare module "@deepseek-ai/cordis" {
    interface Context {
        draftsRemote: DraftsRemoteService;
        benchRemote: BenchRemoteService;
    }
    interface Events {
        /**
         * A bench write landed. Emitted after every successful bench verb
         * (and after the drafts-patch door's bench-shaped write).
         * @mode emit
         * @param session - the bench session whose doc changed.
         */
        "bench.changed": (session: string) => void;
    }
}
/** Install the typed bench event seam on a Context: `bench.ts`
 *  (the pure domain module) emits and subscribes through it.
 *
 *  ONE implementation, three callers: the plugin's service, the tests'
 *  `bootCtx`, and any direct construction outside the package (it is
 *  re-exported from index.ts). The seam is fiber-scoped — `ctx.effect`
 *  detaches it when the fiber is disposed.
 *
 *  ONE SEAM AT A TIME, MEASURED (the verification, 2026-10-12): the
 *  seam is module state, so the LAST install wins, and disposing an
 *  OLDER Context nulls the newer, still-live seam. The estate is
 *  single-tenant here (one root Context, one plugin apply), and the
 *  failure mode is loud — `onBenchChange` then refuses rather than
 *  subscribing to nothing — but a tree that mounts two draft plugins
 *  must install once.
 * @param ctx - the Context whose bus carries `bench.changed`.
 * @returns the effect disposer (the effect owns it; returned for direct callers that need an early detach).
 */
export declare function installBenchChangeSeam(ctx: Context): () => void;
/** ── THE OUTPUT HISTORY HELPERS (stroke 40) ──────────────────────
 * A result's OUTPUT urls, one spelling: the artifacts name→url map
 * first, the flat assetUrls list second, the lone url third (the
 * same harvest order the client's preview reads — the history and
 * the hero can never disagree about what a run produced). */
export declare function resultOutputUrls(result: unknown): string[];
/** Same OUTPUTS (the uniqueness key): two results match when their
 * url sets are equal — a re-run landing the same urls is not a new
 * history entry (the operator's "when it is unique"). */
export declare function sameResultOutputs(a: unknown, b: unknown): boolean;
/** THE WRITE-TIME MODEL ADMISSION (the no-silent-drop law's door):
 *  the registry refuses a model the card does not offer — or a
 *  boarded model the machine has not downloaded — the moment it
 *  would land on the bench (add/patch/load), with the offered list
 *  in the error. Registry-less lanes admit everything (the local
 *  derive; never a silent throw on the serve path).
 *
 *  THE RESTORE REPAIR (operator law 2026-09-24 — receipt: loading
 *  run-257737552c00's history refused "unknown model
 *  'qwen3-tts-voicedesign-design'"; the era's compose wrote ids
 *  today's registry never boarded, so the whole archive died at
 *  the load door). A RESTORED row (provenance 'restored' — the
 *  bench-load wand's stamp on every restore arm) whose model
 *  refuses gets ONE schema-master repair: the registry's longest
 *  boarded-family dash-prefix wins, a declared-variant suffix
 *  restores the variant coordinate, era junk strips. The repair
 *  mutates the row's params IN PLACE (the load lands repaired);
 *  a repair that still refuses rethrows the ORIGINAL refusal. A
 *  live-composed row (no provenance) never repairs — the loud
 *  refusal with the board is the composer's teaching surface.
 *  Exported for the wall (a pure factory over the resolver seat). */
export declare function admissionOf(ctx: Context): ((card: string, params: Record<string, unknown>, provenance: unknown) => void) | undefined;
/** The marker that says "this row is being restored BY US" — a
 *  symbol, so a request body carrying the string "restored" buys
 *  nothing (2026-10-10, the door audit's HIGH-2: the carve was
 *  purchasable). Internal restore arms pass this; nothing over the
 *  wire can. */
export declare const RESTORED_PROVENANCE: unique symbol;
/** THE WIRE SPELLING, MAPPED (2026-10-10, the bypass audit's
 *  CRITICAL-1: the carve compared a SYMBOL that no wire can carry,
 *  so it never fired — every restored row was judged anyway, and the
 *  model-repair arm it also guards was dead. A caller cannot forge
 *  the symbol; it can only say the word `restored`, which is a
 *  REQUEST to restore, and this is the one place that turns the word
 *  into the server's authority. Nothing else in the tree needs it:
 *  the raw string is passed everywhere else and only these two
 *  comparisons treat it as the marker. */
/** THE CONTRACT'S SPELLING (the identity law, 2026-09-28) — the
 *  door and its callers read ONE coordinate, not two. */
export declare const RESTORED_WIRE_SPELLING = "restored";
/** THE LANE ADMISSION SEAT (2026-10-10, the YOU_ARE_A_LIAR fix
 *  shape 3): after the model admission passes, the registry judges
 *  the DECL's own words — the lane surface + the relation words —
 *  over the merged stage params, refusing at WRITE TIME in the
 *  field's voice with the cure in the message (the operator's
 *  incident A: CustomVoice + design_prompt without voice_name,
 *  refused at bench-write, named, cured). RESTORED rows are exempt
 *  (the same carve the model repair rides: the archive loads, the
 *  Run refusal with the cure teaches — a fresh composer gets the a
 *  priori voice). Returns undefined when the registry seat offers
 *  no lane admission (registry-less lanes). Exported for the wall
 *  (a pure factory over the resolver seat, the admissionOf
 *  precedent). */
export declare function laneAdmissionOf(ctx: Context): ((card: string, params: Record<string, unknown>, provenance: unknown) => void) | undefined;
/** THE BENCH-WRITE ADMISSION, COMPOSED (2026-10-10): the model
 *  admission (board + repair law) THEN the lane admission (the
 *  DECL's surface + relation words — fix shape 3). The pair is what
 *  every params-bearing bench write walks (ensure/patch/add/load);
 *  either refusing refuses the write in its own voice. */
export declare function benchAdmissionOf(ctx: Context): ((card: string, params: Record<string, unknown>, provenance: unknown) => void) | undefined;
/** The drafts Remote owner: list/get over the storage domain. */
export declare class DraftsRemoteService extends TypertRemoteService {
    /** THE BENCH ADMISSION THIS DOOR OWNS (2026-10-10, the door
     *  audit's CRITICAL): the same composed admission the bench
     *  doors walk, injected at construction from the resolver seat. A
     *  bench doc is a drafts doc ("bench-<session>" satisfies
     *  DRAFT_ID_RE), and the GUI's param editor rides THIS door — so
     *  without the seat a keystroke could write a stage the agent's
     *  bench/patch would refuse. Registry-less lanes get undefined
     *  (the standing degrade, never a throw). */
    /** Read LAZILY, never at construction (2026-10-10): the drafts row
     *  can be constructed before the cards registry seats, and a
     *  captured `undefined` would be a permanent silent degrade — the
     *  exact class of hole this door was closed for. One resolver
     *  lookup per write, and the seat is whatever is live then. */
    private benchAdmit;
    constructor(ctx: Context);
    /** Endpoint `drafts/list` — the domain index, recency DESC. */
    remoteExportList(signal: AbortSignal): Promise<DraftListResult>;
    /** Endpoint `drafts/get` — one doc by id. */
    remoteExportGet(draftId: string, signal: AbortSignal): Promise<DraftGetRow>;
    /** The in-process API the adapters above delegate to. */
    list(signal: AbortSignal): Promise<DraftListResult>;
    /** The in-process API the adapter above delegates to. */
    get(draftId: string, signal: AbortSignal): Promise<Record<string, unknown>>;
    /** Endpoint `drafts/patch` — the stage patch door, REBORN on the
     *  domain (2026-09-11; the gateway-era PATCH /v1/flows/drafts/:id/
     *  stages/:sid died with the app and stroke L left the client door
     *  a throwing stub). Semantics VERBATIM from the old door (hDraftStagePatch, the retired gateway drafts door): admission on the fixed key set (STAGE_PATCH_KEYS: params | result | runStatus | inputs | inputOutputs — unknown
     *  keys refuse with the door's voice), params merge PER-KEY into
     *  the stage's existing params (never replace), the domain write
     *  bumps the recency column, and the answer is the delivered
     *  envelope. THE SHARED STATE DOOR: the agent (bench verbs) and
     *  the user (the card drilldowns) author the SAME domain records
     *  through it — one truth, two authors.
     *
     *  THE LAYERED-PARAMS LAW (2026-09-14, the parameter audit): the
     *  params map is the stage's USER layer — a key's PRESENCE is the
     *  override mark (never its value). Two additions make the door
     *  speak it: (1) JSON Merge Patch semantics for params — a null
     *  value DELETES the key (the reset/unset path; RFC 7386's
     *  convention, the wire form of the settings system's unset path
     *  op); (2) the door JOINS the bench CAS law — every write bumps
     *  bench.rev and appends a kind:'patch' log entry, and expectRev
     *  (nullable) fences the write: a bench that moved refuses loud
     *  with bench/cas-conflict carrying current_rev, never merges
     *  under the earlier author. */
    remoteExportPatch(draftId: string, stageId: string, patch: DraftStagePatch, expectRev: number | null, signal: AbortSignal): Promise<DraftPatchRow>;
    /** The patch arm the adapter above delegates to. */
    patch(draftId: string, stageId: string, patch: Record<string, unknown>, expectRev: number | null, signal: AbortSignal): Promise<DraftPatchRow>;
}
/** The bench Remote owner: ensure/get over the same drafts domain
 *  (the bench doc IS a draft doc, id "bench-<session>"). */
export declare class BenchRemoteService extends TypertRemoteService {
    constructor(ctx: Context);
    /** Endpoint `bench/get` — one session's bench block as the row. */
    remoteExportGet(sessionKey: string, signal: AbortSignal): Promise<BenchGetRow>;
    /** Endpoint `bench/subscribe` — THE PUSH SOURCE (the collapse
     *  plan's stream arm, 2026-09-12): the session's doc on open, then
     *  a fresh doc after EVERY write that touches the session (the
     *  change events the write arms fire). Stream mode rides the
     *  typert logical-stream carrier — the in-process mux carries it
     *  today; the browser's resource provider consumes rev drift until
     *  the host's HTTP stream face lands, then swaps its source here
     *  with zero consumer changes. Abort ends the stream; a write's
     *  listener fault never breaks the stream (the next write re-wakes
     *  it). */
    subscribe(sessionKey: string, signal: AbortSignal): AsyncIterable<BenchGetRow>;
    /** Endpoint `bench/ensure` — birth or load (the only creating arm). */
    remoteExportEnsure(doc: BenchDoc, signal: AbortSignal): Promise<BenchEnsureRow>;
    /** The in-process API the adapters above delegate to. Classified
     *  bench failures pass through untouched; only the open itself
     *  wraps as bench/store-failed. */
    get(session: string, signal: AbortSignal): Promise<BenchGetRow>;
    /** The in-process API the adapter above delegates to. */
    ensure(doc: BenchDoc, signal: AbortSignal): Promise<BenchEnsureRow>;
    /** Endpoint `bench/patch` — params merge (+result/runStatus) with
     *  CAS + log. */
    remoteExportPatch(sessionKey: string, doc: BenchDoc, signal: AbortSignal): Promise<BenchPatchRow>;
    /** Endpoint `bench/add-stage` — append a card stage. */
    remoteExportAddStage(sessionKey: string, doc: BenchDoc, signal: AbortSignal): Promise<BenchStageRow>;
    /** Endpoint `bench/remove-stage` — splice one stage out. */
    remoteExportRemoveStage(sessionKey: string, doc: BenchDoc, signal: AbortSignal): Promise<BenchStageRow>;
    /** Endpoint `bench/clear` — THE OPERATOR'S CLEAR ALL (2026-10-10,
     *  "there is no clear all"): every stage out in one verb, one log
     *  entry, undoable whole. The nuclear seat for a bench that is
     *  itself the wound. */
    remoteExportClear(sessionKey: string, doc: BenchDoc, signal: AbortSignal): Promise<BenchClearRow>;
    /** Endpoint `bench/rewire` — set or clear one input binding. */
    remoteExportRewire(sessionKey: string, doc: BenchDoc, signal: AbortSignal): Promise<BenchRewireRow>;
    /** Endpoint `bench/reorder` — move one stage to a new index (the
     *  drag-reorder door, 2026-09-11). */
    remoteExportReorder(sessionKey: string, doc: BenchDoc, signal: AbortSignal): Promise<BenchReorderRow>;
    /** Endpoint `bench/group` — collapse 2+ stages into a compound row
     *  (the Group Cards sub-view's door, 2026-09-11). */
    remoteExportGroup(sessionKey: string, doc: BenchDoc, signal: AbortSignal): Promise<BenchStageRow>;
    /** Endpoint `bench/ungroup` — spill a compound's children back. */
    remoteExportUngroup(sessionKey: string, doc: BenchDoc, signal: AbortSignal): Promise<BenchStageRow>;
    /** Endpoint `bench/undo` — walk the log tail, apply inverses. */
    remoteExportUndo(sessionKey: string, doc: BenchDoc, signal: AbortSignal): Promise<BenchUndoRow>;
    /** The in-process APIs the adapters above delegate to. The
     *  domain's classified failures pass through untouched; only the
     *  open itself wraps as bench/store-failed. */
    private open;
    patch(session: string, doc: BenchDoc, signal: AbortSignal): Promise<BenchPatchRow>;
    addStage(session: string, doc: BenchDoc, signal: AbortSignal): Promise<BenchStageRow>;
    removeStage(session: string, doc: BenchDoc, signal: AbortSignal): Promise<BenchStageRow>;
    clear(session: string, doc: BenchDoc, signal: AbortSignal): Promise<BenchClearRow>;
    rewire(session: string, doc: BenchDoc, signal: AbortSignal): Promise<BenchRewireRow>;
    undo(session: string, doc: BenchDoc, signal: AbortSignal): Promise<BenchUndoRow>;
}
//# sourceMappingURL=remote.d.ts.map
