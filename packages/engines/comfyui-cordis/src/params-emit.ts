// params-emit.ts — the TS-side params_schema emitter (Phase-2 core).
//
// LAW OF THIS FILE (DSH-AS-LANGUAGE, applied to the Card UI): the
// card's Schemastery schema IS the single declaration of the knob
// surface — validation AND the served UI contract both derive from
// it. This walker projects schema meta → the served params_schema
// JSON-Schema dialect (type/format/enum/default/minimum/maximum/
// description + x-visible-when/x-families). The manifest's UI
// role for cards retires; these bytes replace it at the chrome door.
//
// MAPPING RULES:
//  - type: number → 'number'; number+step(1) → 'integer' (the seed
//    contract); string/boolean/array/any → as-is except:
//    · union of consts → 'string' + enum (declaration order)
//    · union number|string (wire-coerced Select) → 'string' + enum
//      from extra.options
//    · union boolean|string → 'string' + enum ['true','false']
//    · nullable union (…|const null) → the inner branch wins; null
//      is the family-literal resolution path, never served
//    · any (mod bags) → 'string' (the mod-bag serving shape)
//  - minimum/maximum: meta.min/meta.max (VALIDATING floors — RANGE
//    RULE: whoever owns the default owns the floor) OR hint-only
//    meta.extra.min/max (ride-the-model keys; the cascade stays
//    authoritative, the editor still gets its floor)
//  - default: meta.default, OMITTED when empty array (the emitter
//    omission law — served bytes carry no "default": [])
//  - format: meta.role === 'path' → 'path'
//  - description: meta.description verbatim
//  - x-visible-when: meta.extra.visible_when (the declaration's
//    spelling — the one every card writes; visibleWhen rides as an
//    accepted alias)
//  - x-families: meta.extra.families
//  - required: knobs carrying extra.required (EMIT-ONLY — the flag
//    rides meta.extra so schemastery never validates it; compose's
//    named refusals stay the enforcement, refusal bytes unchanged)
//  - model: NOT a schema knob (the {model:} door owns admission —
//    wall-pinned 422). emitParamsSchema synthesizes the served model
//    knob from the card's boarded array: enum boarded, default
//    boarded[0] — one source, two projections.
import type z from '@deepseek-ai/schemastery'
import { extraOf } from '@melite/contracts/extraKeys'
import type { DeclaredModifierKind } from './service.ts'

/** The carrier dict shape (shared with the no-cheat door). */
export type Schema = {
  type: string
  meta?: Record<string, unknown>
  dict?: Record<string, Schema>
  list?: Schema[]
  value?: unknown
}

export type ParamsSchema = {
  type: 'object'
  properties: Record<string, Record<string, unknown>>
  required?: string[]
}

/** One knob's JSON-schema projection (shared: the tools door's
 *  params_schema AND the discovery door's family param-schemas ride
 *  this — one spelling, never a second projector). */
