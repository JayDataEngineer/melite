/**
 * Unified form descriptor — fetched from /v1/form-spec?model=...
 *
 * The backend builds this from the model catalog, service tags, flow
 * catalog, and field options. The frontend renders it directly — no
 * model-specific branches, no hardcoded model lists.
 *
 * Adding a model is a YAML edit on the server; the form adapts here
 * without any code changes.
 */

/** One select option — a display ``label`` distinct from the wire ``value``.
 *
 *  The backend's SelectOption (media/comfyui/schema.py) serializes to this
 *  shape; plain strings (value == label) are also valid. SchemaField renders
 *  the label and sends the value; the enhance detail modes (Face / Hands /
 *  Body) and any future labeled select rely on this. Generated from the
 *  backend's FormFieldOption (components["schemas"]["FormFieldOption"]). */
export type FieldOption = components["schemas"]["FormFieldOption"]

/** Select options are EITHER plain strings (legacy / value == label) OR
 *  {value, label} objects. Render via optionValue/optionLabel helpers. */
export type SelectOptions = Array<string | FieldOption>

export const optionValue = (opt: string | FieldOption): string =>
  typeof opt === "string" ? opt : opt.value

export const optionLabel = (opt: string | FieldOption): string =>
  typeof opt === "string" ? opt : opt.label
// ─── Wire types — GENERATED from /openapi.json (2026-08-11 directive) ────
//
// openapi-typescript migration: the backend's pydantic models are the
// single source of truth for the wire. `api:sync` regenerates
// src/api/schema.d.ts from the gateway's /openapi.json; every type below
// is a re-export of components["schemas"], NOT a hand-written mirror. The
// runtime contract (validateSpecContract in lib/specContract) still guards
// what RENDERS; these types guard what COMPILES.

import type { components } from "./schema"

/** A single form field definition (the flat fields list — see the
 *  generated FormField for the full doc). */
export type FormField = components["schemas"]["FormField"]

/** Optional features declared per-model — modifiers / variants /
 *  variant_groups / retake, generated from the backend's FormFeatures. */
export type FormFeatures = components["schemas"]["FormFeatures"]

/** Prompt guide sections from the family metadata. */
export type FormGuide = components["schemas"]["FormGuide"]

/** The complete form descriptor — /v1/form-spec's 200 body. */
export type FormSpec = components["schemas"]["FormSpec"]

// ─── Builder schema types (structured groups for SchemaForm) ─────────────

/** The type vocabulary of a builder-schema field. */
export type SchemaFieldType = components["schemas"]["SchemaFieldDef"]["type"]

/** A builder-schema field (constraints, visible_when, layout hints). */
export type SchemaFieldDef = components["schemas"]["SchemaFieldDef"]

/** Widget discriminators — the special-purpose slot renderers. */
export type WidgetType = NonNullable<
  components["schemas"]["SchemaFieldDef"]["widget"]
>

/** A structured group for SchemaForm rendering. */
export type SchemaGroupDef = components["schemas"]["SchemaGroupDef"]

// ─── Conditional CONTRACT (per-mode param rules) ─────────────────────────

/** One set of field rules applying under a discriminator value. */
export type ContractClause = components["schemas"]["ContractClause"]

/** The full per-mode contract table. */
export type ConditionalContract = components["schemas"]["ConditionalContract"]

/** A single contract violation for UI display. */
export type ContractViolation = components["schemas"]["ContractViolation"]

// ─── visible_when expression evaluator ───────────────────────────────────
//
// Grammar (lowest → highest precedence):
//   or_expr   := and_expr ( "||" and_expr )*
//   and_expr  := atom ( "&&" atom )*
//   atom      := FIELD "==" VALUE
//              | FIELD "!=" VALUE
//              | FIELD ">=" VALUE
//              | FIELD "<=" VALUE
//              | FIELD ">" VALUE
//              | FIELD "<" VALUE
//              | FIELD                  (truthy)
// VALUE := "null" | "true" | "false" | NUMBER | QUOTED-STRING
//
// Unknown atoms default to visible (true) — never silently hide a field
// because of a typo in the expression. Compound `&&` short-circuits on the
// first false atom; `||` short-circuits on the first true atom.

/** Split `expr` on `op` at the top level (not inside quotes). Returns the
 *  trimmed parts; length 1 means the operator was not present. */
function splitOnOperator(expr: string, op: string): string[] {
  const parts: string[] = []
  let depth = 0
  let inStr: string | null = null
  let start = 0
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i]
    if (inStr) {
      if (ch === inStr && expr[i - 1] !== "\\") inStr = null
      continue
    }
    if (ch === '"' || ch === "'") { inStr = ch; continue }
    if (ch === "(") { depth++; continue }
    if (ch === ")") { depth--; continue }
    if (depth === 0 && expr.startsWith(op, i)) {
      parts.push(expr.slice(start, i).trim())
      start = i + op.length
    }
  }
  parts.push(expr.slice(start).trim())
  return parts
}

