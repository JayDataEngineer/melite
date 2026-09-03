// llmProviders — the preset-provider catalog behind the AI Model Endpoints
// dialog's provider dropdown (2026-08-18).
//
// SPLIT SOURCE OF TRUTH, PINNED TOGETHER: the AGENT decides which chat class
// serves an endpoint by matching base_url MARKERS in
// agent/models/provider_registry.py (_PROVIDER_CHAT_MODELS). This table
// mirrors those markers so the editor's dropdown, the saved-endpoint badges,
// and the agent's class resolution all agree — every entry's ``markers`` are
// rows in that registry, and GET /v1/llm/providers serves the registry rows
// (module + class + installed flag) straight from the agent's table. The
// parity invariant (every marker here exists there; every preset baseUrl
// self-matches) is pinned by __tests__/llm-providers.test.ts.
//
// Matching here mirrors the registry's semantics with two deliberate
// divergences, both toward robustness: markers are matched against a
// lowercased URL, and when several markers match the LONGEST wins (the
// registry is top-down first-wins; its one ordering-sensitive pair —
// Gemini's OpenAI-compat path vs its bare host — is exactly a
// longest-marker-wins relationship).
import { apiFetch } from "./api"

export interface LlmProviderPreset {
  /** Dropdown value + saved-row badge id. */
  id: string
  /** Human label — dropdown + saved-row badge. */
  label: string
  /** Canonical OpenAI-compatible endpoint the preset fills in. */
  baseUrl: string
  /** Registry markers whose chat class an endpoint on this host resolves to. */
  markers: readonly string[]
  /** API-key placeholder shape, when characteristic (sk-…, gsk_…, …). */
  keyHint?: string
  /** Where to create a key, when well-known. */
  keyUrl?: string
  /** Suggested starting model — Fetch models remains the real source. */
  defaultModel?: string
}

/** The dropdown's escape hatch: any OpenAI-compatible base URL, typed by hand. */
export const CUSTOM_PROVIDER_ID = "custom"

export const LLM_PROVIDERS: readonly LlmProviderPreset[] = [
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    markers: ["api.openai.com"],
    keyHint: "sk-…",
    keyUrl: "https://platform.openai.com/api-keys",
    defaultModel: "gpt-4o-mini",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    markers: ["deepseek.com"],
    keyHint: "sk-…",
    keyUrl: "https://platform.deepseek.com/api_keys",
    defaultModel: "deepseek-chat",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    markers: ["api.anthropic.com"],
    keyHint: "sk-ant-…",
    keyUrl: "https://console.anthropic.com/settings/keys",
    defaultModel: "claude-sonnet-4-5",
  },
  {
    id: "google",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    // OpenAI-compat surface first (what the preset stores → ChatOpenAI);
    // a bare native-protocol URL still resolves the native class.
    markers: [
      "generativelanguage.googleapis.com/v1beta/openai",
      "generativelanguage.googleapis.com",
    ],
    keyHint: "AIza…",
    keyUrl: "https://aistudio.google.com/apikey",
    defaultModel: "gemini-2.5-flash",
  },
  {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    markers: ["api.groq.com"],
    keyHint: "gsk_…",
    keyUrl: "https://console.groq.com/keys",
    defaultModel: "llama-3.3-70b-versatile",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    markers: ["openrouter.ai"],
    keyHint: "sk-or-…",
    keyUrl: "https://openrouter.ai/settings/keys",
  },
  {
    id: "together",
    label: "Together",
    baseUrl: "https://api.together.xyz/v1",
    markers: ["api.together.xyz"],
    keyUrl: "https://api.together.ai/settings/api-keys",
  },
  {
    id: "fireworks",
    label: "Fireworks",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    markers: ["api.fireworks.ai"],
    keyHint: "fw_…",
    keyUrl: "https://fireworks.ai/account/api-keys",
  },
  {
    id: "mistral",
    label: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    markers: ["api.mistral.ai"],
    keyUrl: "https://console.mistral.ai/api-keys",
    defaultModel: "mistral-small-latest",
  },
  {
    id: "perplexity",
    label: "Perplexity",
    baseUrl: "https://api.perplexity.ai",
    markers: ["api.perplexity.ai"],
    keyHint: "pplx-…",
    keyUrl: "https://www.perplexity.ai/settings/api",
    defaultModel: "sonar",
  },
  {
    id: "xai",
    label: "xAI (Grok)",
    baseUrl: "https://api.x.ai/v1",
    markers: ["api.x.ai"],
    keyHint: "xai-…",
    keyUrl: "https://console.x.ai",
  },
  {
    id: "nvidia",
    label: "NVIDIA",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    markers: ["integrate.api.nvidia.com"],
    keyHint: "nvapi-…",
    keyUrl: "https://build.nvidia.com",
  },
  {
    id: "cohere",
    label: "Cohere",
    baseUrl: "https://api.cohere.ai/compatibility/v1",
    markers: ["api.cohere.ai", "api.cohere.com"],
    keyUrl: "https://dashboard.cohere.com/api-keys",
  },
]

const _BY_MARKER = new Map<string, LlmProviderPreset>()
for (const p of LLM_PROVIDERS) {
  for (const m of p.markers) _BY_MARKER.set(m, p)
}

/** The provider whose registry markers match this base URL — the SAME
 *  endpoint the agent's provider_registry resolves a class for. Longest
 *  matching marker wins (see module header). undefined = custom/unknown. */
export function matchProvider(baseUrl: string): LlmProviderPreset | undefined {
  const url = (baseUrl || "").trim().toLowerCase()
  if (!url.startsWith("http")) return undefined
  let best: LlmProviderPreset | undefined
  let bestLen = 0
  for (const p of LLM_PROVIDERS) {
    for (const m of p.markers) {
      if (m.length > bestLen && url.includes(m)) {
        best = p
        bestLen = m.length
      }
    }
  }
  return best
}

export function providerById(id: string): LlmProviderPreset | undefined {
  return LLM_PROVIDERS.find((p) => p.id === id)
}

// ── Backend-served registry facts (module + class + installed) ────────────

export interface ProviderRegistryRow {
  marker: string
  module: string
  className: string
  installed: boolean
}

export type ProviderRegistry = Record<string, ProviderRegistryRow>

/** GET /v1/llm/providers — the agent's marker table + install status.
 *  null when the backend is older/offline: the dropdown degrades to no
 *  installed-badges (presets still work; only the informational hint goes). */
export async function fetchProviderRegistry(): Promise<ProviderRegistry | null> {
  try {
    const resp = await apiFetch("/v1/llm/providers")
    if (!resp.ok) return null
    const data = (await resp.json()) as { providers?: ProviderRegistryRow[] }
    const reg: ProviderRegistry = {}
    for (const row of data.providers ?? []) reg[row.marker] = row
    return reg
  } catch {
    return null
  }
}

/** The registry row governing a provider (first marker that has one). */
export function registryRowFor(
  provider: LlmProviderPreset,
  registry: ProviderRegistry | null,
): ProviderRegistryRow | undefined {
  if (!registry) return undefined
  return provider.markers.map((m) => registry[m]).find(Boolean)
}
