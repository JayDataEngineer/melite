// familyParamContract — THE params contract transmitted to the frontend.
//
// ONE system, ONE endpoint, ONE pattern. The gateway serves every
// family's param JSON Schema in ONE fetch:
//
//   GET /v1/flows/families/param-schemas → { family_id: jsonSchema, ... }
//
// The frontend loads this at boot (loadFamilySchemas, mirroring loadCatalog),
// caches it, and every run request validates against the family's schema
// BEFORE the fetch. Same envelope the backend wire gate serves — one
// source, zero drift. The frontend cannot lie about a param shape because
// it validates against the exact schema the backend serves.
//
// F-DEBT (2026-08-21): the COMPILE-time half of this contract (`familyParams.generated.ts` — 77 per-family interfaces generated from the Python family signatures via scripts/gen_family_param_types.py) is DELETED with the Python estate it was derived from: the generator died in the purge (2f1be2a7), the served family_schema.ts (server-js) died with it, the file's body was corrupted by a later hand-edit (6a96073a deleted 49 interface HEADS, leaving 74 orphan bodies — the exact 98 tsc parse errors), and the served param-schemas endpoint emits faithful EMPTY envelopes for untyped families because TS families take an untyped params dict — there is no per-param knowledge to generate from.
// Regenerating would have produced empty interfaces that made every `@ts-expect-error` directive in the type-test unused (tsc error TS2578 — proven), i.e. a vacuous gate.
// The RUNTIME validator below is the honest contract that remains.
//
// The 2026-08-14 directive: "WE NEED ONE SYSTEM THAT TRANSMITS TO THE
// FRONTEND, ONE WAY, ONE PATTERN." This module IS that one pattern.

import { apiJson } from "./api.ts"
import type { ModifierKindSpec } from "@melite/contracts"

// ── Types ───────────────────────────────────────────────────────────────

export interface ParamContractViolation {
  /** The param path, e.g. "motion_constraints" or "step#3.params.prompt". */
  path: string
  /** Human-readable reason, e.g. "expected string, got object". */
  message: string
}

type JsonSchemaType = "string" | "number" | "integer" | "boolean" | "array" | "object" | "null"

interface ParamFieldSchema {
  type?: JsonSchemaType
  default?: unknown
  enum?: unknown[]
}

export interface FamilyParamSchema {
  properties: Record<string, ParamFieldSchema>
  required?: string[]
  additionalProperties?: boolean
}

/** The bulk response: family_id → JSON Schema. */
export type FamilyParamSchemaIndex = Record<string, FamilyParamSchema>

// ── The ONE cache + the ONE loader (mirrors loadCatalog) ────────────────

let _cache: FamilyParamSchemaIndex | null = null
let _inflight: Promise<FamilyParamSchemaIndex> | null = null

/** Ingest gate (audit R-S7, 2026-10-22): a 200 body is a schema index
 *  only when every value carries a `properties` record — an error
 *  envelope or a proxy's JSON non-index must never reach _cache. This
 *  mirrors modelCatalog._ingest (validate before caching), which this
 *  loader mirrors in every other respect. */
function isValidSchemaIndex(data: unknown): data is FamilyParamSchemaIndex {
  if (typeof data !== "object" || data === null) return false
  for (const v of Object.values(data as Record<string, unknown>)) {
    if (typeof v !== "object" || v === null || typeof (v as Record<string, unknown>).properties !== "object"
      || (v as Record<string, unknown>).properties === null) {
      return false
    }
  }
  return true
}

/**
 * Load ALL family param schemas in ONE fetch. Mirrors loadCatalog: module-
 * level cache, inflight dedup, idempotent. Call at boot (alongside
 * loadCatalog) so the validator never blocks on a fetch.
 *
 * Returns the cached index on subsequent calls (no refetch). Use
 * { force: true } to bypass the cache.
 */
