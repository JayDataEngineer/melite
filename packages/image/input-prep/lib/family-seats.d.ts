import type { ModelDecl } from '@melite/comfyui-card-kit/model-contract';
/** The input family's seat: its DECL plus the scale vocabulary it
 *  owns (the one truth the card's schema rails and the studio's
 *  menus cite — the leaf imports nothing, so the client bundle
 *  inlines its bytes; the studio reads the same seat through
 *  src/ui/studio/scaleVocabSeat.ts). */
export type FamilySeat = {
    decl: ModelDecl;
    scaleMethods: readonly string[];
    scaleModelOptions: readonly string[];
    minDim: number;
};
/** Prime every family seat (idempotent; absent packages degrade to
 *  their own absence — the card never dies for a family). */
export declare const primeFamilySeats: () => Promise<void>;
/** A family's seat — undefined when the package is absent (the
 *  compose door's own loud refusal names the family there). */
export declare const seatOf: (id: string) => FamilySeat | undefined;
/** The scale-method rail — the seat's array (a fresh copy of the
 *  family's own export; the schema rail spreads it). An absent
 *  family serves the card's own declared default as the degenerate
 *  closed set: the kit refuses an empty vocabulary (vocab.ts), so
 *  the rail cannot serve [] — the menu renders the one default and
 *  the compose door refuses the family, loud, by name (never a
 *  fabricated roster). */
export declare const scaleMethods: () => readonly string[];
/** The upscale-model rail — the seat's array (a fresh copy of the
 *  family's own export; the schema rail spreads it). Absent-family
 *  degrade: the "" unstated sentinel (see scaleMethods). */
export declare const scaleModelOptions: () => readonly string[];
/** The crop/scale floor — the seat's MIN_DIM. An absent family
 *  carries no floor: the gates pass through and the dispatch's own
 *  loud family refusal speaks (the degrade never silently
 *  substitutes a card-authored number for the family's law). */
export declare const minDim: () => number;
//# sourceMappingURL=family-seats.d.ts.map
