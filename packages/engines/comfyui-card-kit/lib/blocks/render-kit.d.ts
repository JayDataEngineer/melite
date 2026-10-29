import { GraphBuilder, OutputHandle } from '../graph.ts';
import type { NodeRef } from '../graph.ts';
import type { LaneInputsFacts } from '../facts.ts';
/** The text-encode pair: CLIPLoader + VAELoader from lane rows.
 *  Returns OUTPUT HANDLES (never NodeRefs — a ref in an inputs bag
 *  serializes as a scalar and the wall goes red). */
export declare function loadTextPair(g: GraphBuilder, li: LaneInputsFacts): {
    clip: OutputHandle;
    vae: OutputHandle;
};
/** A stated deliverable size (the resize order, 2026-11-12): the
 * edit lanes keep the source's own frame (the latent law); when the
 * doc flips match_input_resolution off and states both axes, the
 * DELIVERABLE resizes to this post-decode. Integers, min 16px — the
 * firing gate owns those refusals; this type carries the vetted
 * pair. */
export interface DeliverableSize {
    readonly width: number;
    readonly height: number;
}
/** THE RESIZE BLOCK (one owner): lanczos scale of decoded pixels to
 * a stated deliverable size. `size === undefined` returns the image
 * handle UNCHANGED (the byte-stable default — every existing caller
 * composes identical bytes). crop stays disabled: a stated size is a
 * resize, never a center-crop. */
export declare function scaleDeliverable(g: GraphBuilder, image: OutputHandle, size: DeliverableSize | undefined): OutputHandle;
/** The image-lane tail: VAEDecode (+ optional deliverable resize) +
 *  SaveImage under the prefix. Returns the SaveImage NODE REF
 *  (terminal — no downstream wire): callers take `.out()` off it
 *  (kit.ts imageT2I) or discard it. (2026-09-08: the declared return
 *  was OutputHandle, which the implementation never returned — a
 *  NodeRef. OutputHandle has no .out() method, so "fixing" the
 *  implementation to match the declaration would crash kit.ts:88 at
 *  runtime; the declaration now names the truth. Type-level only;
 *  runtime-identical.) */
export declare function decodeSave(g: GraphBuilder, sampled: OutputHandle, vae: OutputHandle, filenamePrefix: string, size?: DeliverableSize): NodeRef;
/** The lora chain (empty picks → the bare unet, byte-stable).
 *  Every link returns an OUTPUT HANDLE — a NodeRef left in the
 *  chain serializes as {"id": ...} and the wall goes red (caught
 *  live: empty-pick lanes never reached the bug). */
export declare function stackLoras(g: GraphBuilder, unet: OutputHandle, picks: Array<{
    name: string;
    strength: number;
}>): OutputHandle;
/** The controlnet chain (the z-image restoration: empty picks →
 *  the bare model, byte-stable). Every link loads the union patch
 *  and wraps the running model in ZImageFunControlnet — the live
 *  ComfyUI nodes (ModelPatchLoader + comfy_extras'
 *  ZImageFunControlnet), array order = apply order. The conditioning
 *  source rides LoadImage exactly like the image-edit lane's slots
 *  (staged at submit by the upload walk — paths, estate asset URLs,
 *  and data URLs all stage there, never here). A pick whose still
 *  channel is empty (002 H2: clip/mask-only, a video-valued
 *  entry) refuses here — this lane serves STILL sources only, and
 *  a silent wrong run (LoadImage of "") is the one thing it never
 *  does.
 *
 *  THE SEAM: the node pair is z-image's — a second controlnet
 *  family re-opens the node-selection seam here, never a silent
 *  node swap. */
export declare function stackControlNets(g: GraphBuilder, model: OutputHandle, vae: OutputHandle, picks: Array<{
    type: string;
    model: string;
    image: string;
    strength: number;
    clip?: string;
    mask?: string;
}>): OutputHandle;
//# sourceMappingURL=render-kit.d.ts.map