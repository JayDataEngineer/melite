/**
 * PNG tEXt chunk utilities — embed and parse metadata in PNG files.
 *
 * Compatible with the chunk layout ComfyUI uses (keys `workflow` and
 * `prompt`), so images saved from Pose Studio can be dragged back in
 * to recover the full generation state, and vice-versa.
 *
 * PNG chunk grammar:
 *   chunk = [length:u32be][type:4 bytes][data:length][crc:u32be]
 *   tEXt data = keyword (1-79 bytes, Latin-1) + 0x00 + text (Latin-1)
 *
 * We insert metadata chunks immediately after IHDR so they appear
 * before IDAT — readers that scan only the file head will find them.
 *
 * JSON values are forced to ASCII (via \\uXXXX escapes for any code
 * point above 0x7F) because the tEXt chunk is Latin-1: a raw UTF-8
 * multibyte sequence would be mis-decoded as one byte == one char.
 */
/**
 * Force JSON to pure ASCII by escaping any code point above 0x7F as
 * \uXXXX. Keeps tEXt payloads spec-compliant (Latin-1) while preserving
 * the full Unicode content for recovery.
 */
export declare function asciiJsonStringify(value: unknown): string;
/**
 * Embed key/value pairs as tEXt chunks in a PNG data: URL. Chunks are
 * inserted immediately after IHDR. Returns the original URL unchanged
 * if the input is not a valid PNG data URL or metadata is empty.
 */
export declare function embedPngText(dataUrl: string, metadata: Record<string, string>): string;
/**
 * Parse every tEXt chunk in a PNG data: URL into a {key: value} record.
 * Also surfaces iTXt (uncompressed, UTF-8) if present. Last write wins
 * on duplicate keys. Returns {} for non-PNG or unreadable input.
 */
export declare function parsePngText(dataUrl: string): Record<string, string>;
/**
 * Read the embedded `workflow` (or fallback `prompt`/`parameters`) JSON
 * from a PNG data: URL. Returns the parsed object or null.
 */
export declare function readWorkflowFromPng(dataUrl: string): unknown | null;
//# sourceMappingURL=pngMeta.d.ts.map
