/** One collected validation failure (loc = dotted path;
 *  empty = model-level). */
export interface VError {
    readonly loc: readonly (string | number)[];
    readonly msg: string;
    readonly input: unknown;
}
export declare function vErr(loc: readonly (string | number)[], msg: string, input: unknown): VError;
/** The validation-error render: one "path: message" line per
 *  failure (model name heads model-level errors). */
export declare function renderErrors(model: string, errs: readonly VError[]): string;
/** Validate a served params_json through the AnnyBakeParams shape
 *  (the serve-side belt). Failures render with the wire string as
 *  input, not the parsed doc.
 *  Returns the failure text, or null. */
export declare function validateBakeParams(s: string): string | null;
//# sourceMappingURL=bakeParams.d.ts.map
