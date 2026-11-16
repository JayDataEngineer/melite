var __rewriteRelativeImportExtension = (this && this.__rewriteRelativeImportExtension) || function (path, preserveJsx) {
    if (typeof path === "string" && /^\.\.?\//.test(path)) {
        return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
            return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
        });
    }
    return path;
};
/** The boarded family modules, by package — the id lives in
 *  card.ts's BOARDED literal (the family-coverage wall judges the
 *  binding on the dev tree; a typo'd id reds it there). */
const FAMILY_MODULES = [
    '@melite/models-input',
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
                scaleMethods: Array.isArray(mod.SCALE_METHODS) ? [...mod.SCALE_METHODS] : [],
                scaleModelOptions: Array.isArray(mod.SCALE_MODEL_OPTIONS) ? [...mod.SCALE_MODEL_OPTIONS] : [],
                minDim: typeof mod.MIN_DIM === 'number' && Number.isFinite(mod.MIN_DIM) ? mod.MIN_DIM : 0,
            });
        }
    });
    return priming;
};
/** A family's seat — undefined when the package is absent (the
 *  compose door's own loud refusal names the family there). */
export const seatOf = (id) => seats.get(id);
/** The scale-method rail — the seat's array (a fresh copy of the
 *  family's own export; the schema rail spreads it). An absent
 *  family serves the card's own declared default as the degenerate
 *  closed set: the kit refuses an empty vocabulary (vocab.ts), so
 *  the rail cannot serve [] — the menu renders the one default and
 *  the compose door refuses the family, loud, by name (never a
 *  fabricated roster). */
export const scaleMethods = () => seatOf('input')?.scaleMethods ?? ['lanczos'];
/** The upscale-model rail — the seat's array (a fresh copy of the
 *  family's own export; the schema rail spreads it). Absent-family
 *  degrade: the "" unstated sentinel (see scaleMethods). */
export const scaleModelOptions = () => seatOf('input')?.scaleModelOptions ?? [''];
/** The crop/scale floor — the seat's MIN_DIM. An absent family
 *  carries no floor: the gates pass through and the dispatch's own
 *  loud family refusal speaks (the degrade never silently
 *  substitutes a card-authored number for the family's law). */
export const minDim = () => seatOf('input')?.minDim ?? 0;
// THE MODULE-LOAD PRIME — see the header (the schema's rails read
// the seat synchronously; the static import from card.ts lands
// after this settles).
await primeFamilySeats();
//# sourceMappingURL=family-seats.js.map
