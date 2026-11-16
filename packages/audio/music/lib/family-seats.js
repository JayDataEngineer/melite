var __rewriteRelativeImportExtension = (this && this.__rewriteRelativeImportExtension) || function (path, preserveJsx) {
    if (typeof path === "string" && /^\.\.?\//.test(path)) {
        return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
            return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
        });
    }
    return path;
};
/** The boarded family modules, by package — ids live in card.ts's
 *  BOARDED literal (the family-coverage wall judges the binding on
 *  the dev tree; a typo'd id reds it there). */
const FAMILY_MODULES = [
    '@melite/models-music3',
    '@melite/models-yue2',
];
const seats = new Map();
let priming = null;
/** Prime every family seat (idempotent; absent packages degrade to
 *  their own absence — the card never dies for a family). Fired
 *  fire-and-forget at registration; the post-boot seats read the
 *  filled table synchronously. */
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
            seats.set(decl.id, { decl });
        }
    });
    return priming;
};
/** A family's seat — undefined when the package is absent (the
 *  compose door's own loud refusal names the family there). */
export const seatOf = (id) => seats.get(id);
/** The boarded knob's live ids — the PRESENT families in the
 *  FAMILY_MODULES order (a missing family costs its enum row, never
 *  the knob; an all-absent install serves an empty list and the
 *  tool face falls back to the BOARDED literal, where the run
 *  refuses loud at the model seat). */
export const boardedModels = () => [...seats.values()].map((seat) => seat.decl.id);
//# sourceMappingURL=family-seats.js.map
