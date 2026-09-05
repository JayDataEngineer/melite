import { apiFetch, externalUrl } from "./api"

// The LLM-keystore plane (/v1/llm/keys, /v1/llm/enhance, storyboard,
// ideogram-ai) is RETIRED (2026-09-05, door-gate kill stroke): the
// gateway never served those doors, and dead UI over missing backends
// is debt. Prompt enhancement rides the DSH harness door
// (/melite-tools/enhance) — a real external service — with NO
// keystore fallback. Standalone editors get an honest error.

export interface EnhancedPrompt {
  positive: string
  negative: string
}

/**
 * THE DeepSeek-harness door (2026-08-22): POST /melite-tools/enhance on the DSH
 * host — same origin from the chat embed — completes the enhancement with the
 * harness's OWN model (ctx.llm). NO keystore key involved, so inside the GUI
 * the Enhance button can never answer "no model". Returns null when this
 * editor is NOT running under the DSH host (standalone :5173/:33081 — the
 * route isn't there; Vite SPA-fallbacks answer HTML), letting the caller use
 * the keystore flow.
 */
async function enhanceViaHarness(
  systemPrompt: string,
  prompt: string,
  temperature?: number,
): Promise<EnhancedPrompt | null> {
  let res: Response
  try {
    res = await apiFetch(externalUrl("/melite-tools/enhance"), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_prompt: systemPrompt,
        prompt: prompt,
        ...(temperature !== undefined ? { temperature } : {}),
      }),
    })
  } catch {
    return null // host unreachable — not a harness answer
  }
  const text = await res.text()
  let data: { positive?: unknown; negative?: unknown; error?: unknown }
  try {
    data = JSON.parse(text) as typeof data
  } catch {
    return null // HTML/SPA fallback or empty body — no harness route here
  }
  if (typeof data.error === "string" && data.error.length > 0) {
    // OUR route answered (JSON error shape) — surface it honestly.
    throw new Error(`Enhancement failed (${res.status}): ${data.error.slice(0, 200)}`)
  }
  if (!res.ok) return null
  const positive = String(data.positive ?? "").trim()
  const negative = String(data.negative ?? "").trim()
  if (!positive) return null
  return { positive, negative }
}

export async function enhancePrompt(
  systemPrompt: string,
  prompt: string,
): Promise<EnhancedPrompt> {
  // The harness door — the ONLY enhance path. Zero configuration inside
  // the DSH GUI; standalone editors get an honest error (no fallback).
  const harnessed = await enhanceViaHarness(systemPrompt, prompt)
  if (harnessed !== null) return harnessed
  throw new Error(
    "Prompt enhance runs inside the DeepSeek app (/melite-tools/enhance " +
    "not answered here)")
}

/**
 * AGENT ENHANCE (2026-08-22) — the ✦ Agent Enhance button's wire.
 * POST /melite-tools/enhance {model, prompt} on the DSH host: the agent
 * system's orchestration core sweeps EVERY declared enhance field of the
 * model (each with its own recipe) over the harness model in one press and
 * returns results keyed by field name. NO keystore key involved. Requires
 * the DSH app — standalone editors get an honest error.
 */
export async function agentEnhance(
  model: string,
  prompt: string,
  temperature?: number,
): Promise<Record<string, { positive: string; negative: string }>> {
  const res = await apiFetch(externalUrl("/melite-tools/enhance"), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      ...(temperature !== undefined ? { temperature } : {}),
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    let msg = body.slice(0, 200)
    try {
      const parsed = JSON.parse(body) as { error?: unknown }
      if (typeof parsed.error === "string") msg = parsed.error
    } catch {
      // Non-JSON answer = no /melite-tools door here (standalone editor).
      msg = "Agent Enhance runs inside the DeepSeek app — use Enhance here."
    }
    throw new Error(`Agent Enhance failed (${res.status}): ${msg}`)
  }
  const data = (await res.json()) as {
    model?: unknown
    results?: Record<string, { positive?: unknown; negative?: unknown }>
  }
  const results: Record<string, { positive: string; negative: string }> = {}
  for (const [field, v] of Object.entries(data.results ?? {})) {
    results[field] = {
      positive: String(v?.positive ?? "").trim(),
      negative: String(v?.negative ?? "").trim(),
    }
  }
  return results
}

