// params-emit.ts — the TS-side params_schema emitter (Phase-2 core).
//
// LAW OF THIS FILE (DSH-AS-LANGUAGE, applied to the Card UI): the
// card's Schemastery schema IS the single declaration of the knob
// surface — validation AND the served UI contract both derive from
// it. This walker projects schema meta → the served params_schema
// JSON-Schema dialect (type/format/enum/default/minimum/maximum/
// description + x-visible-when/x-families). The py manifest's UI
// role for cards retires; these bytes replace it at the chrome door.
//
// MAPPING RULES (each proven against the served golden):
//  - type: number → 'number'; number+step(1) → 'integer' (the seed
//    contract); string/boolean/array/any → as-is except:
//    · union of consts → 'string' + enum (declaration order)
//    · union number|string (wire-coerced Select) → 'string' + enum
//      from extra.options
//    · union boolean|string → 'string' + enum ['true','false']
//    · nullable union (…|const null) → the inner branch wins; null
//      is the family-literal resolution path, never served
//    · any (mod bags) → 'string' (the py mod-bag serving shape)
//  - minimum/maximum: meta.min/meta.max (VALIDATING floors — RANGE
//    RULE: whoever owns the default owns the floor) OR hint-only
//    meta.extra.min/max (ride-the-model keys; the cascade stays
//    authoritative, the editor still gets its floor)
//  - default: meta.default, OMITTED when empty array (the emitter
//    omission law — served bytes carry no "default": [])
//  - format: meta.role === 'path' → 'path'
//  - description: meta.description verbatim
//  - x-visible-when: meta.extra.visibleWhen
//  - x-families: meta.extra.families
//  - required: knobs carrying extra.required (EMIT-ONLY — the flag
//    rides meta.extra so schemastery never validates it; compose's
//    named refusals stay the enforcement, refusal bytes unchanged)
//  - model: NOT a schema knob (the {model:} door owns admission —
//    wall-pinned 422). emitParamsSchema synthesizes the served model
//    knob from the card's boarded array: enum boarded, default
//    boarded[0] — one source, two projections.
import type z from '@deepseek-ai/schemastery'

type Schema = {
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
  const ex = (m.extra ?? {}) as Record<string, any>

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
  const iex = inner ? ((im.extra ?? m.extra ?? {}) as Record<string, any>) : ex

  // extra.options ⇒ wire-coerced Select class regardless of TS atom:
  // served type "string", enum + default stringified (compose coerces)
  if (iex.options !== undefined) {
    stringified = true
    type = 'string'
  }

  // canonical key order: type, format, enum, default, minimum,
  // maximum, description, x-visible-when, x-families (the served
  // golden's order — byte-stable)
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
  // default ONLY when extra.serveDefault is set (reference_images).
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
  if (iex.visibleWhen !== undefined) out['x-visible-when'] = iex.visibleWhen
  if (iex.families !== undefined) out['x-families'] = iex.families

  return out
}

/**
 * The DSH tool-parameter projection (M2′ stroke 2c, 2026-09-09):
 * the IMPLICIT PROPERTY MAP the dsh-tools defineTool contract
 * consumes — { knob: { type, description?, enum?, required?,
 * minimum?, maximum? } } — derived from the served params_schema
 * projection (one walking family, two projections; never a second
 * walk of the Schemastery carrier). The spec form carries no
 * `default`: optionality is the per-property required flag, and the
 * card's admission owns defaulting at execute time. The DSL carries
 * no numeric bounds and no object/array internals: both stay owned
 * by the card gate at execute time, and remain visible on the
 * registry plane (/v1/tools serves the full JSON-schema form).
 * `object`/`array` knobs project as the unconstrained lossless node
 * (`json`).
 */
export interface ParamSpecNode {
  type: "string" | "number" | "integer" | "boolean" | "json"
  description?: string
  enum?: string[]
  required?: true
}

export type ParamsSpec = Record<string, ParamSpecNode>

export const emitParamsSpec = (carrier: Schema, boarded: readonly string[]): ParamsSpec => {
  const served = emitParamsSchema(carrier, boarded)
  const spec: ParamsSpec = {}
  const requiredSet = new Set(served.required ?? [])
  for (const [k, node] of Object.entries(served.properties ?? {})) {
    const t = String(node.type)
    const out: ParamSpecNode = {
      type:
        t === "string" || t === "number" || t === "integer" || t === "boolean"
          ? (t as ParamSpecNode["type"])
          : "json",
    }
    let desc = typeof node.description === "string" ? node.description : ""
    // The DSL whitelists no default/bounds keys: fold them into the
    // description so the model still sees them (the receipt's
    // converter discipline — never attach unsupported keys).
    if (node.default !== undefined) desc += ` (default: ${JSON.stringify(node.default)})`
    const bounds: string[] = []
    if (typeof node.minimum === "number") bounds.push(`min: ${node.minimum}`)
    if (typeof node.maximum === "number") bounds.push(`max: ${node.maximum}`)
    if (bounds.length > 0) desc += ` (${bounds.join(", ")})`
    desc = desc.trim()
    if (desc) out.description = desc
    if (Array.isArray(node.enum)) out.enum = node.enum.map((e) => String(e))
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
    properties[k] = emitKnob(v)
    const ex = ((v.meta ?? {}).extra ?? {}) as Record<string, any>
    if (ex.required === true) required.push(k)
  }
  const out: ParamsSchema = { type: 'object', properties }
  if (required.length > 0) out.required = required
  return out
}
