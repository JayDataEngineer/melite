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
export declare function benchDir(): string;
/** Cheap change signal — name+mtime+size over EVERY bench doc
 *  (cutoff never applies here: any write, live or stale, must
 *  retrigger the poll so the catalog follows the bench). */
export declare function benchFingerprint(): Promise<string>;
/** The LIVE bench's stage picks — docs written during this
 *  process's life only (the boot cutoff; stale docs from dead
 *  sessions are invisible by law). */
export declare function benchPicks(): Promise<StagePick[]>;
/** The sync twin of benchPicks — for sync surfaces (buildSkillIndex
 *  rides the seat handler synchronously). Same law: live docs only
 *  (mtime >= the process boot), malformed docs contribute nothing. */
export declare function benchPicksSync(): StagePick[];
//# sourceMappingURL=bench.d.ts.map
