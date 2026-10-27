/** The VRAM floor under which a cell's declared peak tiles the
 *  decode. The audit's box cut: a lane whose DECL-declared peak sits
 *  at or above the floor decodes plain. */
export declare const TILED_VRAM_FLOOR_GB = 16;
/** The track length past which the decode tiles regardless of the
 *  declared peak — VAE decode memory scales with the latent's
 *  length, and the AR's duration cap is the compose-time size
 *  signal (the realized length is the AR's own output, unknowable
 *  here). */
export declare const TILED_DURATION_CEIL_S = 90;
/** The closed decode vocabulary. */
export type DecodeTier = "plain" | "tiled";
/** Derive the decode tier from the lane's VRAM/size signal.
 *  @param vramPeakGb the resolved cell's DECL-declared peak (null =
 *   unmeasured — an unmeasured body is never called low-VRAM; the
 *   audition-gated peak class, ROADMAP)
 *  @param seconds the track's duration cap (the size signal)
 *  @returns "tiled" past the size ceiling or under the VRAM floor,
 *   "plain" otherwise */
export declare function deriveDecodeTier(vramPeakGb: number | null, seconds: number): DecodeTier;
/** The tiled decode's segment seats, verbatim from the official
 *  template's VAEDecodeAudioTiled (tile 1536, overlap 64 — inside
 *  the engine's declared [32, 8192]/[0, 1024] bounds). */
export declare const TILED_DECODE_SEATS: {
    readonly tile_size: 1536;
    readonly overlap: 64;
};
//# sourceMappingURL=decode.d.ts.map
