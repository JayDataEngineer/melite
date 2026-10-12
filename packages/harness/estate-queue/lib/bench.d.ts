/** One bench stage's picks — the card it composes and the model it
 *  names (the model is unstated unless explicitly put in params). */
export interface StagePick {
    readonly card: string | null;
    readonly model: string | null;
}
/** The process's melite boot instant — pinned once, survives the
 *  estate's re-apply churn (each re-apply re-imports modules; the
 *  globalThis pin keeps ONE cutoff per process). */
export declare function benchBootMs(): number;
export declare function benchDir(storageRoot?: string): string;
/** The LIVE bench's stage picks — docs written during this
 *  process's life only (the boot cutoff; stale docs from dead
 *  sessions are invisible by law). Sync by need: buildSkillIndex
 *  rides the seat handler synchronously. Malformed or racing docs
 *  contribute nothing — never a crash.
 *  @param storageRoot the drafts store's resolved storage root —
 *  one root for writer and reader (the C1 law); defaults to the
 *  store's own default law. */
export declare function benchPicksSync(storageRoot?: string): StagePick[];
//# sourceMappingURL=bench.d.ts.map
