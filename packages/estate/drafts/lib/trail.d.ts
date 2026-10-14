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
//# sourceMappingURL=trail.d.ts.map
