import type { Context } from '@melite/comfyui-card-kit/card-definition';
import z from '@deepseek-ai/schemastery';
import { ComfyUIServiceFace } from '@melite/comfyui-card-kit/service-faces';
import type { ModelFacts } from '@melite/comfyui-card-kit/facts';
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph';
export declare const declCap: (d: {
    id: string;
    lane_inputs?: Record<string, unknown>;
}) => number;
export declare const schema: z<Schemastery.ObjectS<NoInfer<{
    input_images: z<string[], string[], "defined">;
    image1: z<string, string, "plain">;
    image2: z<string, string, "plain">;
    image3: z<string, string, "plain">;
    reference_images: z<string[], string[], "plain">;
    input_mask: z<string, string, "plain">;
    prompt: z<string, string, "plain">;
    negative_prompt: z<string, string, "plain">;
    width: z<number, number, "plain">;
    height: z<number, number, "plain">;
    match_input_resolution: z<boolean, boolean, "defined">;
    seed: z<number, number, "defined">;
    steps: z<number, number, "plain">;
    cfg: z<number, number, "plain">;
    sampler: z<string, string, "plain">;
    scheduler: z<string, string, "plain">;
    use_stock_nodes: z<boolean, boolean, "plain">;
    double_reference: z<boolean, boolean, "plain">;
}>>, Schemastery.ObjectT<NoInfer<{
    input_images: z<string[], string[], "defined">;
    image1: z<string, string, "plain">;
    image2: z<string, string, "plain">;
    image3: z<string, string, "plain">;
    reference_images: z<string[], string[], "plain">;
    input_mask: z<string, string, "plain">;
    prompt: z<string, string, "plain">;
    negative_prompt: z<string, string, "plain">;
    width: z<number, number, "plain">;
    height: z<number, number, "plain">;
    match_input_resolution: z<boolean, boolean, "defined">;
    seed: z<number, number, "defined">;
    steps: z<number, number, "plain">;
    cfg: z<number, number, "plain">;
    sampler: z<string, string, "plain">;
    scheduler: z<string, string, "plain">;
    use_stock_nodes: z<boolean, boolean, "plain">;
    double_reference: z<boolean, boolean, "plain">;
}>>, "plain">;
export declare const BOARDED: string[];
/** The action bindings (the atom vocabulary, stroke 3): a boarded
 *  family with a bound action composes through the atom's own
 *  declared segment — the card delegates, never authors nodes.
 *  Keyed by the OWNING FAMILY (model.family, never model.id: route
 *  addresses must land on their family's row, never a silent miss
 *  onto nothing). Every boarded family holds a bound action.
 *  Exported for the every-address wall: each served facts row's
 *  OWNING family must hold a row here — an unbound family refuses
 *  loud at the dispatch. */
export declare const ACTION_BINDINGS: Record<string, (p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string) => void>;
/** The identity rung (label/description — the authored prose the
 *  emitted tool row carries; the ring's spelling, stated once). */
export declare const identity: {
    label: string;
    description: string;
    genre: string;
    icon: string;
    principles: string[];
};
export declare function registerCard(ctx: Context, comfy: ComfyUIServiceFace): void;
//# sourceMappingURL=card.d.ts.map
