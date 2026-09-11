// bakeParams.ts — the AnnyBakeParams serve belt, RE-HOMED
// (REBUILD-21, 2026-09-10): ported verbatim from the dead gateway's
// doors/studios.ts (killed with the gateway app) — the params_json
// preset-dialect validation the flows registry's initial_validators
// gate rides (bake_params initials refuse BEFORE any run registers).
// pyFloatRepr ports from the dead doors/drafts.ts (CPython repr
// fidelity — the belt renders float positions verbatim). pyTypeName
// comes from queue.ts (already re-homed, REBUILD-4).
//
// Erasable-syntax TS only (node --experimental-strip-types).
import { PyNum } from "./pyValue.ts";
import { parseJson, pyReprString } from "./pyJson.ts";
import { pyTypeName } from "./queue.ts";

// The pydantic version the render cites (dead studios.ts:131).
const PYDANTIC_MM = "2.13";

/** One collected validation failure (loc = dotted pydantic path;
 *  empty = model-level). input feeds BOTH input_value (repr) and
 *  input_type (type name) — exactly pydantic-core's pairing. */
export interface VError {
  readonly loc: readonly (string | number)[];
  readonly msg: string;
  readonly type: string;
  readonly input: unknown;
}

/** One collected validation failure (loc = dotted pydantic path;
 *  empty = model-level). input feeds BOTH input_value (repr) and
 *  input_type (type name) — exactly pydantic-core's pairing. */
export interface VError {
  readonly loc: readonly (string | number)[];
  readonly msg: string;
  readonly type: string;
  readonly input: unknown;
}

export function vErr(
  loc: readonly (string | number)[],
  msg: string,
  type: string,
  input: unknown,
): VError {
  return { loc, msg, type, input };
}

/** str(ValidationError): head line + per-error loc/message lines +
 *  a footer after EACH error carrying THAT error's type
 *  (empirical pydantic 2.13 — [value_error, missing] carries
 *  /v/value_error mid-text and ends /v/missing). */
export function renderErrors(model: string, errs: readonly VError[]): string {
  const head: string =
    errs.length === 1
      ? "1 validation error for " + model
      : errs.length + " validation errors for " + model;
  const lines: string[] = [head];
  for (const e of errs) {
    if (e.loc.length > 0) {
      lines.push(e.loc.map(String).join("."));
    }
    lines.push(
      "  " +
        e.msg +
        " [type=" +
        e.type +
        ", input_value=" +
        truncateRepr(pyReprValue(e.input)) +
        ", input_type=" +
        pyTypeName(e.input) +
        "]",
    );
    lines.push(
      "    For further information visit https://errors.pydantic.dev/" +
        PYDANTIC_MM +
        "/v/" +
        e.type,
    );
  }
  return lines.join("\n");
}

/** Python repr() of a parsed-JSON value (None/True/False, ints
 *  verbatim, floats via pyFloatRepr, strings single-quoted,
 *  lists/tuples/dicts recursive with ", " separators — probed
 *  verbatim 2026-09-07). Plain host numbers appear only on
 *  TS-constructed paths (validated coercions); parseJson yields
 *  PyNum, never number. */
export function pyReprValue(v: unknown): string {
  if (v === null || v === undefined) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  if (typeof v === "string") return pyReprString(v);
  if (v instanceof PyNum) {
    return isIntLiteral(v.literal)
      ? v.literal
      : pyFloatRepr(Number(v.literal));
  }
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new Error("bad sidecar number");
    return Number.isInteger(v) ? String(v) : pyFloatRepr(v);
  }
  if (v instanceof PyTuple) {
    const inner: string = v.items.map(pyReprValue).join(", ");
    return "(" + inner + (v.items.length === 1 ? "," : "") + ")";
  }
  if (Array.isArray(v)) return "[" + v.map(pyReprValue).join(", ") + "]";
  if (typeof v === "object") {
    const parts: string[] = Object.keys(v as Record<string, unknown>).map(
      (k: string): string =>
        pyReprString(k) + ": " + pyReprValue((v as Record<string, unknown>)[k]),
    );
    return "{" + parts.join(", ") + "}";
  }
  return String(v);
}

