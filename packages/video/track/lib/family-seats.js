var __rewriteRelativeImportExtension = (this && this.__rewriteRelativeImportExtension) || function (path, preserveJsx) {
    if (typeof path === "string" && /^\.\.?\//.test(path)) {
        return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
            return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
        });
    }
    return path;
};
/** The boarded family modules, by package — the id lives in the
 *  compose door's seat read (the family-coverage wall judges the
 *  binding on the dev tree; a typo'd id reds it there). */
const FAMILY_MODULES = [
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
                provisions: Array.isArray(mod.PROVISIONS) ? mod.PROVISIONS : [],
            });
        }
    });
    return priming;
};
/** A family's seat — undefined when the package is absent (the
 *  compose door's own loud refusal names the family there). */
export const seatOf = (id) => seats.get(id);
/** The registration rows the card serves — the family's OWN
 *  PROVISIONS export, by identity; an absent family package serves
 *  no rows (its absence is its own cost). */
export const maskProvisions = () => seatOf('mask-select')?.provisions;
// THE MODULE-LOAD PRIME — see the header (the registration rows
// read the seat synchronously inside the card's registration
// effect; the static import from card.ts lands after this settles).
await primeFamilySeats();
//# sourceMappingURL=family-seats.js.map
