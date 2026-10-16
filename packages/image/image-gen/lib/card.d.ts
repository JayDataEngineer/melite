import type { Context } from '@melite/comfyui-card-kit/card-definition';
import z from '@deepseek-ai/schemastery';
import type { PromptGraph, StripTable } from '@melite/comfyui-card-kit/graph';
import type { ModelFacts } from '@melite/comfyui-card-kit/facts';
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph';
import { ComfyUIServiceFace } from '@melite/comfyui-card-kit/service-faces';
import type { SemanticModelEntry } from '@melite/comfyui-card-kit/semanticModelKnob';
/** The card's boarding — where the card gets its models: THE AI
 *  MODELS' own plugin declarations (packages/models/*), each
 *  carrying its whole truth — variants, quant cells, HF artifact
 *  links, mods, lane inputs. The id is spelled once, in the model
 *  plugin; a rename breaks at tsc, never silently at the
 *  not-boarded refusal. The model-knob enum, the tool default, and
 *  the registry row all derive from this array. */
export declare const BOARDED: readonly [string, string, string, string, string];
/** The served style enum (the semantic model knob): entries derived
 *  from the same five DECLs — labels are their own copy, values
 *  are stable family:variant:cell addresses, routes resolve
 *  estate-side. One source: the tool face serves THIS, never a
 *  second hand-written list. */
export declare const SEMANTIC_MODELS: readonly SemanticModelEntry[];
/** The action bindings (the atom vocabulary, stroke-1 pilot): a
 *  boarded family with a bound action composes through the atom's
 *  own declared segment — the card delegates, never authors nodes.
 *  Keyed by the OWNING FAMILY (model.family, never model.id: six of
 *  ten served addresses are route ids — a route-keyed lookup misses
 *  and silently composes nothing). Every boarded family holds a
 *  bound action; the binding per family is the card's declared
 *  compose contract, never an id switch inside lane code. Exported
 *  for the every-address wall: each served facts row's OWNING
 *  family must hold a row here — a boarded-but-unbound family
 *  refuses loud at the dispatch, never a silent miss. */
export declare const IMAGE_GEN_STRIP: StripTable;
/** The card's autofill strip (the t2i family's pin defaults never ride). */
export declare function finalizeImageGen(graph: PromptGraph): PromptGraph;
export declare const ACTION_BINDINGS: Record<string, (p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string) => void>;
export declare const schema: z<Schemastery.ObjectS<NoInfer<{
    prompt: z<string, string, "plain">;
    negative_prompt: z<string, string, "plain">;
    width: z<number, number, "plain">;
    height: z<number, number, "plain">;
    seed: z<number, number, "defined">;
    steps: z<number, number, "plain">;
    cfg: z<number, number, "plain">;
    sampler: z<string, string, "plain">;
    scheduler: z<string, string, "plain">;
    reference_images: z<string[], string[], "plain">;
}>>, Schemastery.ObjectT<NoInfer<{
    prompt: z<string, string, "plain">;
    negative_prompt: z<string, string, "plain">;
    width: z<number, number, "plain">;
    height: z<number, number, "plain">;
    seed: z<number, number, "defined">;
    steps: z<number, number, "plain">;
    cfg: z<number, number, "plain">;
    sampler: z<string, string, "plain">;
    scheduler: z<string, string, "plain">;
    reference_images: z<string[], string[], "plain">;
}>>, "plain">;
export declare const identity: {
    label: string;
    description: string;
    genre: string;
    icon: string;
    principles: string[];
};
/** Register the card face into the engine registry. The service
 *  arrives as a parameter (index.ts probed it — comfyui is an
 *  optional dependency, not an injected one). */
export declare function registerCard(ctx: Context, comfy: ComfyUIServiceFace): void;
//# sourceMappingURL=card.d.ts.map
