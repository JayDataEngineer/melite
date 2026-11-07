/** True when the value is the wire's array encoding: an object
 * whose single own key `item` holds an array. */
export function isItemWrapped(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        return false;
    const keys = Object.keys(value);
    if (keys.length !== 1 || keys[0] !== 'item')
        return false;
    return Array.isArray(value['item']);
}
/** Deep-unwrap every `{item:[…]}` shape in a params-like tree
 * (objects and arrays both walked, cycles severed by identity).
 * The tool-boundary seat: melite_construct/melite_flow params
 * before they reach the bench — the draft stores CLEAN, reads and
 * compose never see the poison. */
export function unwrapItemArrays(value) {
    const walk = (v, seen) => {
        if (Array.isArray(v)) {
            if (seen.has(v))
                return seen.get(v);
            const out = new Array(v.length);
            seen.set(v, out);
            for (let i = 0; i < v.length; i++)
                out[i] = walk(v[i], seen);
            return out;
        }
        if (typeof v !== 'object' || v === null)
            return v;
        if (isItemWrapped(v))
            return walk(v['item'], seen);
        if (seen.has(v))
            return seen.get(v);
        const out = {};
        seen.set(v, out);
        for (const k of Object.keys(v))
            out[k] = walk(v[k], seen);
        return out;
    };
    return walk(value, new Map());
}
/** The card-seat arm: for every key the Schemastery object schema
 * declares as `type: 'array'`, an empty-string value fills to `[]`
 * (the wire's empty-array spelling). Schema-derived — the dict is
 * the truth, no key list is hand-copied. Every other value rides
 * untouched. */
export function coerceWireArrays(schema, raw) {
    const dict = schema.dict;
    if (dict === undefined)
        return raw;
    let out = null;
    for (const [key, inner] of Object.entries(dict)) {
        if (inner?.type !== 'array')
            continue;
        const v = raw[key];
        if (v === undefined)
            continue;
        if (v === '') {
            out = out ?? { ...raw };
            out[key] = [];
        }
        else if (typeof v === 'string' && v.startsWith('$')) {
            // THE SINGLE-SPELL ARM (2026-10-10, the anchor-law commission's
            // live receipt: `params {input_images: "$input_images"}` + a
            // wire of that name died at the schema gate with `expected
            // array but got $input_images` — the bench grammar's own
            // example spells a channel into a LIST field, and the lane
            // itself takes a spelled member of the ordered list). A bare
            // `$name` on a key the schema declares an array IS the
            // one-element list [spell] — the same restore the single-
            // element wire arm below already makes, keyed on the dict.
            out = out ?? { ...raw };
            out[key] = [v];
        }
        else if (isItemWrapped(v)) {
            out = out ?? { ...raw };
            out[key] = v['item'];
        }
        else if (typeof v === 'object' && v !== null && !Array.isArray(v) &&
            Object.keys(v).length === 1 && Object.prototype.hasOwnProperty.call(v, 'item')) {
            // THE SINGLE-ELEMENT ARM (attempt-035/008's forensic,
            // 2026-09-24): the transport encodes a ONE-element array as
            // `{item: <the element>}` — the element itself, NOT wrapped
            // in an array — so the shape seat (isItemWrapped) misses it.
            // Here the DICT has already declared this key an array, so
            // the restore is schema-licensed: `[element]`.
            out = out ?? { ...raw };
            out[key] = [v['item']];
        }
    }
    return out ?? raw;
}
/** The strict numeric grammar a wire string must match before it
 * fills to a Number (Number() alone admits '0x10', '1e999'→Infinity
 * — the fill never reinterprets, it only restores the number the
 * wire stringified). */
const NUMERIC_STRING = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
/** The numeric-string fill (commission 035's receipt): for every
 * key the Schemastery object schema declares `type: 'number'`, a
 * string value matching the strict numeric grammar fills to its
 * Number. Schema-derived through the dict — the carrier names the
 * numeric keys, no mirror is hand-copied (LAW 2). Every other value
 * (real numbers, non-numeric strings, nulls, objects) rides
 * untouched so Schemastery's own bounds refusal stays the honest
 * voice. */