/** pydantic-core's middle-truncation (probed 2026-09-07: a 50-char
 *  repr rides whole, 51+ renders first 25 + "..." + last 24). */
export function truncateRepr(s: string): string {
  if (s.length <= 50) return s;
  return s.slice(0, 25) + "..." + s.slice(s.length - 24);
}

/** A JSON tuple (promotion EstimatedParams inputs render with parens —
 *  py constructs them from real tuples, so repr shows (1.0, ...) and
 *  () — distinct from lists at render time only). */
export class PyTuple {
  readonly items: readonly unknown[];
  constructor(items: readonly unknown[]) {
    this.items = items;
  }
}

/** JSON int literal (no fraction/exponent — exactly what py's json
 *  parses to int; huge literals ride verbatim, never through
 *  Number). */
function isIntLiteral(lit: string): boolean {
  return /^-?\d+$/.test(lit);
}

/** Lax float slot: numbers (finite), bools (True->1.0), numeric
 *  strings ("50"->50.0); failure -> float_parsing at loc. */
function parseFloatLax(
  v: unknown,
  loc: readonly (string | number)[],
  errs: VError[],
): number | null {
  if (v instanceof PyNum) {
    const n: number = Number(v.literal);
    if (!Number.isFinite(n)) {
      errs.push(
        vErr(loc, "Input should be a valid number", "float_type", v),
      );
      return null;
    }
    return n;
  }
  // (parseJson yields PyNum, never number — the number arm below is
  // dead through every caller: kept as the coercion's contract.)
  /* v8 ignore next */
  if (typeof v === "number") {
    if (!Number.isFinite(v)) {
      errs.push(vErr(loc, "Input should be a valid number", "float_type", v));
      return null;
    }
    return v;
  }
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "string") {
    const t: string = v.trim();
    if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) {
      const n: number = Number(t);
      if (Number.isFinite(n)) return n;
    }
    errs.push(
      vErr(
        loc,
        "Input should be a valid number, unable to parse string as a number",
        "float_parsing",
        v,
      ),
    );
    return null;
  }
  errs.push(vErr(loc, "Input should be a valid number", "float_type", v));
  return null;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const proto: unknown = Object.getPrototypeOf(v);
  // (parseJson builds {}-literal objects — never null-proto — so the
  // null arm is dropped: only standard-prototype dicts ride.)
  return proto === Object.prototype;
}

const PRESET_ID_RE: RegExp = /^[a-z0-9][a-z0-9_\-]*$/;
/** The pattern SOURCE for the mismatch message (py renders the
 *  pattern's repr — the \- doubles to \\ — probed verbatim). */
const PRESET_ID_SRC = "^[a-z0-9][a-z0-9_\\-]*$";

const AUTH_TAG = "function-after[_check_dims(), AuthoredParams]";
const EST_TAG = "function-after[_check_dims(), EstimatedParams]";

/** Required-field fetch (missing -> Field required on the parent). */
function reqField(
  v: Record<string, unknown>,
  key: string,
  loc: readonly (string | number)[],
  errs: VError[],
): { found: boolean; value: unknown }

/** Required-field fetch (missing -> Field required on the parent). */
function reqField(
  v: Record<string, unknown>,
  key: string,
  loc: readonly (string | number)[],
  errs: VError[],
): { found: boolean; value: unknown } {
  if (!(key in v) || (v as Record<string, unknown>)[key] === undefined) {
    errs.push(vErr([...loc, key], "Field required", "missing", v));
    return { found: false, value: undefined };
  }
  return { found: true, value: (v as Record<string, unknown>)[key] };
}

/** Extra-key sweep (definition-order fields first, extras last in
 *  input order — probed: label/origin miss before zzz extra). */
function extraSweep(
  v: Record<string, unknown>,
  known: ReadonlySet<string>,
  loc: readonly (string | number)[],
  errs: VError[],
): void {
  for (const k of Object.keys(v)) {
    if (!known.has(k)) {
      errs.push(
        vErr(
          [...loc, k],
          "Extra inputs are not permitted",
          "extra_forbidden",
          (v as Record<string, unknown>)[k],
        ),
      );
    }
  }
}

