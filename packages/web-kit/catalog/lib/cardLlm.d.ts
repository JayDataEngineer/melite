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
export declare const CARD_LLM_KEY = "melite:card-llm:v1";
/** Read the preferred card LLM route ("provider/model"), if set. */
export declare function getCardLlm(): string | null;
/** Set (or clear, with null) the preferred card LLM route. */
export declare function setCardLlm(route: string | null): void;
/**
 * The `llm` argument shape the enhance wire takes: undefined when
 * unset (Auto — the server resolves its preference chain).
 */
export declare function cardLlmArg(): string | undefined;
//# sourceMappingURL=cardLlm.d.ts.map