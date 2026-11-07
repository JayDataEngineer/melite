/** True iff `s` is a base64 data URL (large enough that streaming
 *  matters — the timeline package gates its blob handling on this).
 *  The object-URL cache this module once carried was deleted with the
 *  2026-10-21 dead-exports census: no production consumer converted
 *  through it — only the module's own spec. */
export function isDataUrl(s) {
    return typeof s === 'string' && s.startsWith('data:') && s.length > 128;
}
//# sourceMappingURL=objectUrlCache.js.map