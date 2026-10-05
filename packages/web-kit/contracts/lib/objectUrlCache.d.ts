/** True iff `s` is a base64 data URL (large enough to benefit from conversion). */
export declare function isDataUrl(s: unknown): s is string;
/**
 * Convert a data URL (or pass through other URL forms) to a cached object URL.
 *
 * - `data:…` URLs → converted once, cached, returned.
 * - `blob:`, `http:`, `https:`, relative paths → returned as-is.
 * - `null` / `undefined` / empty → returned as-is (caller handles).
 *
 * The same input always yields the same output for the lifetime of the
 * module (until revokeObjectUrlFor or revokeAll is called).
 */
export declare function dataUrlToObjectUrl(url: string | null | undefined): string | null;
/** Revoke the object URL associated with `sourceUrl` (the original data URL). */
export declare function revokeObjectUrlFor(sourceUrl: string): void;
/** Revoke every cached object URL. Intended for tests and explicit teardown. */
export declare function revokeAll(): void;
/** Test-only: how many object URLs are currently cached. */
export declare function _cachedCount(): number;
//# sourceMappingURL=objectUrlCache.d.ts.map