export async function loadFamilySchemas(
  opts?: { force?: boolean },
): Promise<FamilyParamSchemaIndex> {
  if (_cache && !opts?.force) return _cache
  if (_inflight) return _inflight
  _inflight = (async () => {
    try {
      const data: unknown = await apiJson<unknown>(
        "/v1/flows/families/param-schemas",
      )
      // R-S7: refuse to cache a 200 lie. A poisoned _cache made
      // isFamilySchemaCachePopulated() count ANY key (e.g. "error") as
      // populated — the phantom branch then threw "backend does not
      // know this family" for REAL families, and the honest defer
      // (cache failed → the backend decides) was unreachable exactly
      // when it was needed. An invalid body THROWS (the caller's catch
      // defers), and _cache stays null.
      if (!isValidSchemaIndex(data)) {
        throw new Error(
          `families/param-schemas returned a malformed body (audit R-S7) — not cached, deferring to the backend gate`,
        )
      }
      _cache = data
      return data
    } finally {
      _inflight = null
    }
  })()
  return _inflight
}

/** Sync lookup — returns the cached schema for a family, or null if the
 * cache isn't loaded yet or the family is unknown. Pure, no fetch. */
export function getFamilySchema(familyId: string): FamilyParamSchema | null {
  if (!_cache) return null
  return _cache[familyId] ?? null
}

/** Is the schema cache POPULATED (a successful bulk fetch with ≥1
 * family)? Distinguishes "transmission worked and the family is absent"
 * (a phantom family — throw) from the cache-cold/failed branch (defer). */
export function isFamilySchemaCachePopulated(): boolean {
  return !!_cache && Object.keys(_cache).length > 0
}

// ── WIRE_RELAXED keys — transport the gate must not false-positive ──────
/**
 * Params the click-time gate admits WITHOUT a family-signature
 * declaration. Every entry needs a LIVE consumer (mod-audit law,
 * 2026-09-05 — an unread key here is a hole: the gate waves it
 * through and the backend 400s it, the exact inversion of this
 * gate's purpose):
 *
 *  • CARD FIELDS ELSEWHERE (sampling_steps, guide_scale, num_frames,
 *    image1/2/3, input_image, …): real params on the lanes that
 *    declare them (their schemas admit them); waved here so the
 *    click gate doesn't second-guess cross-lane bodies. On lanes
 *    that DON'T declare them the backend forbid row voices LOUD —
 *    admission ≠ permission, the hard gate decides.
 *  • SLOT / TRANSPORT VOCABULARY (the flow spec's slot + upstream
 *    injector vocabulary): input slots (first_frame, last_frame,
 *    input_glb, source_glb, outfit_glb, hair_glb, motion_npz,
 *    prev_motion_artifact), modifier bags (loras,
 *    controlnets, modifiers), renderer weight filenames
 *    (model_name, t5_name, vae_name — read by the
 *    renderers), export flags, detect_mode (mask_studio field),
 *    reference_audio / reference_text / rigged_path / npz_path
 *    (slot + renderer reads), service (envelope chrome the gateway
 *    lift strips — CARD_ENVELOPE_KEYS), source + preset (card
 *    fields on their lanes; backend voices misuse field-named).
 *
 * CUT 2026-09-05 (zero backend presence — no card field, no reader
 * in python/ or the plugin tree, unwaved by any live sender):
 * pose_image_b64, vace_name, motion_bg_image, loras_selected (the
 * flow draft still carries loras_selected as transport, but NOTHING
 * reads it — a silent-drop fossil; the flow lane owns that
 * vocabulary, this generate-surface gate must not bless it).
 * (the old
 * provenance) is DEAD — no successor translates legacy spellings;
 * the "catalog_defaults_violations keeps drift out" claim was
 * fiction too (no such gate exists). This comment is the provenance
 * now; a key without a consumer cited above is cut on sight.
 */
const WIRE_RELAXED_KEYS: ReadonlySet<string> = new Set([
  // Real params on their declaring lanes (schemas admit where valid)
  "sampling_steps", "guide_scale", "num_frames", "end_image",
  "image1", "image2", "image3",
  // Slot / transport vocabulary (slot_kinds + flow injector + renderers)
  "input_image", "first_frame", "last_frame", "input_glb",
  "prev_motion_artifact",
  "source_glb", "outfit_glb", "hair_glb", "motion_npz",
  "loras", "controlnets", "modifiers",
  "service", "source", "preset",
  "reference_audio", "reference_text", "rigged_path", "npz_path",
  "export_glb", "export_fbx", "export_usd", "export_obj",
  "detect_mode",
  "model_name", "t5_name", "vae_name",
])

