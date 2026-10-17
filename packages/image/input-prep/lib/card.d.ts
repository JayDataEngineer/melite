import type { Context } from '@melite/comfyui-card-kit/card-definition';
import z from '@deepseek-ai/schemastery';
import type { ModelFacts } from '@melite/comfyui-card-kit/facts';
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph';
export declare const ACTION_BINDINGS: Record<string, (p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string) => void>;
export declare const schema: z<Schemastery.ObjectS<NoInfer<{
    source: z<string, string, "plain">;
    media_type: z<string, string, "defined">;
    crop_x: z<number, number, "defined">;
    crop_y: z<number, number, "defined">;
    crop_width: z<number, number, "defined">;
    crop_height: z<number, number, "defined">;
    scale_width: z<number, number, "defined">;
    scale_height: z<number, number, "defined">;
    scale_method: z<string, string, "defined">;
    scale_model: z<string, string, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    source: z<string, string, "plain">;
    media_type: z<string, string, "defined">;
    crop_x: z<number, number, "defined">;
    crop_y: z<number, number, "defined">;
    crop_width: z<number, number, "defined">;
    crop_height: z<number, number, "defined">;
    scale_width: z<number, number, "defined">;
    scale_height: z<number, number, "defined">;
    scale_method: z<string, string, "defined">;
    scale_model: z<string, string, "defined">;
}>>, "plain">;
export declare const inject: string[];
export declare const identity: {
    label: string;
    description: string;
    genre: string;
    icon: string;
    principles: string[];
};
export declare function apply(ctx: Context): void;
//# sourceMappingURL=card.d.ts.map
