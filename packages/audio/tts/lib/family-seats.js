var __rewriteRelativeImportExtension = (this && this.__rewriteRelativeImportExtension) || function (path, preserveJsx) {
    if (typeof path === "string" && /^\.\.?\//.test(path)) {
        return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
            return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
        });
    }
    return path;
};
/** The boarded family module, by package — the id lives in
 *  card.ts's BOARDED literal (the family-coverage wall judges the
 *  binding on the dev tree; a typo'd id reds it there). */
const FAMILY_MODULES = [
    '@melite/models-qwen3-tts',
];
/** The route-table keys the tool face derives the offered compose
 *  addresses from (the family's OWN variant ids and size quants —
 *  data keys, never retyped route strings; the route VALUES come
 *  from the live seat's DECL). */
const OFFERED_VARIANTS = ['customvoice', 'voicedesign', 'base'];
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
            seats.set(decl.id, {
                decl,
                laneTopologyOf: typeof mod.laneTopologyOf === 'function' ? mod.laneTopologyOf : missingCraftFace,
                variantRoute: typeof mod.variantRoute === 'function' ? mod.variantRoute : missingCraftFace,
                cellRoute: typeof mod.cellRoute === 'function' ? mod.cellRoute : missingCraftFace,
            });
        }
    });
    return priming;
};
/** A family's seat — undefined when the package is absent (the
 *  compose door's own loud refusal names the family there). */
export const seatOf = (id) => seats.get(id);
/** The offered compose addresses beyond the atom id itself — the
 *  PRESENT family's OWN variant/cell route values, deduplicated,
 *  the head id excluded (the retained small-CustomVoice route is
 *  the atom id, never repeated). An absent family package costs
 *  these rows, never the knob: the tool face serves the BOARDED
 *  atom id alone (the enum still builds; the run refuses loud at
 *  the model seat). */
export const offeredRoutes = () => {
    const seat = seatOf('qwen3-tts');
    if (seat === undefined)
        return [];
    const head = typeof seat.decl.id === 'string' ? seat.decl.id : '';
    const rows = OFFERED_VARIANTS.map((variant) => seat.variantRoute(seat.decl, variant));
    rows.push(seat.cellRoute(seat.decl, 'base', '0_6b'));
    return rows.filter((route, i, all) => route !== '' && all.indexOf(route) === i && route !== head);
};
/** The large default's route — the 1.7B CustomVoice cell's OWN
 *  route from the live DECL (the unstated model composes the large
 *  checkpoint, "ALWAYS the big model"); undefined when the family
 *  package is absent (the tool face falls back to the boarded atom
 *  id). */
export const largeRoute = () => {
    const seat = seatOf('qwen3-tts');
    return seat === undefined ? undefined : seat.cellRoute(seat.decl, 'customvoice', '1_7b');
};
/** A module whose DECL exists but lacks the named craft face — the
 *  seats stay total so a malformed family fails at ITS OWN use site
 *  (a TypeError naming the face), never at priming. */
function missingCraftFace() {
    throw new Error('the family module exports no such craft face — the seat carries the family package exports, never a reimplementation');
}
//# sourceMappingURL=family-seats.js.map