// ── The validator (pure, synchronous) ───────────────────────────────────

function jsonTypeOf(val: unknown): JsonSchemaType | null {
  /* v8 ignore next -- defensive: both callers (coerceParamsToSchema,
   * validateParamsAgainstSchema) route val === null through the defaulted
   * null path BEFORE calling, so null never reaches here (2026-09-12) */
  if (val === null) return "null"
  if (Array.isArray(val)) return "array"
  const t = typeof val
  if (t === "string") return "string"
  if (t === "boolean") return "boolean"
  if (t === "number") return Number.isInteger(val) ? "integer" : "number"
  return "object"
}

/**
 * Coerce a params dict to a family's schema types — the TYPED RUN BODY.
 * Canonical coercions ONLY (2026-09-05 compile-time incident: form state,
 * stale drafts and legacy editors carry strings for numbers/booleans and
 * "" for empty arrays — the class admits the canonical forms, so the
 * boundary normalizes them instead of refusing what the backend takes):
 *   - integer/number: numbers kept (integer rejects fractions); a trimmed
 *     canonical numeric string becomes Number; "" means UNSET (falls into
 *     the null path: default-or-omit — "" is NEVER 0); anything else is
 *     a violation (never NaN into the wire).
 *   - boolean: booleans kept; "true"/"false" become bool; else violation.
 *   - array: arrays kept; "" becomes [] (the unowned picker's empty
 *     serialization — the class coerces the same); a non-empty string is
 *     a violation (ambiguous — never a split-guess).
 *   - string/object: kept on exact type; anything else is a violation
 *     (never String()-collapse, never JSON.parse-guess).
 *   - null / UNSET-"": OMITTED when the field declares a default —
 *     absent rides the backend default (the class's own semantics:
 *     explicit null refuses on numerics, so the boundary must never
 *     POST a null the click gate waved through — 2026-09-06
 *     frontend-impossible incident). A null/UNSET with NO default is
 *     kept so the validator refuses it loudly. Untyped fields (the
 *     loras/mask tile bags) pass null through untouched — the class's
 *     own None-coercion owns them, and it runs on explicit values.
 *   - fields with NO declared type (the loras/mask tile bags {}): passed
 *     through untouched — the compose door owns them.
 * Returns the typed copy + violations against the TYPED values (empty =
 * the body is exactly what the class admits — the POST must send THIS
 * body, never the raw draft).
 */
export function coerceParamsToSchema(
  schema: FamilyParamSchema,
  params: Record<string, unknown>,
  opts: { pathPrefix?: string } = {},
): { params: Record<string, unknown>; violations: ParamContractViolation[] } {
  const out: ParamContractViolation[] = []
  const prefix = opts.pathPrefix ? `${opts.pathPrefix}.` : ""
  const typed: Record<string, unknown> = {}
  const props = schema.properties ?? {}
  for (const [key, val] of Object.entries(params)) {
    const field = props[key]
    if (!field || !field.type) {
      typed[key] = val
      continue
    }
    const expected = field.type
    if (val === null) {
      // Null with a default = "use the default": OMIT so the POST
      // carries absent (the class defaults it). POSTing the null
      // would 400 on every numeric row (explicit null refuses).
      if ("default" in field) continue
      typed[key] = val
      continue
    }
    const actual = jsonTypeOf(val)
    if (actual === expected) {
      typed[key] = val
      continue
    }
    if (expected === "number" && actual === "integer") {
      typed[key] = val
      continue
    }
    const coerced = coerceScalar(key, expected, val)
    if ("value" in coerced) {
      typed[key] = coerced.value
      continue
    }
    if (coerced.unset) {
      // "" is UNSET: omit when defaulted (absent rides the default),
      // keep-as-null when not (the validator refuses it loudly).
      if (field && "default" in field) continue
      typed[key] = null
      continue
    }
    out.push({
      path: `${prefix}${key}`,
      message: `'${key}': expected ${expected}, got ${actual}`,
    })
    typed[key] = val
  }
  return { params: typed, violations: out }
}

/** Canonical scalar coercion. ok = coerced value; unset = "" for a
 * non-string field (the value is UNSET — the caller routes it into the
 * null path); neither = refuse loudly. */
