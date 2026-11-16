import type { SemanticModelEntry } from '@melite/comfyui-card-kit/semanticModelKnob';
import type { ModelDecl } from '@melite/comfyui-card-kit/model-contract';
/** One family's runtime seat: its DECL plus any craft face the
 *  family package exports (today only anima ships a promptTags
 *  restorer; the pattern is the seat any future craft face rides). */
export type FamilySeat = {
    decl: ModelDecl;
    restorePromptTags?: (text: string) => {
        text: string;
        fixed: string[];
    };
};
/** Prime every family seat (idempotent; absent packages degrade to
 *  their own absence — the card never dies for a family). Fired
 *  fire-and-forget at registration; the post-boot seats read the
 *  filled table synchronously. */
export declare const primeFamilySeats: () => Promise<void>;
/** A family's seat — undefined when the package is absent (the
 *  compose door's own loud refusal names the family there). */
export declare const seatOf: (id: string) => FamilySeat | undefined;
/** The semantic model knob's entries — derived from the PRESENT
 *  families only (a missing family costs its entries, never the
 *  knob; an all-absent estate serves an empty enum and the tool
 *  default falls to BOARDED[0]). */
export declare const semanticModels: () => readonly SemanticModelEntry[];
//# sourceMappingURL=family-seats.d.ts.map
