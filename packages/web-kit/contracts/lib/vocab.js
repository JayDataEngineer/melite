/** Frozen vocabularies — types + vocabulary CONSTANTS only (no
 * render, no fetch; the icon-bearing META table stays app-side). */
export const Provenance = {
    agent: "agent",
    user: "user",
    imported: "imported",
};
export const PROVENANCE_VALUES = Object.values(Provenance);
/** Is the value a valid Provenance? Gate untrusted JSON (a past run's
 * metadata, a drag payload) before rendering. */
export function isProvenance(v) {
    return typeof v === "string" && PROVENANCE_VALUES.includes(v);
}
//# sourceMappingURL=vocab.js.map