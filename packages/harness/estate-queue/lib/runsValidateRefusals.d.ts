export declare function minLengthRefusal(cls: string, field: string): string;
/** Record coercion for stage params: plain objects ride
 *  (falsy rides {}); anything else refuses loud. Pair-list
 *  params are refused — JSON params are objects, never pair
 *  lists. */
export declare function coerceRecord(v: unknown): Record<string, unknown>;
//# sourceMappingURL=runsValidateRefusals.d.ts.map