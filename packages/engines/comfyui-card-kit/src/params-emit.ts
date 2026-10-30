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
import type { JsonValue } from './graph.ts'
import { extraOf } from '@melite/contracts/extraKeys'
import type { SemanticModelEntry } from './semanticModelKnob.ts'

/** One card-declared modifier kind (the declarer face of the served
 *  ModifierKind — structural, the JSON wire shape). `entry` follows
 *  the served vocabulary: 'option' | 'hybrid' | undefined = field. */
export interface DeclaredModifierKind {
  kind: string
  label: string
  param_key: string
  entry?: string
  option_key?: string
  scalar_key?: string
  cardinality: string
  max_stack?: number
  fields?: readonly Record<string, unknown>[]
  kindFields?: readonly Record<string, unknown>[]
  options?: readonly Record<string, unknown>[]
  /** THE CATEGORY (the mods-abstraction law, stroke 78):
   *  'standalone' = every entry applies to the SAME base image and
   *  provides its OWN output (sam2/sam3 mask sources — order is
   *  semantically void); 'ordered' (default, the stacking law every
   *  pack kind follows — loras/controlnet) = entries STACK in array
   *  order, each receiving the previous outputs, modifying the
   *  model call — no independent inference. Served verbatim; the
   *  section renders the drag stack ONLY on ordered kinds. */
  category?: 'standalone' | 'ordered'
  /** THE LEAF FACE (paint-leaf-canvas.md): 'paint-canvas' = the
   *  kind's payload field offers the brush verb beside the square
   *  (the modal arrives from the host; absent host degrades to the
   *  three-source square — the payload PNG is the contract either
   *  way). 'bbox-canvas' (stroke 78) = the entry's bbox_x/y/w/h
   *  fields offer the rectangle verb — an image preview the user
   *  drags a selection on (absent host degrades to the four number
   *  inputs). Served verbatim like every declared row. */
  leaf_face?: 'paint-canvas' | 'bbox-canvas'
  /** THE SECTION CAPTION (2026-10-08, the operator's filter demand —
   *  "SAM2 AND SAM3 DON'T HAVE BBOX FILTER"): a one-line caption
   *  the leaf seats ABOVE the field stack, naming what the stack
   *  IS. The detector arms use it to NAME the bbox filter (the
   *  class chips + confidence ARE the filter — automated, Impact
   *  Pack boxes + YOLO; a caption-less stack reads as loose
   *  inputs). Served verbatim; absent = no caption. */
  section?: string
  /** THE ARM-CONDITIONAL EXTENSION PACKS (the mask SAM2 law,
   *  2026-09-19 — the operator: "declared, then auto provisioned"):
   *  pack ids this KIND's arm needs live (impact-pack nodes for the
   *  SAM2 chain). The compose door enforces them ONLY when the
   *  kind's bag is non-empty — an unused arm never blocks a run
   *  (the card-level `requires` above stays the always-on gate).
   *  Served verbatim; absent = no arm requirements. */
  requires?: readonly string[]
  /** THE GHOST DEFAULT (F34's chip half, 2026-11-13): the family's
   *  resolved absent-bag row — the id + strength/steps the compose
   *  door seeds when the operator states no list. The face shows ONE
   *  chip for it while the bag is ABSENT; an explicit `[]` is off. */
  default_entry?: { id: string; strength: number; steps: number }
  /** THE MENU ATTRIBUTION (the mod-liveness ARM 3 law, 2026-10-28,
   *  the swap build): the menu/compose flavor wall demands every
   *  served modifier carry a schema_key naming its catalog. Pack
   *  kinds inherit theirs from the MODIFIER_PACKS envelope; a
   *  CARD-declared kind has no envelope — the card IS the catalog —
   *  so the declarer stamps its own kind name. Served verbatim;
   *  absent = unattributed (the wall reds the lane). */
  schema_key?: string
}

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
/** The meta members schemastery knobs carry that this projector
 *  reads — a structural view over Schema.meta (default values are
 *  JSON by construction; the rest are the projector's own floors). */
type MetaView = {
  default?: JsonValue
  min?: number
  max?: number
  step?: number
  role?: string
  description?: string
}