function coerceScalar(
  _key: string,
  expected: JsonSchemaType,
  val: unknown,
): { ok: true; value: unknown } | { ok: false; unset: boolean } {
  if (typeof val === "string") {
    const t = val.trim()
    if (t === "") {
      // "" is UNSET for every non-string field — never 0, never false.
      // ("" for an array IS the picker's empty → [], handled above.)
      if (expected === "array") return { ok: true, value: [] }
      // NOTE: no `expected === "string"` arm — provably dead (2026-09-12):
      // coerceScalar is only reached when actual !== expected, and a ""
      // string's actual IS "string", so a string field exact-matches before
      // this runs. "" for a string is the value itself, never UNSET.
      return { ok: false, unset: true }
    }
    if (expected === "integer" || expected === "number") {
      const n = Number(t)
      if (!Number.isFinite(n)) return { ok: false, unset: false }
      if (expected === "integer" && !Number.isInteger(n)) {
        return { ok: false, unset: false }
      }
      return { ok: true, value: n }
    }
    if (expected === "boolean") {
      if (t === "true") return { ok: true, value: true }
      if (t === "false") return { ok: true, value: false }
      return { ok: false, unset: false }
    }
    return { ok: false, unset: false }
  }
  return { ok: false, unset: false }
}

/**
 * Validate a params dict against a family's param schema. Pure + synchronous.
 * Returns violations (empty = clean). A null for a field WITH a default is
 * treated as "use the default" (no violation) — coerce strips such nulls
 * to absent before this runs, and absent rides the backend default; the
 * tolerance here is defense-in-depth for direct callers (the boundary
 * must NEVER POST a null the class would refuse — explicit null 400s
 * on every numeric row, so coerce omits, it never forwards). A null for
 * a field WITHOUT a default IS a violation.
 *
 * WHAT IT CATCHES (the motion_constraints bug class):
 *   - TYPE mismatches: a str param sent an object/number/array.
 *   - EXTRA fields: unknown param names (additionalProperties: false).
 *   - null for NON-defaulted fields.
 *
 * WHAT IT LEAVES TO THE BACKEND (no false positives):
 *   - REQUIRED-field presence — the frontend doesn't know which keys are
 *     injected from flow.shared via the consumes axis (comfy_url, model).
 *     The backend's card phase-1 compose knows the consumes set, so it
 *     knows. The frontend defers required-checking to the hard wire gate.
 */
export function validateParamsAgainstSchema(
  schema: FamilyParamSchema,
  params: Record<string, unknown>,
  opts: { pathPrefix?: string } = {},
): ParamContractViolation[] {
  const out: ParamContractViolation[] = []
  const prefix = opts.pathPrefix ? `${opts.pathPrefix}.` : ""
  const props = schema.properties ?? {}

  // EMPTY-ENVELOPE DEFERRAL (unknown-family backstop): the backend
  // derives each boarded family's properties from its card's schema
  // row (2026-09-05 image-edit incident — the derivation that makes
  // this gate real; before it EVERY envelope was empty and the gate
  // deferred always). An envelope that STILL declares nothing means
  // an unboarded family — no param knowledge to validate against, so
  // the unknown-key/type checks defer to the backend HARD wire gate
  // rather than false-positive every key. (History: untyped family params made the served endpoint serve EMPTY envelopes with additionalProperties:false, and the gate THREW on every clean payload — proven by a canonical z-image draw's 6 phantom violations.
  // A schema that declares NOTHING transmits no param knowledge; validating against it means validating against nothing.)
  // The unknown-key/type checks run only when the family actually declared a properties map; the modifier-entry gate (real catalog knowledge) and the backend wire gate still run either way.
  if (Object.keys(props).length === 0) return out

  for (const [key, val] of Object.entries(params)) {
    const field = props[key]
    if (!field) {
      if (schema.additionalProperties === false && !WIRE_RELAXED_KEYS.has(key)) {
        out.push({
          path: `${prefix}${key}`,
          message: `unknown parameter '${key}' — not in the family signature`,
        })
      }
      continue
    }
    if (val === null) {
      if (!("default" in field)) {
        out.push({
          path: `${prefix}${key}`,
          message: `'${key}' is null but has no default — provide a value`,
        })
      }
      continue
    }
    const expected = field.type
    if (!expected) continue
    const actual = jsonTypeOf(val)
    if (actual === expected) continue
    if (expected === "number" && actual === "integer") continue
    out.push({
      path: `${prefix}${key}`,
      message: `'${key}': expected ${expected}, got ${actual}`,
    })
  }
  return out
}

