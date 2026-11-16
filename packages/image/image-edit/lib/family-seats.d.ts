import type { ModelDecl, ProvisionRow } from '@melite/comfyui-card-kit/model-contract';
/** One family's runtime seat: its DECL plus the detector rows when
 *  the family owns them (today only mask ships DETECTOR_PROVISIONS;
 *  the field is the pattern any future row-owner rides). */
export type FamilySeat = {
    decl: ModelDecl;
    detectors?: ProvisionRow[];
};
/** Prime every family seat (idempotent; absent packages degrade to
 *  their own absence — the card never dies for a family). */
export declare const primeFamilySeats: () => Promise<void>;
/** A family's seat — undefined when the package is absent (the
 *  compose door's own loud refusal names the family there). */
export declare const seatOf: (id: string) => FamilySeat | undefined;
/** The detector rows the crop_stitch arm serves — the mask
 *  family's DETECTOR_PROVISIONS export by identity (the downloads
 *  law: the card serves, never authors a copy); an absent mask
 *  package serves no rows (its absence is its own cost). */
export declare const detectorProvisions: () => ProvisionRow[] | undefined;
/** The present edit seats, in BOARDED order — the schema's list-cap
 *  derivation reads these (a pruned lane costs its own contribution
 *  to the cap, never the card). */
export declare const editSeats: () => FamilySeat[];
//# sourceMappingURL=family-seats.d.ts.map