export const emitKnob = (s: Schema): Record<string, unknown> => {
  const m = (s.meta ?? {}) as Record<string, any>
  // THE ONE VOCABULARY (2026-10-10): the bag narrows through the
  // floor's typed read — @melite/contracts/extraKeys owns every
  // spelling; this face reads property names off the typed bag,
  // never a second string literal (the visibleWhen dead read died
  // here).
  const ex = extraOf(s as { meta?: Record<string, unknown> }) as Record<string, any>

  // union resolution
  let type = s.type
  let inner: Schema | null = null
  // wire-coerced Select classes stringify their default + options
  // (served bytes: type "string", enum ["512",...] — compose coerces)
  let stringified = false
  if (type === 'union' && Array.isArray(s.list)) {
    const branches = s.list
    const nonNull = branches.filter((b) => !(b.type === 'const' && b.value === null))
    if (nonNull.length === 0) {
      type = 'null'
    } else if (nonNull.length === 1 && branches.length === 2) {
      // nullable: inner branch wins, null never served
      inner = nonNull[0]
      type = inner.type
    } else if (branches.every((b) => b.type === 'const')) {
      type = 'string'
    } else if (branches.some((b) => b.type === 'boolean')) {
      type = 'string'
      stringified = true
    } else {
      // wire-coerced Select (number|string): the knob default rides
      type = 'string'
      stringified = true
    }
  }
  const im = inner
    // nullable: the DEFAULT/description/role ride the OUTER union
    // (that's where the card declares them); floors/step ride the
    // inner number branch — merge with outer as fallback
    ? ({ ...m, ...Object.fromEntries(Object.entries((inner.meta ?? {})).filter(([, v]) => v !== undefined)) } as Record<string, any>)
    : m
  const iex = inner ? (extraOf({ meta: im } as never) as Record<string, any>) : ex

  // extra.options ⇒ wire-coerced Select class regardless of TS atom:
  // served type "string", enum + default stringified (compose coerces)
  if (iex.options !== undefined) {
    stringified = true
    type = 'string'
  }

  // canonical key order: type, format, enum, default, minimum,
  // maximum, description, x-visible-when, x-families (the served
  // order — byte-stable)
  const out: Record<string, unknown> = {}
  if (type === 'number') {
    out.type = im.step === 1 ? 'integer' : 'number'
  } else if (type === 'any') {
    out.type = 'string'
  } else {
    out.type = type
  }

  if (im.role === 'path') out.format = 'path'

  // enum: const-union values, then options hints (stringified for
  // the coerced Select class), then the bool-string pair
  if (type === 'string' && Array.isArray(s.list) && s.list.every((b) => b.type === 'const' && b.value !== null)) {
    out.enum = s.list.map((b) => b.value)
  } else if (iex.options !== undefined) {
    out.enum = iex.options.map((o: unknown) => String(o))
  } else if (stringified && Array.isArray(s.list) && s.list.some((b) => b.type === 'boolean')) {
    out.enum = ['true', 'false']
  }

  // default: omit only when UNDECLARED (a bare knob) — an explicit
  // .default([]) serves its [] (the served bytes carry it). The
  // marker disambiguates from schemastery's auto-default []: arrays
  // ALWAYS carry meta.default [], so an empty array serves its
  // default ONLY when extra.serveDefault is set (input_images).
  if (im.default !== undefined && !(Array.isArray(im.default) && im.default.length === 0 && !iex.serveDefault)) {
    out.default = stringified && (typeof im.default === 'number' || typeof im.default === 'boolean')
      ? String(im.default)
      : im.default
  }

  // floors: validating meta first, then hint-only extra
  if (im.min !== undefined) out.minimum = im.min
  if (im.max !== undefined) out.maximum = im.max
  if (out.minimum === undefined && iex.min !== undefined) out.minimum = iex.min
  if (out.maximum === undefined && iex.max !== undefined) out.maximum = iex.max

  if (im.description) out.description = im.description
  // THE ONE-VOCABULARY LAW (2026-10-10, the contract audit): every
  // card declares `visible_when` (snake — the form walker's own
  // spelling); this face read `visibleWhen` (camel), a key NO
  // declaration writes — x-visible-when never fired for a single
  // card. The declaration's spelling is the contract; the camel
  // alias stays accepted (a future declaration may not be re-iled),
  // but the snake key is the one that serves.
  const vw = iex['visible_when'] !== undefined ? iex['visible_when'] : iex.visibleWhen
  if (vw !== undefined) out['x-visible-when'] = vw
  if (iex.families !== undefined) out['x-families'] = iex.families

  return out
}

/**
 * The DSH tool-parameter projection (M2′ stroke 2c, 2026-09-09):
 * the IMPLICIT PROPERTY MAP the dsh-tools defineTool contract
 * consumes — { knob: { type, description?, enum?, default?,
 * required? } } — derived from the served params_schema
 * projection (one walking family, two projections; never a second
 * walk of the Schemastery carrier). The spec form carries the
 * default NATIVELY (ValueSchemaAnnotations.default — projected to
 * the model JSON and non-validating, verified against the packed
 * dsh-tools runtime) and numeric enums NATIVELY (Number/Integer
 * specs take number enums — no String() collapse). What the DSL
 * has no keys for stays folded into the description (minimum/
 * maximum — no bounds keys in the DSL) or stays served-form-only
 * (format/bounds/x-* ride /v1/tools, which serves the full
 * JSON-schema form). `object`/`array` knobs project as the
 * unconstrained lossless node (`json`) — the carrier walk drops
 * internals one layer down, identically for both projections.
 */
export interface ParamSpecNode {
  type: "string" | "number" | "integer" | "boolean" | "json"
  description?: string
  enum?: (string | number)[]
  default?: unknown
  required?: true
}

export type ParamsSpec = Record<string, ParamSpecNode>

