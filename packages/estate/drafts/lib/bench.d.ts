import { type DraftId } from '@melite/contracts/benchStage';
import type { Domain } from "@deepseek-ai/dsh-storage-domain";
import type { DraftsDomainSpec } from "./spec.js";
import type { JsonValue } from "./remote.js";
/** The bench's Remote failure codes, merged into the protocol's one
 *  vocabulary (cookbook §2: declaration merging, next to the throw). */
declare module "@deepseek-ai/dsh-typert-protocol" {
    interface RemoteErrorDetailsMap {
        /** The session key fails the [A-Za-z0-9_-]{1,64} bench law. */
        "bench/bad-session": Record<string, never>;
        /** The body failed the bench contract (non-object / unknown keys). */
        "bench/bad-body": Record<string, never>;
        /** THE PRE-MINT COMPOSE REFUSAL (F14's estate half, 2026-10-31):
         *  the add-stage door composed the projection (live rows + the
         *  candidate) through the runs validate seat and it refused —
         *  the write never happened (no stage, no rev, nothing to roll
         *  back); the message carries the validate door's own teaching
         *  refusal. */
        "bench/compile-refused": {
            readonly session: string;
            readonly stage: string;
            readonly card: string;
        };
        /** THE MODEL ADMISSION (no-silent-drop law, hour 26 stroke 17):
         *  the stage's model is not offered by the card, or boarded but
         *  not downloaded on this machine — the write refuses with the
         *  card + the offered (present) models. */
        "bench/bad-model": {
            readonly card: string;
            readonly offered: readonly string[];
        };
        /** THE LANE REFUSAL (2026-10-10, the YOU_ARE_A_LIAR fix shape 3):
         *  the DECL's own words — the lane's declared surface + relation
         *  words — refused the state at write time, in the field's voice,
         *  with the cure in the message. Declared here so typed clients
         *  and codecs carry the shape (the door audit's MEDIUM-5: the
         *  code shipped undeclared and the runtime only agreed by luck). */
        "bench/lane-refusal": {
            readonly card: string;
        };
        /** THE FAMILY REFUSAL (journey-closure B5, 2026-10-17 — hop 3's
         *  first judge): the card's own family clause (the walk the run
         *  door enforces — h3's t4r inject keys) refused the MERGED view
         *  at write time, in the run door's own voice, one hop earlier
         *  than the run press. Declared beside its sibling so typed
         *  clients and codecs carry the shape. */
        "bench/family-refusal": {
            readonly card: string;
        };
        /** The CAS law: expect_rev missing, or the bench moved under the
         *  caller — current_rev is the rev to re-read from. */
        "bench/cas-conflict": {
            readonly current_rev: number;
            readonly expect_rev?: number;
        };
        /** The overwrite law (2026-09-15): a wholesale load onto a
         *  non-empty bench without overwrite: true — stages is how
         *  many would have been discarded. */
        "bench/overwrite-required": {
            readonly current_rev: number;
            readonly stages: number;
        };
        /** No bench doc carries that session. */
        "bench/not-found": {
            readonly session: string;
        };
        /** THE ONE-SEAT RE-SEAT's fail-closed voice (the one-seat audit,
         *  2026-10-31): the caller key is not a conversation generation
         *  and the host sessions service resolves no parent conversation
         *  — a delegated lane composes on its parent's bench or not at
         *  all; a silent birth on the orphan key is the split itself. */
        "bench/unseated": {
            readonly caller: string;
        };
        /** No stage of that id sits on the bench. */
        "bench/stage-not-found": {
            readonly session: string;
            readonly stage: string;
        };
        /** The anchored reorder's target is gone (the F1-residue cure,
         *  round 25): the id the drop named as its anchor is not on the
         *  CURRENT list — a second author removed it between the press
         *  and the apply. The honest re-ask, never a silent fallback to
         *  the stale numeric slot. */
        "bench/anchor-gone": {
            readonly session: string;
            readonly anchor: string;
        };
        /** A wiring input whose binding is neither {stage, output} nor
         *  {initial} — the run maps only those two shapes (silent drop
         *  before the 2026-09-15 wiring admission). */
        "bench/bad-wire": {
            readonly session: string;
            readonly stage: string;
            readonly input: string;
        };
        /** A stage wired to itself — a cycle composes nothing. */
        "bench/self-wire": {
            readonly session: string;
            readonly stage: string;
            readonly input: string;
        };
        /** A wiring input pointing at a stage id not on the bench (the
         *  phantom-upstream cure: 'stage-1' never existed; the mint
         *  mints s_N). */
        "bench/wire-stage-not-found": {
            readonly session: string;
            readonly stage: string;
            readonly input: string;
            readonly live: readonly string[];
        };
        /** A WIRED MEMBER CANNOT BE GROUPED (2026-10-10, the bench
         *  audit's gap 6): the run's wiring walk reads the flat stage
         *  list, so a member's wire dies the moment it is parked. */
        "bench/grouped-row-wired": {
            readonly session: string;
            readonly stage: string;
        };
        /** A wiring channel no param spells ($channel) — the wiring
         *  feeds nothing and the run would silently ignore it. */
        "bench/dead-wire": {
            readonly session: string;
            readonly stage: string;
            readonly input: string;
        };
        /** A stage of that id is already on the bench. */
        "bench/duplicate-stage": {
            readonly session: string;
            readonly stage: string;
        };
        /** The undo walk found no live, filter-matching action. */
        "bench/nothing-to-undo": Record<string, never>;
        /** The storage open refused an otherwise valid call. */
        "bench/store-failed": Record<string, never>;
    }
}
/** Session key gate: same charset family as draft ids, capped so
 * "bench-" + session always clears the 96-char draft ceiling.
 * EXPORTED (the wall audit's B-C1, 2026-09-28): the draft-id-grammar
 * wall drove the DRAFT regexes where it meant to drive this one —
 * the rule was unreadable from the outside, so the wall sampled a
 * neighbour. The export is the single derivation the clients' mirrors
 * and the wall both pin against. */
