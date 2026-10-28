import type { Context } from '@melite/comfyui-card-kit/card-definition';
import z from '@deepseek-ai/schemastery';
export declare const FPS = 24;
export declare const schema: z<Schemastery.ObjectS<NoInfer<{
    clip: z<string, string, "plain">;
    start_seconds: z<number, number, "defined">;
    end_seconds: z<number, number, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    clip: z<string, string, "plain">;
    start_seconds: z<number, number, "defined">;
    end_seconds: z<number, number, "defined">;
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