/** A validated float tuple's raw items + numbers (promotion
 *  after-errors render the RAW tuple — PyTuple of parsed items). */
interface FloatTuple {
  readonly items: unknown[];
  readonly nums: number[];
}

function validFloatTuple(
  v: unknown,
  loc: readonly (string | number)[],
  errs: VError[],
): FloatTuple | null {
  if (!Array.isArray(v)) {
    errs.push(vErr(loc, "Input should be a valid tuple", "tuple_type", v));
    return null;
  }
  const items: unknown[] = [...v];
  const nums: number[] = [];
  let bad = false;
  for (let i = 0; i < items.length; i++) {
    const n = parseFloatLax(items[i], [...loc, i], errs);
    if (n === null) bad = true;
    else nums.push(n);
  }
  return bad ? null : { items, nums };
}

/** Validate a served params_json through the AnnyBakeParams shape
 *  (infra/python/melite_models/presets.py AnnyBakeParams — the serve-side
 *  belt). After-validator failures render with the WIRE STRING as
 *  input_value (probed: the original str, not the parsed doc).
 *  Returns the full "N validation error(s)..." text, or null. */
export function validateBakeParams(s: string): string | null {
  let doc: unknown;
  try {
    doc = parseJson(s);
  } catch (exc) {
    const msg: string = exc instanceof Error
      ? exc.message
      : /* v8 ignore next -- parseJson throws Errors: the String
           fallback never fires (2026-09-12) */ String(exc);
    // Host JSON text (CPython's differs) — shape-only parity; the
    // belt never fires on canonical strings, only hand-corrupt
    // ledger rows (the wall pins status + prefix).
    return renderErrors("AnnyBakeParams", [
      vErr([], "Value error, params_json is not JSON: " + msg, "value_error", s),
    ]);
  }
  if (!isPlainObject(doc)) {
    return renderErrors("AnnyBakeParams", [
      vErr(
        [],
        "Value error, params_json must be a JSON object, got " + pyTypeName(doc),
        "value_error",
        s,
      ),
    ]);
  }
  const errs: VError[] = [];
  let dialect = "";
  const rd = reqField(doc, "dialect", [], errs);
  if (!rd.found) dialect = "";
  else if (rd.value !== "authored" && rd.value !== "estimated") {
    errs.push(
      vErr([], "Input should be 'authored' or 'estimated'", "literal_error", rd.value),
    );
  } else dialect = rd.value;
  let phenotype: number[] | null = null;
  const rp = reqField(doc, "phenotype", [], errs);
  if (!rp.found) phenotype = null;
  else {
    const t = validFloatTuple(rp.value, ["phenotype"], errs);
    phenotype = t === null ? null : t.nums;
  }
  let locals: { name: string; value: number }[] = [];
  let localsBad = false;
  if ("local_changes" in doc && doc["local_changes"] !== undefined) {
    const lv = doc["local_changes"];
    if (!isPlainObject(lv)) {
      errs.push(
        vErr([], "Input should be a valid dictionary", "dict_type", lv),
      );
      localsBad = true;
    } else {
      for (const k of Object.keys(lv)) {
        const n = parseFloatLax(lv[k], ["local_changes", k], errs);
        if (n === null) localsBad = true;
        else locals.push({ name: k, value: n });
      }
    }
  }
  let scale: number[] | null = null;
  if ("scale" in doc && doc["scale"] !== undefined && doc["scale"] !== null) {
    const t = validFloatTuple(doc["scale"], ["scale"], errs);
    if (t !== null) scale = t.nums;
  }
  extraSweep(doc, new Set(["dialect", "phenotype", "local_changes", "scale"]), [], errs);
  if (errs.length > 0 || phenotype === null || localsBad) {
    return renderErrors("AnnyBakeParams", errs);
  }
  const fail = (msg: string): string =>
    renderErrors("AnnyBakeParams", [vErr([], "Value error, " + msg, "value_error", s)]);
  if (dialect === "authored") {
    if (phenotype.length !== 11) {
      return fail(
        "authored phenotype wants 11 dims, got " + phenotype.length +
          " — the dims are gender/age/muscle/weight/height/proportions/cupsize/firmness/african/asian/caucasian",
      );
    }
    for (let i = 0; i < phenotype.length; i++) {
      const n: number = phenotype[i] as number;
      if (!(n >= 0.0 && n <= 1.0)) {
        return fail(
          "authored phenotype[" + i + "] = " + pyFloatRepr(n) + " outside 0.0..1.0",
        );
      }
    }
    if (scale !== null) {
      return fail(
        "authored takes local_changes, not scale (that is the estimated dialect)",
      );
    }
  } else {
    if (phenotype.length !== 6) {
      return fail(
        "estimated phenotype wants 6 dims, got " + phenotype.length +
          " (the estimator's identity coefficients, not the 11 authoring dims)",
      );
    }
    if (scale === null) {
      return fail("estimated wants scale (the estimator run's measurement vector)");
    }
    if ((scale as number[]).length !== 139) {
      return fail(
        "estimated scale wants 139 entries, got " + (scale as number[]).length,
      );
    }
    if (locals.length > 0) {
      return fail(
        "estimated bakes phenotype+scale only — local_changes would be silently ignored (that is the authored dialect)",
      );
    }
  }
  for (const e of locals) {
    if (!(e.value >= -1.0 && e.value <= 2.0)) {
      return fail(
        "local_changes[" + pyReprString(e.name) + "] = " +
          pyFloatRepr(e.value) + " outside -1.0..2.0",
      );
    }
  }
  return null;
}

