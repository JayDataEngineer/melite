import type { Context } from '@melite/comfyui-card-kit/card-definition';
import type { ModelFacts } from '@melite/comfyui-card-kit/facts';
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph';
/** THE FAMILY ID IS A LITERAL (the plugin law, L3 cure, 2026-11-16:
 * "The Card can exist without a Family"): the family package
 * resolves through ./family-seats.ts (a guarded dynamic seat,
 * primed at registration) — a missing family package costs its OWN
 * seat, never this card's load. A retyped id breaks the binding on
 * the dev tree (the family-coverage wall judges every boarded
 * entry against the live registry; the seat table skips a module
 * whose DECL id names nothing), never silently at the not-boarded
 * refusal. */
export declare const BOARDED: string[];
/** THE VARIANT ADDRESSES: NONE — the singing lane is a RECIPE
 * stamp (f0_condition=true), never a second route. The wrapper
 * loads both DiT bodies at init; one route serves both lanes. */
export declare const VARIANT_ADDRESSES: string[];
/** LARGE DEFAULT: DEFAULT_MODEL is the default everywhere the tool
 *  row and the form need a first pick (the speech lane — f0 unset). */
export declare const DEFAULT_MODEL: string;
/** THE SEAT-DRIVEN DISPATCH (the atom vocabulary): the owning
 * family's declared convert action, resolved through the family's
 * SEAT at call time — the card owns only dispatch; the segment
 * factory lives in the family package. A family package absent
 * from the install refuses loud HERE, by name; the card itself
 * still loads and registers. */
export declare function composeFamilyAction(family: string, p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): void;
/** THE ACTION BINDINGS: the dispatch table compose reads at call
 * time, keyed by OWNING FAMILY (`model.family ?? model.id` — a
 * route id keys nothing, the derived-row law). Both routes (the
 * speech lane and the singing f0 lane) close over the one family
 * id; the variant's wire_defaults stamp the f0 pick. */
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
