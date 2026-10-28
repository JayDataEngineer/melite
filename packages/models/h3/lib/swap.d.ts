import type { GraphBuilder, OutputHandle } from '@melite/comfyui-card-kit/graph';
import type { H3Facts } from './actions.js';
/** The VHS source loader the slice + timeline read (reference node 5
 *  verbatim: force_rate 24 — the film clock — and the zero/one
 *  passthrough knobs; format 'None'). Slot 0 frames, slot 2 audio.
 *  The window seats (repair, 2026-11-12) ride the loader's own cap +
 *  skip — 0/0 is the whole clip, the swap's posture. The SAME loader
 *  yields the frames and the audio, so a windowed load stays in
 *  sync on both wires. Exported: the repair seat loads its window
 *  through the identical spelling. */
export declare const loadVideo: (g: GraphBuilder, path: string, frameLoadCap?: number, skipFirstFrames?: number) => OutputHandle[];
/** The family's model + lora plane BOTH masked-edit seats ride
 *  (swap + repair; extracted 2026-11-12 when the repair seat joined
 *  — one sequence, two callers, zero drift). The operator's lora
 *  law, 2026-10-28, verbatim: "WE SAID KEEP OUR CURRENT LORA SETUP
 *  FOR NOW" — facts.unet, the SLA/lowvram/chunked attention chain,
 *  and LTX_lora_loader with h3LoraStackOf(p) (the lora mod bag, else
 *  the absent-bag family default): the same plane the film renders
 *  under, composed in the same order (actions.ts's renderH3Window is
 *  the symmetry owner). No fixed accelerator row, no engine-side
 *  stack the operator cannot see or empty. Creation order is pinned
 *  by the emission walls — keep the node sequence untouched.
 * @param g the run's graph builder
 * @param p the walked doc params (the lora mod bag + SLA/shift knobs)
 * @param facts the family's lane facts (unet off the DECL row)
 * @param clipSeconds the clip budget (the preview override's frames)
 * @returns the plane's five seats: sigmaModel, samplerSel, clip,
 *  vaeVideo, vaeAudio */
export declare const h3MaskedEditPlane: (g: GraphBuilder, p: Record<string, unknown>, facts: H3Facts, clipSeconds: number) => {
    sigmaModel: OutputHandle;
    samplerSel: OutputHandle;
    clip: OutputHandle;
    vaeVideo: OutputHandle;
    vaeAudio: OutputHandle;
};
/** The swap renderer: validates the bound entry, then composes the
 *  masked-edit chain per the reference map above. The film path
 *  never reaches here (the card branches ONLY on a non-empty replace
 *  bag, and refuses a bag under an armed reshoot — one door per doc).
 * @param entry the replace mod's single bound entry
 * @param p the walked doc params (the lora mod bag + SLA/shift knobs —
 *  the family plane this swap renders under)
 * @param facts the family's lane facts (unet off the DECL row)
 * @param g the run's graph builder
 * @param runId the run tree's id (the assemble filename rides it) */
export declare function renderH3Swap(entry: Record<string, unknown>, p: Record<string, unknown>, facts: H3Facts, g: GraphBuilder, runId: string): void;
//# sourceMappingURL=swap.d.ts.map
