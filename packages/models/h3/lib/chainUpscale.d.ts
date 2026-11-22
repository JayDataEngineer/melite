import type { GraphBuilder } from '@melite/comfyui-card-kit/graph';
import type { H3Facts } from './actions.js';
/** The arm predicate: BAG PRESENCE — the same law as the
 *  replace/repair/extend/refine/reshoot arms (a commission is armed
 *  when its bag is a NON-EMPTY ARRAY). Absent or empty bag = the
 *  compose never sees the chain (byte-stable graphs).
 * @param p the gated compose doc
 * @returns true when the upscale bag carries at least one entry */
export declare function upscaleArmed(p: Record<string, unknown>): boolean;
/** The chain-upscale renderer: validates the bound entry, then
 *  composes the deferred 2x loop over the named prior run. The film
 *  path never reaches here (the card branches on a non-empty upscale
 *  bag, and a bag beside any other edit arm refuses loud: one door
 *  per doc). The emission ends in ChainAssemble at `<runId>/upscale`
 *  (copy_to_output — the estate's film law; the recipe's dated
 *  filename and no-copy posture is a browser-session spelling, not an
 *  estate one).
 * @param entry the upscale mod's single bound entry
 * @param p the walked doc params (the lora mod bag + scheduler knobs
 * — the family plane this loop renders under)
 * @param facts the family's lane facts (unet off the DECL row)
 * @param g the run's graph builder
 * @param runId the run tree's id (the assemble filename rides it) */
export declare function renderH3ChainUpscale(entry: Record<string, unknown>, p: Record<string, unknown>, facts: H3Facts, g: GraphBuilder, runId: string): void;
//# sourceMappingURL=chainUpscale.d.ts.map