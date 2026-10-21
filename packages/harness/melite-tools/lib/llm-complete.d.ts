/**
 * One harness-model completion core — the ONLY execution path for prompt
 * enhancement. Both consumers share it:
 *
 *   - the enhance_prompt TOOL (model-facing, multi-field orchestration)
 *   - the POST /melite-tools/enhance HOST ROUTE (the editor's ✦ button inside
 *     the DSH GUI — same origin, no keystore, no key setup)
 *
 * The LLM is the DeepSeek harness's own model via ctx.llm (LlmRuntime):
 * the adapter the host itself chats through. There is no keystore lookup
 * anywhere on this path, so "no model configured" cannot happen in a host
 * that is conversing at all.
 *
 * Structural seam only — now TYPED against the real package
 * (2026-09-10 conformance stroke): @deepseek-ai/dsh-llm IS a
 * declared dependency of this workspace (package.json rc.8), so
 * the hand-mirrored interface below is dead — a mirror of a
 * contract is drift by construction (the DSH cookbook law; the
 * old header's "not a resolvable dependency" claim was stale).
 * The seam stays a structural Pick of LlmRuntime so test fakes
 * stay light, but every field now checks against the SSOT.
 */
import type { LlmRuntime } from "@deepseek-ai/dsh-llm";
/** The runtime seat this core exercises — a structural Pick of the
 *  REAL LlmRuntime contract (@deepseek-ai/dsh-llm). */
export type LlmStreamSeam = Pick<LlmRuntime, "stream" | "listProviders" | "listModels">;
/** One enhancement request — a recipe system prompt + the user's words. */
export interface EnhanceRequest {
    system: string;
    prompt: string;
    temperature?: number;
    signal?: AbortSignal;
    /**
     * The caller's chosen harness route (2026-09-06, operator order:
     * the ✦ button must serve the USER'S model, never silently
     * DeepSeek): "provider/model" exact, or a bare "model" that must
     * match exactly one advertised route. Honored FIRST; the walk
     * below stays behind it (ordered preference, never a silent
     * wrong-model answer — the response echoes `via`).
     */
    llm?: string;
}
/** One route on the harness model plane. */
export interface HarnessRoute {
    provider: string;
    model: string;
}
/** "provider/model" — the only spelling a route is ever named by. */
export declare function routeName(r: HarnessRoute): string;
/** End-to-end deadline for one auxiliary completion (observed live: ~60s). */
export declare const ENHANCE_DEADLINE_MS = 180000;
export declare function resolveHarnessRoutes(llm: LlmStreamSeam): Promise<HarnessRoute[]>;
/**
 * One streaming completion on ONE exact route, assembled to text. Terminal
 * finish reasons other than 'stop' become thrown errors carrying the
 * provider failure message + code — never swallowed.
 */
export declare function harnessCompleteOnRoute(llm: LlmStreamSeam, route: {
    provider: string;
    model: string;
}, req: EnhanceRequest): Promise<string>;
/**
 * The door's WIRE CONTRACT, appended to EVERY recipe (2026-09-06,
 * live-caught 1:1: the image model's form-spec recipe is pure
 * structure rules — no output-format word in it — so the model
 * answered "**Prompt:** …" prose and the JSON parse 502'd). The
 * {positive, negative} JSON shape is THIS door's requirement, so
 * THIS door guarantees it, whatever the per-model recipe says.
 */
export declare const OUTPUT_CONTRACT: string;
/**
 * Match a caller-named route against the live list. Exact
 * "provider/model" wins; a bare "model" must be unambiguous (two
 * providers advertising it is a 400 naming both — guessing between
 * providers is how silent-DeepSeek happens). Unknown → throw with
 * the live list (the route turns it into a 400, never a walk).
 *
 * `{ quiet: true }` (the preference arm): an unresolvable or
 * ambiguous name returns undefined instead of throwing — a
 * preference is an ordered candidate, so the caller skips to its
 * next arm; every resolve rule above is unchanged.
 *
 * Version-tail tolerance (2026-09-06, live-caught): the settings
 * default names glm-5.3 while the provider advertises glm-4.7 —
 * a newer default than the live provider list carries. The named
 * model is RESOLVED, never walked: same provider, its NEWEST
 * advertised model below the named one in the family line. If the
 * provider itself is absent, or nothing matches, the failure stays
 * loud with the live list. This is resolution of the user's own
 * default, not a fallback to a DIFFERENT provider's model.
 */
export declare function matchHarnessRoute(routes: HarnessRoute[], want: string, opts?: {
    quiet?: boolean;
}): HarnessRoute | undefined;
/**
 * Recipe + prompt in, {positive, negative, via} out. THE one enhance
 * call. NO WALK, NO FALLBACKS (queue lane law, operator 2026-09-06:
 * "No fallbacks. Ever." — the first-breathing walk is what served
 * DeepSeek/minimax by luck of registration order and provider
 * health):
 *
 *   - explicit req.llm names the route, else defaultLlm (the
 *     agentDefaultModel service's live selection — the user's own
 *     default) names it. Explicit wins; NEITHER walks.
 *   - preference (operator order, "muse-spark-1.3-contributor i
 *     want to use over glm-5v-turbo"): a route name the door
 *     prefers BETWEEN explicit and the host default. An ordered
 *     candidate, not a contract — a name that does not resolve
 *     against the live list is SKIPPED (the default arm serves);
 *     a named-live preference that fails to complete is still the
 *     honest 502 (no step-past, ever).
 *   - unresolvable name → throw naming the live routes (the route
 *     maps explicit→400, stale default→502).
 *   - the ONE route completes; its failure is the honest error
 *     (502 naming route + cause) — never a silent other model.
 *
 * `via` echoes the serving route. This is the keystore era's shape
 * (one configured model, loud otherwise) with the model resolved
 * from the host default instead of the retired keystore.
 */
export declare function harnessEnhance(llm: LlmStreamSeam, req: EnhanceRequest, defaultLlm?: string, preference?: string): Promise<{
    positive: string;
    negative: string;
    via: string;
}>;
/**
 * Parse the recipe's STRICT JSON reply ({positive, negative}) out of model
 * text: direct parse, then fenced, then first-brace slice. All fail → throw
 * with the raw head (honest failure, never a silent whole-text positive).
 */
export declare function parseEnhanceJson(text: string): {
    positive: string;
    negative: string;
};
//# sourceMappingURL=llm-complete.d.ts.map
