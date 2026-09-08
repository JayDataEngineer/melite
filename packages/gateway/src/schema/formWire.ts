// formWire — the TypeScript runtime-gate twin of py/form_wire.py.
//
// Ladder P1 (editor manifest §1.6 + §5 step 1): FIRST port target — pure
// types + validator, zero fs. The gateway will own the GET door; this
// module is the construction-time gate the door calls before serving:
// every 200 body validates here, and malformed card data refuses LOUD
// with a field-named reason instead of serving a hollow 200.
//
// SSOT: py/form_wire.py is authoritative. This file mirrors its six
// frozen rows (FormFieldRow, SchemaGroupRow, VariantRow,
// ModifierFeatureRow, FormFeaturesRow, FormSpecRow), the KindGenre
// vocabulary, and refusal_reason — key sets, required-ness, and
// nullability transcribed 1:1. Pinned by
// tests/walls/suites/test_formwire_parity.py (py-vs-ts accept/reject
// agreement on every golden + refusal parity on malformed fixtures).
//
// NO SECOND TRUTH: the openapi re-export (packages/web-kit/contracts' formSpec.ts)
// is the compile-time view. This module imports FormSpec (re-exported
// below so GET-door code has ONE import site) and adds ONLY what that
// module lacks: the closed-key runtime validator + the refusalReason
// equivalent. The Form*Row interfaces use the py row names — those names
// exist nowhere else in TS, so nothing is redefined. Where this gate and
// the generated openapi view disagree, THE GATE WINS (see DRIFT).
//
// VALIDATOR CHOICE: hand-written, zero-dependency, in the web-kit's
// existing wire-gate style (packages/web-kit/formats' validateSpecContract,
// packages/web-kit/catalog's validateCatalogContract: an isObj guard plus a
// violations array — no library). The estate's other vocabularies were
// considered and rejected:
//   - zod is a declared-but-unused dep of packages/web/editor (zero
//     imports estate-wide) — adopting it would make the gateway the
//     first consumer of a dead vocabulary AND a new dependency.
//   - @deepseek-ai/schemastery is the compose plane's vocabulary
//     (@comfyui/cordis atoms) — graph knobs, not wire gates; its error
//     taxonomy cannot reproduce the refusal_reason shape the wall pins.
// No new dependency was added for this port.
//
// Erasable-syntax TS only (node --experimental-strip-types, like the
// rest of packages/gateway/src): no enums (KindGenre is a string union),
// `import type` for types, .ts specifiers on relative imports.
//
// DRIFT (generated openapi vs frozen wire, 2026-09-07): schema.d.ts was
// generated from an older/other backend — FormField carries `section`
// (the frozen row carries group/zone/columns/width/min/max/placeholder/
// visible_when), FormFeatures carries variants/retake/outputs (the frozen
// FormFeaturesRow carries modifiers + variant_groups only), FormSpec
// carries sidebar_key (absent from every golden; refused as extra here)
// and optional variants (REQUIRED here), while size/layout are open
// strings here but notched unions there. Regenerating the openapi from
// the frozen models is its own deliberate stroke — until then the gate,
// not the generated view, decides what serves.
//
// KNOWN DIVERGENCES from pydantic lax coercion (verdict-affecting, all
// outside the canonical emitter output — no golden or wall fixture hits
// them; the parity wall pins agreement on canonical data):
//   - numeric-string ints ("order": "5") — pydantic ACCEPTS (lax), this
//     gate REFUSES (strict typeof). The emitter always writes JSON
//     numbers; strictness is the safer gate.
//   - lax bools (0/1/"true" for bool fields) — same story.
// Union-typed arms (width int|str, vram_peak_gb int|float) mirror
// pydantic's per-arm error locs (`.int` / `.str` / `.float` suffixes)
// with plain valid-integer/string/number messages (no ", unable to
// parse…" suffixes — those describe the rejected input, not the
// contract).

import type { FormSpec } from "../../../../web/contracts/src/formSpec.ts";

/**
 * The openapi compile-time view, re-exported so GET-door code imports
 * wire types from exactly one module. Never redefined here — the
 * runtime gate below proves an unknown body carries the frozen
 * FormSpecRow shape; this type is the serving view.
 */
export type { FormSpec };

/** The closed genre vocabulary — py KindGenre as a string union (no enums). */
export type KindGenre =
  | "image"
  | "video"
  | "audio"
  | "motion"
  | "text"
  | "3d"
  | "creature"
  | "other";