/** CPython repr() of a finite double (probed battery 2026-09-07:
 *  1.0/0.5/0.1/1e15 fixed, 1e16+ exponential, 0.0001 fixed, 1e-05
 *  exponential, -0.0 signed, 1e100/5e-324/1.8e308 round-trip).
 *  Shortest digits come from String(v); py's fixed window is
 *  -3 <= decExp <= 16 (decExp = decimal-point position); the
 *  exponent pads to 2+ digits, lowercase e. */
export function pyFloatRepr(v: number): string {
  if (v === 0) return Object.is(v, -0) ? "-0.0" : "0.0";
  const neg: string = v < 0 ? "-" : "";
  const s: string = String(Math.abs(v));
  const epos: number = s.indexOf("e");
  let digits: string;
  let exp10: number;
  if (epos >= 0) {
    const mant: string = s.slice(0, epos);
    const exp: number = Number(s.slice(epos + 1));
    const dot: number = mant.indexOf(".");
    const fracLen: number = dot < 0 ? 0 : mant.length - dot - 1;
    digits = mant.replace(".", "");
    exp10 = exp - fracLen;
  } else {
    const dot: number = s.indexOf(".");
    const fracLen: number = dot < 0 ? 0 : s.length - dot - 1;
    digits = s.replace(".", "");
    exp10 = -fracLen;
  }
  // Strip leading zeros (no value change — the digit string reads
  // as an integer) then trailing zeros (each divides by 10, so the
  // exponent climbs to compensate).
  let lead = 0;
  while (lead < digits.length && digits[lead] === "0") lead++;
  /* v8 ignore next -- unreachable (v != 0 blanks the digit string
     before the strip): kept as the belt's contract (2026-09-12) */
  if (lead === digits.length) return "0.0";
  digits = digits.slice(lead);
  let tend = digits.length;
  while (tend > 0 && digits[tend - 1] === "0") tend--;
  exp10 += digits.length - tend;
  digits = digits.slice(0, tend);
  const n: number = digits.length;
  const decExp: number = exp10 + n;
  if (decExp >= -3 && decExp <= 16) {
    if (decExp <= 0) return neg + "0." + "0".repeat(-decExp) + digits;
    if (decExp >= n) return neg + digits + "0".repeat(decExp - n) + ".0";
    return neg + digits.slice(0, decExp) + "." + digits.slice(decExp);
  }
  const mantissa: string =
    digits.length === 1 ? digits : digits[0] + "." + digits.slice(1);
  const e: number = decExp - 1;
  const esign: string = e < 0 ? "-" : "+";
  const eabs: string = String(Math.abs(e)).padStart(2, "0");
  return neg + mantissa + "e" + esign + eabs;
}