/** THE CONTRACT'S GRAMMAR, RE-EXPORTED (the identity law, 2026-09-28):
 *  the bench key is an address and has ONE grammar — the contract
 *  floor's. This copy was the owner; the floor is now. */
import { SESSION_RE } from "@melite/contracts/benchStage";
export { SESSION_RE };
declare const AUTHORS: readonly ["agent", "user"];
type Author = (typeof AUTHORS)[number];
interface BenchEntry {
    /** Filled by the persister (rev/at are the domain's, not the caller's). */
    rev: number;
    at: number;
    author: Author;
    kind: "patch" | "add_stage" | "add_stages" | "remove_stage" | "archive" | "rewire" | "reorder" | "group" | "ungroup" | "load" | "clear" | "undo" | "seed";
    stage?: string;
    summary?: string;
    /** Kind-specific inverse payload (undo applies it). */
    inverse?: Record<string, unknown>;
    /** Filled on undo entries: the revs this entry reverted. */
    reverted?: number[];
}
export interface BenchBlock {
    rev: number;
    log: BenchEntry[];
}
export declare function benchBlockOf(doc: Record<string, unknown>): BenchBlock;
/** THE STAGE-ID MINT, ONE PRODUCER (the identity law, 2026-09-28).
 *
 *  A stage with no id of its own is minted `s_<max+1>` over the LIVE
 *  rows. That law was written TWICE in this file — once for the row
 *  handed to admission, once for the row stored — and two producers
 *  of one value is the seam that just cost the operator a run (see
 *  the run id's law in runsRegistry/runsStart: the id is an INPUT to
 *  the write, not a label on it). If the two ever disagreed, the door
 *  would judge one row and the bench would store another — the
 *  "the judge sees the STORED row" law with a different id under it.
 *
 *  The collision-safe form is the law: MAX numeric suffix + 1 over the
 *  rows as they stand, never the count (a bench that lost stages
 *  re-mints a live id with the count — the 2026-09-12 fix). */
export declare function mintStageId(rows: readonly Record<string, unknown>[], body: Record<string, unknown>): string;
/** Birth defaults per the composer's law (id, inputs, provenance)
 *  with the runner's object inputs. */
export declare function normalizeStages(stagesIn: unknown, author: Author): Record<string, unknown>[];
/** The ensure row: create marker, rev, intent, stages. */
export interface BenchEnsureRow {
    readonly draft_id: DraftId;
    readonly session: string;
    readonly rev: number;
    readonly intent: JsonValue;
    readonly stages: JsonValue;
    readonly created: boolean;
}
/** The get row: the bench as it stands, log HEADS only (rev/at /
 *  author / kind / stage / summary / reverted — inverses never
 *  leave the domain). */