function evalAtom(trimmed: string, values: Record<string, unknown>): boolean {
  const gteMatch = trimmed.match(/^(\w+)\s*>=\s*(.+)$/)
  if (gteMatch) return Number(values[gteMatch[1]]) >= Number(gteMatch[2].trim())

  const lteMatch = trimmed.match(/^(\w+)\s*<=\s*(.+)$/)
  if (lteMatch) return Number(values[lteMatch[1]]) <= Number(lteMatch[2].trim())

  const eqMatch = trimmed.match(/^(\w+)\s*==\s*(.+)$/)
  if (eqMatch) {
    const [, field, rawVal] = eqMatch
    const expected = parseValue(rawVal.trim())
    const actual = values[field]
    // null ≡ undefined: a field not in the form data (family-filtered out,
    // never seeded) is semantically absent. Without this, `field == null`
    // returns false when the field is undefined, breaking cross-family
    // visible_when expressions like `audio_mode == 'lipSync' || audio_mode == null`
    // where audio_mode is family-filtered on non-LTX families.
    if (expected === null) return actual == null
    return actual === expected
  }

  const neqMatch = trimmed.match(/^(\w+)\s*!=\s*(.+)$/)
  if (neqMatch) {
    const [, field, rawVal] = neqMatch
    const expected = parseValue(rawVal.trim())
    const actual = values[field]
    if (expected === null) return actual != null
    return actual !== expected
  }

  const gtMatch = trimmed.match(/^(\w+)\s*>\s*(.+)$/)
  if (gtMatch) return Number(values[gtMatch[1]]) > Number(gtMatch[2].trim())

  const ltMatch = trimmed.match(/^(\w+)\s*<\s*(.+)$/)
  if (ltMatch) return Number(values[ltMatch[1]]) < Number(ltMatch[2].trim())

  if (/^\w+$/.test(trimmed)) return !!values[trimmed]
  return true
}

export function evalVisibleWhen(
  expr: string | null | undefined,
  values: Record<string, unknown>,
): boolean {
  if (!expr) return true
  let trimmed = expr.trim()
  if (!trimmed) return true

  // Strip outer parentheses: "(expr)" → "expr". Only strips when the
  // first '(' matches the LAST ')' — i.e. the parens wrap the entire
  // expression. This is essential for grouping OR-clauses inside an AND:
  //   a != null && (b == 'x' || b == null)
  // Without stripping, "(b == 'x' || b == null)" would be passed to
  // evalAtom and fall through to "default visible" (true).
  while (trimmed.startsWith("(") && trimmed.endsWith(")")) {
    let depth = 0
    let wraps = true
    for (let i = 0; i < trimmed.length; i++) {
      const ch = trimmed[i]
      if (ch === "(") depth++
      else if (ch === ")") {
        depth--
        // depth hits 0 before the last char → outer parens don't wrap
        if (depth === 0 && i < trimmed.length - 1) { wraps = false; break }
      }
    }
    if (wraps && depth === 0) trimmed = trimmed.slice(1, -1).trim()
    else break
  }

  // OR — lowest precedence
  const orParts = splitOnOperator(trimmed, "||")
  if (orParts.length > 1) {
    return orParts.some((p) => evalVisibleWhen(p, values))
  }

  // AND — higher precedence
  const andParts = splitOnOperator(trimmed, "&&")
  if (andParts.length > 1) {
    return andParts.every((p) => evalVisibleWhen(p, values))
  }

  return evalAtom(trimmed, values)
}

// ─── Contract evaluation (mirror of family_schema.run_contract) ──────────
//
// These helpers let the card UI evaluate the serialized CONTRACT against the
// current form values — the same logic the backend runs at parse time
// (validate_step_params → run_contract), so the UI and the 400 stay aligned.
// A mismatch between these and run_contract would mean the card shows green
// but the POST still 400s — the contract tests lock them together.

/** True if `value` counts as "set" — mirrors backend `_is_present`.
 *  None, empty string, whitespace-only, and empty containers are absent.
 *  Numeric 0 and boolean false are PRESENT (a real value, not "unset"). */
export function isPresent(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === "string") return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "object") return Object.keys(value as object).length > 0
  return true // numbers (incl. 0), booleans (incl. false)
}

/** The clause active under the discriminator's current value, or undefined
 *  when no clause applies (the discriminator is unset or maps to a mode
 *  with no clause and no default_clause). */
export function activeClause(
  contract: ConditionalContract,
  values: Record<string, unknown>,
): ContractClause | undefined {
  const mode = values[contract.discriminator]
  const key = typeof mode === "string" ? mode : String(mode ?? "")
  return contract.clauses[key] ?? contract.default_clause ?? undefined
}