// ── The modifier-entry gate (Phase B2, 2026-08-14) ──────────────────────
// A mod-capable family's signature only says ``loras: list[dict] | None`` — the ENTRY structure is untyped at the wire.
// The catalog's declared ``modifiers:`` kinds (ModifierKind — param_key / cardinality / fields / options) ARE the entry contract: the editor renders from them, the appliers consume them.
// This matches the validateModifierEntries gate below so a bad entry fails before the fetch, not at ComfyUI sample time.
// The declared-CN type gate stays backend-side (it resolves the model's CN declarations); the generic kind-options membership is skipped for controlnet kinds so the same bug isn't double-flagged.

/** Entry keys the bespoke tile editors add beyond the declared fields
 * (newControlnetEntry / newGenericEntry in modifierSubcards.ts) — wire-
 * legitimate bookkeeping, not typos. */
const EDITOR_MOD_ENTRY_KEYS = new Set([
  "id",
  "value",
  "model",
  "preprocessor",
  "enabled",
  "source",
])

/**
 * Validate a stage's modifier entries against the family's declared kinds.
 * validateModifierEntries (this file) is the owner: per declared kind with a
 * param_key, params[param_key] must honor the cardinality (list kinds take
 * a list of entry dicts bounded by max_stack; scalar kinds take ONE value),
 * and each entry's keys/required/type/bounds/select-membership must match
 * the declared fields. Empty = clean; never throws. No kinds → no-op.
 */
export function validateModifierEntries(
  kinds: ModifierKindSpec[] | null | undefined,
  params: Record<string, unknown>,
): ParamContractViolation[] {
  const out: ParamContractViolation[] = []
  if (!kinds) return out
  for (const kind of kinds) {
    const key = kind.param_key
    const value = params[key]
    if (value === undefined || value === null) continue // no mods — legal
    const fields = kind.fields ?? []
    const cardinality = kind.cardinality ?? "list"
    if (cardinality === "scalar") {
      if (typeof value === "object") {
        out.push({
          path: key,
          message: `expected a single scalar value for '${kind.kind}' ` +
            `(cardinality='scalar'), got ${Array.isArray(value) ? "array" : "object"}`,
        })
        continue
      }
      if (fields.length > 0 && fields[0].name) {
        checkModEntry(
          out, { [fields[0].name]: value }, fields, kind, key,
          kind.kind === "controlnet",
        )
      }
      continue
    }
    // cardinality == "list"
    if (!Array.isArray(value)) {
      out.push({
        path: key,
        message: `expected a list of entries for '${kind.kind}' ` +
          `(cardinality='list'), got ${typeof value}`,
      })
      continue
    }
    if (typeof kind.max_stack === "number" && value.length > kind.max_stack) {
      out.push({
        path: key,
        message: `stack of ${value.length} exceeds the declared max_stack ` +
          `(${kind.max_stack}) for '${kind.kind}'`,
      })
    }
    // Controlnet kinds resolve their type vocabulary through the model-
    // declared gate (backend validate_step_controlnets) — skip the generic
    // kind-options membership to avoid double-flagging the same bug.
    const cnKind = kind.kind === "controlnet"
    for (let i = 0; i < value.length; i++) {
      const entry = value[i]
      const entryPath = `${key}[${i}]`
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
        out.push({
          path: entryPath,
          message: `expected a dict entry, got ` +
            `${Array.isArray(entry) ? "array" : typeof entry}`,
        })
        continue
      }
      checkModEntry(
        out, entry as Record<string, unknown>, fields, kind, entryPath, cnKind,
      )
    }
  }
  return out
}

