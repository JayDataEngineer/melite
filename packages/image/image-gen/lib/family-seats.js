var __rewriteRelativeImportExtension = (this && this.__rewriteRelativeImportExtension) || function (path, preserveJsx) {
    if (typeof path === "string" && /^\.\.?\//.test(path)) {
        return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
            return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
        });
    }
    return path;
};
// family-seats.ts — the plugin law's family seat (L3 cure,
// 2026-11-16, card-without-family audit): THE CARD EXISTS WITHOUT
// ITS FAMILIES. This module is the card's ONLY bridge to the
// family packages, and it holds ZERO static imports — each family
// resolves through a guarded dynamic import, primed once at
// registration (fire-and-forget) and read synchronously by the
// card's post-boot seats (craft normalize, compose bindings, the
// tool face's semantic knob).
//
// THE DEGRADE LAW (per family, never per card): a missing family
// package costs ITS OWN seat — the card still registers, the knob
// serves the present families, compose refuses loud naming the
// absent family at the model seat. A family module that exists
// but exports no DECL id is skipped named; a present family's
// craft face (anima's promptTags restore) is picked up generically.
import { semanticModelEntries } from '@melite/comfyui-card-kit/semanticModelKnob';
/** The boarded family modules, by package — ids live in card.ts's
 *  BOARDED literal (the family-coverage wall judges the binding on
 *  the dev tree; a typo'd id reds it there). */
const FAMILY_MODULES = [
    '@melite/models-krea-2',
    '@melite/models-z-image',
    '@melite/models-anima',
    '@melite/models-qwen-img-21',
    '@melite/models-flux-klein',
    '@melite/models-moss-image',
    '@melite/models-h3-image',
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
            seats.set(decl.id, {
                decl,
                restorePromptTags: typeof mod.normalizeAnimaPromptTags === 'function'
                    ? mod.normalizeAnimaPromptTags
                    : undefined,
            });
        }
    });
    return priming;
};
/** A family's seat — undefined when the package is absent (the
 *  compose door's own loud refusal names the family there). */
export const seatOf = (id) => seats.get(id);
/** The semantic model knob's entries — derived from the PRESENT
 *  families only (a missing family costs its entries, never the
 *  knob; an all-absent estate serves an empty enum and the tool
 *  default falls to BOARDED[0]). */
export const semanticModels = () => semanticModelEntries([...seats.values()].map((seat) => seat.decl));
//# sourceMappingURL=family-seats.js.map
