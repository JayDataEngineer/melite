import type { EnhanceModel } from "@melite/contracts"
import { apiFetch } from "./api"

/**
 * Store an API key securely on the backend.
 * Returns the key_id to use for future enhancement calls.
 */
export async function storeEnhanceKey(model: Omit<EnhanceModel, 'id' | 'keyId'>): Promise<string> {
  const res = await apiFetch('/v1/llm/keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: model.name,
      baseUrl: model.baseUrl,
      apiKey: model.apiKey,
      model: model.model,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Failed to store API key (${res.status}): ${body.slice(0, 200)}`)
  }

  const data = await res.json()
  return data.key_id
}

/**
 * List stored enhance keys (metadata only, no API keys).
 */
export async function listEnhanceKeys(): Promise<Array<{ key_id: string; name: string; baseUrl: string; model: string }>> {
  const res = await apiFetch('/v1/llm/keys')

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Failed to list keys (${res.status}): ${body.slice(0, 200)}`)
  }

  const data = await res.json()
  return data.keys || []
}

/**
 * Delete a stored enhance key.
 */
export async function deleteEnhanceKey(keyId: string): Promise<void> {
  const res = await apiFetch(`/v1/llm/keys/${keyId}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Failed to delete key (${res.status}): ${body.slice(0, 200)}`)
  }
}

/**
 * Change a stored key's MODEL in place (2026-08-18 — the provider-centric
 * switch). The key_id, credential, and base URL are untouched server-side;
 * only the model pick changes, so switching models never re-entering the
 * key. The next agent run picks the new model up automatically.
 */
export async function updateEnhanceKeyModel(keyId: string, model: string): Promise<void> {
  const res = await apiFetch(`/v1/llm/keys/${keyId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Failed to update model (${res.status}): ${body.slice(0, 200)}`)
  }
}

/**
 * Duplicate a saved endpoint under a NEW model, keeping the same provider
 * (base_url + api_key). The credential never crosses the wire — the clone
 * happens in-process on the backend. Returns the new endpoint's metadata
 * so the caller can add it to the store without a re-list.
 */
export async function duplicateEnhanceKey(
  keyId: string,
  model: string,
  name?: string,
): Promise<{ key_id: string; name: string; base_url: string; model: string }> {
  const res = await apiFetch(`/v1/llm/keys/${keyId}/duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, ...(name ? { name } : {}) }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Failed to duplicate endpoint (${res.status}): ${body.slice(0, 200)}`)
  }

  const data = await res.json()
  return data
}

/**
 * Enhance a prompt using a stored backend key.
 * The backend handles the API key securely.
 *
 * Returns structured JSON `{positive, negative}` — the backend asks the LLM
 * to produce both fields in one shot, model-aware (distilled variants return
 * `negative: ""` since they ignore negatives). For non-image services only
 * `positive` is populated. The legacy `result` field is still sent for any
 * caller that hasn't migrated; new code should read positive/negative.
 */
export class KeyNotFoundError extends Error {
  constructor() {
    super("Key not found")
    this.name = "KeyNotFoundError"
  }
}

export interface EnhancedPrompt {
  positive: string
  negative: string
}

// ── Storyboard generation (same key-store pattern as enhance) ────────────

/** A single LLM-drafted shot. The frontend hydrates this into a
 *  DirectorSegment — all the creative logic (system prompt, JSON
 *  extraction, normalization) lives server-side in /v1/llm/storyboard. */
export interface StoryboardSegment {
  prompt: string
  duration: number
  first_frame_prompt: string
}

export async function generateStoryboard(
  keyId: string,
  prompt: string,
  count: number = 5,
): Promise<StoryboardSegment[]> {
  const res = await apiFetch('/v1/llm/storyboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key_id: keyId,
      prompt,
      count,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    if (res.status === 404 && body.includes("Key not found")) {
      throw new KeyNotFoundError()
    }
    throw new Error(`Storyboard failed (${res.status}): ${body.slice(0, 200)}`)
  }

  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return (data.segments ?? []) as StoryboardSegment[]
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
    res = await apiFetch("/melite-tools/enhance", {
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
  keyId: string,
  systemPrompt: string,
  prompt: string,
  temperature?: number,
): Promise<EnhancedPrompt> {
  // The harness model FIRST — zero configuration inside the DSH GUI.
  const harnessed = await enhanceViaHarness(systemPrompt, prompt, temperature)
  if (harnessed !== null) return harnessed

  // Standalone editor (no DSH host): the keystore flow, unchanged.
  const res = await apiFetch('/v1/llm/enhance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key_id: keyId,
      system_prompt: systemPrompt,
      prompt: prompt,
      // Sampling temperature — when provided it overrides the keystore's
      // global knob (the sidebar's Parameters value). Undefined → the
      // backend uses the global. 0.0 is a valid value, so no `||`.
      ...(temperature !== undefined ? { temperature } : {}),
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    // Detect stale key that was lost on server restart
    if (res.status === 404 && body.includes("Key not found")) {
      throw new KeyNotFoundError()
    }
    throw new Error(`Enhancement failed (${res.status}): ${body.slice(0, 200)}`)
  }

  const data = await res.json()
  // Backend returns both shapes: prefer structured fields, fall back to legacy.
  const positive = String(data.positive ?? data.result ?? "").trim()
  const negative = String(data.negative ?? "").trim()
  return { positive, negative }
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
  const res = await apiFetch("/melite-tools/enhance", {
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

// ─── Ideogram 4 structured AI ──────────────────────────────────────────────
//
// Calls /v1/llm/ideogram-ai — the backend loads the mode-specific system
// prompt from config (single source of truth), calls a vision-capable LLM,
// and returns the parsed Ideogram caption JSON. The frontend never sees the
// prompt text — it just passes the mode + inputs.

export type IdeogramAIMode = "generate" | "refine" | "transfer_composition" | "transfer_style"

export interface IdeogramAIResult {
  caption: Record<string, unknown>
  mode: string
  model: string
  provider: string
}

export async function ideogramAI(
  keyId: string,
  mode: IdeogramAIMode,
  opts: {
    description?: string
    changeRequest?: string
    currentCaption?: Record<string, unknown> | null
    imageB64?: string
  },
): Promise<IdeogramAIResult> {
  const res = await apiFetch('/v1/llm/ideogram-ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key_id: keyId,
      mode,
      description: opts.description ?? "",
      change_request: opts.changeRequest ?? "",
      current_caption: opts.currentCaption ?? null,
      image_b64: opts.imageB64 ?? "",
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    if (res.status === 404 && body.includes("Key not found")) {
      throw new KeyNotFoundError()
    }
    throw new Error(`Ideogram AI failed (${res.status}): ${body.slice(0, 300)}`)
  }

  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data as IdeogramAIResult
}
