/**
 * Global cache that converts base64 data URLs (the format segment videos
 * and audio cues are stored as in the timeline store) into object URLs
 * (`blob:…`) that the browser can stream without re-parsing the data URL
 * on every React render.
 *
 * Why this matters:
 *   `data:video/mp4;base64,…` strings can be tens of MB. Handing them
 *   directly to `<video src>` means the browser re-decodes the base64 on
 *   every render, and React's virtual DOM diff serializes the full
 *   string into the prop comparison. An object URL is a ~40-char handle
 *   that the browser resolves internally to the same bytes — orders of
 *   magnitude cheaper at the rendering layer.
 *
 * Trade-off:
 *   Object URLs hold the bytes alive until revoked. We don't revoke
 *   automatically — the cache grows with unique videos in the session.
 *   For a typical session (<100 segments) this is fine. A future
 *   enhancement (see EDITOR-IMPROVEMENT-TRACKER E1.3b) is to add LRU
 *   eviction tied to segment removal.
 *
 * Idempotent: calling dataUrlToObjectUrl() twice with the same input
 * returns the same object URL.
 */
const cache = new Map();
/** True iff `s` is a base64 data URL (large enough to benefit from conversion). */
export function isDataUrl(s) {
    return typeof s === 'string' && s.startsWith('data:') && s.length > 128;
}
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
export function dataUrlToObjectUrl(url) {
    if (url == null || url === '')
        return null;
    if (!isDataUrl(url))
        return url;
    const cached = cache.get(url);
    if (cached)
        return cached;
    const obj = createObjectUrlFromDataUrl(url);
    cache.set(url, obj);
    return obj;
}
/** Revoke the object URL associated with `sourceUrl` (the original data URL). */
export function revokeObjectUrlFor(sourceUrl) {
    const obj = cache.get(sourceUrl);
    if (obj) {
        try {
            URL.revokeObjectURL(obj);
        }
        catch { /* ignore — already revoked */ }
        cache.delete(sourceUrl);
    }
}
/** Revoke every cached object URL. Intended for tests and explicit teardown. */
export function revokeAll() {
    for (const obj of cache.values()) {
        try {
            URL.revokeObjectURL(obj);
        }
        catch { /* revoke is idempotent — failure = already-revoked/gone (row 28) */ }
    }
    cache.clear();
}
/** Test-only: how many object URLs are currently cached. */
export function _cachedCount() {
    return cache.size;
}
// ─── Internals ────────────────────────────────────────────────────────────
function createObjectUrlFromDataUrl(dataUrl) {
    // Parse `data:<mime>;base64,<payload>` once.
    const comma = dataUrl.indexOf(',');
    if (comma < 0) {
        // Malformed — fall back to returning the original.
        return dataUrl;
    }
    const header = dataUrl.slice(0, comma);
    const payload = dataUrl.slice(comma + 1);
    const mime = header.match(/^data:([^;,]+)/)?.[1] || 'application/octet-stream';
    const isBase64 = header.includes(';base64');
    let bytes;
    if (isBase64) {
        let bin;
        try {
            bin = atob(payload);
        }
        catch { /* revoke is idempotent — failure = already-revoked/gone (row 28) */
            return dataUrl; // malformed base64 — return original, browser <img>/<video> handles it
        }
        bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++)
            bytes[i] = bin.charCodeAt(i);
    }
    else {
        // URL-encoded payload — decode then encode as UTF-8 bytes.
        bytes = new TextEncoder().encode(decodeURIComponent(payload));
    }
    return URL.createObjectURL(new Blob([bytes.slice()], { type: mime }));
}
//# sourceMappingURL=objectUrlCache.js.map
