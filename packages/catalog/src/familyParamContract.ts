// familyParamContract — THE params contract transmitted to the frontend.
//
// ONE system, ONE endpoint, ONE pattern. The gateway serves every
// family's param JSON Schema in ONE fetch:
//
//   GET /v1/pipelines/families/param-schemas → { family_id: jsonSchema, ... }
//
// The frontend loads this at boot (loadFamilySchemas, mirroring loadCatalog),
// caches it, and every run request validates against the family's schema
// BEFORE the fetch. Same envelope the backend wire gate serves — one
// source, zero drift. The frontend cannot lie about a param shape because
// it validates against the exact schema the backend serves.
//
// F-DEBT (2026-08-21): the COMPILE-time half of this contract
// (`familyParams.generated.ts` — 77 per-family interfaces generated from
// the Python family signatures via scripts/gen_family_param_types.py) is
// DELETED with the Python estate it was derived from: the generator died
// in the purge (2f1be2a7), the file's body was corrupted by a later
// hand-edit (6a96073a deleted 49 interface HEADS, leaving 74 orphan
// bodies — the exact 98 tsc parse errors), and the live TS derivation
// source (server-js family_schema.ts) emits faithful EMPTY envelopes
// because TS families take an untyped params dict — there is no
// per-param knowledge to generate from. Regenerating would have produced
// empty interfaces that made every `@ts-expect-error` directive in the
// type-test unused (tsc error TS2578 — proven), i.e. a vacuous gate.
// The RUNTIME validator below is the honest contract that remains.
//
// The 2026-08-14 directive: "WE NEED ONE SYSTEM THAT TRANSMITS TO THE
// FRONTEND, ONE WAY, ONE PATTERN." This module IS that one pattern.

import { apiJson } from "./api"
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
      const data = await apiJson<FamilyParamSchemaIndex>(
        "/v1/pipelines/families/param-schemas",
      )
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

// ── WIRE_RELAXED keys — pre-sweep saved cards + wire-level fields ────────
/**
 * Params the backend ACCEPTS on the wire even though the family signature
 * doesn't declare them — the local gate must not false-positive them:
 *
 *  • ALIAS KEYS (2026-08-14 param-vocabulary sweep): the compile path
 *    translates sampling_steps→steps, guide_scale→cfg, num_frames→frames
 *    (compile.py _PARAM_TRANSLATIONS) — a card SAVED before the sweep
 *    carries the old spellings and runs fine (the backend translates);
 *    rejecting it locally would block a card the wire accepts.
 *  • WIRE-LEVEL FIELDS (compile.py _KNOWN_NON_SIG_PARAMS — the Python
 *    mirror): input slots (image1/2/3, end_image…), modifier bags,
 *    builder weight filenames (model_name/t5_name/vae_name/vace_name),
 *    the loras_selected variant switch, export flags, envelope keys.
 *
 * Genuinely unknown keys still throw — this is a bounded, enumerated set
 * kept in lockstep with the backend (compile.py's two tables are the
 * source of truth; the catalog defaults gate
 * (backend catalog_defaults_violations) keeps NEW drift out at CI time).
 */
const WIRE_RELAXED_KEYS: ReadonlySet<string> = new Set([
  // _PARAM_TRANSLATIONS — legacy spellings the compile path translates
  "sampling_steps", "guide_scale", "num_frames", "end_image",
  "image1", "image2", "image3",
  // _KNOWN_NON_SIG_PARAMS mirror (input slots / wire fields)
  "input_image", "first_frame", "last_frame", "input_glb",
  "prev_motion_artifact", "motion_bg_image", "lanpaint_mask",
  "source_glb", "outfit_glb", "hair_glb", "motion_npz",
  "loras", "controlnets", "modifiers",
  "service", "source", "preset",
  "reference_audio", "reference_text", "rigged_path", "npz_path",
  "pose_image_b64",
  "export_glb", "export_fbx", "export_usd", "export_obj",
  "detect_mode",
  "model_name", "t5_name", "vae_name", "vace_name",
  "loras_selected",
])

// ── The validator (pure, synchronous) ───────────────────────────────────