/** Definition order — also drives the pydantic-style genre refusal message. */
export const KIND_GENRES: readonly KindGenre[] = [
  "image",
  "video",
  "audio",
  "motion",
  "text",
  "3d",
  "creature",
  "other",
];

const KIND_GENRE_SET: ReadonlySet<string> = new Set(KIND_GENRES);

/** Pydantic-shaped: "Input should be 'image', 'video', … 'creature' or 'other'". */
const GENRE_REFUSAL: string = `Input should be ${KIND_GENRES.map((g) => `'${g}'`).join(", ").replace(/, ([^,]*)$/, " or $1")}`;

/** One card input row (the universal form's atom) — py FormFieldRow. */
export interface FormFieldRow {
  readonly name: string;
  readonly type: string;
  readonly label?: string;
  readonly default?: unknown;
  readonly options?: unknown[];
  readonly group?: string;
  readonly zone?: string;
  readonly order?: number | null;
  readonly required?: boolean | null;
  readonly columns?: number | null;
  readonly width?: number | string | null;
  readonly min?: unknown;
  readonly max?: unknown;
  readonly step?: unknown;
  readonly placeholder?: string;
  readonly tooltip?: string;
  readonly visible_when?: unknown;
}

/**
 * One schema group — py SchemaGroupRow. id may be EMPTY by wire
 * contract: ungrouped fields land in the legacy "Parameters" bucket.
 */
export interface SchemaGroupRow {
  readonly id: string;
  readonly label?: string;
  readonly fields?: unknown[];
  readonly order?: number | null;
  readonly zone?: string;
}

/** One model variant (Variant/Quant axes) — py VariantRow. */
export interface VariantRow {
  readonly id: string;
  readonly label?: string;
  readonly group?: string;
  readonly defaults?: Record<string, unknown>;
  readonly route?: string;
  readonly hint?: string | null;
  readonly engine?: string;
  readonly quant?: string | null;
  readonly vram_peak_gb?: number | null;
  /** The parent Variant this cell is owned by ("" on lane/peek empties). */
  readonly owner?: string;
}

/** One declared modifier capability — py ModifierFeatureRow. */
export interface ModifierFeatureRow {
  readonly kind: string;
  readonly label?: string;
  readonly param_key: string;
  readonly cardinality?: string;
  readonly max_stack?: number | null;
  readonly fields?: unknown[];
  readonly options?: unknown[];
  readonly options_scanned?: boolean | null;
  readonly upload_dir?: string;
  readonly declaration_only?: boolean | null;
}

/** The spec's capability declaration — py FormFeaturesRow. */
export interface FormFeaturesRow {
  readonly modifiers?: ModifierFeatureRow[];
  readonly variant_groups?: Record<string, unknown>;
}

/** GET /v1/form-spec 200 body — py FormSpecRow. */
export interface FormSpecRow {
  readonly model: string;
  readonly form: string;
  readonly service: string;
  readonly label: string;
  readonly genre: KindGenre;
  readonly fields: FormFieldRow[];
  readonly schema_groups: SchemaGroupRow[];
  readonly features: FormFeaturesRow;
  readonly defaults: Record<string, unknown>;
  readonly variants: VariantRow[];
  readonly guide?: unknown;
  readonly engine?: string;
  readonly enhance_prompt?: unknown;
  readonly enhance_prompts?: unknown;
  readonly size?: string | null;
  readonly layout?: string | null;
  readonly loader_info?: unknown;
  readonly contract?: unknown;
}

/** One gate failure — the TS twin of a pydantic error (loc + msg). */
export interface FormWireError {
  readonly path: string;
  readonly message: string;
}

/** The gate verdict — collect-all semantics, like pydantic. */
export interface FormWireResult {
  readonly valid: boolean;
  readonly errors: readonly FormWireError[];
  /** The narrowed body — present iff valid. The validator never mutates. */
  readonly spec?: FormSpecRow;
}

// ─── refusal_reason twin ─────────────────────────────────────────────

/**
 * One-line, field-named reason for a form-spec contract refusal — the
 * LOUD part of document-and-continue. Twins py refusal_reason:
 * "loc: msg; …", with "<root>" for the body-level failure.
 */
