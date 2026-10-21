import type { FormSpecDoc, SpecField } from './spec.js';
/** The resolved studio seam: spec + error from the door, values
 * resolved through the ONE cascade, edits coerced at the schema
 * boundary. `user` is the surface's explicit layer (a document's
 * params — sparse by design); `base` is the persisted layer under
 * it (the bench/stage row's params), when the surface has one. */
export declare function useResolvedForm(family: string, user: Record<string, unknown>, onWrite: (name: string, v: unknown) => void, base?: Record<string, unknown>): {
    spec: FormSpecDoc | null;
    error: string | null;
    /** What the rows SHOW: every layer composed — exactly what a run
     * composes. The surface reads THIS map and nothing else. */
    resolved: Record<string, unknown>;
    /** The one edit verb: coerce through the spec's own field, then
     * the caller's write. */
    edit: (name: string, v: unknown) => void;
    /** The spec's field row by wire name (the coercion's own lookup,
     * exposed for hosts that render their own atoms). */
    fieldOf: (name: string) => SpecField | undefined;
};
/** The layer composition — PURE, exported for the seam's own wall:
 * with a spec it is exactly resolveValue (schema <- model_defaults
 * <- base <- user); without one (the pre-fetch render, the dead
 * door) it is still the LAYERS — base under user, verbatim — so
 * every surface reads the same shape at every moment. */
export declare function resolveValueLayered(spec: FormSpecDoc | null, base: Record<string, unknown> | undefined, user: Record<string, unknown>): Record<string, unknown>;
//# sourceMappingURL=use-resolved.d.ts.map
