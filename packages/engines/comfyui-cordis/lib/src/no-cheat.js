import { emitParamsSchema } from '@melite/comfyui-card-kit/params-emit';
/** The declared non-null defaults, by knob name, from the SAME
 *  enumeration (emitParamsSchema's projection carries each knob's
 *  resolved default — one spelling, three consumers: the tool face,
 *  the discovery serve, and this door). */
export const declaredDefaults = (schemaCarrier, boarded) => {
    const served = emitParamsSchema(schemaCarrier, boarded);
    const out = {};
    const dict = schemaCarrier.dict ?? {};
    for (const [k, knob] of Object.entries(served.properties)) {
        if (k === 'model') {
            // the projection SYNTHESIZES the family-picker 'model' knob for
            // multi-family cards — never a declared default. A card that
            // declares its own knob literally named 'model' is rare but
            // lawful, and then the door holds it to its word like any knob.
            if (!(k in dict))
                continue;
        }
        // HIDDEN KNOBS NEVER ARRIVE HERE: emitParamsSchema `continue`s
        // every extra.hidden knob before writing properties, so this
        // enumeration — served.properties — carries no hidden row (the
        // re-audit, 2026-10-16). The declared key still VALIDATES —
        // compose reads it and its refusals fire verbatim when a draft
        // carries it. (dict[k] is non-null here: the projection's only
        // synthesized key is 'model', excluded above — every remaining
        // served key is a declared knob.)
        const d = knob.default;
        if (d !== undefined && d !== null)
            out[k] = d;
    }
    return out;
};
/** The door's check (both compose paths): every knob carrying a
 *  declared non-null default must hold a non-null, non-undefined
 *  value in the merged doc. Returns the offenders, name + declared
 *  default + walked value — the refusal names them verbatim. */
export const unwalkedParams = (schemaCarrier, boarded, merged) => {
    const offenders = [];
    for (const [name, declared] of Object.entries(declaredDefaults(schemaCarrier, boarded))) {
        const walked = merged[name];
        if (walked === undefined || walked === null)
            offenders.push({ name, declared, walked });
    }
    return offenders;
};
//# sourceMappingURL=no-cheat.js.map