export function refusalReason(errors: readonly FormWireError[]): string {
  return errors
    .map((e) => `${e.path === "" ? "<root>" : e.path}: ${e.message}`)
    .join("; ");
}

// ─── scalar vocabulary (pydantic-flavored messages) ──────────────────

const FIELD_REQUIRED = "Field required";
const EXTRA_FORBIDDEN = "Extra inputs are not permitted";
const NOT_DICT = "Input should be a valid dictionary";
const NOT_LIST = "Input should be a valid list";
const NOT_STRING = "Input should be a valid string";
const MIN_LENGTH_1 = "String should have at least 1 character";
const NOT_INT = "Input should be a valid integer";
const NOT_BOOL = "Input should be a valid boolean";
const NOT_NUMBER = "Input should be a valid number";

const dictInstance = (row: string): string =>
  `Input should be a valid dictionary or instance of ${row}`;

type MutableErrors = FormWireError[];
type Check = (value: unknown, path: string, errors: MutableErrors) => void;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const at = (base: string, key: string | number): string =>
  base === "" ? String(key) : `${base}.${key}`;

const has = (obj: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined;

/** Required key — absent means "Field required", present means checked. */
const req = (
  obj: Record<string, unknown>,
  key: string,
  base: string,
  errors: MutableErrors,
  check: Check,
): void => {
  if (!has(obj, key)) {
    errors.push({ path: at(base, key), message: FIELD_REQUIRED });
    return;
  }
  check(obj[key], at(base, key), errors);
};

/** Defaulted key — absent is fine (py fills the default), present is checked. */
const opt = (
  obj: Record<string, unknown>,
  key: string,
  base: string,
  errors: MutableErrors,
  check: Check,
): void => {
  if (!has(obj, key)) return;
  check(obj[key], at(base, key), errors);
};

const checkAny: Check = (_v, _p, _e): void => {
  // Values stay open (py Any) — card vocabulary, not the wire's.
};

const checkString: Check = (v, path, errors): void => {
  if (typeof v !== "string") errors.push({ path, message: NOT_STRING });
};

const checkNonEmptyString: Check = (v, path, errors): void => {
  if (typeof v !== "string") errors.push({ path, message: NOT_STRING });
  else if (v.length === 0) errors.push({ path, message: MIN_LENGTH_1 });
};

const checkStringOrNull: Check = (v, path, errors): void => {
  if (v === null) return;
  checkString(v, path, errors);
};

const checkInt: Check = (v, path, errors): void => {
  if (typeof v !== "number" || !Number.isInteger(v)) {
    errors.push({ path, message: NOT_INT });
  }
};

const checkIntOrNull: Check = (v, path, errors): void => {
  if (v === null) return;
  checkInt(v, path, errors);
};

const checkBoolOrNull: Check = (v, path, errors): void => {
  if (v === null) return;
  if (typeof v !== "boolean") errors.push({ path, message: NOT_BOOL });
};

const checkNumberOrNull: Check = (v, path, errors): void => {
  if (v === null) return;
  if (typeof v !== "number") errors.push({ path, message: NOT_NUMBER });
};

const checkList: Check = (v, path, errors): void => {
  if (!Array.isArray(v)) errors.push({ path, message: NOT_LIST });
};

const checkDict: Check = (v, path, errors): void => {
  if (!isRecord(v)) errors.push({ path, message: NOT_DICT });
};

const checkGenre: Check = (v, path, errors): void => {
  if (typeof v !== "string" || !KIND_GENRE_SET.has(v)) {
    errors.push({ path, message: GENRE_REFUSAL });
  }
};

/** width: int | str | None — per-arm locs, pydantic union shape. */
const checkWidthOrNull: Check = (v, path, errors): void => {
  if (v === null) return;
  if (typeof v === "string") return;
  if (typeof v === "number" && Number.isInteger(v)) return;
  errors.push({ path: `${path}.int`, message: NOT_INT });
  errors.push({ path: `${path}.str`, message: NOT_STRING });
};

/** vram_peak_gb: int | float | None — per-arm locs, pydantic union shape. */
const checkVramOrNull: Check = (v, path, errors): void => {
  if (v === null) return;
  if (typeof v === "number") return;
  errors.push({ path: `${path}.int`, message: NOT_INT });
  errors.push({ path: `${path}.float`, message: NOT_NUMBER });
};

/** Closed keys — extra="forbid" everywhere (py rung 3). */
const forbidExtras = (
  obj: Record<string, unknown>,
  known: ReadonlySet<string>,
  base: string,
  errors: MutableErrors,
): void => {
  for (const k of Object.keys(obj)) {
    if (!known.has(k)) {
      errors.push({ path: at(base, k), message: EXTRA_FORBIDDEN });
    }
  }
};

// ─── row gates (definition order = refusal order) ────────────────────

const FORM_FIELD_KNOWN: ReadonlySet<string> = new Set([
  "name", "type", "label", "default", "options", "group", "zone",
  "order", "required", "columns", "width", "min", "max", "step",
  "placeholder", "tooltip", "visible_when",
]);

const checkFormFieldRow: Check = (v, path, errors): void => {
  if (!isRecord(v)) {
    errors.push({ path, message: dictInstance("FormFieldRow") });
    return;
  }
  req(v, "name", path, errors, checkNonEmptyString);
  req(v, "type", path, errors, checkNonEmptyString);
  opt(v, "label", path, errors, checkString);
  opt(v, "default", path, errors, checkAny);
  opt(v, "options", path, errors, checkList);
  opt(v, "group", path, errors, checkString);
  opt(v, "zone", path, errors, checkString);
  opt(v, "order", path, errors, checkIntOrNull);
  opt(v, "required", path, errors, checkBoolOrNull);
  opt(v, "columns", path, errors, checkIntOrNull);
  opt(v, "width", path, errors, checkWidthOrNull);
  opt(v, "min", path, errors, checkAny);
  opt(v, "max", path, errors, checkAny);
  opt(v, "step", path, errors, checkAny);
  opt(v, "placeholder", path, errors, checkString);
  opt(v, "tooltip", path, errors, checkString);
  opt(v, "visible_when", path, errors, checkAny);
  forbidExtras(v, FORM_FIELD_KNOWN, path, errors);
};

const SCHEMA_GROUP_KNOWN: ReadonlySet<string> = new Set([
  "id", "label", "fields", "order", "zone",
]);

const checkSchemaGroupRow: Check = (v, path, errors): void => {
  if (!isRecord(v)) {
    errors.push({ path, message: dictInstance("SchemaGroupRow") });
    return;
  }
  // id may be EMPTY (the legacy "Parameters" bucket) — plain str, no minimum.
  req(v, "id", path, errors, checkString);
  opt(v, "label", path, errors, checkString);
  opt(v, "fields", path, errors, checkList);
  opt(v, "order", path, errors, checkIntOrNull);
  opt(v, "zone", path, errors, checkString);
  forbidExtras(v, SCHEMA_GROUP_KNOWN, path, errors);
};

const VARIANT_KNOWN: ReadonlySet<string> = new Set([
  "id", "label", "group", "defaults", "route", "hint", "engine",
  "quant", "vram_peak_gb", "owner",
]);

const checkVariantRow: Check = (v, path, errors): void => {
  if (!isRecord(v)) {
    errors.push({ path, message: dictInstance("VariantRow") });
    return;
  }
  req(v, "id", path, errors, checkNonEmptyString);
  opt(v, "label", path, errors, checkString);
  opt(v, "group", path, errors, checkString);
  opt(v, "defaults", path, errors, checkDict);
  opt(v, "route", path, errors, checkString);
  opt(v, "hint", path, errors, checkStringOrNull);
  opt(v, "engine", path, errors, checkString);
  opt(v, "quant", path, errors, checkStringOrNull);
  opt(v, "vram_peak_gb", path, errors, checkVramOrNull);
  opt(v, "owner", path, errors, checkString);
  forbidExtras(v, VARIANT_KNOWN, path, errors);
};

const MODIFIER_KNOWN: ReadonlySet<string> = new Set([
  "kind", "label", "param_key", "cardinality", "max_stack", "fields",
  "options", "options_scanned", "upload_dir", "declaration_only",
]);

const checkModifierFeatureRow: Check = (v, path, errors): void => {
  if (!isRecord(v)) {
    errors.push({ path, message: dictInstance("ModifierFeatureRow") });
    return;
  }
  req(v, "kind", path, errors, checkNonEmptyString);
  opt(v, "label", path, errors, checkString);
  req(v, "param_key", path, errors, checkNonEmptyString);
  opt(v, "cardinality", path, errors, checkString);
  opt(v, "max_stack", path, errors, checkIntOrNull);
  opt(v, "fields", path, errors, checkList);
  opt(v, "options", path, errors, checkList);
  opt(v, "options_scanned", path, errors, checkBoolOrNull);
  opt(v, "upload_dir", path, errors, checkString);
  opt(v, "declaration_only", path, errors, checkBoolOrNull);
  forbidExtras(v, MODIFIER_KNOWN, path, errors);
};

const FEATURES_KNOWN: ReadonlySet<string> = new Set([
  "modifiers", "variant_groups",
]);

const checkModifierList: Check = (v, path, errors): void => {
  if (!Array.isArray(v)) {
    errors.push({ path, message: NOT_LIST });
    return;
  }
  v.forEach((item, i) => checkModifierFeatureRow(item, at(path, i), errors));
};

const checkFormFeaturesRow: Check = (v, path, errors): void => {
  if (!isRecord(v)) {
    errors.push({ path, message: dictInstance("FormFeaturesRow") });
    return;
  }
  opt(v, "modifiers", path, errors, checkModifierList);
  opt(v, "variant_groups", path, errors, checkDict);
  forbidExtras(v, FEATURES_KNOWN, path, errors);
};

const FORM_SPEC_KNOWN: ReadonlySet<string> = new Set([
  "model", "form", "service", "label", "genre", "fields", "schema_groups",
  "features", "defaults", "variants", "guide", "engine", "enhance_prompt",
  "enhance_prompts", "size", "layout", "loader_info", "contract",
]);

const checkFieldList: Check = (v, path, errors): void => {
  if (!Array.isArray(v)) {
    errors.push({ path, message: NOT_LIST });
    return;
  }
  v.forEach((item, i) => checkFormFieldRow(item, at(path, i), errors));
};

const checkSchemaGroupList: Check = (v, path, errors): void => {
  if (!Array.isArray(v)) {
    errors.push({ path, message: NOT_LIST });
    return;
  }
  v.forEach((item, i) => checkSchemaGroupRow(item, at(path, i), errors));
};

const checkVariantList: Check = (v, path, errors): void => {
  if (!Array.isArray(v)) {
    errors.push({ path, message: NOT_LIST });
    return;
  }
  v.forEach((item, i) => checkVariantRow(item, at(path, i), errors));
};

const checkFormSpecBody = (
  body: Record<string, unknown>,
  errors: MutableErrors,
): void => {
  req(body, "model", "", errors, checkNonEmptyString);
  req(body, "form", "", errors, checkNonEmptyString);
  req(body, "service", "", errors, checkNonEmptyString);
  req(body, "label", "", errors, checkNonEmptyString);
  req(body, "genre", "", errors, checkGenre);
  req(body, "fields", "", errors, checkFieldList);
  req(body, "schema_groups", "", errors, checkSchemaGroupList);
  req(body, "features", "", errors, checkFormFeaturesRow);
  req(body, "defaults", "", errors, checkDict);
  req(body, "variants", "", errors, checkVariantList);
  opt(body, "guide", "", errors, checkAny);
  opt(body, "engine", "", errors, checkString);
  opt(body, "enhance_prompt", "", errors, checkAny);
  opt(body, "enhance_prompts", "", errors, checkAny);
  opt(body, "size", "", errors, checkStringOrNull);
  opt(body, "layout", "", errors, checkStringOrNull);
  opt(body, "loader_info", "", errors, checkAny);
  opt(body, "contract", "", errors, checkAny);
  forbidExtras(body, FORM_SPEC_KNOWN, "", errors);
};

/**
 * Validate an unknown body as a FormSpecRow — the TS twin of
 * FormSpecRow.model_validate. Returns collect-all errors (never throws
 * on shape); the door refuses !valid with refusalReason(errors) as the
 * 500 field-named reason, mirroring editor_forms' gate.
 */
export function validateFormSpecRow(body: unknown): FormWireResult {
  const errors: MutableErrors = [];
  if (!isRecord(body)) {
    errors.push({ path: "", message: dictInstance("FormSpecRow") });
    return { valid: false, errors };
  }
  checkFormSpecBody(body, errors);
  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, errors, spec: body as unknown as FormSpecRow };
}

/** True when `v` names a member of the closed genre vocabulary. */
export function isKindGenre(v: unknown): v is KindGenre {
  return typeof v === "string" && KIND_GENRE_SET.has(v);
}
