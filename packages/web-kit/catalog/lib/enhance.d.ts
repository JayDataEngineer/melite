export interface EnhancedPrompt {
    positive: string;
    negative: string;
    /** The harness route that actually served ("provider/model") — the
     * server echoes it on every success so the card can SHOW which
     * model answered (2026-09-06: never silent DeepSeek again). */
    via: string;
}
/**
 * The card's model picker source (2026-09-06): the LIVE route list
 * off the proof route — never a restated copy. Null when this
 * editor is NOT under a DSH host (no picker renders).
 */
export declare function fetchEnhanceRoutes(): Promise<string[] | null>;
/** Is this editor embedded under the DSH GUI (same-origin parent)?
 * Standalone → false (no picker exists; the host default serves). */
export declare function isEmbedded(): boolean;
/**
 * Parse the picker trigger's aria-label (the LIVE-PROBED contract,
 * 2026-09-06: `Select model, current <NAME>, reasoning effort <E>`).
 * Returns the model display name, or null when the label doesn't
 * carry a current selection.
 */
export declare function parsePickerAria(label: string): string | null;
/**
 * Read the GUI picker's CURRENT selection from the parent page
 * (2026-09-06, operator order: the button auto-follows the model I
 * have selected). The card iframe is same-origin with the DSH GUI.
 * Anchor (live-probed on the deployed build): the trigger button's
 * aria-label "Select model, current <NAME>, reasoning effort …" —
 * an accessible contract, not a CSS-module hash (the `*modelName*`
 * class probe found ZERO elements on the real page). Fallback: the
 * trigger's `*triggerLabel*` span text. Standalone/cross-origin →
 * null (host default serves).
 */
export declare function readPickerModel(): string | null;
/**
 * Map the picker's display name onto one LIVE route
 * ("provider/model"). Exact normalized model equality first, then a
 * unique prefix ("Muse Spark" → muse-spark-1.3-contributor).
 * Ambiguous or unmatched → null (never a guess).
 */
export declare function resolvePickerRoute(routes: readonly string[], pick: string): string | null;
export declare function enhancePrompt(systemPrompt: string, prompt: string, llm?: string): Promise<EnhancedPrompt>;
/**
 * AGENT ENHANCE (2026-08-22) — the ✦ Agent Enhance button's wire.
 * POST /melite-tools/enhance {model, prompt} on the DSH host: the agent
 * system's orchestration core sweeps EVERY declared enhance field of the
 * model (each with its own recipe) over the harness model in one press and
 * returns results keyed by field name. NO keystore key involved. Requires
 * the DSH app — standalone editors get an honest error.
 */
export declare function agentEnhance(model: string, prompt: string, temperature?: number, llm?: string): Promise<Record<string, {
    positive: string;
    negative: string;
    via: string;
}>>;
//# sourceMappingURL=enhance.d.ts.map
