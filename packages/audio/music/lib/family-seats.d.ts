import type { ModelDecl } from '@melite/comfyui-card-kit/model-contract';
/** One family's runtime seat: its DECL. The seat is the pattern any
 *  future craft face the families export rides (image-gen's seat
 *  carries anima's promptTags restorer the same way). */
export type FamilySeat = {
    decl: ModelDecl;
};
/** Prime every family seat (idempotent; absent packages degrade to
 *  their own absence — the card never dies for a family). Fired
 *  fire-and-forget at registration; the post-boot seats read the
 *  filled table synchronously. */
export declare const primeFamilySeats: () => Promise<void>;
/** A family's seat — undefined when the package is absent (the
 *  compose door's own loud refusal names the family there). */
export declare const seatOf: (id: string) => FamilySeat | undefined;
/** The boarded knob's live ids — the PRESENT families in the
 *  FAMILY_MODULES order (a missing family costs its enum row, never
 *  the knob; an all-absent install serves an empty list and the
 *  tool face falls back to the BOARDED literal, where the run
 *  refuses loud at the model seat). */
export declare const boardedModels: () => string[];
//# sourceMappingURL=family-seats.d.ts.map
