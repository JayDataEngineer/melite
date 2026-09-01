// specContract — the frontend half of the NO SILENT DROPS contract.
//
// 2026-08-11 directive: "make declarative contracts in the Zustand and
// pydantic so it's impossible to fail this". The backend half is
// ModifierKind._no_silent_drops (catalog load) + the form-spec emission
// gate (wire boundary). This is the frontend half: every form-spec that
// lands in the store is validated HERE before it is allowed to drive any
// UI. A spec that fails the contract is a HARD VIOLATION — the store
// surfaces it, the UI renders it, and a declared modifier capability can
// never silently vanish into an empty dropdown again.
//
// The gates mirror the backend 1:1 (WEIGHTS_FILE_OPTION_KINDS on the
// server = lora/controlnet here; the emission gate refuses those kinds
// with zero options; the installed gate refuses a dropdown where every
// entry would be disabled).

export interface SpecViolation {
 /** "spec" = the whole spec is not a valid form-spec; otherwise the kind. */
 kind: string
 message: string
}

export interface SpecContractResult {
 valid: boolean
 violations: SpecViolation[]
}

/** Backend mirror: WEIGHTS_FILE_OPTION_KINDS (backend/core/catalog/schema.py:100).
 * A kind in this set populates its dropdown EXCLUSIVELY from its options —
 * zero options renders an empty select with zero signal. */
const WEIGHTS_FILE_OPTION_KINDS = new Set(["controlnet", "lora"])

const isObj = (v: unknown): v is Record<string, any> =>
 v != null && typeof v === "object" && !Array.isArray(v)

export function validateSpecContract(spec: unknown): SpecContractResult {
 const violations: SpecViolation[] = []

 // ── Shape gate — an error body can never masquerade as a spec ──────────
 // The 500-period class: the endpoint failed, the client parsed the error
 // body as the spec, `features` was absent, and the grid silently vanished
 // with zero signal (2026-08-11 "families-import form-spec 500 chain").
 if (!isObj(spec)) {
  return {
   valid: false,
   violations: [{
    kind: "spec",
    message: "Form-spec is not an object — this is an error body, not a contract.",
   }],
  }
 }
 if (!isObj(spec.features)) {
  violations.push({
   kind: "spec",
   message: "Form-spec has no `features` object — declared capabilities cannot be located.",
  })
 }
 const rawModifiers = (spec as Record<string, any>).features?.modifiers
 // Absent OR null = "no modifier capability" — contract-valid. The wire
 // model serializes the optional field as null (model_dump emits declared
 // fields; the generated type is `ModifierKindSpec[] | null`), so null is
 // NOT a violation. Anything else non-array is (an error body, a dict —
 // unreadable).
 if (rawModifiers === undefined || rawModifiers === null) {
  return { valid: violations.length === 0, violations }
 }
 if (!Array.isArray(rawModifiers)) {
  violations.push({
   kind: "spec",
   message: "`features.modifiers` is not an array — a declared capability would never render.",
  })
  return { valid: false, violations }
 }

 // ── Kind gate + options gate + installed gate ─────────────────────────
 for (const raw of rawModifiers) {
  if (!isObj(raw) || typeof raw.kind !== "string") {
   violations.push({ kind: "spec", message: "A modifiers entry is not a kind object." })
   continue
  }
  const kind = raw.kind
  const cardinality = raw.cardinality ?? "list"
  if (cardinality !== "list" && cardinality !== "scalar") {
   violations.push({
    kind,
    message: `Declared cardinality ${JSON.stringify(cardinality)} is not "list" or "scalar".`,
   })
  }
  if (typeof raw.param_key !== "string" || !raw.param_key) {
   violations.push({ kind, message: `Kind ${kind} declares no param_key — the wire entry has no home.` })
  }
  if (!Array.isArray(raw.fields)) {
   violations.push({ kind, message: `Kind ${kind} declares no fields — it cannot render.` })
  }

  // Weights-file kinds: the dropdown is populated EXCLUSIVELY from options.
  if (WEIGHTS_FILE_OPTION_KINDS.has(kind)) {
   const options = Array.isArray(raw.options) ? raw.options : []
   if (
    cardinality === "list" &&
    options.length === 0 &&
    !(raw.options_scanned === true && raw.upload_dir)
   ) {
    // Backend mirror: the emission gate raises instead of emitting this;
    // if it reaches the client anyway, the store refuses it. Zero options
    // is contract-valid ONLY when options_scanned === true (the enrichment
    // RAN and found nothing — honest) AND upload_dir gives the upload
    // path. The 2026-08-11 empty-lora-dropdown incident shipped the raw
    // YAML kind (options: [], upload_dir present, NO scan proof) and this
    // gate blessed it as valid — upload_dir alone lied.
    violations.push({
     kind,
     message: `Declared ${kind} kind carries ZERO options without scan proof (options_scanned=true) and an upload_dir — the dropdown would render empty (silent drop).`,
    })
   }
   if (options.length > 0) {
    const noValue = options.filter((o) => !isObj(o) || typeof o.value !== "string" || !o.value)
    if (noValue.length > 0) {
     violations.push({
      kind,
      message: `${kind} has ${noValue.length} option(s) without a "value" — unusable entries.`,
     })
    }
    const allUninstalled = options.every((o) => isObj(o) && o.installed === false)
    if (allUninstalled) {
     violations.push({
      kind,
      message: `Every declared ${kind} option is marked NOT installed — the dropdown would be all-disabled (silent dead end).`,
     })
    }
   }
  }
 }

 return { valid: violations.length === 0, violations }
}
