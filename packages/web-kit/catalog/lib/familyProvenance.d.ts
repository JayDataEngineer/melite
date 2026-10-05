import type { MediaRun } from "@melite/contracts";
export interface FamilyProvenance {
    /** Completed runs that used this family. */
    count: number;
    /** Unix ms of the most recent completed run (0 when none). */
    lastRunAt: number;
}
/** Fold runs into per-family provenance. Only runs that CARRY an
 *  artifact count (the fold's done family: done, cached, reused —
 *  the estate settles success as "completed", which the old raw
 *  `!== "done"` compare never matched, so every real run's
 *  provenance read "never"). Running / interrupted / stopped runs
 *  haven't produced anything yet. Runs with no families field
 *  (pre-provenance sidecars) or a family-less brick contribute
 *  nothing (backward compatible by construction). */
export declare function familyProvenance(runs: MediaRun[]): Record<string, FamilyProvenance>;
/** Compact relative time for the tile title — "just now", "5m ago",
 *  "3h ago", "2d ago", then a short date. Pure; no i18n in scope. */
export declare function formatLastRun(at: number): string;
//# sourceMappingURL=familyProvenance.d.ts.map