/** The SUB-contract active under the parent discriminator's current value
 *  ("sub modes further down the line", 2026-08-08), or undefined when the
 *  parent value owns no child — e.g. mode=inpaint owns an inpaint_region
 *  child; mode=upscale owns none. */
export function activeChild(
  contract: ConditionalContract,
  values: Record<string, unknown>,
): ConditionalContract | undefined {
  if (!contract.children) return undefined
  const mode = values[contract.discriminator]
  const key = typeof mode === "string" ? mode : String(mode ?? "")
  return contract.children[key] ?? undefined
}

/** The clause active under BOTH tiers: the parent clause (when the parent
 *  discriminator has one) AND the child clause (when the parent value owns
 *  a sub-contract). The union drives required/forbidden styling for the
 *  enhance card — e.g. input_mask is required only when
 *  mode=inpaint AND inpaint_region=free. */
function activeClauseChain(
  contract: ConditionalContract,
  values: Record<string, unknown>,
): ContractClause[] {
  const clauses: ContractClause[] = []
  const parent = activeClause(contract, values)
  if (parent) clauses.push(parent)
  const child = activeChild(contract, values)
  if (child) {
    const childClause = activeClause(child, values)
    if (childClause) clauses.push(childClause)
  }
  return clauses
}

/** Evaluate the contract against current values → every violation, across
 *  BOTH tiers. Mirrors run_contract's collect-all semantics (not just the
 *  first), including the child recursion — the child's violations carry
 *  its own discriminator in the message (e.g. inpaint_region="free"). */
export function validateContract(
  contract: ConditionalContract,
  values: Record<string, unknown>,
): ContractViolation[] {
  const mode = values[contract.discriminator]
  const disc = `${contract.discriminator}=${JSON.stringify(mode ?? "")}`
  const out: ContractViolation[] = []

  const clause = activeClause(contract, values)
  if (clause) {
    for (const f of clause.requires ?? []) {
      if (!isPresent(values[f])) {
        out.push({
          field: f,
          message: `required when ${disc} (got empty).`,
        })
      }
    }
    for (const f of clause.forbids ?? []) {
      if (isPresent(values[f])) {
        out.push({
          field: f,
          message: `not applicable when ${disc} — clear this field.`,
        })
      }
    }
    const oneOf = clause.requires_one_of ?? []
    if (oneOf.length >= 2 && !oneOf.some((f) => isPresent(values[f]))) {
      out.push({
        field: oneOf.join("|"),
        message: `at least one of [${oneOf.join(", ")}] is required when ${disc}.`,
      })
    }
    const mutex = clause.mutually_exclusive ?? []
    if (mutex.length >= 2) {
      const present = mutex.filter((f) => isPresent(values[f]))
      if (present.length > 1) {
        out.push({
          field: present.join("|"),
          message: `[${present.join(", ")}] are mutually exclusive when ${disc} (set at most one).`,
        })
      }
    }
  }

  const child = activeChild(contract, values)
  if (child) out.push(...validateContract(child, values))
  return out
}

/** True if `fieldName` is required under the current discriminator values
 *  (parent tier, or the child tier when the parent value owns a
 *  sub-contract). Drives the `*` indicator. */
export function fieldRequiredInMode(
  contract: ConditionalContract | undefined,
  fieldName: string,
  values: Record<string, unknown>,
): boolean {
  if (!contract) return false
  return activeClauseChain(contract, values).some(
    (clause) => clause.requires?.includes(fieldName),
  )
}

/** True if `fieldName` is forbidden under the current discriminator values
 *  (parent tier, or the child tier when the parent value owns a
 *  sub-contract). Drives the disabled / "n/a" styling so the user sees
 *  the field is inert in this mode. */
export function fieldForbiddenInMode(
  contract: ConditionalContract | undefined,
  fieldName: string,
  values: Record<string, unknown>,
): boolean {
  if (!contract) return false
  return activeClauseChain(contract, values).some(
    (clause) => clause.forbids?.includes(fieldName),
  )
}

function parseValue(raw: string): unknown {
  if (raw === "null") return null
  if (raw === "true") return true
  if (raw === "false") return false
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw)
  if ((raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'")))
    return raw.slice(1, -1)
  return raw
}

// ─── Door B DELETED (2026-08-11) ──────────────────────────────────────────
//
// The legacy `loadFormSpec` fetcher + `useFormSpec` hook lived here and
// bypassed validateSpecContract — a spec could render without ever being
// checked. That door is physically CLOSED: every form-spec now enters
// through useSpecContractStore.loadFormSpec (validated) and components read
// it via useFormSpecContract (lib/specContractStore). An import error is
// the only "impossible to bypass" guarantee. The FormSpec TYPE stays here.
