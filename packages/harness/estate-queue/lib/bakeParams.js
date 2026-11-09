// bakeParams.ts — the AnnyBakeParams serve belt: params_json
// preset-dialect validation rides the initial_validators gate
// (bake_params initials refuse BEFORE any run registers).
// TS-native: the estate voice,
// renders, and the PyNum literal-holder are deleted.
//
// Erasable-syntax TS only (node --experimental-strip-types).
export function vErr(loc, msg, input) {
    return { loc, msg, input };
}
/** The validation-error render: one "path: message" line per
 *  failure (model name heads model-level errors). */
export function renderErrors(model, errs) {
    const lines = [];
    for (const e of errs) {
        const loc = e.loc.map(String).join(".");
        lines.push((loc === "" ? model : loc) + ": " + e.msg);
    }
    return lines.join("\n");
}
/** Strict float slot: finite numbers ride; anything else errors. */
function parseFloatLax(v, loc, errs) {
    if (typeof v === "number") {
        if (!Number.isFinite(v)) {
            errs.push(vErr(loc, "Input should be a valid number", v));
            return null;
        }
        return v;
    }
    errs.push(vErr(loc, "Input should be a valid number", v));
    return null;
}
function isPlainObject(v) {
    if (typeof v !== "object" || v === null || Array.isArray(v))
        return false;
    const proto = Object.getPrototypeOf(v);
    return proto === Object.prototype;
}
/** Required-field fetch (missing -> Field required on the parent). */
function reqField(v, key, loc, errs) {
    if (!(key in v) || v[key] === undefined) {
        errs.push(vErr([...loc, key], "Field required", v));
        return { found: false, value: undefined };
    }
    return { found: true, value: v[key] };
}
/** Extra-key sweep (definition-order fields first, extras last in
 *  input order.) */
function extraSweep(v, known, loc, errs) {
    for (const k of Object.keys(v)) {
        if (!known.has(k)) {
            errs.push(vErr([...loc, k], "Extra inputs are not permitted", v[k]));
        }
    }
}
function validFloatTuple(v, loc, errs) {
    if (!Array.isArray(v)) {
        errs.push(vErr(loc, "value must be an array", v));
        return null;
    }
    const items = [...v];
    const nums = [];
    let bad = false;
    for (let i = 0; i < items.length; i++) {
        const n = parseFloatLax(items[i], [...loc, i], errs);
        if (n === null)
            bad = true;
        else
            nums.push(n);
    }
    return bad ? null : { items, nums };
}
/** Validate a served params_json through the AnnyBakeParams shape
 *  (the serve-side belt). Failures render with the wire string as
 *  input, not the parsed doc.
 *  Returns the failure text, or null. */
export function validateBakeParams(s) {
    let doc;
    try {
        doc = JSON.parse(s);
    }
    catch (exc) {
        const msg = exc instanceof Error
            ? exc.message
            : /* v8 ignore next -- JSON.parse throws Errors: the String
                 fallback never fires (2026-09-12) */
                String(exc);
        return renderErrors("AnnyBakeParams", [
            vErr([], "params_json is not JSON: " + msg, s),
        ]);
    }
    if (!isPlainObject(doc)) {
        return renderErrors("AnnyBakeParams", [
            vErr([], "params_json must be a JSON object, got " + (typeof doc), s),
        ]);
    }
    const errs = [];
    let dialect = "";
    const rd = reqField(doc, "dialect", [], errs);
    if (!rd.found)
        dialect = "";
    else if (rd.value !== "authored" && rd.value !== "estimated") {
        errs.push(vErr([], "Input should be 'authored' or 'estimated'", rd.value));
    }
    else
        dialect = rd.value;
    let phenotype = null;
    const rp = reqField(doc, "phenotype", [], errs);
    if (!rp.found)
        phenotype = null;
    else {
        const t = validFloatTuple(rp.value, ["phenotype"], errs);
        phenotype = t === null ? null : t.nums;
    }
    let locals = [];
    let localsBad = false;
    if ("local_changes" in doc && doc["local_changes"] !== undefined) {
        const lv = doc["local_changes"];
        if (!isPlainObject(lv)) {
            errs.push(vErr([], "params_json local_changes must be an object", lv));
            localsBad = true;
        }
        else {
            for (const k of Object.keys(lv)) {
                const n = parseFloatLax(lv[k], ["local_changes", k], errs);
                if (n === null)
                    localsBad = true;
                else
                    locals.push({ name: k, value: n });
            }
        }
    }
    let scale = null;
    if ("scale" in doc && doc["scale"] !== undefined && doc["scale"] !== null) {
        const t = validFloatTuple(doc["scale"], ["scale"], errs);
        if (t !== null)
            scale = t.nums;
    }
    extraSweep(doc, new Set(["dialect", "phenotype", "local_changes", "scale"]), [], errs);
    if (errs.length > 0 || phenotype === null || localsBad) {
        return renderErrors("AnnyBakeParams", errs);
    }
    const fail = (msg) => renderErrors("AnnyBakeParams", [vErr([], msg, s)]);
    if (dialect === "authored") {
        if (phenotype.length !== 11) {
            return fail("authored phenotype wants 11 dims, got " + phenotype.length +
                " — the dims are gender/age/muscle/weight/height/proportions/cupsize/firmness/african/asian/caucasian");
        }
        for (let i = 0; i < phenotype.length; i++) {
            const n = phenotype[i];
            if (!(n >= 0.0 && n <= 1.0)) {
                return fail("authored phenotype[" + i + "] = " + String(n) + " outside 0.0..1.0");
            }
        }
        if (scale !== null) {
            return fail("authored takes local_changes, not scale (that is the estimated dialect)");
        }
    }
    else {
        if (phenotype.length !== 6) {
            return fail("estimated phenotype wants 6 dims, got " + phenotype.length +
                " (the estimator's identity coefficients, not the 11 authoring dims)");
        }
        if (scale === null) {
            return fail("estimated wants scale (the estimator run's measurement vector)");
        }
        if (scale.length !== 139) {
            return fail("estimated scale wants 139 entries, got " + scale.length);
        }
        if (locals.length > 0) {
            return fail("estimated bakes phenotype+scale only — local_changes would be silently ignored (that is the authored dialect)");
        }
    }
    for (const e of locals) {
        if (!(e.value >= -1.0 && e.value <= 2.0)) {
            return fail("local_changes[" + JSON.stringify(e.name) + "] = " +
                String(e.value) + " outside -1.0..2.0");
        }
    }
    return null;
}
//# sourceMappingURL=bakeParams.js.map