import type { Context } from '@melite/comfyui-card-kit/card-definition';
import z from '@deepseek-ai/schemastery';
import { ComfyUIServiceFace } from '@melite/comfyui-card-kit/service-faces';
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
}>>, "plain">;
export declare const BOARDED: readonly ["qwen-img-edit-21", "fibo2-edit", "h3-image-edit"];
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
