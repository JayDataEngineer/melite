import type { Context } from '@melite/comfyui-card-kit/card-definition';
import z from '@deepseek-ai/schemastery';
import { type ActionBinding as Binding } from '@melite/comfyui-card-kit';
import { ComfyUIServiceFace } from '@melite/comfyui-card-kit/service-faces';
export declare const schema: z<Schemastery.ObjectS<NoInfer<{
    text: z<string, string, "plain">;
    voice: z<string, string, "plain">;
    style_instruction: z<string, string, "plain">;
    design_prompt: z<string, string, "plain">;
    ref_audio: z<string, string, "plain">;
    ref_text: z<string, string, "plain">;
    temperature: z<number, number, "defined">;
    top_p: z<number, number, "defined">;
    top_k: z<number, number, "defined">;
    speed: z<number, number, "defined">;
    repetition_penalty: z<number, number, "defined">;
    seed: z<number, number, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    text: z<string, string, "plain">;
    voice: z<string, string, "plain">;
    style_instruction: z<string, string, "plain">;
    design_prompt: z<string, string, "plain">;
    ref_audio: z<string, string, "plain">;
    ref_text: z<string, string, "plain">;
    temperature: z<number, number, "defined">;
    top_p: z<number, number, "defined">;
    top_k: z<number, number, "defined">;
    speed: z<number, number, "defined">;
    repetition_penalty: z<number, number, "defined">;
    seed: z<number, number, "defined">;
}>>, "plain">;
export declare const BOARDED: string[];
export declare const DEFAULT_MODEL: string;
/** THE ACTION BINDING (the atom vocabulary, stroke 3): the owning
 * family's declared speak + export actions — the card owns only
 * dispatch; the segment factories live in the family package.
 * Keyed by OWNING FAMILY (`model.family ?? model.id` at dispatch —
 * a route id keys nothing, the derived-row law); an unbound family
 * refuses loud at the dispatch. */
export declare const ACTION_BINDINGS: Record<string, {
    save: Binding;
    speak: Binding;
}>;
export declare const VARIANT_ADDRESSES: string[];
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