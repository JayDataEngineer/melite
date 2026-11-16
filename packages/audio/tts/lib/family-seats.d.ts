import type { ModelDecl } from '@melite/comfyui-card-kit/model-contract';
import type { ModelFacts } from '@melite/comfyui-card-kit/facts';
import type { TtsLaneTopology } from '@melite/models-qwen3-tts';
/** One family's runtime seat: its DECL plus the craft faces the
 *  family package exports. */
export type FamilySeat = {
    decl: ModelDecl;
    laneTopologyOf: (model: ModelFacts) => TtsLaneTopology;
    variantRoute: (decl: {
        variants?: ReadonlyArray<{
            id: string;
            route?: string;
        }>;
    }, variantId: string) => string;
    cellRoute: (decl: {
        variants?: ReadonlyArray<{
            id: string;
            cells?: ReadonlyArray<{
                quant: string;
                route?: string;
            }>;
        }>;
    }, variantId: string, quant: string) => string;
};
/** Prime every family seat (idempotent; absent packages degrade to
 *  their own absence — the card never dies for a family). Fired
 *  fire-and-forget at registration; the post-boot seats read the
 *  filled table synchronously. */
export declare const primeFamilySeats: () => Promise<void>;
/** A family's seat — undefined when the package is absent (the
 *  compose door's own loud refusal names the family there). */
export declare const seatOf: (id: string) => FamilySeat | undefined;
/** The offered compose addresses beyond the atom id itself — the
 *  PRESENT family's OWN variant/cell route values, deduplicated,
 *  the head id excluded (the retained small-CustomVoice route is
 *  the atom id, never repeated). An absent family package costs
 *  these rows, never the knob: the tool face serves the BOARDED
 *  atom id alone (the enum still builds; the run refuses loud at
 *  the model seat). */
export declare const offeredRoutes: () => string[];
/** The large default's route — the 1.7B CustomVoice cell's OWN
 *  route from the live DECL (the unstated model composes the large
 *  checkpoint, "ALWAYS the big model"); undefined when the family
 *  package is absent (the tool face falls back to the boarded atom
 *  id). */
export declare const largeRoute: () => string | undefined;
//# sourceMappingURL=family-seats.d.ts.map
