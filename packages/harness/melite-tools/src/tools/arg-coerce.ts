/**
 * arg-coerce — the numeric-string valve (efficiency review,
 * prong (a) fix 3, 2026-09-22).
 *
 * THE CENSUS: attempt005 burned 9 turns on invalid-arg refusals,
 * `bash timeoutMs` as a string ×4 among them — "the agent never
 * learned the coercion lesson" because the error voice states
 * types but never coerces. The gate is RIGHT to validate; the
 * CLIENT is wrong to round-trip a refusal for a value whose
 * intent is unambiguous ("300" for a number slot).
 *
 * THIS LAYER'S SHARE: every melite tool def passes through
 * withArgCoercion at registration — a numeric string for a
 * declared number param coerces BEFORE the dsh-tools validation
 * gate; 'true'/'false' for a boolean likewise. Flat top-level
 * args only (the census class is flat); anything else rides
 * untouched and the gate still owns it.
 *
 * DSH-core tools (bash/read) are upstream Layer A — their side of
 * the fix is out of this repo's hands; the melite faces never
 * refuse the class again.
 */
import type { ToolDefinition } from '../types.ts'

type PropSpec = { type?: unknown }

/** Coerce one flat args object against a compiled parameter schema's
 * properties. Never throws, never drops keys — a value that is not a
 * clean numeric string stays verbatim for the gate to refuse. */
export function coerceArgs(
  props: Record<string, PropSpec> | undefined,
  args: unknown,
): unknown {
  if (props === undefined || typeof args !== 'object' || args === null ||
      Array.isArray(args)) return args
  const out: Record<string, unknown> = { ...(args as Record<string, unknown>) }
  for (const [key, spec] of Object.entries(props)) {
    const v = out[key]
    if (v === undefined || v === null) continue
    const t = spec?.type
    if (t === 'number' && typeof v === 'string') {
      const n = Number(v)
      if (v.trim() !== '' && Number.isFinite(n)) out[key] = n
    } else if (t === 'boolean' && (v === 'true' || v === 'false')) {
      out[key] = v === 'true'
    }
  }
  return out
}

/** Wrap a built tool def: coerce numeric-string/boolean-string args
 * per the def's own compiled schema, then run the original execute
 * (which still validates everything else). The def is mutated in
 * place and returned — one spelling at the registration site. */
export function withArgCoercion<T extends ToolDefinition>(def: T): T {
  const params = (def as unknown as { parameters?: { properties?: Record<string, PropSpec> } }).parameters
  const props = params?.properties
  const orig = (def as unknown as { execute?: unknown }).execute
  if (props === undefined || typeof orig !== 'function') return def
  ;(def as unknown as { execute: unknown }).execute = (args: unknown, exec: unknown) =>
    (orig as (a: unknown, e: unknown) => unknown)(coerceArgs(props, args), exec)
  return def
}