function checkModEntry(
  out: ParamContractViolation[],
  entry: Record<string, unknown>,
  fields: ModifierKindSpec["fields"],
  kind: ModifierKindSpec,
  path: string,
  cnKind: boolean,
): void {
  const declared = new Map<string, ModifierKindSpec["fields"][number]>()
  for (const f of fields) if (f.name) declared.set(f.name, f)
  const allowed = new Set([...declared.keys(), ...EDITOR_MOD_ENTRY_KEYS])
  for (const entryKey of Object.keys(entry)) {
    if (!allowed.has(entryKey)) {
      out.push({
        path: `${path}.${entryKey}`,
        message: `unknown field '${entryKey}'. Declared fields: ` +
          `${[...declared.keys()].sort().join(", ")}.`,
      })
    }
  }
  const kindOptions = (kind.options ?? [])
    .map((o) => o?.value)
    .filter((v): v is string => typeof v === "string")
  const hasUploadDir = Boolean(kind.upload_dir)
  for (const f of fields) {
    const name = f.name
    const val = entry[name]
    const present = name in entry && val !== null && val !== undefined
    if (!present) {
      if (f.default === undefined && f.type !== "image" && name !== "artifact") {
        out.push({
          path: `${path}.${name}`,
          message: `missing required field '${name}'.`,
        })
      }
      continue
    }
    if (f.type === "integer" || f.type === "float") {
      if (typeof val !== "number") {
        out.push({
          path: `${path}.${name}`,
          message: `expected a number, got ${typeof val}.`,
        })
        continue
      }
      if (f.type === "integer" && !Number.isInteger(val)) {
        out.push({
          path: `${path}.${name}`,
          message: `expected an integer, got ${typeof val}.`,
        })
        continue
      }
      if (typeof f.min === "number" && val < f.min) {
        out.push({
          path: `${path}.${name}`,
          message: `value ${val} below the declared minimum ${f.min}.`,
        })
      }
      if (typeof f.max === "number" && val > f.max) {
        out.push({
          path: `${path}.${name}`,
          message: `value ${val} above the declared maximum ${f.max}.`,
        })
      }
    } else if (f.type === "boolean") {
      if (typeof val !== "boolean") {
        out.push({
          path: `${path}.${name}`,
          message: `expected a boolean, got ${typeof val}.`,
        })
      }
    } else if (f.type === "string") {
      if (typeof val !== "string") {
        out.push({
          path: `${path}.${name}`,
          message: `expected a string, got ${typeof val}.`,
        })
      } else if (
        name === "id" &&
        kindOptions.length > 0 &&
        !hasUploadDir &&
        !cnKind
      ) {
        // Weights-file adapter membership: the applier resolves the
        // entry's ``id`` through the kind's curated options; an
        // undeclared adapter resolves to a nonexistent file and dies
        // mid-run. Upload_dir kinds are disk-driven (any name legal).
        if (!kindOptions.includes(val)) {
          out.push({
            path: `${path}.${name}`,
            message: `unknown adapter '${val}'. Declared: ` +
              `${[...kindOptions].sort().join(", ")}.`,
          })
        }
      }
    } else if (f.type === "select") {
      if (typeof val !== "string") {
        out.push({
          path: `${path}.${name}`,
          message: `expected a string, got ${typeof val}.`,
        })
        continue
      }
      if (f.options && f.options.length > 0) {
        if (!f.options.includes(val)) {
          out.push({
            path: `${path}.${name}`,
            message: `unknown option '${val}'. Allowed: ` +
              `${[...f.options].sort().join(", ")}.`,
          })
        }
      } else if (kindOptions.length > 0 && !hasUploadDir && !cnKind) {
        if (!kindOptions.includes(val)) {
          out.push({
            path: `${path}.${name}`,
            message: `unknown option '${val}'. Declared: ` +
              `${[...kindOptions].sort().join(", ")}.`,
          })
        }
      }
    }
    // image fields: presence is enough (conditioning carries no wire rules)
  }
}

// ── The pre-submit gate ─────────────────────────────────────────────────

