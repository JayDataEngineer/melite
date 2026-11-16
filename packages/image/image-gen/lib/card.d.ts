import type { Context } from '@melite/comfyui-card-kit/card-definition';
import z from '@deepseek-ai/schemastery';
import type { PromptGraph, StripTable } from '@melite/comfyui-card-kit/graph';
import type { ModelFacts } from '@melite/comfyui-card-kit/facts';
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph';
import { ComfyUIServiceFace } from '@melite/comfyui-card-kit/service-faces';
/** The card's boarding — where the card gets its models: THE AI
 *  MODELS' own plugin declarations (packages/models/*), each
 *  carrying its whole truth — variants, quant cells, HF artifact
 *  links, mods, lane inputs. THE PLUGIN LAW (L3 cure, 2026-11-16):
 *  the ids are LITERALS and the family packages resolve through
 *  ./family-seats.ts (guarded dynamic seats, primed at
 *  registration) — a missing family package costs its OWN seat,
 *  never this card's load. The binding is judged by the
 *  family-coverage wall on the dev tree: a family that changes its
 *  id reds there, never silently at the not-boarded refusal. The
 *  model-knob enum, the tool default, and the registry row all
 *  derive from these ids. */
export declare const BOARDED: readonly ["krea-2", "z-image", "anima", "qwen-img-21", "flux-klein", "moss-image", "h3-image"];
/** THE GEN REGION ROSTER IS DEAD (operator 2026-11-09, the
 *  face-rail burn: "ANY model can inpaint, not just krea-2" — the
 *  two-family roster was artificial, the DetailerForEach tail is
 *  family-agnostic): EVERY boarded family's t2i build composes the
 *  crop_stitch arm, so no roster seat exists to check against and
 *  no E2-11 unserved refusal remains — the region vocabulary
 *  serves wherever the card boards. The pair-law refusals below
 *  (base without region half, region without source, mode law)
 *  still fire for every family. */
/** The served style enum (the semantic model knob): entries derive
 *  from the PRESENT family seats at serve time (family-seats.ts —
 *  a missing family package costs its own entries, never this
 *  card's load); labels are the families' own copy, values are
 *  stable family:variant:cell addresses, routes resolve
 *  estate-side. One source: the tool face serves the seats'
 *  derivation, never a second hand-written list. */
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
/** The action bindings (the atom vocabulary, stroke-1 pilot): a
 *  boarded family with a bound action composes through the atom's
 *  own declared segment — the card delegates, never authors nodes.
 *  THE PLUGIN LAW (L3 cure): the binding resolves from the
 *  family's SEAT (family-seats.ts) at compose time — every
 *  boarded family holds the same declared t2i action, so one
 *  seat-driven dispatch replaces the per-family closure table,
 *  and a missing family package refuses at the dispatch's own
 *  loud voice below, never at this module's load. Keyed by the
 *  OWNING FAMILY (model.family, never model.id: six of ten served
 *  addresses are route ids — a route-keyed lookup misses and
 *  silently composes nothing). */
export declare function composeFamilyAction(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): void;
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
