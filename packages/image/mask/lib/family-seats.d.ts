import type { ModelDecl, ProvisionRow } from '@melite/comfyui-card-kit/model-contract';
/** The mask family's seat: its DECL plus the download rows the
 *  family owns (served by identity — never a card-authored copy). */
export type FamilySeat = {
    decl: ModelDecl;
    provisions: ProvisionRow[];
};
/** Prime every family seat (idempotent; absent packages degrade to
 *  their own absence — the card never dies for a family). */
export declare const primeFamilySeats: () => Promise<void>;
/** A family's seat — undefined when the package is absent (the
 *  compose door's own loud refusal names the family there). */
export declare const seatOf: (id: string) => FamilySeat | undefined;
/** The registration rows the card serves — the family's OWN
 *  PROVISIONS export, by identity; an absent family package serves
 *  no rows (its absence is its own cost). */
export declare const maskProvisions: () => ProvisionRow[] | undefined;
//# sourceMappingURL=family-seats.d.ts.map
