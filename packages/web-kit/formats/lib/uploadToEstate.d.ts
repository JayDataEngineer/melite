export declare class UploadRefusedError extends Error {
}
/** The rail: File → POST /v1/uploads → the estate path. */
export declare function uploadToEstate(file: File): Promise<string>;
/**
 * estateInputUrl — slot value → a URL an <img> can load (2026-09-06,
 * operator order: "We need to have an image preview when the card is
 * drilled out for ANNY and IMAGE->3d").
 *
 * The uploads rail returns repo-relative `data/input/<name>` paths —
 * composable at every door, but no browser tag can load them, so a
 * drilled-out card showed NO preview of its own source photo after
 * reload (the fresh object-URL preview is session-local). The input
 * preview door (GET /v1/assets/inputs/<name>) serves those bytes
 * back; this maps the param to that URL.
 *
 * Already-servable shapes pass through untouched (data:/blob:/
 * http(s) URLs, and the estate's own /assets, /api, /v1/assets
 * prefixes — the same vocabulary the assembly viewer uses); anything
 * else (mount paths like /mnt/...) is NOT previewable → null (the
 * caller renders the explicit non-preview state, never a doomed
 * <img>).
 */
export declare function estateInputUrl(value: string): string | null;
//# sourceMappingURL=uploadToEstate.d.ts.map
