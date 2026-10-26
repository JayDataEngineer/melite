/**
 * mp4Probe.ts — THE MEDIA PROBE, IN TYPESCRIPT (2026-09-25).
 *
 * WHY THIS EXISTS: `melite_view` shelled out to `ffprobe` to read a
 * file's stream facts. That put a host binary (and a Linux-shaped
 * deployment) inside a TypeScript extension, and the unit suite could
 * not run anywhere the binary was absent. A container is a box tree —
 * every field the probe reported is readable from bytes, so it is
 * parsed here, in-repo, with NO dependency and NO subprocess.
 *
 * WHAT IT READS (exactly the row the tool published):
 *   MP4/MOV/QuickTime — `moov/mvhd` (duration + timescale),
 *     `trak/tkhd` (display size), `trak/mdia/hdlr` (video | soun),
 *     `trak/mdia/minf/stbl/stsd` (codec fourcc, sample rate,
 *     channels), `stts` (sample count → a frame count), `mdhd`
 *     (media timescale, for the audio duration).
 *   WAV/RIFF — `fmt ` (codec tag, channels, sample rate, bits) and
 *     `data` (byte length → duration).
 *
 * WHAT IT DELIBERATELY DOES NOT DO: decode. Frame pixels are the
 * engine's business — the harness commits an image the run produced
 * and never re-frames a video itself. (Decoding H.264/AAC in
 * TypeScript is not a thing you can do without shipping a codec as a
 * dependency, and the architecture says the engine owns media.)
 *
 * Pure and total: given bytes in, facts out. No fs, no child process,
 * no platform assumptions.
 */
/** One probed stream, the row `melite_view` publishes. */
export interface ProbedStream {
    codec: string;
    codec_type?: 'video' | 'audio';
    width?: number;
    height?: number;
    fps?: string;
    frames?: number;
    sample_rate?: number;
    channels?: number;
}
export interface ProbeResult {
    duration_s?: number;
    /** ALWAYS present: the probe read the bytes, so their count is a
     *  fact, not a reading. */
    size_bytes: number;
    streams: ProbedStream[];
}
export declare function codecNameOf(fourcc: string): string;
/** THE MP4/MOV PROBE. */
export declare function probeMp4(bytes: Uint8Array): ProbeResult;
/** THE RIFF/WAV PROBE. */
export declare function probeWav(bytes: Uint8Array): ProbeResult;
/** THE DISPATCH: the container decides the parser. A file that is
 *  neither is refused by name — never probed with the wrong reader. */
export declare function probeMedia(bytes: Uint8Array): ProbeResult;
//# sourceMappingURL=mp4Probe.d.ts.map