export interface BenchGetRow {
    readonly draft_id: DraftId;
    readonly session: string;
    readonly rev: number;
    readonly intent: JsonValue;
    readonly stages: JsonValue;
    readonly log: readonly {
        readonly [key: string]: JsonValue;
    }[];
    /** THE INCARNATION (W-3 / F3-11, 2026-11-05): the doc's epoch,
     *  served so the bench read's join can require the run side's
     *  matching stamp (queueSidecar `bench_epoch` alongside draft_id).
     *  Absent on a bench that never cleared since the cure — the key
     *  is never guessed. */
    readonly epoch?: string;
}
export declare function ensureBench(drafts: Domain<DraftsDomainSpec>, body: Record<string, unknown>, admit?: StageAdmission, lineage?: readonly string[]): Promise<BenchEnsureRow>;
/** get — one session's bench block as the served row. */
export declare function getBench(drafts: Domain<DraftsDomainSpec>, session: string): BenchGetRow;
/** get, seeded — THE READ-PATH INHERITANCE (the one-seat audit's
 *  tab-first ordering, 2026-10-31: `bench/get` refused not-found and
 *  subscribe served ZERO, so the tab's first frame after a reload
 *  was empty until a write — the operator reopens and sees nothing,
 *  the app-broken-under-green-walls face of the split). On a missing
 *  bench whose lineage resolves to an ancestor with state, this
 *  materializes the SAME seed birth the write doors use
 *  (materializeSeedBirth — one shape, both seats) and serves it; the
 *  change wire wakes on the put and every later read is the plain
 *  get. Scoped to `session-` keys: a non-generation caller key is a
 *  delegated lane the doors RE-SEAT or refuse — it never materializes
 *  its own doc (that would rebuild the split this audit closed).
 *  No lineage or no ancestor state → the caller's own not-found
 *  (the genuinely fresh conversation's law, byte-identical). */
export declare function getBenchSeeded(drafts: Domain<DraftsDomainSpec>, session: string, lineage: readonly string[] | undefined): Promise<BenchGetRow>;
/** The patch row: the touched stage + the params keys merged. */
export interface BenchPatchRow {
    readonly draft_id: DraftId;
    readonly session: string;
    readonly rev: number;
    readonly stage: string;
    readonly patched: readonly string[];
    /** THE FAMILY RESEAT'S RECEIPT (the ERROR g/h cure, 2026-11-08):
     *  the family-dead keys the settlement dropped off the merged view
     *  (the flip's own strand — the arrival flipped the derived family
     *  under carried stamps). Empty/absent when nothing dropped. The
     *  drop rides the row so it SPEAKS — never a silent strip. */
    readonly dropped?: readonly string[];
    /** Present-and-true when the patch changed what the next run
     *  composes (the done mark cleared — the skip law cannot fold
     *  it). Absent when the patch was idempotent. */
    readonly stale?: true;
    /** D-22 (the board, 2026-11-10): a LANDED write answered "no
     *  value change" on a never-run stage — `stale` only voices when a
     *  done mark EXISTED to clear, so the render read its absence as
     *  equality. The change truth now rides the row itself: true iff
     *  the stored params moved under this patch, mark or no mark. */
    readonly changed?: boolean;
    /** The moved leaves, pathed and spelled ("seed 46601 → 46602",
     *  "ref_mods removed", "edit[0].denoise 0.32 → 0.33", plus the
     *  element-merge carry note for record arrays). Empty iff the
     *  patch wrote back exactly what was stored. */
    readonly diff?: readonly string[];
}
/** patch — params merge with CAS + log. THE ONE OUTCOME DOOR
 *  (the telemetry law's other half, 2026-10-08): run outcomes ride
 *  drafts/patch — the archive's door, the poll's door. This verb
 *  authors PARAMS only (the construct tool's patch grammar is
 *  {stage, params}; the tab's outcome observer writes through the
 *  drafts door). The old result/runStatus arms wrote ARCHIVE-LESS —
 *  a landing here destroyed the previous result with no supersede —
 *  under the old every-write-bumps law, so every outcome here also
 *  ticked the rev. Outcomes refuse with the redirect voice. */
