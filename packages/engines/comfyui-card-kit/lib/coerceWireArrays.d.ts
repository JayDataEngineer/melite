/** True when the value is the wire's array encoding: an object
 * whose single own key `item` holds an array. */
export declare function isItemWrapped(value: unknown): boolean;
/** Deep-unwrap every `{item:[…]}` shape in a params-like tree
 * (objects and arrays both walked, cycles severed by identity).
 * The tool-boundary seat: melite_construct/melite_flow params
 * before they reach the bench — the draft stores CLEAN, reads and
 * compose never see the poison. */
export declare function unwrapItemArrays<T>(value: T): T;
/** The card-seat arm: for every key the Schemastery object schema
 * declares as `type: 'array'`, an empty-string value fills to `[]`
 * (the wire's empty-array spelling). Schema-derived — the dict is
 * the truth, no key list is hand-copied. Every other value rides
 * untouched. */
export declare function coerceWireArrays(schema: {
    dict?: Record<string, {
        type?: string;
    }>;
}, raw: Record<string, unknown>): Record<string, unknown>;
/** The numeric-string fill (commission 035's receipt): for every
 * key the Schemastery object schema declares `type: 'number'`, a
 * string value matching the strict numeric grammar fills to its
 * Number. Schema-derived through the dict — the carrier names the
 * numeric keys, no mirror is hand-copied (LAW 2). Every other value
 * (real numbers, non-numeric strings, nulls, objects) rides
 * untouched so Schemastery's own bounds refusal stays the honest
 * voice. */
export declare function coerceWireNumbers(schema: {
    dict?: Record<string, {
        type?: string;
    }>;
}, raw: unknown): unknown;
/** THE WIRE-TYPE LEDGER (commission 035's maker gap #2: "the value
 *  printed as 768 gives no type evidence"): for every key the
 *  Schemastery object schema declares, report the RECEIVED typeof
 *  whenever it mismatches the declared type — the refusal voice
 *  appends this so the next wire-corruption receipt names the
 *  corruptor's exact shape instead of a bare toString. */
export declare function wireTypeLedger(schema: {
    dict?: Record<string, {
        type?: string;
    }>;
}, raw: unknown): string;
//# sourceMappingURL=coerceWireArrays.d.ts.map
