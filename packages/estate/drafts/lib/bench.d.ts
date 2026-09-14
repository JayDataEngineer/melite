import type { Domain } from "@deepseek-ai/dsh-storage-domain";
import type { DraftsDomainSpec } from "./spec.js";
/** The bench's Remote failure codes, merged into the protocol's one
 *  vocabulary (cookbook §2: declaration merging, next to the throw). */
declare module "@deepseek-ai/dsh-typert-protocol" {
    interface RemoteErrorDetailsMap {
        /** The session key fails the [A-Za-z0-9_-]{1,64} bench law. */
        "bench/bad-session": Record<string, never>;
        /** The body failed the bench contract (non-object / unknown keys). */
        "bench/bad-body": Record<string, never>;
        /** THE MODEL ADMISSION (no-silent-drop law, hour 26 stroke 17):
         *  the stage's model is not offered by the card, or boarded but
         *  not downloaded on this machine — the write refuses with the
         *  card + the offered (present) models. */
        "bench/bad-model": {
            readonly card: string;
            readonly offered: readonly string[];
        };
        /** The CAS law: expect_rev missing, or the bench moved under the
         *  caller — current_rev is the rev to re-read from. */
        "bench/cas-conflict": {
            readonly current_rev: number;
            readonly expect_rev?: number;
        };
        /** No bench doc carries that session. */
        "bench/not-found": {
            readonly session: string;
        };
        /** No stage of that id sits on the bench. */
        "bench/stage-not-found": {
            readonly session: string;
            readonly stage: string;
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
declare const AUTHORS: readonly ["agent", "user"];
type Author = (typeof AUTHORS)[number];
interface BenchEntry {
    /** Filled by the persister (rev/at are the domain's, not the caller's). */
    rev: number;
    at: number;
    author: Author;
    kind: "patch" | "add_stage" | "remove_stage" | "rewire" | "reorder" | "group" | "ungroup" | "load" | "undo";
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
/** The ensure row: create marker, rev, intent, stages. */
export interface BenchEnsureRow {
    readonly draft_id: string;
    readonly session: string;
    readonly rev: number;
    readonly intent: unknown;
    readonly stages: unknown;
    readonly created: boolean;
}
/** The get row: the bench as it stands, log HEADS only (rev/at /
 *  author / kind / stage / summary / reverted — inverses never
 *  leave the domain). */
export interface BenchGetRow {
    readonly draft_id: string;
    readonly session: string;
    readonly rev: number;
    readonly intent: unknown;
    readonly stages: unknown;
    readonly log: readonly Record<string, unknown>[];
}
/** ensure — create the bench (birth: rev 0, empty log) or LOAD onto
 *  it (replace stages, snapshot inverse). The only arm that may
 *  create; everything else refuses a missing bench. */
export declare function ensureBench(drafts: Domain<DraftsDomainSpec>, body: Record<string, unknown>, admit?: StageAdmission): Promise<BenchEnsureRow>;
/** get — one session's bench block as the served row. */
export declare function getBench(drafts: Domain<DraftsDomainSpec>, session: string): BenchGetRow;
/** The patch row: the touched stage + the params keys merged. */
export interface BenchPatchRow {
    readonly draft_id: string;
    readonly session: string;
    readonly rev: number;
    readonly stage: string;
    readonly patched: readonly string[];
}
/** patch — params merge with CAS + log (result/runStatus ride too:
 *  run-status writes from the tab land here, authored "user"). */
export declare function patchBench(drafts: Domain<DraftsDomainSpec>, session: string, body: Record<string, unknown>, admit?: StageAdmission): Promise<BenchPatchRow>;
/** The stage row: the arm's answer (stage id + rev). */
export interface BenchStageRow {
    readonly draft_id: string;
    readonly session: string;
    readonly rev: number;
    readonly stage: string;
}
/** THE ADMISSION SEAT (the no-silent-drop law, hour 26 stroke 17):
 *  the remote injects the registry's model admission (card +
 *  params.model -> refusal with the offered list); the domain stays
 *  pure (tests inject nothing and every model passes). A refusal
 *  throws bench/bad-model AT WRITE TIME — the writer (agent or
 *  human patch) learns the model is not offered/downloaded the
 *  moment it lands, never at run time. */
export type StageAdmission = (card: string, params: Record<string, unknown>) => void;
/** add_stage — append a card stage with optional wiring (the
 *  runner's input convention rides the row). */
export declare function addStageBench(drafts: Domain<DraftsDomainSpec>, session: string, body: Record<string, unknown>, admit?: StageAdmission): Promise<BenchStageRow>;
/** reorder — move ONE stage to a new index in the bench's stage order
 *  (the drag-reorder door, 2026-09-11: the old system's reorderRange
 *  gesture; the reborn bench is SSOT so the door exists before the UX
 *  does). The inverse carries the ORIGINAL index for undo. `to` is
 *  clamped into [0, stages.length-1] AFTER the splice-out, so a move
 *  past either end parks at the end — the drag gesture's own
 *  semantics, not an error. */
export declare function reorderBench(drafts: Domain<DraftsDomainSpec>, session: string, body: Record<string, unknown>): Promise<BenchReorderRow>;
/** The reorder row: the move's coordinates for the caller's optimistic
 *  update (from → to, both POST-splice-clamp). */
export interface BenchReorderRow {
    readonly draft_id: string;
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
export declare function groupBench(drafts: Domain<DraftsDomainSpec>, session: string, body: Record<string, unknown>): Promise<BenchStageRow>;
/** ungroup — the compound's door: spill the children back at the
 *  compound's index, in their stored order. */
export declare function ungroupBench(drafts: Domain<DraftsDomainSpec>, session: string, body: Record<string, unknown>): Promise<BenchStageRow>;
/** remove_stage — splice one stage out (the inverse carries row +
 *  index for undo). */
export declare function removeStageBench(drafts: Domain<DraftsDomainSpec>, session: string, body: Record<string, unknown>): Promise<BenchStageRow>;
/** The rewire row. */
export interface BenchRewireRow {
    readonly draft_id: string;
    readonly session: string;
    readonly rev: number;
    readonly stage: string;
    readonly input: string;
}
/** rewire — set or clear one input binding. from:
 *  {stage, output} | {initial: "image"} | absent → clear. */
export declare function rewireBench(drafts: Domain<DraftsDomainSpec>, session: string, body: Record<string, unknown>): Promise<BenchRewireRow>;
/** The undo row: the undone revs + the stages as they stand. */
export interface BenchUndoRow {
    readonly draft_id: string;
    readonly session: string;
    readonly rev: number;
    readonly undone: readonly number[];
    readonly stages: unknown;
}
/** undo — walk the log tail, skip already-reverted entries and
 *  entries the author filter excludes, apply inverses
 *  newest-first, append ONE undo entry carrying the pre-undo
 *  snapshot. Undo entries are NEVER candidates — a plain undo
 *  walks ACTIONS (targeting them would ping-pong). */
export declare function undoBench(drafts: Domain<DraftsDomainSpec>, session: string, body: Record<string, unknown>): Promise<BenchUndoRow>;
type BenchChangeListener = (session: string) => void;
/** Subscribe to bench writes; returns the unsubscribe. */
export declare function onBenchChange(fn: BenchChangeListener): () => void;
/** Fire the write event — the remote layer calls this after every
 *  successful bench write (the door seam: every in-process and
 *  host-routed write crosses the remote arms). */
export declare function notifyBenchChange(session: string): void;
/** The public notify (the drafts-patch door writes bench docs from
 *  remote.ts — outside this module; it fires this with the session
 *  parsed from the bench-shaped draft id). */
export declare function notifyBenchDocWrite(draftId: string): void;
export {};
//# sourceMappingURL=bench.d.ts.map