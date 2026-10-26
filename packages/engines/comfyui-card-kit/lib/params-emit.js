import { extraOf } from '@melite/contracts/extraKeys';
export const emitKnob = (s) => {
    const m = (s.meta ?? {});
    // THE ONE VOCABULARY (2026-10-10): the bag narrows through the
    // floor's typed read — @melite/contracts/extraKeys owns every
    // spelling; this face reads property names off the typed bag,
    // never a second string literal (the visibleWhen dead read died
    // here).
    const ex = extraOf(s);
    // union resolution
    let type = s.type;
    let inner = null;
    // wire-coerced Select classes stringify their default + options
    // (served bytes: type "string", enum ["512",...] — compose coerces)
    let stringified = false;
    if (type === 'union' && Array.isArray(s.list)) {
        const branches = s.list;
        const nonNull = branches.filter((b) => !(b.type === 'const' && b.value === null));
        if (nonNull.length === 0) {
            type = 'null';
        }
        else if (nonNull.length === 1 && branches.length === 2) {
            // nullable: inner branch wins, null never served
            inner = nonNull[0];
            type = inner.type;
        }
        else if (branches.every((b) => b.type === 'const')) {
            type = 'string';
        }
        else if (branches.some((b) => b.type === 'boolean')) {
            type = 'string';
            stringified = true;
        }
        else {
            // wire-coerced Select (number|string): the knob default rides
            type = 'string';
            stringified = true;
        }
    }
    const im = inner
        // nullable: the DEFAULT/description/role ride the OUTER union
        // (that's where the card declares them); floors/step ride the
        // inner number branch — merge with outer as fallback
        ? { ...m, ...Object.fromEntries(Object.entries((inner.meta ?? {})).filter(([, v]) => v !== undefined)) }
        : m;
    const iex = inner ? extraOf({ meta: im }) : ex;
    // extra.options ⇒ wire-coerced Select class regardless of TS atom:
    // served type "string", enum + default stringified (compose coerces)
    if (iex.options !== undefined) {
        stringified = true;
        type = 'string';
    }
    // canonical key order: type, format, enum, default, minimum,
    // maximum, description, x-visible-when, x-families (the served
    // order — byte-stable)
    const out = {};
    if (type === 'number') {
        out.type = im.step === 1 ? 'integer' : 'number';
    }
    else if (type === 'any') {
        out.type = 'string';
    }
    else {
        out.type = type;
    }
    if (im.role === 'path')
        out.format = 'path';
    // enum: const-union values, then options hints (stringified for
    // the coerced Select class), then the bool-string pair
    if (type === 'string' && Array.isArray(s.list) && s.list.every((b) => b.type === 'const' && b.value !== null)) {
        out.enum = s.list.map((b) => b.value);
    }
    else if (iex.options !== undefined) {
        // THE BOTH-SHAPES LAW (extraKeys.ts:28): an option row is a plain
        // string OR a {value,label} row. String(o) over the object arm
        // served "[object Object]" as an enum member — the select's own
        // value, unreachable and unreadable (the typed-seam audit, 2026-10-15).
        out.enum = iex.options.map((o) => {
            if (typeof o === "string")
                return o;
            if (typeof o === "object" && o !== null &&
                typeof o.value === "string") {
                return o.value;
            }
            return String(o);
        });
    }
    else if (stringified && Array.isArray(s.list) && s.list.some((b) => b.type === 'boolean')) {
        out.enum = ['true', 'false'];
    }
    // default: omit only when UNDECLARED (a bare knob) — an explicit
    // .default([]) serves its [] (the served bytes carry it). The
    // marker disambiguates from schemastery's auto-default []: arrays
    // ALWAYS carry meta.default [], so an empty array serves its
    // default ONLY when extra.serveDefault is set (input_images).
    if (im.default !== undefined && !(Array.isArray(im.default) && im.default.length === 0 && !iex.serveDefault)) {
        out.default = stringified && (typeof im.default === 'number' || typeof im.default === 'boolean')
            ? String(im.default)
            : im.default;
    }
    // floors: validating meta first, then hint-only extra
    if (im.min !== undefined)
        out.minimum = im.min;
    if (im.max !== undefined)
        out.maximum = im.max;
    if (out.minimum === undefined && iex.min !== undefined)
        out.minimum = iex.min;
    if (out.maximum === undefined && iex.max !== undefined)
        out.maximum = iex.max;
    if (im.description)
        out.description = im.description;
    // ONE VOCABULARY (li-f): the snake spelling is the only one the
    // contract carries — the camel alias is GONE. Every writer passes
    // bag() (tsc refuses camel at the literal), the wire walk refuses
    // camel on any served envelope, so a legible second spelling had
    // no remaining writer and no reason to stay legible.
    const vw = iex['visible_when'];
    if (vw !== undefined)
        out['x-visible-when'] = vw;
    if (iex.families !== undefined)
        out['x-families'] = iex.families;
    return out;
};
/** The implicit property map (`/v1/tools`'s JSON-schema form):
 *  the schema's own fields plus the synthesized model enum.
 *
 *  @param schemaCarrier the card's declared schema object
 *  @param boarded the boarded family ids
 *  @param semantic the derived style entries — served as the model
 *   enum when present; the bare boarded enum otherwise
 *  @returns the served properties + required list
 */
