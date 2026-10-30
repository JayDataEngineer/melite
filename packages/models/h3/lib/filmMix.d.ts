export { spanOverlap, spanStanzaFrames } from './timelineContract.js';
export type FilmMixClipClass = 'dialogue' | 'sfx' | 'music';
/** One clip row — the card's audio_clips shape, post-parse. */
export interface FilmMixClip {
    readonly src: string;
    /** doc-anchored start (frames at the DOC CLOCK — the stamp, studio lanes, and tool face all speak doc). */
    readonly start: number;
    /** duration (frames; 0 = overlay-only, unsized). */
    readonly dur: number;
    readonly text: string;
    readonly cls: FilmMixClipClass;
}
/** Parse raw audio_clips rows — the card's one law for what a clip
 *  IS: a src without a numeric start_frame refuses loud (never a
 *  silent misplacement); a row without src is junk and skips; the
 *  class auto law (text → dialogue, textless → music) rides here. */
export declare function parseFilmMixClips(rows: readonly unknown[]): FilmMixClip[];
/** One window's doc span + seam for the owner map. */
export interface FilmMixSpan {
    /** doc-anchored span start (frames). */
    readonly start: number;
    /** doc-anchored span end (frames). */
    readonly end: number;
    /** 'cut' = the director's overlap-0 arm; anything else extends at 22f. */
    readonly transition?: string;
}
/** One positioned clip — the overlay's currency. */
export interface FilmMixPlacement {
    /** index into the clips array. */
    readonly clip: number;
    readonly cls: FilmMixClipClass;
    /** film seat (seconds, ms-rounded). */
    readonly filmSec: number;
    /** overlay duration (seconds, ms-rounded; 0 = full-length, unfitted). */
    readonly durSec: number;
}
/** One duck span (seconds, ms-rounded). */
export interface FilmMixSpanSec {
    readonly start: number;
    readonly end: number;
}
/** The mix manifest — everything the disk-side mix needs. */
export interface FilmMixManifest {
    readonly placements: FilmMixPlacement[];
    /** the film track ducks during every CONDITIONED span (the doubling
     *  case — the model reproduces what it hears pinned). */
    readonly duckSpans: FilmMixSpanSec[];
    /** the music sub-bus ducks under dialogue/sfx spans only (the
     *  score yields to speech and impacts; never to itself). */
    readonly musicDuckSpans: FilmMixSpanSec[];
    /** the in-graph MeliteAudioDuck string form ("a:b;c:d") — the
     *  retired tail's voice, kept for the walls. */
    readonly duckSpanString: string;
    readonly musicDuckSpanString: string;
    readonly duckDb: number;
    /** the total film duration (seconds, ms-rounded). */
    readonly filmSec: number;
}
export interface FilmMixInput {
    readonly spans: FilmMixSpan[];
    readonly clips: FilmMixClip[];
    /** per-window rendered durations (seconds) — stanza length at the
     *  doc clock at compose time, probed durations disk-side. THE
     *  ground truth the owner map accumulates (never re-derived from
     *  spans). */
    readonly windowSecs: number[];
    /** the DOC CLOCK for the owner map's frames→seconds joins (the
     *  overlap trims). Unstated = DOC_FPS_DEFAULT — one clock with
     *  stanzaSecs and the stamps (journey audit AUDIO-2: this seat
     *  hardcoded /24 while the container played p.fps). */
    readonly fps?: number;
    readonly duckDb?: number;
}
/** The duck span string — "start:end" at ms precision, ';'-joined. */
export declare function formatDuckSpan(start: number, end: number): string;
/** Per-window stanza seconds — THE compose-time windowSecs
 *  (computeFilmMix's ground truth): the render grid's own promise,
 *  the deliverer's contract — SaveVideo hands back exactly stanza
 *  frames at the DOC CLOCK (fps, unstated = DOC_FPS_DEFAULT; the
 *  three-clock cure, journey audit AUDIO-2: this divisor hardcoded
 *  /24 while the container played p.fps — a 16fps film's manifest
 *  overbooked every window by 1.5x). No probe, no disk: the clock
 *  is pure at compose. RAW fractions (frames/fps, unrounded): the
 *  manifest sums these into film starts, and rounding a SUM of
 *  rounded parts compounds drift (the 3-window seat 7.416 ≠ 7.417
 *  proof) — only the final seats/spans round (ms,
 *  computeFilmMix's own law).
 *
 *  @param spans the film windows, doc frames
 *  @param fps the DOC CLOCK (unstated docs pass DOC_FPS_DEFAULT —
 *  never a foreign default; the walk fills the same value) */
export declare function stanzaSecs(spans: readonly FilmMixSpan[], fps?: number): number[];
export declare function computeFilmMix(input: FilmMixInput): FilmMixManifest;
//# sourceMappingURL=filmMix.d.ts.map