import type { ComfyActionSpec } from '@melite/comfyui-card-kit';
import type { LaneInputsFacts } from '@melite/comfyui-card-kit/facts';
/** The closed facts shape the animate segment reads. */
export type ViggleFacts = {
    readonly unet: string;
    readonly vae: string;
    readonly text_cond: string;
    readonly loras: string;
};
/** The gated params doc the animate segment reads (the card's
 * schema walk validated types and bounds — a same-process typed
 * boundary; the seed arrives minted through the declared
 * seed-sentinel rule). */
export type ViggleParams = Record<string, unknown>;
/** The animate facts door: the resolved lane_inputs parsed into the
 * closed shape — a missing weight refuses field-named here, never
 * composes with an empty filename.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export declare function parseViggleFacts(raw: LaneInputsFacts): ViggleFacts;
/** THE DMD2 SCHEDULE (the upstream distill's sigma grid): n Euler
 *  updates ride n+1 sigma points, t evenly spaced from 1 to 0,
 *  sigma = 3t / (1 + 2t). n=3 emits the upstream baseline string
 *  verbatim ("1.0, 0.8571428571428571, 0.6, 0.0").
 *  @param updates the stated Euler-update count (the `steps` knob)
 *  @returns the comma-joined sigma string ManualSigmas parses */
export declare function dmd2Sigmas(updates: number): string;
/** THE MARRIED-KNOB CONSULT (the h3 steps marriage, one spelling):
 *  while a counting bag row rides, steps is the ROW'S — stated on
 *  the entry first, else the catalog row's declared column BY
 *  FILENAME (the wire's `name`; fictional filenames marry nothing),
 *  Math.max across the bag, else null (no counting row — the
 *  schema's default owns). The ACTION's layering is the h3 law: the
 *  doc's own stated steps > this consult > the schema default.
 *  PURE, no I/O.
 *  @param p the gated doc (the loras bag)
 *  @returns the bag's step count, or null when no counting row rides */
export declare function marriedSteps(p: Record<string, unknown>): number | null;
/** The animate action: the Openjutsu single-shot swap — the frozen
 * text embed, the driving clip + the identity still, the DMD
 * 3-4 step envelope, SaveVideo (VHS_VideoCombine) with the source
 * clip's audio. */
export declare const animate: ComfyActionSpec<ViggleParams, ViggleFacts>;
//# sourceMappingURL=actions.d.ts.map
