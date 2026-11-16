var __rewriteRelativeImportExtension = (this && this.__rewriteRelativeImportExtension) || function (path, preserveJsx) {
    if (typeof path === "string" && /^\.\.?\//.test(path)) {
        return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
            return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
        });
    }
    return path;
};
/** The boarded family modules, by package — the three edit lanes
 *  plus the mask family (its detector rows serve the crop_stitch
 *  arm). Ids live in card.ts's BOARDED literal (the family-coverage
 *  wall judges the binding on the dev tree; a typo'd id reds it
 *  there). */
const FAMILY_MODULES = [
    '@melite/models-qwen-img-edit-21',
    '@melite/models-fibo2-edit',
    '@melite/models-h3-image-edit',
    '@melite/models-mask',
];
const seats = new Map();
let priming = null;
/** Prime every family seat (idempotent; absent packages degrade to
 *  their own absence — the card never dies for a family). */
export const primeFamilySeats = () => {
    priming ??= Promise.allSettled(FAMILY_MODULES.map((spec) => import(__rewriteRelativeImportExtension(spec))))
        .then((results) => {
        for (const result of results) {
            if (result.status !== 'fulfilled')
                continue;
            const mod = result.value;
            const decl = mod?.DECL;
            if (decl?.id === undefined || typeof decl.id !== 'string')
                continue;
            seats.set(decl.id, {
                decl,
                detectors: Array.isArray(mod.DETECTOR_PROVISIONS)
                    ? mod.DETECTOR_PROVISIONS
                    : undefined,
            });
        }
    });
    return priming;
};
/** A family's seat — undefined when the package is absent (the
 *  compose door's own loud refusal names the family there). */
export const seatOf = (id) => seats.get(id);
/** The detector rows the crop_stitch arm serves — the mask
 *  family's DETECTOR_PROVISIONS export by identity (the downloads
 *  law: the card serves, never authors a copy); an absent mask
 *  package serves no rows (its absence is its own cost). */
export const detectorProvisions = () => seatOf('mask-select')?.detectors;
/** The present edit seats, in BOARDED order — the schema's list-cap
 *  derivation reads these (a pruned lane costs its own contribution
 *  to the cap, never the card). */
export const editSeats = () => ['qwen-img-edit-21', 'fibo2-edit', 'h3-image-edit']
    .map((id) => seatOf(id))
    .filter((seat) => seat !== undefined);
// THE MODULE-LOAD PRIME — see the header (the schema's cap and the
// registration rows read the seats synchronously; the static import
// from card.ts lands after this settles).
await primeFamilySeats();
//# sourceMappingURL=family-seats.js.map
