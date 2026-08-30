/**
 * The AGENT-side enhance orchestration — shared by the chat tool and the
 * /melite-tools/enhance route's sweep mode. ONE implementation, two doors.
 *
 * The recipes are SSOT in the gateway form-spec (per-model
 * prompt-enhance* SKILL.md files surfaced as enhance_prompt | enhance_prompts).
 * Every field completion rides the harness model via llm-complete.ts —
 * no keystore, no "no model".
 */
import { gatewayRequest } from './gateway.ts'
import { harnessEnhance } from './llm-complete.ts'

const FORMSPEC_TIMEOUT_MS = 15_000

interface FormSpecShape {
  enhance_prompt?: unknown
  enhance_prompts?: unknown
}

/** The declared enhance fields of one model: name → recipe system prompt. */
export interface DeclaredFields {
  fields: Record<string, string>
  names: string[]
}

/** Read the model's declared recipes straight off the form-spec SSOT. */
export async function fetchDeclaredFields(
  gatewayUrl: string,
  model: string,
  signal: AbortSignal,
): Promise<DeclaredFields> {
  const spec = await gatewayRequest(
    gatewayUrl, 'GET', '/v1/form-spec?model=' + encodeURIComponent(model),
    undefined, signal, FORMSPEC_TIMEOUT_MS,
  ) as FormSpecShape

  let fields: Record<string, string> = {}
  if (spec.enhance_prompts !== null && typeof spec.enhance_prompts === 'object' && !Array.isArray(spec.enhance_prompts)) {
    for (const [k, v] of Object.entries(spec.enhance_prompts as Record<string, unknown>)) {
      if (typeof v === 'string' && v.length > 0) fields[k] = v
    }
  } else if (typeof spec.enhance_prompt === 'string' && spec.enhance_prompt.length > 0) {
    fields = { prompt: spec.enhance_prompt }
  }
  return { fields, names: Object.keys(fields) }
}

export interface FieldResult {
  positive: string
  negative: string
}

/** One field's enhancement through the harness model. */
export function enhanceOneField(
  llm: LlmSeam,
  recipe: string,
  prompt: string,
  temperature: number | undefined,
  signal: AbortSignal,
): Promise<FieldResult> {
  return harnessEnhance(llm, {
    system: recipe,
    prompt,
    temperature,
    signal,
  })
}

/** Structural re-export so callers do not import llm-complete for the type. */
export type LlmSeam = import('./llm-complete.ts').LlmStreamSeam

/**
 * THE SWEEP — every declared field, one press. The route's model-form uses
 * this: the CALLER orchestrates (a button, not a conversational agent), so
 * unlike the chat tool there is no listing round-trip — all declared fields
 * are enhanced sequentially and returned together.
 */
export async function agenticSweep(
  gatewayUrl: string,
  llm: LlmSeam,
  opts: { model: string; prompt: string; temperature?: number; signal: AbortSignal },
): Promise<{ model: string; results: Record<string, FieldResult> }> {
  const { fields } = await fetchDeclaredFields(gatewayUrl, opts.model, opts.signal)
  const names = Object.keys(fields)
  if (names.length === 0) {
    throw new Error('agentic enhance: model "' + opts.model + '" declares no enhance recipe')
  }
  const results: Record<string, FieldResult> = {}
  for (const name of names) {
    results[name] = await enhanceOneField(
      llm, fields[name]!, opts.prompt, opts.temperature, opts.signal,
    )
  }
  return { model: opts.model, results }
}

