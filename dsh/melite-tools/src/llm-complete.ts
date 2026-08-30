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
export interface LlmStreamSeam {
  listProviders(): Array<{ id: string; name?: string }>
  listModels(provider: string): Promise<Array<{ id: string }>>
  stream(options: {
    provider: string
    model: string
    messages: Array<unknown>
    system?: string
    temperature?: number
    maxTokens?: number
    signal?: AbortSignal
  }): AsyncIterable<
    | { type: 'text-delta'; text: string }
    | { type: 'finish'; kind: string; failure?: { message: string; code?: string } }
    | { type: string; [k: string]: unknown }
  >
}

/** One enhancement request — a recipe system prompt + the user's words. */
export interface EnhanceRequest {
  system: string
  prompt: string
  temperature?: number
  signal?: AbortSignal
}

/** End-to-end deadline for one auxiliary completion (observed live: ~60s). */
export const ENHANCE_DEADLINE_MS = 180_000

/** Output cap — recipes emit bounded JSON (captions, lyrics), never essays. */
const MAX_TOKENS = 2048

/**
 * Resolve the harness model routes with ZERO configuration: every
 * registered provider route × its advertised models, in registration order.
 * The FIRST healthy route serves; a dead one (quota, auth) is stepped past —
 * "no model" cannot happen while any route breathes. There is no explicit
 * config knob to misconfigure.
 */
const MAX_ROUTE_ATTEMPTS = 6

export async function resolveHarnessRoutes(llm: LlmStreamSeam): Promise<Array<{ provider: string; model: string }>> {
  // LlmProviderInfo: { id } is the route key GenerateOptions.provider wants.
  const providers = llm.listProviders()
  if (providers.length === 0) {
    throw new Error('enhance: no LLM adapter is registered in the harness host')
  }
  const routes: Array<{ provider: string; model: string }> = []
  for (const p of providers) {
    try {
      const models = await llm.listModels(p.id)
      for (const m of models) routes.push({ provider: p.id, model: m.id })
    } catch { /* a provider that cannot enumerate is still usable — keep going */ }
  }
  if (routes.length === 0) {
    throw new Error('enhance: no registered harness provider advertises any model')
  }
  return routes.slice(0, MAX_ROUTE_ATTEMPTS)
}

/**
 * One streaming completion on ONE exact route, assembled to text. Terminal
 * finish reasons other than 'stop' become thrown errors carrying the
 * provider failure message + code — never swallowed.
 */
export async function harnessCompleteOnRoute(
  llm: LlmStreamSeam,
  route: { provider: string; model: string },
  req: EnhanceRequest,
): Promise<string> {
  const timeout = AbortSignal.timeout(ENHANCE_DEADLINE_MS)
  const signal = req.signal ? AbortSignal.any([req.signal, timeout]) : timeout
  const options = {
    provider: route.provider,
    model: route.model,
    messages: [{
      role: 'user',
      content: [{ type: 'text', text: req.prompt }],
      source: { kind: 'plugin', plugin: '@melite-plugin/dsh-tools' },
    }],
    system: req.system,
    ...(req.temperature !== undefined && Number.isFinite(req.temperature) ? { temperature: req.temperature } : {}),
    maxTokens: MAX_TOKENS,
    signal,
  }
  let text = ''
  let finish: { kind: string; failure?: { message: string; code?: string } } | null = null
  for await (const chunk of llm.stream(options)) {
    if (chunk.type === 'text-delta' && typeof chunk.text === 'string') {
      text += chunk.text
    } else if (chunk.type === 'finish') {
      // StreamChunk finish: { type:'finish', reason: FinishReason } where
      // FinishReason = { kind: 'stop'|'error'|'aborted'|…, failure? }.
      const r = (chunk as { reason?: { kind?: unknown; failure?: { message: string; code?: string } } }).reason
      finish = {
        kind: typeof r?.kind === 'string' ? r.kind : JSON.stringify(r ?? null),
        failure: r?.failure,
      }
    }
  }
  if (finish === null) {
    throw new Error('enhance: the harness model stream ended without a terminal finish')
  }
  if (finish.kind !== 'stop') {
    const detail = finish.failure ? finish.failure.message + ' [' + (finish.failure.code ?? '?') + ']' : finish.kind
    throw new Error('enhance: harness model call failed — ' + detail)
  }
  return text
}

/**
 * Recipe + prompt in, {positive, negative} out. THE one enhance call:
 * walk the harness's registered routes until ONE completes (a quota-dead
 * or unauthorized route is stepped past — the first healthy model serves),
 * then parse the recipe's strict JSON reply. All routes dead → one honest
 * error naming every failure.
 */
export async function harnessEnhance(llm: LlmStreamSeam, req: EnhanceRequest): Promise<{ positive: string; negative: string }> {
  const routes = await resolveHarnessRoutes(llm)
  const failures: string[] = []
  for (const route of routes) {
    let text: string
    try {
      text = await harnessCompleteOnRoute(llm, route, req)
    } catch (err) {
      failures.push(route.provider + '/' + route.model + ': ' + (err instanceof Error ? err.message : String(err)))
      continue
    }
    try {
      return parseEnhanceJson(text)
    } catch (err) {
      // A real completion that isn't recipe JSON is a MODEL failure on that
      // route — record it and let a healthier route answer.
      failures.push(route.provider + '/' + route.model + ': ' + (err instanceof Error ? err.message : String(err)))
    }
  }
  throw new Error('enhance: every registered harness route failed — ' + failures.join(' | '))
}

/**
 * Parse the recipe's STRICT JSON reply ({positive, negative}) out of model
 * text: direct parse, then fenced, then first-brace slice. All fail → throw
 * with the raw head (honest failure, never a silent whole-text positive).
 */
export function parseEnhanceJson(text: string): { positive: string; negative: string } {
  const attempts = [text, text.replace(/^```(?:json)?\s*|\s*```$/g, ''), text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)]
  for (const attempt of attempts) {
    try {
      const obj = JSON.parse(attempt) as { positive?: unknown; negative?: unknown }
      if (obj !== null && typeof obj === 'object' && typeof obj.positive === 'string') {
        return { positive: obj.positive, negative: typeof obj.negative === 'string' ? obj.negative : '' }
      }
    } catch { /* next shape */ }
  }
  throw new Error('enhance: the model reply was not the recipe JSON — head: ' + text.slice(0, 160))
}

