export type RunStatusProbe = (runId: string) => string | null;
export declare function registerRunStatusProbe(fn: RunStatusProbe | null): void;
/** The row's live status, or null when this process owns no live
 *  row — mirrors `gw.runs.get(rid)` (the retired resume/reproduce
 *  doors). */
export declare function runStatus(runId: string): string | null;
//# sourceMappingURL=runStatus.d.ts.map
