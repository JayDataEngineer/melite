//#region src/llm-complete.d.ts
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
 * Structural seam only: @deepseek-ai/dsh-llm is not a resolvable dependency
 * of this workspace (mirrors types.ts), so the runtime contract is captured
 * as the minimal shape we exercise — verified against the harness README:
 * stream() emits raw chunks (text-delta, finish{kind,failure}) and
 * listProviders/listModels expose registered routes.
 */
/** Minimal structural view of the LlmRuntime seam we exercise. */
interface LlmStreamSeam {
  listProviders(): Array<{
    id: string;
    name?: string;
  }>;
  listModels(provider: string): Promise<Array<{
    id: string;
  }>>;
  stream(options: {
    provider: string;
    model: string;
    messages: Array<unknown>;
    system?: string;
    temperature?: number;
    maxTokens?: number;
    signal?: AbortSignal;
  }): AsyncIterable<{
    type: 'text-delta';
    text: string;
  } | {
    type: 'finish';
    kind: string;
    failure?: {
      message: string;
      code?: string;
    };
  } | {
    type: string;
    [k: string]: unknown;
  }>;
}
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
 * Version-tail tolerance (2026-09-06, live-caught): the settings
 * default names glm-5.3 while the provider advertises glm-4.7 —
 * a newer default than the live provider list carries. The named
 * model is RESOLVED, never walked: same provider, its NEWEST
 * advertised model below the named one in the family line. If the
 * provider itself is absent, or nothing matches, the failure stays
 * loud with the live list. This is resolution of the user's own
 * default, not a fallback to a DIFFERENT provider's model.
 */
declare function matchHarnessRoute(routes: HarnessRoute[], want: string): HarnessRoute;
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
 *   - unresolvable name → throw naming the live routes (the route
 *     maps explicit→400, stale default→502).
 *   - the ONE route completes; its failure is the honest error
 *     (502 naming route + cause) — never a silent other model.
 *
 * `via` echoes the serving route. This is the keystore era's shape
 * (one configured model, loud otherwise) with the model resolved
 * from the host default instead of the retired keystore.
 */
declare function harnessEnhance(llm: LlmStreamSeam, req: EnhanceRequest, defaultLlm?: string): Promise<{
  positive: string;
  negative: string;
  via: string;
}>;
//#endregion
export { routeName as a, resolveHarnessRoutes as i, harnessEnhance as n, matchHarnessRoute as r, LlmStreamSeam as t };