function jsonTypeOf(val: unknown): JsonSchemaType | null {
  if (val === null) return "null"
  if (Array.isArray(val)) return "array"
  const t = typeof val
  if (t === "string") return "string"
  if (t === "boolean") return "boolean"
  if (t === "number") return Number.isInteger(val) ? "integer" : "number"
  return "object"
}

/**
 * Validate a params dict against a family's param schema. Pure + synchronous.
 * Returns violations (empty = clean). A null for a field WITH a default is
 * treated as "use the default" (no violation) — mirrors the backend's
 * None→default coercion. A null for a field WITHOUT a default IS a violation.
 *
 * WHAT IT CATCHES (the motion_constraints bug class):
 *   - TYPE mismatches: a str param sent an object/number/array.
 *   - EXTRA fields: unknown param names (additionalProperties: false).
 *   - null for NON-defaulted fields.
 *
 * WHAT IT LEAVES TO THE BACKEND (no false positives):
 *   - REQUIRED-field presence — the frontend doesn't know which keys are
 *     injected from pipeline.shared via the consumes axis (comfy_url, model).
 *     The backend's validate_pipeline_doc_params passes consumes=tuple(
 *     shared.keys()), so it knows. The frontend defers required-checking to
 *     the hard wire gate.
 */
export function validateParamsAgainstSchema(
  schema: FamilyParamSchema,
  params: Record<string, unknown>,
  opts: { pathPrefix?: string } = {},
): ParamContractViolation[] {
  const out: ParamContractViolation[] = []
  const prefix = opts.pathPrefix ? `${opts.pathPrefix}.` : ""
  const props = schema.properties ?? {}

  // EMPTY-ENVELOPE DEFERRAL (F-DEBT 2026-08-21, a LIVE bug): the TS
  // families take an untyped params dict, so the gateway's derivation
  // (server-js family_schema.ts) serves faithful envelopes with EMPTY
  // `properties` + additionalProperties:false. Against that envelope
  // EVERY key — prompt, steps, cfg — flagged as "unknown parameter" and
  // the gate THREW on every clean payload (proven: a canonical
  // {prompt,steps,cfg,width,height,seed} z-image draw produced 6 phantom
  // violations). A schema that declares NOTHING transmits no param
  // knowledge; validating against it means validating against nothing.
  // The unknown-key/type checks run only when the family actually
  // declared a properties map; the modifier-entry gate (real catalog
  // knowledge) and the backend wire gate still run either way.
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
// A mod-capable family's signature only says ``loras: list[dict] | None`` —
// the ENTRY structure is untyped at the wire. The catalog's declared
// ``modifiers:`` kinds (ModifierKind — param_key / cardinality / fields /
// options) ARE the entry contract: the editor renders from them, the
// appliers consume them. This mirrors the backend's validate_modifier_entries
// (family_schema.py) so a bad entry fails before the fetch, not at ComfyUI
// sample time. The declared-CN type gate stays backend-side (it resolves the
// model's CN declarations); the generic kind-options membership is skipped
// for controlnet kinds so the same bug isn't double-flagged.

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
 * Mirrors backend validate_modifier_entries: per declared kind with a
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
        name === "name" &&
        kindOptions.length > 0 &&
        !hasUploadDir &&
        !cnKind
      ) {
        // Weights-file adapter membership: the applier resolves the
        // entry's ``name`` through the kind's curated options; an
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
): Promise<void> {
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
    return // catalog cache cold at boot — nothing to resolve against yet
  }
  if (!cat) return // cache not populated — backend gate decides
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
    return
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
    return // cache cold/failed — defer to the backend wire gate
  }

  const violations = validateParamsAgainstSchema(schema, params)
  // Modifier entries are untyped in the family signature (``list[dict]``);
  // the catalog's declared ``modifiers:`` kinds are their contract — same
  // validator the backend's wire gate runs (validate_modifier_entries).
  violations.push(...validateModifierEntries(modifiers, params))
  if (violations.length > 0) {
    const lines = violations.map((v) => `  - ${v.path}: ${v.message}`).join("\n")
    throw new Error(
      `Parameter validation failed — the params do not match the ` +
        `'${family}' family signature. Fix before running:\n${lines}\n\n` +
        `(The backend's wire gate would reject this same request with 400.)`,
    )
  }
}
