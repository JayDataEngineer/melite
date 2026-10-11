/**
 * E3.8 — Client-side video frame extraction.
 *
 * Extracts a single frame from a video at a given timestamp by seeking
 * a hidden <video> element and drawing it to a <canvas>. Returns a PNG
 * data URL, or null if extraction fails (best-effort — the caller
 * continues without a first-frame anchor rather than blocking).
 *
 * Used by the SmartSplit flow to grab the opening frame of each detected
 * scene and set it as the segment's firstFrameB64 anchor.
 */
/**
 * Extract a frame from `videoUrl` at `timeSeconds`.
 * @returns PNG data URL, or null on any failure.
 */
export declare function extractVideoFrame(videoUrl: string, timeSeconds: number): Promise<string | null>;
/**
 * Extract the opening frame for each scene in parallel (bounded — at most
 * `concurrency` extractions in flight at once). Returns an array aligned
 * with the input `times` (null where extraction failed).
 */
export declare function extractFramesBatch(videoUrl: string, times: number[], concurrency?: number): Promise<(string | null)[]>;
//# sourceMappingURL=extractVideoFrame.d.ts.map