export declare function patchBench(drafts: Domain<DraftsDomainSpec>, session: string, body: Record<string, unknown>, admit?: StageAdmission, migrate?: LaneMigration, reseat?: FamilyReseat, lineage?: readonly string[]): Promise<BenchPatchRow>;
/** THE ELEMENT MERGE (defect board D-23, 2026-11-10): a partial
 *  `edit[0]` patch replaced the whole array element — `carry`,
 *  `keep_audio` and the bag's `seed` vanished from the stored bag
 *  while the tool's own description said "merge onto the stage".
 *  Record arrays (the bench's bags — edit[], calls[], every lane's
 *  one-element array of knobs) now merge ELEMENT-WISE: the arrival
 *  merges onto the stored element under the same law as the top
 *  level (null deletes a key, a stated key wins, an unstated key
 *  carries). Anything else — scalar arrays, shape-mismatched
 *  arrays, plain values — rides VERBATIM: array-of-records is the
 *  only shape whose silent loss ever burned a press, and inventing
 *  merge semantics for lists (index-less unions) is a silent error
 *  in the other direction. */
export declare function mergeParamValue(stored: unknown, arrival: unknown): unknown;
/** The diff's one-line spellings — leaf paths with before → after
 *  (D-22): "seed 46601 → 46602", "ref_mods removed", the nested
 *  "edit[0].denoise 0.32 → 0.33", and the carry note that makes an
 *  element merge legible ("edit[0]: carry, keep_audio, seed
 *  carried"). Long values are spelled as their JSON, trimmed. */
export declare function diffParams(pre: Record<string, unknown>, post: Record<string, unknown>, wrote: Record<string, unknown>): string[];
/** Canonical params spelling for the staleness compare — sorted
 * keys, recursively (a params view is a shallow record of scalars
 * and one-deep records; this spells both orders identically). */
export declare function canonicalParams(view: Record<string, unknown>): string;
/** The stage row: the arm's answer (stage id + rev). */
export interface BenchStageRow {
    readonly draft_id: DraftId;
    readonly session: string;
    readonly rev: number;
    readonly stage: string;
}
/** The batch add's row: every minted stage id under the ONE rev the
 *  whole batch landed at. */
export interface BenchStagesRow {
    readonly draft_id: DraftId;
    readonly session: string;
    readonly rev: number;
    readonly stages: readonly string[];
}
/** THE ADMISSION SEAT (the no-silent-drop law, hour 26 stroke 17):
 *  the remote injects the registry's model admission (card +
 *  params.model -> refusal with the offered list); the domain stays
 *  pure (tests inject nothing and every model passes). A refusal
 *  throws bench/bad-model AT WRITE TIME — the writer (agent or
 *  human patch) learns the model is not offered/downloaded the
 *  moment it lands, never at run time.
 *
 *  THE PROVENANCE COORDINATE (2026-09-24, the schema-master law):
 *  the third arg names the row's provenance — an admission may
 *  REPAIR a restored row (provenance 'restored') whose era model id
 *  predates today's registry, while a live-composed row (no
 *  provenance) still gets the loud refusal. The repair law lives
 *  in the injected admission (remote.ts); the domain only carries
 *  the coordinate. */
export type StageAdmission = (card: string, params: Record<string, unknown>, provenance: unknown) => void;
/** THE PRE-MINT COMPOSE SEAT (F14's estate half, 2026-10-31): the
 *  GUI card-press door composes the bench's projection — live rows
 *  PLUS the candidate — through the runs validate seat BEFORE the
 *  row lands. A refusal is a VALUE the door refuses loud with (the
 *  same verdict voice the agent tool's pre-mint gate teaches with);
 *  an absent seat admits (the registry-less law — every optional
 *  cross-service judge here drops out when its service is not
 *  mounted, the benchAdmissionOf precedent). Never throws: the
 *  verdict folds the seat's own failures into its refusal message
 *  (the estate cannot certify the projection, so it does not write
 *  it — no mint on refusal, nothing to roll back).
 *
 *  THE INCOMPLETE-DRAFT EXCEPTION (the GUI-add burn, 2026-11-01):
 *  `incomplete: true` marks the refusal as the authoring-incomplete
 *  class (an UNSTATED required lane word — tts's `text`). The
 *  frictionless-authoring ruling (operator 2026-11-11: "you are
 *  submitting a form, not hacking the mainframe") drops that class
 *  at every write seat: the add door seeds a card's axes, the words
 *  are typed in the form the landed stage opens, and the RUN door
 *  owns the required-word voice. A gate that refused the class here
 *  made the card UN-ADDABLE from the GUI — text can only be stated
 *  in a form that only exists once the stage lands. */
