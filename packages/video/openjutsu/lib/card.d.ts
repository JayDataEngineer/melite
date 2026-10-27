import type { Context } from '@melite/comfyui-card-kit/card-definition';
import z from '@deepseek-ai/schemastery';
import type { ModelFacts } from '@melite/comfyui-card-kit/facts';
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph';
export declare const ACTION_BINDINGS: Record<string, (p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string) => void>;
export declare const schema: z<Schemastery.ObjectS<NoInfer<{
    clip: z<string, string, "plain">;
    ref_image: z<string, string, "plain">;
    length: z<number, number, "plain">;
    width: z<number, number, "plain">;
    height: z<number, number, "plain">;
    steps: z<number, number, "plain">;
    shift_video: z<number, number, "plain">;
    shift_audio: z<number, number, "plain">;
    seed: z<number, number, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    clip: z<string, string, "plain">;
    ref_image: z<string, string, "plain">;
    length: z<number, number, "plain">;
    width: z<number, number, "plain">;
    height: z<number, number, "plain">;
    steps: z<number, number, "plain">;
    shift_video: z<number, number, "plain">;
    shift_audio: z<number, number, "plain">;
    seed: z<number, number, "defined">;
}>>, "plain">;
export declare const identity: {
    label: string;
    description: string;
    genre: string;
    icon: string;
    principles: string[];
};
export declare const inject: string[];
export declare function apply(ctx: Context): void;
//# sourceMappingURL=card.d.ts.map
