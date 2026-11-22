var __rewriteRelativeImportExtension = (this && this.__rewriteRelativeImportExtension) || function (path, preserveJsx) {
    if (typeof path === "string" && /^\.\.?\//.test(path)) {
        return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
            return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
        });
    }
    return path;
};
/** The boarded family package — the id lives in card.ts's BOARDED
 *  literal (the family-coverage wall judges the binding on the dev
 *  tree; a typo'd id reds it there). */
const FAMILY = '@melite/models-h3';
/** The faces of the ONE package the card reads. Subpaths count as
 *  the same family: they load or fail together. */
const FAMILY_FACES = [
    FAMILY,
    `${FAMILY}/mods/loras`,
    `${FAMILY}/schema`,
    `${FAMILY}/actions`,
];
const seats = new Map();
let priming = null;
/** Prime every family seat (idempotent; an absent package degrades
 *  to its own absence — the card never dies for a family). A
 *  package whose faces fail to load (absent from the install) or
 *  whose faces load malformed leaves NO seat: the doors that need a
 *  face refuse loud naming the package. */
export const primeFamilySeats = () => {
    priming ??= Promise.allSettled(FAMILY_FACES.map((spec) => import(__rewriteRelativeImportExtension(spec))))
        .then((results) => {
        // ONE package, ONE seat: every face of the one family resolves
        // together — a failed face never seats a half-family.
        if (!results.every((result) => result.status === 'fulfilled'))
            return;
        const [main, loras, schema, actions] = results.map((result) => result.value);
        const decl = main?.DECL;
        if (decl?.id === undefined || typeof decl.id !== 'string')
            return;
        if (typeof main.h3DefaultLoraEntry !== 'function' ||
            typeof main.finalizeH3 !== 'function' ||
            typeof main.renderH3Edit !== 'function' ||
            typeof main.reshootArmed !== 'function' ||
            typeof main.assertOverlayGated !== 'function' ||
            typeof main.filmAdmissionNotices !== 'function' ||
            typeof main.SEAM_OVERLAP_FRAMES !== 'number' ||
            typeof main.REFINE_DEFAULT_CLIP_SECONDS !== 'number' ||
            !Array.isArray(loras?.H3_LORA_ROWS) ||
            typeof schema?.paramSchema !== 'function' ||
            typeof schema?.schema !== 'function' ||
            typeof schema?.coerceWireBoolean !== 'function' ||
            !Array.isArray(schema?.JSON_ARRAY_PARAMS) ||
            typeof actions?.parseH3Facts !== 'function') {
            return;
        }
        seats.set(decl.id, {
            decl,
            loraRows: loras.H3_LORA_ROWS,
            defaultLoraEntry: main.h3DefaultLoraEntry,
            finalize: main.finalizeH3,
            renderEdit: main.renderH3Edit,
            reshootArmed: main.reshootArmed,
            assertOverlayGated: main.assertOverlayGated,
            filmAdmissionNotices: main.filmAdmissionNotices,
            parseFacts: actions.parseH3Facts,
            paramSchema: schema.paramSchema,
            schema: schema.schema,
            coerceWireBoolean: schema.coerceWireBoolean,
            jsonArrayParams: schema.JSON_ARRAY_PARAMS,
            seamOverlapFrames: main.SEAM_OVERLAP_FRAMES,
            refineDefaultClipSeconds: main.REFINE_DEFAULT_CLIP_SECONDS,
        });
    });
    return priming;
};
/** A family's seat — undefined when the package is absent or its
 *  faces did not seat (the doors' own loud refusals name it). */
export const seatOf = (id) => seats.get(id);
/** The family seat, LOUD: every door that cannot serve without a
 *  family face refuses here, by name — the compose dispatch, the
 *  carrier walk, the tool face's param surface. The message shape
 *  is composeFamilyAction's (the image-gen exemplar): the family id
 *  on the card, the reason, and the by-name refusal clause. */
export const requireSeat = (cardId, face) => {
    const seat = seats.get('h3');
    if (seat === undefined) {
        throw new Error(`no seat for family 'h3' on the ${cardId} card — the card's ${face} rides the '${FAMILY}' family package, and that package is absent from the install (a family package absent from the install refuses here, by name)`);
    }
    return seat;
};
//# sourceMappingURL=family-seats.js.map