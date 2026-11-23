/**
 * E3.7 — Caption text splitter.
 *
 * Converts a plain-text transcription into a sequence of CaptionCues with
 * proportional timing. When the ASR backend provides word-level timestamps
 * (via `tokens`), we use those directly. Otherwise we fall back to
 * sentence-aware splitting with proportional duration allocation (by
 * character count — longer sentences get proportionally more time).
 *
 * Caption length targets ~42 characters per cue (the industry standard
 * for readable subtitles, per the BBC/NBC style guides). Sentences longer
 * than that are split at clause boundaries (commas, semicolons, dashes)
 * or at word boundaries as a last resort.
 *
 * Timing model: cue.start/end are SECONDS RELATIVE TO THE SEGMENT START
 * (not the global timeline). The program monitor maps global time →
 * segment-relative time before looking up the active cue.
 */
import type { CaptionCue } from "@melite/contracts";
export interface SplitArgs {
    /** Full transcription text. */
    text: string;
    /** Segment duration in seconds (the cues' timing window). */
    duration: number;
    /** Optional word-level timestamps from the ASR backend. When provided,
     *  cues are built from the actual word timings instead of proportional
     *  splitting. Each token: { text, start, end } in seconds. */
    tokens?: Array<{
        text: string;
        start: number;
        end: number;
    }> | null;
    /** Max characters per cue (default 42). */
    maxChars?: number;
}
/**
 * Build CaptionCues from a transcription. Returns an empty array if the
 * text is empty/whitespace or the duration is <= 0.
 */
export declare function splitCaptions(args: SplitArgs): CaptionCue[];
/**
 * Split text into caption-length chunks. Strategy (in priority order):
 *   1. Split into sentences (terminators . ! ? …).
 *   2. If a sentence exceeds maxChars, split at clause boundaries
 *      (, ; : — –) then at word boundaries as a last resort.
 *   3. Merge short consecutive fragments up to maxChars.
 */
export declare function splitIntoChunks(text: string, maxChars?: number): string[];
//# sourceMappingURL=captionSplitter.d.ts.map