export type PremintCompose = (intent: unknown, projectedStages: Array<Record<string, unknown>>) => Promise<{
    ok: true;
} | {
    ok: false;
    error: string;
    incomplete?: boolean;
}>;
/** THE LANE MIGRATION SEAT (operator 2026-10-12, the stuck-switch
 *  incident): given the stage's card, the MERGED params view, and
 *  the stored row's params BEFORE the merge, returns the cleaned
 *  view — a lane-switching write drops its stale carry instead of
 *  refusing an unclickable cure. The registry resolves both lanes
 *  (prior and next) and owns the drop; registry-less lanes pass the
 *  view through untouched. */
export type LaneMigration = (card: string, params: Record<string, unknown>, priorParams: Record<string, unknown>) => Record<string, unknown>;
/** THE FAMILY RESEAT SEAT (the ERROR g/h cure, 2026-11-08): given
 *  the stage's card and the MERGED params view, returns the
 *  reseated view plus the family-dead keys the settlement dropped
 *  (the flip's own strand), or null when the card declares no
 *  reseat face (every card but the family-conditional ones) — the
 *  domain stays pure, the registry owns the law (the admission
 *  trio's injection pattern). */
export type FamilyReseat = (card: string, params: Record<string, unknown>, priorParams: Record<string, unknown>) => {
    params: Record<string, unknown>;
    dropped: readonly string[];
} | null;
/** The judged view of a row's params — the view the doc will HOLD
 *  (2026-10-10, the write-seat audit's row 7): normalizeBenchStage
 *  strips a self-naming model at store, so every admission seat
 *  judges the STRIPPED copy or the door refuses what the run
 *  composes. One spelling, used by every seat that admits a row. */
export declare function strippedForAdmission(card: string, params: Record<string, unknown>): Record<string, unknown>;
/** The wiring admission over ONE row (params = the MERGED view the
 *  next run composes; inputs = the MERGED wiring; liveIds = the
 *  bench's stage ids after the write; selfId = the row's own id —
 *  self-wiring is a cycle, refused). Throws bench/* named. */
export declare function admitWiring(row: Record<string, unknown>, params: Record<string, unknown>, inputs: Record<string, unknown>, liveIds: readonly string[], selfId: string, session: string, tolerate?: ReadonlySet<string>): void;
/** The un-wedge law's tolerance table: for every row in the list
 *  being JUDGED, the upstreams it wires that are absent from the
 *  PRE-verb live set — refs the verb did not create (they were
 *  already dead, or ride a restored snapshot the log itself
 *  recorded) and must not be refused for. Keyed by row/child id.
 *
 *  The walk is over the JUDGED rows (not the pre rows): a verb
 *  like clear leaves no pre rows at all, and undo restores rows
 *  the pre state doesn't hold — the ref a row CARRIES is the
 *  thing to classify, against what was live before the verb. A
 *  ref newly introduced by a verb (rewire's `from`, a patch's
 *  spell changes) never rides this table: those seats build their
 *  tolerate sets from the PRE ROW's own inputs, so a fresh dead
 *  target stays strict. */
/** Exported for the drafts seat (audit S-S1): the un-wedge table is
 *  the same law at every author seat. */
export declare function toleratedByRow(stages: Array<Record<string, unknown>>, preLive: ReadonlySet<string>): Map<string, Set<string>>;
/** add_stage — append a card stage with optional wiring (the
 *  runner's input convention rides the row). */
