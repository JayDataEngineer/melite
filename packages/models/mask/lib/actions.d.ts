import type { ComfyActionSpec } from '@melite/comfyui-card-kit';
/** The closed facts shape the lane reads: the three SAM weights the
 *  family owns (constants — no variant swaps them, no row declares
 *  them; the h3 LANE_FILES pattern). */
export interface MaskLaneFacts {
    checkpoint: string;
    unet: string;
    sam2: string;
}
/** The gated params doc the lane reads (the card's schema walk
 *  validated types and bounds — a same-process typed boundary). */
export type MaskLaneParams = Record<string, unknown>;
/** The family's three weight names — the lane's own constants (the
 *  LANE_FILES pattern, the h3 precedent: clip/vae_video/vae_audio
 *  never ride a row either). No variant of this family swaps a
 *  weight and no user picks one, so they live beside the build that
 *  wires them; the card's provisions declare the downloads, and
 *  image/mask/tests/card.spec.ts pins the agreement (a weight the
 *  lane loads that no provision downloads is a silent
 *  wrong-weights run — the same law the variant cells carry). */
export declare const MASK_WEIGHTS: {
    readonly checkpoint: "sam3.1_multiplex_fp16.safetensors";
    readonly unet: "rt_detr_v4-x-hgnet_fp32.safetensors";
    readonly sam2: "sam2.1_hiera_large.pt";
};
/** The family's facts door: the lane reads NOTHING off a row (the
 *  three weights are the family's constants above), so the door
 *  returns them closed — an empty loader name is unrepresentable,
 *  which is the old refusal law (a pin that is not a non-empty
 *  string refused here) held by construction. The registry still
 *  exercises this door at registration over the empty family row.
 *  @param _raw the resolved lane_inputs (empty on this family)
 *  @returns the three weights the lane wires into its loaders */
export declare function parseMaskLaneFacts(_raw: unknown): MaskLaneFacts;
export interface EntryTuneShape {
    threshold?: number;
    refine?: number;
    dilation?: number;
    detection_threshold?: number;
    box_expansion?: number;
    hint_threshold?: number;
    detection_dilation?: number;
    crop_factor?: number;
    drop_size?: number;
}
/** THE TUNE VOCABULARY IS DERIVED FROM ITS OWN TYPE (the census's
 *  L1): the runtime list and the compile-time type were written side
 *  by side, so adding a key to one and not the other was silent — the
 *  gate accepted a key the type did not carry (or refused one it
 *  did). The keys are the type's own members now; the assertion
 *  below fails if the two ever part company. */
export declare const TUNE_KEYS: readonly (keyof EntryTuneShape)[];
export type EntryTune = EntryTuneShape;
/** THE MASK SELECTION ACTION (the family's one declared lane): the
 *  input_image admission stays on the card; this is the lane alone.
 *  TWO selection families: the SAM3 CLIP/RT-DETR leg (checkpoint +
 *  unet weights) and the SAM2 impact-pack arm (sam2 + the pack's own
 *  specialized detectors — person on segm, face/hand on their bbox
 *  models — the detector proposes, SAM2 refines). */
export declare const select: ComfyActionSpec<MaskLaneParams, MaskLaneFacts>;
//# sourceMappingURL=actions.d.ts.map
