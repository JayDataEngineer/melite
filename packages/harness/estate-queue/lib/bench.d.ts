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
/** The bench storage root — ONE symmetric seam (race-class audit
 *  rec 1, 2026-10-12 "FIX ALL GAPS" round): MELITE_BENCH_STORAGE
 *  overrides BOTH the writer's seed tree and the reader's walk, so
 *  writer and rider still share ONE root per process (the C1 law's
 *  letter — the retired DSH_HOME seam fed the READER alone, a
 *  split-brain; this seam moves both sides together). Its first
 *  tenant: the disclose/tool-output wall specs boot on isolated
 *  mktemp roots instead of the shared repo tree, killing the
 *  bench-seeder race structurally (CONTRACTS §4 debt 11). Default:
 *  the store's own default law. */
export declare function benchStorageRoot(): string;
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