/**
 * Pre-submit gate: resolve model → family → schema (from the ONE cache),
 * validate params, throw on any violation. Called before EVERY GPU-starting
 * fetch so the crash comes before the button press, not after a round-trip.
 *
 * Ensures the schema cache is loaded (loadFamilySchemas) on the first call,
 * then validates synchronously.
 *
 * NO SILENT DEFERS (2026-08-16): the old gate no-op'd when the model was
 * missing from the catalog or the family had no schema — silently
 * shipping UNKNOWN params to the backend and calling that "the backend's
 * backstop". That is the silent-drop class this contract exists to kill:
 *   - catalog LOADED + model missing → THROW. The picker is showing a
 *     model that DOES NOT EXIST (the original operator complaint) — the
 *     catalog is the source of truth and the model is not in it.
 *   - family resolved + no schema → THROW. The schema transmission is
 *     broken (bulk fetch dropped it); deferring would validate against
 *     NOTHING. (The workflow:* exemption died with the workflow lane —
 *     §12.2; a workflow is a plugin card with a REAL signature now.)
 * The ONE honest defer left: the catalog cache is still cold at boot
 * (nothing fetched yet — cannot resolve anything, backend gate decides).
 */
export async function assertParamsMatchFamilySchema(
  model: string,
  params: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  // Resolve model → family via the cached catalog. The catalog loads at
  // boot (main.tsx, before the app renders) — if the cache is still cold
  // here, DEFER to the backend's HARD wire gate instead of fetching from
  // inside the run protocol: a mid-protocol fetch adds a round-trip to
  // every generate and consumes wire mocks (the run-protocol tests stub
  // fetch narrowly for error surfacing).
  let family: string | undefined
  let modifiers: ModifierKindSpec[] | null | undefined
  let cat: Awaited<ReturnType<typeof import("@melite/catalog").getCachedCatalog>> | undefined
  try {
    const { getCachedCatalog } = await import("@melite/catalog")
    cat = getCachedCatalog()
    family = cat?.models?.[model]?.family
    modifiers = cat?.families?.[family ?? ""]?.modifiers
  } catch {
    return params // catalog cache cold at boot — nothing to resolve against yet
  }
  if (!cat) return params // cache not populated — backend gate decides
  if (!family) {
    throw new Error(
      `Parameter validation failed — model '${model}' is not in the ` +
      `catalog. The picker showed a model that DOES NOT EXIST; the ` +
      `catalog is the source of truth and this key is not in it. ` +
      `(The backend wire gate would 400 the same request.)`,
    )
  }

  // Ensure the ONE schema cache is loaded, then look up synchronously.
  // A failed fetch (offline, narrow test mock) defers — the cache is
  // genuinely unavailable, not silently skipped: the backend gate owns
  // the run.
  try {
    await loadFamilySchemas()
  } catch {
    return params
  }
  const schema = getFamilySchema(family)
  if (!schema) {
    if (isFamilySchemaCachePopulated()) {
      // The bulk fetch SUCCEEDED and this family is not in it — the
      // backend does not know this family. A phantom.
      throw new Error(
        `Parameter validation failed — family '${family}' (model ` +
        `'${model}') has no param schema in the populated cache — the ` +
        `backend does not know this family. Refusing to validate ` +
        `against nothing.`,
      )
    }
    return params // cache cold/failed — defer to the backend wire gate
  }

  // THE TYPED RUN BODY (2026-09-05 compile-time incident): coerce FIRST
  // against the class-derived envelope (canonical forms only), then
  // validate the TYPED values — the mirror must never refuse what the
  // class admits. The caller POSTs the returned body, never the raw
  // draft — a gate that passes but sends the untyped original is
  // false confidence (the backend 400s what the click approved).
  // (2026-09-06: coerce OMITS null/UNSET-"" for defaulted fields, so a
  // body that passed the click can never carry a null the class's
  // explicit-null refusal would 400 at compile.)
  const coerced = coerceParamsToSchema(schema, params)
  const violations = [...coerced.violations]
  violations.push(...validateParamsAgainstSchema(schema, coerced.params))
  // Modifier entries are untyped in the family signature (``list[dict]``);
  // the catalog's declared ``modifiers:`` kinds are their contract — the
  // validator this contract owns (validateModifierEntries).
  // Entries validate against the RAW draft bags (coercion passes untyped
  // fields through untouched — same objects either way).
  violations.push(...validateModifierEntries(modifiers, params))
  if (violations.length > 0) {
    const lines = violations.map((v) => `  - ${v.path}: ${v.message}`).join("\n")
    throw new Error(
      `Parameter validation failed — the params do not match the ` +
        `'${family}' family signature. Fix before running:\n${lines}\n\n` +
        `(The backend's wire gate would reject this same request with 400.)`,
    )
  }
  return coerced.params
}
