var __rewriteRelativeImportExtension = (this && this.__rewriteRelativeImportExtension) || function (path, preserveJsx) {
    if (typeof path === "string" && /^\.\.?\//.test(path)) {
        return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
            return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
        });
    }
    return path;
};
/** The boarded family module, by package — the id lives in
 *  card.ts's boarded literal (the family-coverage wall judges the
 *  binding on the dev tree; a typo'd id reds it there). */
const FAMILY_MODULES = [
    '@melite/models-moss-sfx',
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
//# sourceMappingURL=family-seats.js.map
