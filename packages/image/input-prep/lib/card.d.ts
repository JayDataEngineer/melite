import type { Context } from '@melite/comfyui-card-kit/card-definition';
import z from '@deepseek-ai/schemastery';
export declare const BOARDED: readonly ["input"];
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
export declare const MAX_DIM = 16384;
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
