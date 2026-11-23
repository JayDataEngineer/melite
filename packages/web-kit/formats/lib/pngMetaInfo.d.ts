/**
 * Minimal PNG tEXt chunk injector / reader.
 *
 * PNG format: 8-byte signature, then a sequence of chunks.
 * Each chunk: [4-byte length][4-byte type][N-byte data][4-byte CRC].
 * tEXt chunk data: <keyword>\0<text> (both Latin-1, no compression).
 *
 * We use the key "tech_noir" to store generation params as JSON.
 */
/** Inject generation params into a PNG as a tEXt chunk (inserted after IHDR). */
export declare function injectPngMeta(b64: string, params: Record<string, unknown>): string;
/** Read generation params from a PNG's tEXt chunk, or null if not present. */
export declare function readPngMeta(b64OrDataUrl: string): Record<string, unknown> | null;
//# sourceMappingURL=pngMetaInfo.d.ts.map
