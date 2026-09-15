import { LlmRuntime } from "@deepseek-ai/dsh-llm";
//#region src/llm-complete.d.ts
/** The runtime seat this core exercises — a structural Pick of the
 *  REAL LlmRuntime contract (@deepseek-ai/dsh-llm). */
type LlmStreamSeam = Pick<LlmRuntime, "stream" | "listProviders" | "listModels">;
/** One enhancement request — a recipe system prompt + the user's words. */
interface EnhanceRequest {
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
interface HarnessRoute {
  provider: string;
  model: string;
}
/** "provider/model" — the only spelling a route is ever named by. */
declare function routeName(r: HarnessRoute): string;
declare function resolveHarnessRoutes(llm: LlmStreamSeam): Promise<HarnessRoute[]>;
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
declare function matchHarnessRoute(routes: HarnessRoute[], want: string, opts?: {
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
declare function harnessEnhance(llm: LlmStreamSeam, req: EnhanceRequest, defaultLlm?: string, preference?: string): Promise<{
  positive: string;
  negative: string;
  via: string;
}>;
//#endregion
export { routeName as a, resolveHarnessRoutes as i, harnessEnhance as n, matchHarnessRoute as r, LlmStreamSeam as t };
