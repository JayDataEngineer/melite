import type { Context } from '@deepseek-ai/cordis';
import type { ModelFacts } from '@melite/comfyui-card-kit/facts';
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph';
export declare const ACTION_BINDINGS: Record<string, (p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string) => void>;
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