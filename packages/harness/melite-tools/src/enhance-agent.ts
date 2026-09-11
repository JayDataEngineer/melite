/**
 * The AGENT-side enhance orchestration — shared by the chat tool and the
 * /melite-tools/enhance route's sweep mode. ONE implementation, two doors.
 *
 * The recipes are SSOT in the gateway form-spec (per-model
 * prompt-enhance* SKILL.md files surfaced as enhance_prompt | enhance_prompts).
 * Every field completion rides the harness model via llm-complete.ts —
 * no keystore, no "no model".
 */
import type { EstateRequest } from './estate.ts'
import { formSpecArm } from './discovery.ts'
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

/** Map a form-spec envelope onto its declared recipes (the ONE
 *  spelling — the request lane and the in-process sweep share it). */
export function declaredFieldsFromSpec(spec: FormSpecShape): DeclaredFields {
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

/** Read the model's declared recipes straight off the form-spec SSOT. */
export async function fetchDeclaredFields(
  request: EstateRequest,
  model: string,
  signal: AbortSignal,
): Promise<DeclaredFields> {
  const spec = await request('GET', '/v1/form-spec?model=' + encodeURIComponent(model),
    undefined, signal, FORMSPEC_TIMEOUT_MS,
  ) as FormSpecShape

  return declaredFieldsFromSpec(spec)
}

export interface FieldResult {
  positive: string
  negative: string
  /** The harness route that actually served this field — never silent. */
  via: string
}

/** One field's enhancement through the harness model. */
export function enhanceOneField(
  llm: LlmSeam,
  recipe: string,
  prompt: string,
  temperature: number | undefined,
  signal: AbortSignal,
  llmWant?: string,
  defaultLlm?: string,
): Promise<FieldResult> {
  return harnessEnhance(llm, {
    system: recipe,
    prompt,
    temperature,
    signal,
    ...(llmWant !== undefined && llmWant.length > 0 ? { llm: llmWant } : {}),
  }, defaultLlm)
}

/** Structural re-export so callers do not import llm-complete for the type. */
export type LlmSeam = import('./llm-complete.ts').LlmStreamSeam

/**
 * GENERIC FALLBACK RECIPE — BACK HOME (the gateway kill,
 * 2026-09-10): the ONE spelling lives here, where it was born (the
 * disclosure bundle that shared it died with the gateway).
 */
export const GENERIC_ENHANCE_RECIPE: string =
  'You rewrite rough generation prompts into model-optimal ones. '
  + 'Expand terse descriptions into concrete visual/audio language: subject, '
  + 'action, setting, lighting, composition, style, medium, detail level. '
  + 'Reply with ONLY a JSON object {"positive": "<the rewritten prompt>", '
  + '"negative": "<what to avoid, or empty string>"} — no prose outside the JSON.';

/**
 * THE SWEEP — every declared field, one press. The route's model-form uses
 * this: the CALLER orchestrates (a button, not a conversational agent), so
 * unlike the chat tool there is no listing round-trip — all declared fields
 * are enhanced sequentially and returned together. A model with NO declared
 * fields sweeps ONE generic 'prompt' field (the shared fallback recipe).
 */
export async function agenticSweep(
  ctx: unknown,
  llm: LlmSeam,
  opts: { model: string; prompt: string; temperature?: number; signal: AbortSignal; llmWant?: string; defaultLlm?: string },
): Promise<{ model: string; results: Record<string, FieldResult> }> {
  // The sweep reads the form-spec SSOT IN-PROCESS (2026-09-12 fix:
  // the old makeEstateRequest lane served no GET /v1/form-spec seat,
  // so EVERY sweep 502'd "no remote serves" — the seat plane carries
  // flows/bench/runs/manage/skills/load/ledger, never discovery).
  // Unknown keys refuse loud, same body as the HTTP door.
  // ctx stays in the call shape (the doors sweep passes its host
  // context, as before) but no seat lane is consulted.
  const spec = await formSpecArm(opts.model)
  if (spec === null) {
    throw new Error(`enhance: '${opts.model}' does not resolve (unknown, unoffered, or retired)`)
  }
  const { fields } = declaredFieldsFromSpec(spec)
  let names = Object.keys(fields)
  if (names.length === 0) names = ['prompt']
  if (names.length === 1 && fields[names[0]] === undefined) {
    fields[names[0]] = GENERIC_ENHANCE_RECIPE
  }
  const results: Record<string, FieldResult> = {}
  for (const name of names) {
    results[name] = await enhanceOneField(
      llm, fields[name]!, opts.prompt, opts.temperature, opts.signal, opts.llmWant, opts.defaultLlm,
    )
  }
  return { model: opts.model, results }
}