export const emitParamsSpec = (carrier: Schema, boarded: readonly string[]): ParamsSpec => {
  const served = emitParamsSchema(carrier, boarded)
  const spec: ParamsSpec = {}
  const requiredSet = new Set(served.required ?? [])
  /* v8 ignore next -- emitParamsSchema always serves properties
   * (the object literal above); the ?? is the type-system's toll
   * (ParamsSchema.properties is optional), not a runtime arm. */
  const props = served.properties ?? {}
  for (const [k, node] of Object.entries(props)) {
    const t = String(node.type)
    const out: ParamSpecNode = {
      type:
        t === "string" || t === "number" || t === "integer" || t === "boolean"
          ? (t as ParamSpecNode["type"])
          : "json",
    }
    let desc = typeof node.description === "string" ? node.description : ""
    // The DSL carries default NATIVELY (see the interface header) —
    // the served default is already conditioned (stringified only
    // for wire-coerced Selects, raw otherwise), so it rides through
    // untouched. Bounds have no DSL keys: they fold into the
    // description so the model still sees them (the receipt's
    // converter discipline — never attach unsupported keys).
    if (node.default !== undefined) out.default = node.default
    const bounds: string[] = []
    if (typeof node.minimum === "number") bounds.push(`min: ${node.minimum}`)
    if (typeof node.maximum === "number") bounds.push(`max: ${node.maximum}`)
    if (bounds.length > 0) desc += ` (${bounds.join(", ")})`
    desc = desc.trim()
    if (desc) out.description = desc
    // Enum fidelity: JSON scalars pass through untouched (numbers
    // stay numbers for number/integer nodes — the DSL validates
    // them natively); anything else stringifies (served options
    // are already strings — idempotent; the bool-string pair is
    // strings by construction).
    if (Array.isArray(node.enum)) {
      out.enum = node.enum.map((e) => (typeof e === "number" ? e : String(e)))
    }
    if (requiredSet.has(k)) out.required = true
    spec[k] = out
  }
  return spec
}

/** Project a registered card's schema + boarded list to the served
 * params_schema dialect. `schemaFn` is the card's registered schema
 * (the callable); we walk its carrier via the .dict of the declared
 * object — cards register the schema object itself (h3 wraps with a
 * normalizer function whose .dict we read off the inner paramSchema
 * at registration; see service.ts cardSchemaCarrier). */
export const emitParamsSchema = (
  schemaCarrier: Schema,
  boarded: readonly string[],
): ParamsSchema => {
  const dict = schemaCarrier.dict ?? {}
  const properties: Record<string, Record<string, unknown>> = {}
  // the served model knob exists ONLY on multi-family cards — a
  // single-family board is unambiguous (the top-level model IS the
  // card); multi-family synthesizes enum boarded + default
  // boarded[0] (one source, two projections — the {model:} door
  // still owns admission; this knob is the UI's picker)
  if (boarded.length > 1) {
    properties.model = {
      type: 'string',
      enum: [...boarded],
      default: boarded[0],
      description:
        `The boarded family to run — the request's top-level \`model\`. Options: ${boarded.join(', ')}.`,
    }
  }
  const required: string[] = []
  for (const [k, v] of Object.entries(dict)) {
    // THE HIDDEN-ALIAS LAW (the operator's rework, 2026-09-26:
    // "reference images and input images are the same thing" — a
    // hidden alias is a VALIDATION key for old drafts, never a
    // face): extra.hidden knobs stay out of BOTH projections. The
    // image-edit card's image2/image3 are the case — compose merges
    // them into the reference order and the form never renders
    // them, but the tool face served "Image 2"/"Image 3" beside
    // Reference Images: one concept spelled twice, the alias half
    // of it outside the input category. Hidden = unserved.
    const hiddenEx = ((v.meta ?? {}).extra ?? {}) as Record<string, unknown>
    if (hiddenEx.hidden === true) continue
    properties[k] = emitKnob(v)
    const ex = ((v.meta ?? {}).extra ?? {}) as Record<string, any>
    if (ex.required === true) required.push(k)
  }
  const out: ParamsSchema = { type: 'object', properties }
  if (required.length > 0) out.required = required
  return out
}

/** THE MODS PROJECTION (stroke 79 — the seam-law unification): the
 *  declared kinds as the AGENT plane consumes them. ONE emitter,
 *  TWO doors (the /v1/tools manifest row and the /v1/load bundle's
 *  signature — never a re-derivation in either). The mod bags are
 *  NOT flat-schema keys: params_schema alone cannot compose a card
 *  whose complexity lives in mods, and an agent that never learns
 *  the kinds hits compose's loud refusals blind. Verbatim off the
 *  card's own declared rows; leaf_face is a UI concern and never
 *  rides (the agent composes VALUES, never faces). */
export const emitModifierKinds = (
  mods: readonly DeclaredModifierKind[] | undefined,
): Array<Record<string, unknown>> =>
  (mods ?? []).map((k) => ({
    kind: k.kind,
    ...(k.category !== undefined ? { category: k.category } : {}),
    cardinality: k.cardinality,
    fields: (k.fields ?? []).map((f) => String(f['name'] ?? '')),
  }))
