import type { Context } from '@deepseek-ai/cordis';
import type { ModelFacts } from '@melite/comfyui-card-kit/facts';
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph';
/** THE ACTION BINDINGS (the atom vocabulary, stroke 3): the owning
 * family's declared sfx action — the card owns only dispatch; the
 * segment factory lives in the family package (the legacy lane
 * stays the declared fallback + byte-oracle). Keyed by OWNING
 * FAMILY (`model.family ?? model.id` at dispatch — a route id keys
 * nothing, the derived-row law). */
export declare const ACTION_BINDINGS: Record<string, (p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string) => void>;
export declare const inject: string[];
export declare const identity: {
    label: string;
    description: string;
    genre: string;
    icon: string;
};
export declare function apply(ctx: Context): void;
//# sourceMappingURL=card.d.ts.map