export const emitKnob = (s: Schema): Record<string, unknown> => {
  const m = (s.meta ?? {}) as MetaView
  // THE ONE VOCABULARY (2026-10-10): the bag narrows through the
  // floor's typed read — @melite/contracts/extraKeys owns every
  // spelling; this face reads property names off the typed bag,
  // never a second string literal (the visibleWhen dead read died
  // here).
  const ex = extraOf(s as { meta?: Record<string, unknown> })

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
    ? ({ ...m, ...Object.fromEntries(Object.entries((inner.meta ?? {})).filter(([, v]) => v !== undefined)) } as MetaView)
    : m
  const iex = inner ? extraOf({ meta: im } as never) : ex

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
    // THE BOTH-SHAPES LAW (extraKeys.ts:28): an option row is a plain
    // string OR a {value,label} row. String(o) over the object arm
    // served "[object Object]" as an enum member — the select's own
    // value, unreachable and unreadable (the typed-seam audit, 2026-10-15).
    out.enum = iex.options.map((o: unknown): string => {
      if (typeof o === "string") return o
      if (
        typeof o === "object" && o !== null &&
        typeof (o as { value?: unknown }).value === "string"
      ) {
        return (o as { value: string }).value
      }
      return String(o)
    })
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
  // ONE VOCABULARY (li-f): the snake spelling is the only one the
  // contract carries — the camel alias is GONE. Every writer passes
  // bag() (tsc refuses camel at the literal), the wire walk refuses
  // camel on any served envelope, so a legible second spelling had
  // no remaining writer and no reason to stay legible.
  const vw = iex['visible_when']
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

/** The implicit property map (`/v1/tools`'s JSON-schema form):
 *  the schema's own fields plus the synthesized model enum.
 *
 *  @param schemaCarrier the card's declared schema object
 *  @param boarded the boarded family ids
 *  @param semantic the derived style entries — served as the model
 *   enum when present; the bare boarded enum otherwise
 *  @returns the served properties + required list
 */
export const emitParamsSpec = (
  carrier: Schema,
  boarded: readonly string[],
  semantic?: readonly SemanticModelEntry[],
): ParamsSpec => {
  const served = emitParamsSchema(carrier, boarded, semantic)
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
 * object — cards register the schema object itself, and a card that
 * wraps its schema (h3 normalizes through a function) carries the
 * inner one at def.schemaCarrier. The registry's own reader of that
 * field is models/service.ts:987, which resolves
 * `def?.schemaCarrier ?? def?.schema`. */
/** The JSON-schema form of the same walk.
 *
 *  @param schemaCarrier the card's declared schema object
 *  @param boarded the boarded family ids
 *  @param semantic the derived style entries — the model enum +
 *   default (the first entry) + label-carrying description when
 *   present; the bare boarded enum otherwise
 *  @returns properties, required, and (when the carrier declares
 *   them) additionalProperties
 */
export const emitParamsSchema = (
  schemaCarrier: Schema,
  boarded: readonly string[],
  semantic?: readonly SemanticModelEntry[],
): ParamsSchema => {
  const dict = schemaCarrier.dict ?? {}
  const properties: Record<string, Record<string, unknown>> = {}
  // the served model knob exists ONLY on multi-family cards — a
  // single-family board is unambiguous (the top-level model IS the
  // card). Multi-family synthesizes the picker from one source with
  // two lawful spellings: the semantic style enum (entries derived
  // at semanticModelKnob.ts from the boarded DECLs' own variant
  // rows — labels are the DECLs' copy, values resolve to routes
  // estate-side; a seat passes them when its DECLs are in scope)
  // or the bare boarded family-id enum where no derivation is
  // wired yet. The {model:} door still owns admission; this knob
  // is the UI's picker.
  if (boarded.length > 1) {
    if (semantic !== undefined && semantic.length > 0) {
      properties.model = {
        type: 'string',
        enum: semantic.map((e) => e.value),
        default: semantic[0].value,
        description:
          `The style to run — the request's top-level \`model\`. Options: ` +
          semantic.map((e) => `${e.label} (${e.value})`).join('; ') + '.',
      }
    } else {
      properties.model = {
        type: 'string',
        enum: [...boarded],
        default: boarded[0],
        description:
          `The boarded family to run — the request's top-level \`model\`. Options: ${boarded.join(', ')}.`,
      }
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
    const ex = extraOf(v as { meta?: Record<string, unknown> })
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
    // THE BAG KEY (friction-report #2, 2026-10-28): the agent plane
    // used to strip param_key, so an ordered card-declared kind
    // (h3-timeline replace) read as flat fields and the bench
    // grammar taught the flat spelling — which the compose door
    // refuses (unknown param). The bag key IS the contract: entries
    // ride as an array under params.<param_key> (max_stack 1 = one
    // entry, never flattened). Served verbatim, like the form-spec
    // face (discovery.ts specModifiers serves param_key already).
    param_key: k.param_key,
    ...(k.max_stack !== undefined ? { max_stack: k.max_stack } : {}),
    ...(k.category !== undefined ? { category: k.category } : {}),
    cardinality: k.cardinality,
    fields: (k.fields ?? []).map((f) => String(f['name'] ?? '')),
  }))
