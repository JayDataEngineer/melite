import type { ModelDecl } from '@melite/comfyui-card-kit/model-contract';
/** One family's runtime seat: its DECL. (Both families ship no
 *  craft face — the seat carries whatever the family exports; today
 *  only the DECL is consumed.) */
export type FamilySeat = {
    decl: ModelDecl;
};
/** Prime every family seat (idempotent; absent packages degrade to
 *  their own absence — the card never dies for a family). Fired
 *  fire-and-forget at registration; the compose seats read the
 *  filled table synchronously. */
export declare const primeFamilySeats: () => Promise<void>;
/** A family's seat — undefined when the package is absent (the lane
 *  door's own loud refusal names the family there). */
export declare const seatOf: (id: string) => FamilySeat | undefined;
//# sourceMappingURL=family-seats.d.ts.map