export function coerceWireNumbers(schema, raw) {
    const dict = schema.dict;
    if (dict === undefined || raw === null || typeof raw !== 'object' || Array.isArray(raw))
        return raw;
    const rec = raw;
    let out = null;
    for (const [key, inner] of Object.entries(dict)) {
        if (inner?.type !== 'number')
            continue;
        const v = rec[key];
        if (typeof v !== 'string' || v.trim() === '' || !NUMERIC_STRING.test(v.trim()))
            continue;
        out = out ?? { ...rec };
        out[key] = Number(v.trim());
    }
    // THE BOXED-NUMBER UNBOX (the same corruption family's object
    // arm — a typeof 'object' Number boxes on some wire seats; plain
    // JSON never produces one, the serializer does): Number objects
    // are unambiguously numbers — restore the primitive.
    if (out === null) {
        for (const [key, inner] of Object.entries(dict)) {
            if (inner?.type !== 'number')
                continue;
            const v = rec[key];
            if (typeof v !== 'object' || v === null || !(v instanceof Number) || !Number.isFinite(v.valueOf()))
                continue;
            out = out ?? { ...rec };
            out[key] = v.valueOf();
        }
    }
    // THE DEEP ELEMENT FILL (attempt-035/008's last wire disease,
    // 2026-09-24): NESTED numbers stringify even when the array
    // arrives true — audio_clips/calls rows landed
    // `{start_frame: "144"}` and the schema refused
    // `start_frame is required (int frames — text alone is not a
    // shot)`. The element declaration rides `inner.inner.dict`
    // (Schemastery's array-of-object shape) — each element walks
    // the SAME numeric fill, recursively (an element may nest
    // arrays itself). Runs INDEPENDENT of the top-level fills — a
    // coerced top-level number must not mask a poisoned element.
    for (const [key, inner] of Object.entries(dict)) {
        if (inner?.type !== 'array' || !Array.isArray(rec[key]))
            continue;
        const el = inner.inner;
        if (el?.dict === undefined)
            continue;
        let elOut = null;
        const rows = rec[key];
        for (let i = 0; i < rows.length; i++) {
            const filled = coerceWireNumbers(el, rows[i]);
            if (filled !== rows[i]) {
                elOut = elOut ?? [...rows];
                elOut[i] = filled;
            }
        }
        if (elOut !== null) {
            out = out ?? { ...rec };
            out[key] = elOut;
        }
    }
    return out ?? raw;
}
/** THE WIRE-TYPE LEDGER (commission 035's maker gap #2: "the value
 *  printed as 768 gives no type evidence"): for every key the
 *  Schemastery object schema declares, report the RECEIVED typeof
 *  whenever it mismatches the declared type — the refusal voice
 *  appends this so the next wire-corruption receipt names the
 *  corruptor's exact shape instead of a bare toString. */
export function wireTypeLedger(schema, raw) {
    const dict = schema.dict;
    if (dict === undefined || raw === null || typeof raw !== 'object' || Array.isArray(raw))
        return '';
    const rec = raw;
    const rows = [];
    for (const [key, inner] of Object.entries(dict)) {
        const declared = inner?.type;
        if (declared === undefined || !(key in rec))
            continue;
        const v = rec[key];
        if (v === undefined)
            continue;
        const got = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
        if (got !== declared && !(declared === 'number' && got === 'object' && v instanceof Number)) {
            // objects/arrays carry a short preview — the corruptor's
            // shape (e.g. `{item:…}`) reads straight off the receipt
            const preview = (got === 'object' || got === 'array')
                ? '{' + JSON.stringify(v).slice(1, 25) : '';
            rows.push(key + '=' + got + preview);
        }
    }
    return rows.length > 0 ? ' (wire types: ' + rows.join(', ') + ')' : '';
}
//# sourceMappingURL=coerceWireArrays.js.map