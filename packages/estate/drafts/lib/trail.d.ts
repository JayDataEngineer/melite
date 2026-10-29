export declare function canonicalOutputUrl(url: string): string;
/** A result's OUTPUT urls, one spelling: the artifacts name→url map
 *  first, the flat assetUrls list second, the lone url third (the
 *  same harvest order the client's preview reads). */
export declare function resultOutputUrls(result: unknown): string[];
/** The draft row's terminal words (see remote.ts's trail laws). */
export declare function isTerminalTrailWord(v: unknown): boolean;
/** Same run identity: two non-empty equal run_id strings. */
export declare function sameTrailRunIdentity(a: unknown, b: unknown): boolean;
/** THE ONE-ROW-PER-RUN TRAIL (bench-trail W2's law, applied to any
 *  carried history): identity is the run_id first — the media route
 *  and the gallery proxy spell the same file differently — with the
 *  canonical-url set as the no-id fallback. Order preserved, newest
 *  first in, newest first out. */
export declare function trailDedupe(history: unknown[]): unknown[];
/** THE OUTCOME APPLY (moved verbatim from remote.ts's patchBody
 *  writeTelemetry closure, 2026-10-26 carry-batch: the restore's
 *  batched carry lands through bench/add-stages — a second writer
 *  the trail laws must judge identically, and a forked copy is how
 *  the archive drifts. ONE implementation, two doors: drafts/patch
 *  (the live observer's door, with its R6 live-row re-resolution at
 *  the call) and addStagesBench's per-row outcome arm (fresh rows
 *  in hand — no re-resolution needed). @param stage the LIVE row to
 *  mutate in place @param patch the outcome body ({result?,
 *  runStatus?, health?} — telemetry only, never author keys). */
export declare function applyOutcomePatch(stage: Record<string, unknown>, patch: Record<string, unknown>): void;
//# sourceMappingURL=trail.d.ts.map