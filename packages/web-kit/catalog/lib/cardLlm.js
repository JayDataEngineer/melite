/**
 * cardLlm.ts — the card LLM preference (the ✦ rail's model dropdown
 * store, operator order: "the cards need a model dropdown to select
 * the models we want").
 *
 * ONE preference per browser (localStorage, the tag-map cache's own
 * persistence pattern): every ✦ enhance press from any card reads
 * it at CALL time — the zoom bar's dropdown writes it, the studios'
 * enhance calls thread it as the `llm` argument. UNSET = the host
 * default + the estate's card preference (muse-spark over glm-5v,
 * resolved server-side by the door — the dropdown's "Auto" option).
 *
 * A stale stored route never breaks an enhance: the door resolves
 * explicit names against the LIVE list and 400s — on that refusal
 * the caller may clear the preference (clearCardLlm) and retry on
 * Auto (the honest recovery path, never a silent substitution).
 */
/** The localStorage key (namespaced like the tag-map cache). */
export const CARD_LLM_KEY = "melite:card-llm:v1";
/** Read the preferred card LLM route ("provider/model"), if set. */
export function getCardLlm() {
    try {
        const v = window.localStorage.getItem(CARD_LLM_KEY);
        return typeof v === "string" && v.length > 0 ? v : null;
    }
    catch {
        // No storage access (sandboxed iframe / SSR) — Auto serves.
        return null;
    }
}
/** Set (or clear, with null) the preferred card LLM route. */
export function setCardLlm(route) {
    try {
        if (route === null || route.length === 0) {
            window.localStorage.removeItem(CARD_LLM_KEY);
        }
        else {
            window.localStorage.setItem(CARD_LLM_KEY, route);
        }
    }
    catch {
        // No storage access — the preference stays per-mount only.
    }
}
/**
 * The `llm` argument shape the enhance wire takes: undefined when
 * unset (Auto — the server resolves its preference chain).
 */
export function cardLlmArg() {
    return getCardLlm() ?? undefined;
}
//# sourceMappingURL=cardLlm.js.map
