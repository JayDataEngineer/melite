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
  /** The harness route that actually served ("provider/model") — the
   * server echoes it on every success so the card can SHOW which
   * model answered (2026-09-06: never silent DeepSeek again). */
  via: string
}

/**
 * The card's model picker source (2026-09-06): the LIVE route list
 * off the proof route — never a restated copy. Null when this
 * editor is NOT under a DSH host (no picker renders).
 */
export async function fetchEnhanceRoutes(): Promise<string[] | null> {
  let res: Response
  try {
    res = await apiFetch(externalUrl("/melite-tools/catalog"), { method: "GET" })
  } catch {
    return null
  }
  if (!res.ok) return null
  try {
    const data = (await res.json()) as { llmRoutes?: unknown }
    if (!Array.isArray(data.llmRoutes)) return null
    const routes = data.llmRoutes.filter(
      (r): r is string => typeof r === "string" && r.length > 0,
    )
    return routes.length > 0 ? routes : null
  } catch {
    return null
  }
}

/** Normalize a display/model name for matching: lowercase, keep
 * alphanumerics and dots ("GLM 4.7" / "glm-4.7" → "glm4.7"). */
function normName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9.]/g, "")
}

/** Is this editor embedded under the DSH GUI (same-origin parent)?
 * Standalone → false (no picker exists; the host default serves). */
export function isEmbedded(): boolean {
  try {
    return window.parent !== window
  } catch {
    return false
  }
}

/**
 * Parse the picker trigger's aria-label (the LIVE-PROBED contract,
 * 2026-09-06: `Select model, current <NAME>, reasoning effort <E>`).
 * Returns the model display name, or null when the label doesn't
 * carry a current selection.
 */
export function parsePickerAria(label: string): string | null {
  const m = /select model,\s*current\s+(.+?)(?:,\s*reasoning|$)/i.exec(label)
  const name = m?.[1]?.trim()
  return name && name.length > 0 ? name : null
}

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
export function readPickerModel(): string | null {
  try {
    const parent = window.parent
    if (!parent || parent === window) return null
    const doc = parent.document
    if (!doc) return null
    for (const btn of Array.from(doc.querySelectorAll<HTMLButtonElement>("button[aria-label]"))) {
      const name = parsePickerAria(btn.getAttribute("aria-label") ?? "")
      if (name) return name
    }
    const labels = Array.from(doc.querySelectorAll<HTMLElement>('[class*="triggerLabel"]'))
      .filter((el) => (el.textContent ?? "").trim().length > 0 && el.getClientRects().length > 0)
    const last = labels[labels.length - 1]
    return last ? (last.textContent ?? "").trim() : null
  } catch {
    return null // cross-origin or no parent — host default serves
  }
}

/**
 * Map the picker's display name onto one LIVE route
 * ("provider/model"). Exact normalized model equality first, then a
 * unique prefix ("Muse Spark" → muse-spark-1.3-contributor).
 * Ambiguous or unmatched → null (never a guess).
 */
export function resolvePickerRoute(
  routes: readonly string[],
  pick: string,
): string | null {
  const want = normName(pick)
  if (want.length === 0) return null
  const models = routes.map((r) => {
    const i = r.indexOf("/")
    return { route: r, model: normName(i >= 0 ? r.slice(i + 1) : r) }
  })
  const exact = models.filter((m) => m.model === want)
  if (exact.length === 1) return exact[0].route
  if (exact.length > 1) return null
  const prefix = models.filter((m) => m.model.startsWith(want))
  if (prefix.length === 1) return prefix[0].route
  return null
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
  llm?: string,
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
        ...(llm !== undefined && llm.length > 0 ? { llm } : {}),
      }),
    })
  } catch {
    return null // host unreachable — not a harness answer
  }
  const text = await res.text()
  let data: { positive?: unknown; negative?: unknown; error?: unknown; via?: unknown }
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
  return {
    positive,
    negative,
    via: typeof data.via === "string" && data.via.length > 0 ? data.via : "?",
  }
}

export async function enhancePrompt(
  systemPrompt: string,
  prompt: string,
  llm?: string,
): Promise<EnhancedPrompt> {
  // The harness door — the ONLY enhance path. Zero configuration inside
  // the DSH GUI; standalone editors get an honest error (no fallback).
  // llm names the caller's harness route ("provider/model"); absent =
  // host default walk. The result's `via` says who actually answered.
  const harnessed = await enhanceViaHarness(systemPrompt, prompt, undefined, llm)
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
  llm?: string,
): Promise<Record<string, { positive: string; negative: string; via: string }>> {
  const res = await apiFetch(externalUrl("/melite-tools/enhance"), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      ...(temperature !== undefined ? { temperature } : {}),
      ...(llm !== undefined && llm.length > 0 ? { llm } : {}),
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
    results?: Record<string, { positive?: unknown; negative?: unknown; via?: unknown }>
  }
  const results: Record<string, { positive: string; negative: string; via: string }> = {}
  for (const [field, v] of Object.entries(data.results ?? {})) {
    results[field] = {
      positive: String(v?.positive ?? "").trim(),
      negative: String(v?.negative ?? "").trim(),
      via: typeof v?.via === "string" && v.via.length > 0 ? v.via : "?",
    }
  }
  return results
}