export const emitParamsSpec = (carrier, boarded, semantic) => {
    const served = emitParamsSchema(carrier, boarded, semantic);
    const spec = {};
    const requiredSet = new Set(served.required ?? []);
    /* v8 ignore next -- emitParamsSchema always serves properties
     * (the object literal above); the ?? is the type-system's toll
     * (ParamsSchema.properties is optional), not a runtime arm. */
    const props = served.properties ?? {};
    for (const [k, node] of Object.entries(props)) {
        const t = String(node.type);
        const out = {
            type: t === "string" || t === "number" || t === "integer" || t === "boolean"
                ? t
                : "json",
        };
        let desc = typeof node.description === "string" ? node.description : "";
        // The DSL carries default NATIVELY (see the interface header) —
        // the served default is already conditioned (stringified only
        // for wire-coerced Selects, raw otherwise), so it rides through
        // untouched. Bounds have no DSL keys: they fold into the
        // description so the model still sees them (the receipt's
        // converter discipline — never attach unsupported keys).
        if (node.default !== undefined)
            out.default = node.default;
        const bounds = [];
        if (typeof node.minimum === "number")
            bounds.push(`min: ${node.minimum}`);
        if (typeof node.maximum === "number")
            bounds.push(`max: ${node.maximum}`);
        if (bounds.length > 0)
            desc += ` (${bounds.join(", ")})`;
        desc = desc.trim();
        if (desc)
            out.description = desc;
        // Enum fidelity: JSON scalars pass through untouched (numbers
        // stay numbers for number/integer nodes — the DSL validates
        // them natively); anything else stringifies (served options
        // are already strings — idempotent; the bool-string pair is
        // strings by construction).
        if (Array.isArray(node.enum)) {
            out.enum = node.enum.map((e) => (typeof e === "number" ? e : String(e)));
        }
        if (requiredSet.has(k))
            out.required = true;
        spec[k] = out;
    }
    return spec;
};
/** Project a registered card's schema + boarded list to the served
 * params_schema dialect. `schemaFn` is the card's registered schema
 * (the callable); we walk its carrier via the .dict of the declared
 * object — cards register the schema object itself, and a card that
 * wraps its schema (h3 normalizes through a function) carries the
 * inner one at def.schemaCarrier. The registry's own reader of that
 * field is models/service.ts:987, which resolves
 * `def?.schemaCarrier ?? def?.schema`. */
/** The JSON-schema form of the same walk.
 *
 *  @param schemaCarrier the card's declared schema object
 *  @param boarded the boarded family ids
 *  @param semantic the derived style entries — the model enum +
 *   default (the first entry) + label-carrying description when
 *   present; the bare boarded enum otherwise
 *  @returns properties, required, and (when the carrier declares
 *   them) additionalProperties
 */
export const emitParamsSchema = (schemaCarrier, boarded, semantic) => {
    const dict = schemaCarrier.dict ?? {};
    const properties = {};
    // the served model knob exists ONLY on multi-family cards — a
    // single-family board is unambiguous (the top-level model IS the
    // card). Multi-family synthesizes the picker from one source with
    // two lawful spellings: the semantic style enum (entries derived
    // at semanticModelKnob.ts from the boarded DECLs' own variant
    // rows — labels are the DECLs' copy, values resolve to routes
    // estate-side; a seat passes them when its DECLs are in scope)
    // or the bare boarded family-id enum where no derivation is
    // wired yet. The {model:} door still owns admission; this knob
    // is the UI's picker.
    if (boarded.length > 1) {
        if (semantic !== undefined && semantic.length > 0) {
            properties.model = {
                type: 'string',
                enum: semantic.map((e) => e.value),
                default: semantic[0].value,
                description: `The style to run — the request's top-level \`model\`. Options: ` +
                    semantic.map((e) => `${e.label} (${e.value})`).join('; ') + '.',
            };
        }
        else {
            properties.model = {
                type: 'string',
                enum: [...boarded],
                default: boarded[0],
                description: `The boarded family to run — the request's top-level \`model\`. Options: ${boarded.join(', ')}.`,
            };
        }
    }
    const required = [];
    for (const [k, v] of Object.entries(dict)) {
        // THE HIDDEN-ALIAS LAW (the operator's rework, 2026-09-26:
        // "reference images and input images are the same thing" — a
        // hidden alias is a VALIDATION key for old drafts, never a
        // face): extra.hidden knobs stay out of BOTH projections. The
        // image-edit card's image2/image3 are the case — compose merges
        // them into the reference order and the form never renders
        // them, but the tool face served "Image 2"/"Image 3" beside
        // Reference Images: one concept spelled twice, the alias half
        // of it outside the input category. Hidden = unserved.
        const hiddenEx = ((v.meta ?? {}).extra ?? {});
        if (hiddenEx.hidden === true)
            continue;
        properties[k] = emitKnob(v);
        const ex = extraOf(v);
        if (ex.required === true)
            required.push(k);
    }
    const out = { type: 'object', properties };
    if (required.length > 0)
        out.required = required;
    return out;
};
/** THE MODS PROJECTION (stroke 79 — the seam-law unification): the
 *  declared kinds as the AGENT plane consumes them. ONE emitter,
 *  TWO doors (the /v1/tools manifest row and the /v1/load bundle's
 *  signature — never a re-derivation in either). The mod bags are
 *  NOT flat-schema keys: params_schema alone cannot compose a card
 *  whose complexity lives in mods, and an agent that never learns
 *  the kinds hits compose's loud refusals blind. Verbatim off the
 *  card's own declared rows; leaf_face is a UI concern and never
 *  rides (the agent composes VALUES, never faces). */
export const emitModifierKinds = (mods) => (mods ?? []).map((k) => ({
    kind: k.kind,
    ...(k.category !== undefined ? { category: k.category } : {}),
    cardinality: k.cardinality,
    fields: (k.fields ?? []).map((f) => String(f['name'] ?? '')),
}));
//# sourceMappingURL=params-emit.js.map