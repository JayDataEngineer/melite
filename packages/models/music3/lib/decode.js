// decode.ts — THE VRAM-AWARE DECODE TIER (audit 014 C3): the audio
// decode strategy derives from the lane's own VRAM/size signal, never
// a fixed literal. The official template composes tiled decode with
// a hardcoded true; its own model note seats int8_convrot as the
// low-VRAM body — the quality-correct choice on a roomy box is the
// plain decode, and the tier flips on the DECL's own numbers: a
// low-VRAM cell (its declared vram_peak_gb under the floor) or a
// long track (the AR's duration cap past the ceiling) tiles; a
// measured-roomy cell at a short track decodes plain. An explicitly
// stated knob overrides the derivation at the action (the flip needs
// no re-compose of the lane); absent, the derivation decides — the
// default lives HERE, once, never a second stamped literal.
/** The VRAM floor under which a cell's declared peak tiles the
 *  decode. The audit's box cut: a lane whose DECL-declared peak sits
 *  at or above the floor decodes plain. */
export const TILED_VRAM_FLOOR_GB = 16;
/** The track length past which the decode tiles regardless of the
 *  declared peak — VAE decode memory scales with the latent's
 *  length, and the AR's duration cap is the compose-time size
 *  signal (the realized length is the AR's own output, unknowable
 *  here). */
export const TILED_DURATION_CEIL_S = 90;
/** Derive the decode tier from the lane's VRAM/size signal.
 *  @param vramPeakGb the resolved cell's DECL-declared peak (null =
 *   unmeasured — an unmeasured body is never called low-VRAM; the
 *   audition-gated peak class, ROADMAP)
 *  @param seconds the track's duration cap (the size signal)
 *  @returns "tiled" past the size ceiling or under the VRAM floor,
 *   "plain" otherwise */
export function deriveDecodeTier(vramPeakGb, seconds) {
    if (typeof seconds === "number" && seconds > TILED_DURATION_CEIL_S)
        return "tiled";
    if (typeof vramPeakGb === "number" && vramPeakGb < TILED_VRAM_FLOOR_GB)
        return "tiled";
    return "plain";
}
/** The tiled decode's segment seats, verbatim from the official
 *  template's VAEDecodeAudioTiled (tile 1536, overlap 64 — inside
 *  the engine's declared [32, 8192]/[0, 1024] bounds). */
export const TILED_DECODE_SEATS = { tile_size: 1536, overlap: 64 };
//# sourceMappingURL=decode.js.map
