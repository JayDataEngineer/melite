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
/** THE SEAT-DRIVEN DISPATCH (the atom vocabulary, stroke 3): the
 *  owning family's declared compose action, resolved through the
 *  family's SEAT (family-seats.ts) at call time — the card owns
 *  only dispatch; the segment factories live in the family
 *  packages (the legacy lanes stay the declared fallback +
 *  byte-oracle). A family package absent from the install refuses
 *  loud HERE, by name; the card itself still loads and registers. */
export declare function composeFamilyAction(family: string, p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): void;
/** THE ACTION BINDINGS: the dispatch table compose reads at call
 *  time, keyed by OWNING FAMILY (`model.family ?? model.id` — a
 *  route id keys nothing, the derived-row law). Each row closes
 *  over its literal family id and resolves the DECL through the
 *  seat, so a pruned family package costs its row's reach, never
 *  the table (the value-roundtrip corruption seats swap rows
 *  here). */
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
