/** Frozen vocabularies — types + vocabulary CONSTANTS only (no
 * render, no fetch; the icon-bearing META table stays app-side). */
export const Authorship = {
    agent: "agent",
    user: "user",
    imported: "imported",
};
export const AUTHORSHIP_VALUES = Object.values(Authorship);
/** Is the value a valid Authorship? Gate untrusted JSON (a past run's
 * metadata, a drag payload) before rendering. */
export function isAuthorship(v) {
    return typeof v === "string" && AUTHORSHIP_VALUES.includes(v);
}
//# sourceMappingURL=vocab.js.map