export declare function addStageBench(drafts: Domain<DraftsDomainSpec>, session: string, body: Record<string, unknown>, admit?: StageAdmission, lineage?: readonly string[], compose?: PremintCompose): Promise<BenchStageRow>;
/** THE BATCH ADD DOOR (the restore law, operator 2026-10-21:
 * "Restoring takes an extreme amount of time"): N stages land as
 * ONE write — one load, one CAS over the whole list, one save, one
 * history event, one observer wave. The per-stage gates are the
 * single add's own laws verbatim (the judged view is the stored
 * view; the mint walks the PROJECTED rows so each fresh id is fresh
 * against the bench as it stands plus the rows before it; wiring
 * admits against the projected live ids), each refusal naming the
 * row's index. EVERY gate passes before the first mutation (the
 * refusal-that-lies law): a refused batch persists nothing. */
export declare function addStagesBench(drafts: Domain<DraftsDomainSpec>, session: string, body: Record<string, unknown>, admit?: StageAdmission, lineage?: readonly string[]): Promise<BenchStagesRow>;
/** reorder — move ONE stage to a new index in the bench's stage order
 *  (the drag-reorder door, 2026-09-11: the old system's reorderRange
 *  gesture; the reborn bench is SSOT so the door exists before the UX
 *  does). The inverse carries the ORIGINAL index for undo. `to` is
 *  clamped into [0, stages.length-1] AFTER the splice-out, so a move
 *  past either end parks at the end — the drag gesture's own
 *  semantics, not an error. `after` (the F1-residue cure, round 25)
 *  is the OPTIONAL anchor id the press targeted in its pre-flight
 *  list: when present the door re-derives `to` from the anchor's
 *  index in the CURRENT list, so a second author's insert between
 *  press and apply cannot silently shift the drop's intent (the I2
 *  rebase-shift); a missing anchor refuses `bench/anchor-gone` —
 *  the re-ask is honest, the silent skew was not. */
export declare function reorderBench(drafts: Domain<DraftsDomainSpec>, session: string, body: Record<string, unknown>, lineage?: readonly string[]): Promise<BenchReorderRow>;
/** The reorder row: the move's coordinates for the caller's optimistic
 *  update (from → to, both POST-splice-clamp). */
export interface BenchReorderRow {
    readonly draft_id: DraftId;
    readonly session: string;
    readonly rev: number;
    readonly stage: string;
    readonly from: number;
    readonly to: number;
}
/** group — the Group Cards sub-view's door (2026-09-11): 2+ stage ids
 *  collapse into ONE compound row at the FIRST member's bench position;
 *  the member rows ride INSIDE the compound (children, bench order) so
 *  the bench's stage list stays the projection-free truth — the grid
 *  renders the compound as a single tile and ungroup restores the
 *  members at the compound's index. The inverse carries both halves. */
export declare function groupBench(drafts: Domain<DraftsDomainSpec>, session: string, body: Record<string, unknown>, admit?: StageAdmission | undefined, lineage?: readonly string[]): Promise<BenchStageRow>;
/** ungroup — the compound's door: spill the children back at the
 *  compound's index, in their stored order. */
export declare function ungroupBench(drafts: Domain<DraftsDomainSpec>, session: string, body: Record<string, unknown>, admit?: StageAdmission | undefined, lineage?: readonly string[]): Promise<BenchStageRow>;
/** remove_stage — splice one stage out (the inverse carries row +
 *  index for undo). */
export declare function removeStageBench(drafts: Domain<DraftsDomainSpec>, session: string, body: Record<string, unknown>, lineage?: readonly string[]): Promise<BenchStageRow>;
/** archive — F11 (2026-11-12, the friction report's housekeeping
 *  burn: spent stages re-ran ahead of newer stages, blocking the
 *  queue until manually removed). Sets (or, with off: true, clears)
 *  the row's `archived` mark: the row STAYS on the bench with its
 *  result and history (the provenance remove_stage destroys), but
 *  every run face skips it — the bench compose and the agent's
 *  bench pass both exclude archived rows, so a spent stage never
 *  re-runs ahead of newer work. A LIVE (non-archived) stage wiring
 *  an input to the row REFUSES the archive, naming the wire — an
 *  archived upstream composes nowhere, the wire would dangle at
 *  run time; unarchive or rewire first. */
