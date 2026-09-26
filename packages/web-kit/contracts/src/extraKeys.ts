// extraKeys.ts — THE EXTRA-BAG CONTRACT (2026-10-10, the operator's
// law: "the contracts should be so [REDACTED 2026-11-05] deep that it is
// literally impossible to speak two vocabularies").
//
// THE CRIME THIS FILE KILLS: every face read `meta.extra.<key>` by
// its own string literal — the form walker spelled `visible_when`,
// the tool face spelled `visibleWhen`, and the tool face's
// visibility grammar was DEAD CODE for every card ever declared
// (found 2026-10-10, li-e). Two faces, two spellings, one silent
// dead read — and nothing could catch it, because the vocabulary
// lived nowhere.
//
// THE LAW: the extra bag's vocabulary is declared HERE, once —
// spelling, wire type, owning faces. Writers type against ExtraBag
// (tsc refuses an unknown key at the literal — the compile-time
// wall); readers import the same constants (never a second
// spelling site); the harvest pin walks every real card and mod
// envelope and refuses any key outside EXTRA_KEYS (the net under
// both walls — a bypassed write is a test failure naming
// card + field + key).
//
// This module is the FLOOR: @melite/contracts has zero
// dependencies and no build step — the web tier (card-base) and
// the engine tier (comfyui-cordis, card packages) both sit on it.
// Nothing above may spell an extra-bag key as a bare string.

/** One select option's wire row (the BOTH-shapes law: plain string
 *  labels or {value,label} rows — the atom normalizes). */
export type ExtraOptionRow = string | { value: string; label: string }

/** THE VOCABULARY — every extra-bag key that exists, exactly one
 *  spelling each. A key absent from this list is not part of the
 *  contract; adding one is a deliberate act recorded here with its
 *  type and owners below. */
export const EXTRA_KEYS = [
  'order',
  'group',
  'zone',
  'wtype',
  'width',
  'columns',
  'visible_when',
  'tooltip',
  'required',
  'hidden',
  'families',
  'max_stack',
  'media',
  'placeholder',
  'options',
  'optionsFrom',
  'serveDefault',
  'min',
  'max',
  'default',
] as const

export type ExtraKey = (typeof EXTRA_KEYS)[number]

/** The set form for O(1) membership (the harvest pin's judge). */
export const EXTRA_KEY_SET: ReadonlySet<string> = new Set<string>(EXTRA_KEYS)

/** THE BAG'S SHAPE — the typed write door. Object literals checked
 *  against this refuse unknown keys at compile time (ts2353); the
 *  `bag()` helper re-validates at runtime for spread arms a
 *  literal check cannot see.
 *
 *  OWNERS (the faces that read each key — one spelling each):
 *   - order         form (row order in group; null = undeclared)
 *   - group         form (the group tab the field seats in)
 *   - zone          form (inputs vs params rail split)
 *   - wtype         form (declared presentation: image, image_list,
 *                  textarea, number, select, mesh, …)
 *   - width         form (column span within the group grid)
 *   - columns       form (the group's grid columns, first-seen wins)
 *   - visible_when  form + tool (the "key=value&key2=a|b" grammar;
 *                  the tool face emits it as x-visible-when)
 *   - tooltip       form
 *   - required      form + tool (emit-only; compose enforces)
 *   - hidden        form (never renders — the one-list aliases)
 *   - families      form (family scoping: absent family skips) + tool
 *   - max_stack     form (the progressive stack's cap)
 *   - media         form (media-typed hint)
 *   - placeholder   form
 *   - options       form (closed vocabulary; the serve STAMPS this
 *                  key from optionsFrom — same spelling both ways)
 *   - optionsFrom   serve (names the mod pack whose live rows stamp
 *                  options; never rides a served envelope)
 *   - serveDefault  tool (an empty-array default serves only with it)
 *   - min/max       tool (hint-only floors when the schema carries
 *                  none; the schema's own min/max ride meta, not here)
 *   - default       NO READER TODAY (anny's dynamic spreads write
 *                  it; nothing reads extra.default — the harvest
 *                  report names it; retire or adopt deliberately)
 */
export interface ExtraBag {
  order?: number | null
  group?: string
  zone?: string
  wtype?: string
  width?: number
  columns?: number
  visible_when?: string
  tooltip?: string
  required?: boolean
  hidden?: boolean
  families?: string[]
  max_stack?: number
  media?: string
  placeholder?: string
  options?: ExtraOptionRow[]
  optionsFrom?: string
  serveDefault?: boolean
  min?: number
  max?: number
  default?: unknown
}

/** THE TYPED WRITE — declarations pass their literal through this
 *  so an unknown key fails BOTH walls: tsc at the literal, this
 *  throw at runtime (spread arms). Never a silently dead write. */
export function bag(b: ExtraBag): ExtraBag {
  for (const key of Object.keys(b)) {
    if (!EXTRA_KEY_SET.has(key)) {
      throw new Error(
        "extra bag carries '" + key + "' — not in the contract's vocabulary (packages/web-kit/contracts/src/extraKeys.ts). " +
        'A key outside the table has no reader spelling and would be a silent dead write. Add it to EXTRA_KEYS with its type and owners, or fix the spelling.',
      )
    }
  }
  return b
}

/** THE TYPED READ — one getter for every face. `extraOf(node)`
 *  narrows a serialized ref node's meta.extra to the bag type;
 *  faces read keys off the result, never off a bare record. */
export function extraOf(
  node: { meta?: Record<string, unknown> } | null | undefined,
): Partial<ExtraBag> {
  const raw = node?.meta?.['extra']
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw)
    ? raw as Partial<ExtraBag>
    : {}
}
