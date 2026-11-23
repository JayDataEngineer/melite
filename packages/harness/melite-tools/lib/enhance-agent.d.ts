import type { AuxCallLog } from './aux-session-log.js';
/** The form-spec envelope the recipes ride (the wire shape, read
 *  in-process by formSpecArm). */
interface FormSpecShape {
    enhance_prompt?: unknown;
    enhance_prompts?: unknown;
}
/** The declared enhance fields of one model: name → recipe system prompt. */
export interface DeclaredFields {
    fields: Record<string, string>;
    names: string[];
}
/** Map a form-spec envelope onto its declared recipes (the ONE
 *  spelling — the request lane and the in-process sweep share it). */
export declare function declaredFieldsFromSpec(spec: FormSpecShape): DeclaredFields;
/** Read the model's declared recipes straight off the form-spec SSOT —
 *  the IN-PROCESS arm (F-1, 2026-11-05: the retired URL lane named
 *  `/v1/form-spec`, a path the seat plane never served; the sweep
 *  already read formSpecArm, and now this does too). An unknown model
 *  refuses with the sweep's voice. */
export declare function fetchDeclaredFields(model: string): Promise<DeclaredFields>;
export interface FieldResult {
    positive: string;
    negative: string;
    /** The harness route that actually served this field — never silent. */
    via: string;
}
/**
 * One field's enhancement through the harness model. The seat rides
 * through to the completion core (one record per auxiliary call).
 * @param llm - the harness llm seat.
 * @param recipe - the field's recipe system prompt.
 * @param prompt - the user's words.
 * @param temperature - the caller's sampling temperature, when set.
 * @param signal - the call's cancellation.
 * @param llmWant - the explicit route preference, when named.
 * @param defaultLlm - the host's default route.
 * @param preference - the door's ordered route preference.
 * @param log - the session-log emission seat (required; the sweep's
 *   caller owns which seat its plane carries).
 */
export declare function enhanceOneField(llm: LlmSeam, recipe: string, prompt: string, temperature: number | undefined, signal: AbortSignal, llmWant: string | undefined, defaultLlm: string | undefined, preference: string | undefined, log: AuxCallLog): Promise<FieldResult>;
/** Structural re-export so callers do not import llm-complete for the type. */
export type LlmSeam = import('./llm-complete.js').LlmStreamSeam;
/**
 * GENERIC FALLBACK RECIPE — BACK HOME (the gateway kill,
 * 2026-09-10): the ONE spelling lives here, where it was born (the
 * disclosure bundle that shared it died with the gateway).
 */
export declare const GENERIC_ENHANCE_RECIPE: string;
/**
 * THE SWEEP — every declared field, one press. The route's model-form uses
 * this: the CALLER orchestrates (a button, not a conversational agent), so
 * unlike the chat tool there is no listing round-trip — all declared fields
 * are enhanced sequentially and returned together. A model with NO declared
 * fields sweeps ONE generic 'prompt' field (the shared fallback recipe).
 */
export declare function agenticSweep(ctx: unknown, llm: LlmSeam, opts: {
    model: string;
    prompt: string;
    temperature?: number;
    signal: AbortSignal;
    llmWant?: string;
    defaultLlm?: string;
    preference?: string;
    log: AuxCallLog;
}): Promise<{
    model: string;
    results: Record<string, FieldResult>;
}>;
export {};
//# sourceMappingURL=enhance-agent.d.ts.map
