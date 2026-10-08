import type { Schema } from './params-emit.ts';
/** The declared non-null defaults, by knob name, from the SAME
 *  enumeration (emitParamsSchema's projection carries each knob's
 *  resolved default — one spelling, three consumers: the tool face,
 *  the discovery serve, and this door). */
export declare const declaredDefaults: (schemaCarrier: Schema, boarded: readonly string[]) => Record<string, unknown>;
/** The door's check (both compose paths): every knob carrying a
 *  declared non-null default must hold a non-null, non-undefined
 *  value in the merged doc. Returns the offenders, name + declared
 *  default + walked value — the refusal names them verbatim. */
export declare const unwalkedParams: (schemaCarrier: Schema, boarded: readonly string[], merged: Record<string, unknown>) => {
    name: string;
    declared: unknown;
    walked: unknown;
}[];
//# sourceMappingURL=no-cheat.d.ts.map