export declare function archiveBench(drafts: Domain<DraftsDomainSpec>, session: string, body: Record<string, unknown>, lineage?: readonly string[]): Promise<BenchStageRow>;
/** The clear row. */
export interface BenchClearRow {
    readonly draft_id: DraftId;
    readonly session: string;
    readonly rev: number;
    readonly cleared: number;
}
/** clear — THE OPERATOR'S DEMANDED DOOR (2026-10-10, "there is no
 *  clear all"): remove EVERY stage in one verb. No survivor can
 *  dangle (there are no survivors), so the door admits on ANY bench
 *  — including a wedged one no other verb can repair — and the ONE
 *  log entry carries the full stages_before inverse (undo restores
 *  everything). The nuclear seat: use it when the bench itself is
 *  the wound. clearBench also stamps the doc's next incarnation
 *  epoch (nextBenchEpochOf) — the one writer of that key. */
export declare function clearBench(drafts: Domain<DraftsDomainSpec>, session: string, body: Record<string, unknown>, lineage?: readonly string[]): Promise<BenchClearRow>;
/** The rewire row. */
export interface BenchRewireRow {
    readonly draft_id: DraftId;
    readonly session: string;
    readonly rev: number;
    readonly stage: string;
    readonly input: string;
    /** Present-and-true when the rewire changed what the next run
     * composes (the done mark cleared — the skip law cannot fold
     * it). Absent when the rewire was idempotent. The patch door's
     * own stale voice, same coherence. */
    readonly stale?: true;
}
/** rewire — set or clear one input binding. from:
 *  {stage, output} | {initial: "image"} | absent → clear. */
export declare function rewireBench(drafts: Domain<DraftsDomainSpec>, session: string, body: Record<string, unknown>, lineage?: readonly string[]): Promise<BenchRewireRow>;
/** The undo row: the undone revs + the stages as they stand. */
export interface BenchUndoRow {
    readonly draft_id: DraftId;
    readonly session: string;
    readonly rev: number;
    readonly undone: readonly number[];
    readonly stages: JsonValue;
}
/** undo — walk the log tail, skip already-reverted entries and
 *  entries the author filter excludes, apply inverses
 *  newest-first, append ONE undo entry carrying the pre-undo
 *  snapshot. Undo entries are NEVER candidates — a plain undo
 *  walks ACTIONS (targeting them would ping-pong). */
export declare function undoBench(drafts: Domain<DraftsDomainSpec>, session: string, body: Record<string, unknown>, admit?: StageAdmission, lineage?: readonly string[]): Promise<BenchUndoRow>;
type BenchChangeListener = (session: string) => void;
/** The event seam this pure domain module reaches the bus through.
 *  `bench.ts` owns no Context (it is the domain layer, not a plugin),
 *  so the plugin installs the pair once and every writer here keeps
 *  calling {@link notifyBenchChange}. */
export interface BenchChangeSeam {
    emit: (session: string) => void;
    on: (fn: BenchChangeListener) => () => void;
}
/** Install the seam (the plugin does this with its Context; tests do
 *  it with their own). Pass null to detach. */
export declare function setBenchChangeSeam(seam: BenchChangeSeam | null): void;
/** Detach the seam ONLY if `seam` is still the installed one — the
 *  ownership stamp that keeps dispose honest: a fiber that installed
 *  EARLIER (a newer install displaced it) detaches nothing, so the
 *  live seam survives the older fiber's unwind.
 * @param seam - the seam instance the caller installed.
 */
export declare function clearBenchChangeSeam(seam: BenchChangeSeam): void;
/** Subscribe to bench writes; returns the unsubscribe.
 *
 *  THE LISTENER FAULT LAW rides HERE, not in the bus: `ctx.emit`
 *  stops at the first throwing listener and rethrows out of the emit
 *  (measured 2026-10-12 on cordis 4.0.4), while this module's
 *  contract is that a subscriber's fault never breaks the write and
 *  never starves the listeners after it. Wrapping the handler is what
 *  makes the typed event lawful here. */
export declare function onBenchChange(fn: BenchChangeListener): () => void;
/** Fire the write event — the remote layer calls this after every
 *  successful bench write (the door seam: every in-process and
 *  host-routed write crosses the remote arms). */
export declare function notifyBenchChange(session: string): void;
/** The public notify (the drafts-patch door writes bench docs from
 *  remote.ts — outside this module; it fires this with the bench-
 *  shaped draft id already branded at that door). */
export declare function notifyBenchDocWrite(draftId: DraftId): void;
//# sourceMappingURL=bench.d.ts.map
