import type { Context } from '@melite/comfyui-card-kit/card-definition';
import z from '@deepseek-ai/schemastery';
import type { ModelFacts } from '@melite/comfyui-card-kit/facts';
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph';
import { ComfyUIServiceFace } from '@melite/comfyui-card-kit/service-faces';
export declare const schema: z<Schemastery.ObjectS<NoInfer<{
    prompt: z<string, string, "plain">;
    lyrics: z<string, string, "plain">;
    duration: z<number, number, "defined">;
    mode: z<string, string, "defined">;
    guidance_scale: z<number, number, "defined">;
    n_diffusion_steps: z<number, number, "defined">;
    lm_cfg_scale: z<number, number, "defined">;
    seed: z<number, number, "defined">;
    tiled_decode: z<boolean, boolean, "plain">;
}>>, Schemastery.ObjectT<NoInfer<{
    prompt: z<string, string, "plain">;
    lyrics: z<string, string, "plain">;
    duration: z<number, number, "defined">;
    mode: z<string, string, "defined">;
    guidance_scale: z<number, number, "defined">;
    n_diffusion_steps: z<number, number, "defined">;
    lm_cfg_scale: z<number, number, "defined">;
    seed: z<number, number, "defined">;
    tiled_decode: z<boolean, boolean, "plain">;
}>>, "plain">;
export declare const BOARDED: string[];
/** THE ACTION BINDINGS (the atom vocabulary, stroke 3): the owning
 * family's declared compose action per boarded family — the card
 * owns only dispatch; the segment factories live in the family
 * packages (the legacy lanes stay the declared fallback +
 * byte-oracle). Keyed by OWNING FAMILY (`model.family ?? model.id`
 * at dispatch — a route id keys nothing, the derived-row law). */
export declare const ACTION_BINDINGS: Record<string, (p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string) => void>;
/** The identity rung (label/description — the authored prose the
 *  emitted tool row carries; the ring's spelling, stated once). */
export declare const identity: {
    label: string;
    description: string;
    genre: string;
    icon: string;
};
export declare function registerCard(ctx: Context, comfy: ComfyUIServiceFace): void;
//# sourceMappingURL=card.d.ts.map
