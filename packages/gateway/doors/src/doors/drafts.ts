// drafts.ts — the P4 TS port of the 5 draft CRUD doors.
//
// Handlers (python/gateway.py names in parens; ROUTES rows already mirror):
//   GET    /v1/flows/drafts                          (_h_drafts_list)
//   POST   /v1/flows/drafts                          (_h_drafts_save, body strict)
//   PATCH  /v1/flows/drafts/:id/stages/:sid          (_h_draft_stage_patch, strict)
//   GET    /v1/flows/drafts/:id/stages/:sid/result    (_h_draft_stage_result)
//   GET    /v1/flows/drafts/:id                      (_h_drafts_get)
// DELETE is deliberately ABSENT: infra/python/editor_runs.py drafts_delete
// (1065-1071) is unwired dead code — its docstring says NO SUCH ROUTE
// — so DELETE falls through to the 404 no-such-route shape exactly
// as py route() answers it. Inventing persistence would DIVERGE.
//
// FILE SEMANTICS (infra/python/editor_runs.py 818-1204, probed live 2026-09-07):
//   - dir: STATE_ROOT/drafts (gateway.py 76-77 + 3108-3148: every
//     drafts arm serves str(STATE_ROOT / "drafts")); defaultDraftRoots
//     below mirrors the resolution (MELITE_STATE_ROOT else the
//     file-anchored repo tree) — no hardcodes.
//   - create (drafts_save 957-991): falsy bodies (null, "", 0,
//     false, {}, []) refuse 400 "empty body"; a truthy STRING body is
//     re-parsed as JSON first (unparseable -> {} -> 400 — this is the
//     drafts_save str arm operating on route()'s already-parsed
//     ctx.json, NOT the wire bytes); every other truthy body —
//     including non-dict scalars and LISTS — composes a birth doc
//     and 200s. Caller keys draft_id/status/createdAt/completedAt/
//     intent/stages are composer-owned (body extras with those names
//     are DROPPED); everything else rides verbatim after the six
//     contract keys. Stages default per-row (id "s_<i>", inputs
//     [""], provenance "agent") only when ABSENT — present-but-empty
//     ("", [], ...) is kept and then fails the birth gate.
//   - birth gate (run_wire.validate_draft_birth — NOT form_wire: no
//     drafts arm touches form_wire; the task's "form_wire" is the
//     run_wire DraftBirthStage gate): composer drift refuses as a
//     structured 500 "draft composer drift: <pydantic text>". Only
//     stage triples can fail (doc-level keys are composer-set, always
//     valid); the FIRST failing stage in list order reports, field
//     order id/inputs/provenance, nested inputs.i in index order.
//     birthBirthText() reproduces pydantic v2's str(ValidationError)
//     EXACTLY (probed against pydantic 2.13.4 — the
//     errors.pydantic.dev/2.13 URL is baked; a pydantic upgrade
//     changes the URL and the wall catches it).
//   - create persist is a PLAIN write (988, no tmp+rename, no O_EXCL)
//     of compact separators=(",",":") ensure_ascii=False bytes —
//     concurrent creates are safe only because minted ids are
//     distinct, never by locking (the wall pins N-parallel-200, not
//     atomicity py does not have).
//   - get (drafts_get 1031-1062 + _h wrapper 3118-3134): bad id ->
//     400; missing -> 404 "draft not found"; the doc's VERBATIM disk
//     bytes are parsed ONCE at the handler (a str payload would ride
//     _adapt's dumps a second time — the wire would be "\"{...}\"").
//     Unparseable -> 500 "draft corrupt on disk: <parser text>" (the
//     TEXT embeds the host JSON parser's message — CPython vs V8 —
//     so the wall asserts status + prefix, never bytes); non-object
//     -> the FIXED 500 "draft corrupt on disk: not an object"
//     (byte-identical). heal=False on the gateway path.
//   - list (drafts_list 825-881): merged index over drafts_root (+ an
//     aux tree the gateway never passes), newest-first by int(mtime),
//     rows from the first 8191 CHARS via BYTE-wise sidecar_str (key
//     "model" cap 80; name/intent/title fallback caps 160; service
//     fallback for model cap 80; non-strings read ""), names filtered
//     to 6..110 chars + .json + draft_id_ok, count = TOTAL matches
//     (pre-600-cap), rows capped at 600.
//   - patch (draft_stage_patch 1144-1190): non-object body -> 400;
//     unknown keys (sorted, codepoint) -> 400 with the want list;
//     shape checks in result/runStatus/params/inputs/inputOutputs
//     order (want.__name__ spellings "dict"/"str"/"list"); then load
//     (bad id 400, corrupt 500, missing -> 200 delivered:false),
//     missing/invalid stage -> 200 delivered:false "stage not found"
//     (reconcile doors NEVER 404 — the outbox drops zombies without
//     a wire misfire); params merge SHALLOW, the rest replace;
//     tmp+rename atomic persist (failure -> 500 + unlink attempt);
//     200 carries patched: sorted(keys).
//   - result (draft_stage_result 1193-1204): bad id 400; EVERYTHING
//     else missing/corrupt/non-dict-result -> 200 found:false (a
//     corrupt doc is found:false here, NOT the get door's 500).
// NUMBER FIDELITY: py round-trips every number through its own repr
// (json.load -> float repr / int exact). Bodies and files are parsed
// with assets.parseJson (literals kept as PyNum): int literals ride
// verbatim (exact at any width — JSON.parse would round >2^53),
// float literals normalize through pyFloatRepr (CPython shortest-
// repr rules: fixed iff -3 <= decExp <= 16, exponent padded to 2+
// digits, integral floats keep ".0"). 1.00 -> "1.0", 1e2 ->
// "100.0", 2^60 exact. Differentially tested against repr() (see
// the battery in the wall's float pins).
// REFUSALS: every 4xx object body leaves via the local normalize4xx
// alias (R4.2 — same rule as ctx.ts; kept HERE so this door module
// stays importable without the dispatcher, the assets.ts pattern).
// 200/4xx JSON bytes ride dumpsPy (indent=2, ensure_ascii) —
// byte-identical to _adapt's json.dumps(indent=2, default=str) for
// this value domain (ints, PyNum literals, strings, bools, null).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import {
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  dumpsPy,
  parseJson,
  pyReprString,
} from "./assets.ts";
import {
  PyNum,
} from "@melite/gateway-core";
import type { Context, Plugin } from "@deepseek-ai/cordis";
import type { DispatchResult } from "@melite/gateway-core";
import type { GatewayRequest } from "@melite/gateway-core";
import { matchRoute } from "@melite/gateway-core";
import {
  checkDraftPatch,
  decodeStrictBody,
  draftIdOk,
  DRAFT_PATCH_VOICE,
  STAGE_PATCH_KEYS,
} from "@melite/gateway-core";

/** Dispatcher answer — structural twin of ctx.DispatchResult (kept
 *  local so this module imports nothing from the dispatcher). */
export interface DraftResult {
  readonly status: number;
  readonly body: string | Uint8Array;
  readonly contentType: string;
  readonly headers: Record<string, string>;
}

const JSON_CT: string = "application/json";

/** Mirror py's root resolution: MELITE_STATE_ROOT env else
 *  REPO/data/runs, REPO file-anchored (gateway.py 63, 76-77). The
 *  drafts arms serve STATE_ROOT/"drafts" (gateway.py 3108-3148). */
export function defaultDraftRoots(): {
  readonly stateRoot: string;
  readonly draftsDir: string;
} {
  const here: string = dirname(fileURLToPath(import.meta.url));
  const repo: string = resolve(here, "..", "..", "..", "..", "..");
  const state: string =
    process.env["MELITE_STATE_ROOT"] ?? join(repo, "data", "runs");
  return { stateRoot: state, draftsDir: join(state, "drafts") };
}

/** R4.2 dispatcher normalization — local alias over the ctx.ts twin
 *  (same rule: every 4xx object body leaves with a code). */
function normalize4xx(status: number, payload: unknown): unknown {
  if (
    typeof status === "number" &&
    status >= 400 &&
    status < 500 &&
    typeof payload === "object" &&
    payload !== null &&
    !Array.isArray(payload) &&
    !("code" in (payload as Record<string, unknown>))
  ) {
    (payload as Record<string, unknown>)["code"] = "invalid_request";
  }
  return payload;
}

function refused(
  status: number,
  payload: Record<string, unknown>,
): DraftResult {
  return {
    status,
    body: dumpsPy(normalize4xx(status, payload)),
    contentType: JSON_CT,
    headers: {},
  };
}

function answered(status: number, payload: unknown): DraftResult {
  return {
    status,
    body: dumpsPy(payload),
    contentType: JSON_CT,
    headers: {},
  };
}

/** draft_id_ok (editor_runs.py 818-822) — owned by the admission
 *  gate (src/core/params.ts); the old address below keeps working. */
export { draftIdOk };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  // PyNum is a class instance holding a number LITERAL — a leaf
  // scalar for every isinstance gate below (py's numbers are never
  // dicts), never a mapping with a "literal" key.
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    !(v instanceof PyNum)
  );
}

// ---------------------------------------------------------------------------
// Numbers: CPython repr fidelity for the load -> dump round-trip.
// ---------------------------------------------------------------------------

const INT_RE: RegExp = /^-?(0|[1-9]\d*)$/;

/** True for int-valued literals (kept verbatim — exact at any
 *  width); everything else numeric normalizes via pyFloatRepr. */
function isIntLiteral(lit: string): boolean {
  return INT_RE.test(lit);
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
  if (lead === digits.length) return "0.0"; // unreachable (v != 0)
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

/** Walk a parseJson value: int literals stay verbatim, float
 *  literals normalize to CPython repr form (py's json.load ->
 *  json.dump round-trip: 1.00 -> "1.0", 1e2 -> "100.0"). */
function normalizeNumbers(v: unknown): unknown {
  if (v instanceof PyNum) {
    return isIntLiteral(v.literal)
      ? v
      : new PyNum(pyFloatRepr(Number(v.literal)));
  }
  // Plain host numbers (only the calls-unwrap path produces them —
  // JSON.parse of the encoded array): floats normalize to py repr,
  // ints ride exact.
  if (typeof v === "number") {
    if (!Number.isFinite(v) || Number.isInteger(v)) return v;
    return new PyNum(pyFloatRepr(v));
  }
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) v[i] = normalizeNumbers(v[i]);
    return v;
  }
  if (isPlainObject(v)) {
    for (const k of Object.keys(v)) v[k] = normalizeNumbers(v[k]);
    return v;
  }
  return v;
}

/** Python repr() of an arbitrary JSON value — the input_value side
 *  of the birth-gate refusal text (None/True/False, ints verbatim,
 *  floats via pyFloatRepr, strings single-quoted, containers
 *  recursive with ", " separators — probed verbatim 2026-09-07). */
function pyReprValue(v: unknown): string {
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
    return Number.isInteger(v) ? String(v) : pyFloatRepr(v);
  }
  if (Array.isArray(v)) {
    return "[" + v.map(pyReprValue).join(", ") + "]";
  }
  if (typeof v === "object") {
    const parts: string[] = Object.keys(v).map(
      (k: string): string =>
        pyReprString(k) + ": " + pyReprValue((v as Record<string, unknown>)[k]),
    );
    return "{" + parts.join(", ") + "}";
  }
  return pyReprString(String(v));
}

/** The input_type side of the refusal text. */
function pyTypeName(v: unknown): string {
  if (v === null || v === undefined) return "NoneType";
  if (typeof v === "boolean") return "bool";
  if (typeof v === "string") return "str";
  if (Array.isArray(v)) return "list";
  if (v instanceof PyNum) return isIntLiteral(v.literal) ? "int" : "float";
  if (typeof v === "number") return Number.isInteger(v) ? "int" : "float";
  return "dict";
}

/** Compact JSON (separators=(",",":") — the on-disk draft bytes,
 *  ensure_ascii=False so non-ASCII rides raw UTF-8, exactly like
 *  py's persist writes). */
function dumpsCompact(v: unknown): string {
  if (v === null) return "null";
  if (v === true) return "true";
  if (v === false) return "false";
  if (typeof v === "string") return JSON.stringify(v) ?? "null";
  if (typeof v === "number") {
    if (Number.isInteger(v)) return String(v);
    return pyFloatRepr(v);
  }
  if (v instanceof PyNum) return v.literal;
  if (Array.isArray(v)) {
    return "[" + v.map(dumpsCompact).join(",") + "]";
  }
  if (typeof v === "object") {
    const parts: string[] = [];
    for (const k of Object.keys(v as Record<string, unknown>)) {
      const e: unknown = (v as Record<string, unknown>)[k];
      if (e === undefined) continue;
      parts.push((JSON.stringify(k) ?? "null") + ":" + dumpsCompact(e));
    }
    return "{" + parts.join(",") + "}";
  }
  return JSON.stringify(String(v)) ?? "null";
}

// ---------------------------------------------------------------------------
// Birth gate: run_wire.validate_draft_birth, pydantic-exact text.
// ---------------------------------------------------------------------------

/** Pydantic version the refusal URL is baked against (probed live
 *  2026-09-07: pydantic 2.13.4). An upgrade changes the URL — the
 *  parity wall compares against live py, so drift fails LOUD there,
 *  never silently here. */
const PYDANTIC_DOCS: string = "https://errors.pydantic.dev/2.13/v/";

function gateStringType(loc: string, v: unknown): string {
  return (
    loc +
    "\n  Input should be a valid string [type=string_type, input_value=" +
    pyReprValue(v) +
    ", input_type=" +
    pyTypeName(v) +
    "]\n    For further information visit " +
    PYDANTIC_DOCS +
    "string_type"
  );
}

function gateTooShort(loc: string, v: string): string {
  return (
    loc +
    "\n  String should have at least 1 character [type=string_too_short, input_value=" +
    pyReprString(v) +
    ", input_type=str]\n    For further information visit " +
    PYDANTIC_DOCS +
    "string_too_short"
  );
}

function gateListType(loc: string, v: unknown): string {
  return (
    loc +
    "\n  Input should be a valid list [type=list_type, input_value=" +
    pyReprValue(v) +
    ", input_type=" +
    pyTypeName(v) +
    "]\n    For further information visit " +
    PYDANTIC_DOCS +
    "list_type"
  );
}

/** The error rows for one extracted stage triple, field order
 *  id/inputs/provenance (pydantic definition order). A non-dict
 *  stage extracts all-None (validate_draft_birth 160-161 reads
 *  .get off {} for non-dicts — here: undefined, same repr). */
function birthStageErrors(st: unknown): string[] {
  const src: Record<string, unknown> = isPlainObject(st) ? st : {};
  const has = (k: string): boolean =>
    Object.prototype.hasOwnProperty.call(src, k);
  const id: unknown = has("id") ? src["id"] : undefined;
  const inputs: unknown = has("inputs") ? src["inputs"] : undefined;
  const prov: unknown = has("provenance") ? src["provenance"] : undefined;
  const errs: string[] = [];
  if (typeof id !== "string") errs.push(gateStringType("id", id));
  else if (id === "") errs.push(gateTooShort("id", id));
  if (!Array.isArray(inputs)) {
    errs.push(gateListType("inputs", inputs));
  } else {
    for (let i = 0; i < inputs.length; i++) {
      if (typeof inputs[i] !== "string") {
        errs.push(gateStringType("inputs." + i, inputs[i]));
      }
    }
  }
  if (typeof prov !== "string") errs.push(gateStringType("provenance", prov));
  else if (prov === "") errs.push(gateTooShort("provenance", prov));
  return errs;
}

/** validate_draft_birth (run_wire.py 151-170): the FIRST failing
 *  stage in list order reports; a non-list stages arm validates the
 *  synthetic [{"id": ""}] triple. Returns the pydantic-exact text,
 *  or null when the doc passes. Doc-level keys are composer-set and
 *  always valid — unreachable, ungated (same as py in practice). */
export function birthRefusalText(doc: Record<string, unknown>): string | null {
  const raw: unknown = doc["stages"];
  const stages: unknown[] = Array.isArray(raw) ? raw : [{ id: "" }];
  for (const st of stages) {
    const errs: string[] = birthStageErrors(st);
    if (errs.length > 0) {
      const head: string =
        errs.length === 1
          ? "1 validation error for DraftBirthStage"
          : errs.length + " validation errors for DraftBirthStage";
      return head + "\n" + errs.join("\n");
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Compose: _ray_compose_draft_doc + _unwrap_calls + _mint_draft_id.
// ---------------------------------------------------------------------------

let draftSeq = 0;

/** _mint_draft_id (editor_runs.py 908-911): draft-<time hex>-<tid
 *  hex>-<seq hex>. The tid is a thread id in py, the pid here —
 *  the wall asserts the SHAPE (hex triples), never equality: ids
 *  are minted independently per server. */
export function mintDraftId(nowSec?: number): string {
  const t: number =
    nowSec !== undefined ? nowSec : Math.floor(Date.now() / 1000);
  const pid: number = (process.pid >>> 0) || 1;
  const seq: number = draftSeq++;
  return (
    "draft-" + t.toString(16) + "-" + pid.toString(16) + "-" + seq.toString(16)
  );
}

/** _unwrap_calls (editor_runs.py 884-901): a JSON-encoded STRING
 *  under a "calls" key becomes the array it encodes — FIRST
 *  occurrence only, dicts only (lists are never traversed), fresh
 *  per stage (the composer calls it once per stage row). Mutates in
 *  place, returns true when it replaced. */
function unwrapCalls(obj: unknown): boolean {
  if (!isPlainObject(obj)) return false;
  for (const k of Object.keys(obj)) {
    const v: unknown = obj[k];
    if (k === "calls" && typeof v === "string") {
      let arr: unknown = undefined;
      try {
        arr = JSON.parse(v);
      } catch {
        arr = undefined;
      }
      if (Array.isArray(arr)) {
        // Numbers inside the unwrapped array keep load->dump
        // fidelity (floats normalize to py repr, ints verbatim).
        obj[k] = normalizeNumbers(arr);
        return true;
      }
    }
    if (unwrapCalls(v)) return true;
  }
  return false;
}

/** _ray_compose_draft_doc (editor_runs.py 914-954): the six
 *  contract keys in ray's exact order, caller extras AFTER them in
 *  body order, per-stage birth defaults injected only when absent. */
export function composeDraftDoc(
  body: unknown,
  draftId: string,
  createdAtMs: number,
): Record<string, unknown> {
  let intent = "";
  let stages: unknown[] = [];
  const extras: Record<string, unknown> = {};
  if (isPlainObject(body)) {
    if (typeof body["intent"] === "string") intent = body["intent"];
    if (Array.isArray(body["stages"])) stages = body["stages"];
    for (const k of Object.keys(body)) {
      if (
        k === "intent" ||
        k === "stages" ||
        k === "draft_id" ||
        k === "status" ||
        k === "createdAt" ||
        k === "completedAt"
      ) {
        continue;
      }
      extras[k] = body[k];
    }
  }
  const outStages: unknown[] = [];
  stages.forEach((st: unknown, idx: number): void => {
    const src: Record<string, unknown> = isPlainObject(st) ? st : {};
    unwrapCalls(src);
    const row: Record<string, unknown> = {};
    if (!Object.prototype.hasOwnProperty.call(src, "id")) {
      row["id"] = "s_" + idx;
    }
    for (const k of Object.keys(src)) row[k] = src[k];
    if (!Object.prototype.hasOwnProperty.call(src, "inputs")) {
      row["inputs"] = [""];
    }
    if (!Object.prototype.hasOwnProperty.call(src, "provenance")) {
      row["provenance"] = "agent";
    }
    outStages.push(row);
  });
  const doc: Record<string, unknown> = {
    draft_id: draftId,
    intent,
    stages: outStages,
    status: "ready",
    createdAt: createdAtMs,
    completedAt: null,
  };
  for (const k of Object.keys(extras)) doc[k] = extras[k];
  return doc;
}

// ---------------------------------------------------------------------------
// Strict body: route() 4335-4340 for the strict arms.
// ---------------------------------------------------------------------------

/** Strict-parse the raw wire bytes: "" decodes as {} (py's
 *  body.decode() or "{}"); failure is the exact 400 bad-JSON shape
 *  (the TEXT embeds the host parser's message — V8 here, CPython
 *  there — so walls assert status + code + prefix, never bytes).
 *  The value comes from the literal-preserving parseJson (number
 *  fidelity — see header) once JSON.parse has accepted the text. */
function parseStrictBody(
  rawBody: Uint8Array,
): { doc: unknown } | { status: number; payload: Record<string, unknown> } {
  // The accept gate rides the admission gate (route() 4335-4340 —
  // the TEXT embeds the host parser's message, so walls assert
  // status + code + prefix, never bytes). The VALUE still comes
  // from the literal-preserving parseJson (number fidelity — the
  // admission gate's plain JSON.parse would round >2^53 and drop
  // the CPython float spellings).
  const wire = decodeStrictBody(rawBody);
  if (!("text" in wire)) return { status: wire.status, payload: wire.payload };
  const src: string = wire.text;
  try {
    return { doc: normalizeNumbers(parseJson(src)) };
  } catch {
    return { doc: JSON.parse(src) as unknown };
  }
}

// ---------------------------------------------------------------------------
// GET /v1/flows/drafts — drafts_list.
// ---------------------------------------------------------------------------

/** BYTE-wise sidecar_str (editor_runs.py 124-160): first '"key":',
 *  skip spaces/tabs, expect a quoted string, decode \\n \\r \\t
 *  (any other backslash drops to the literal byte), stop at
 *  cap-1 BYTES written. "" when absent or non-string. NOTE: py
 *  round-trips invalid UTF-8 via surrogateescape (mid-char cuts
 *  become lone surrogates); this decodes lossy U+FFFD instead —
 *  identical for valid UTF-8 (every wall fixture), divergent only
 *  for corrupt-UTF8 docs. */
function sidecarStrBytes(
  raw: Uint8Array,
  key: string,
  cap: number,
): string {
  const pat = Buffer.from('"' + key + '":', "ascii");
  const at: number = Buffer.from(raw).indexOf(pat);
  if (at < 0) return "";
  let p: number = at + pat.length;
  const n: number = raw.length;
  while (p < n && (raw[p] === 0x20 || raw[p] === 0x09)) p++;
  if (p >= n || raw[p] !== 0x22) return "";
  p++;
  const out: number[] = [];
  while (p < n && raw[p] !== 0x22 && out.length + 1 < cap) {
    if (raw[p] === 0x5c && p + 1 < n) {
      p++;
      const e: number = raw[p] as number;
      if (e === 0x6e) out.push(0x0a);
      else if (e === 0x72) out.push(0x0d);
      else if (e === 0x74) out.push(0x09);
      else out.push(e);
      p++;
    } else {
      out.push(raw[p] as number);
      p++;
    }
  }
  return Buffer.from(out).toString("utf8");
}

/** One index row's display fields from the doc's first 8191 chars
 *  (drafts_list 851-864: model cap 80, name/intent/title 160,
 *  service backstop for model 80; OSError reads as "" fields). */
function indexFields(full: string): { model: string; name: string } {
  let raw: Uint8Array;
  try {
    raw = Buffer.from(full.slice(0, 8191), "utf8");
  } catch {
    return { model: "", name: "" };
  }
  let model: string = sidecarStrBytes(raw, "model", 80);
  let disp: string = sidecarStrBytes(raw, "name", 160);
  if (disp === "") disp = sidecarStrBytes(raw, "intent", 160);
  if (disp === "") disp = sidecarStrBytes(raw, "title", 160);
  if (model === "") model = sidecarStrBytes(raw, "service", 80);
  return { model, name: disp };
}

/** GET /v1/flows/drafts — mirrors _h_drafts_list + drafts_list
 *  (aux_root is never passed by the gateway: single-root index). */
export function hDraftsList(draftsDir: string): DraftResult {
  const ents: { mt: number; row: Record<string, string> }[] = [];
  let names: string[];
  try {
    names = readdirSync(draftsDir);
  } catch {
    names = [];
  }
  for (const name of names) {
    const len: number = name.length;
    if (len < 6 || len > 110 || !name.endsWith(".json")) continue;
    const did: string = name.slice(0, -5);
    if (!draftIdOk(did)) continue;
    const full: string = join(draftsDir, name);
    let mt: number;
    try {
      mt = Math.floor(statSync(full).mtimeMs / 1000);
    } catch {
      continue;
    }
    let model = "";
    let disp = "";
    try {
      const fields = indexFields(readFileSync(full, "utf8"));
      model = fields.model;
      disp = fields.name;
    } catch {
      // OSError mid-read: row kept with "" fields (py: pass).
    }
    ents.push({ mt, row: { draft_id: did, model, name: disp } });
  }
  // std::sort by mtime DESC (py .sort is stable; so is this).
  ents.sort((a, b): number => b.mt - a.mt);
  const rows: Record<string, string>[] = ents
    .slice(0, 600)
    .map((e): Record<string, string> => e.row);
  // count is the TOTAL matches, pre-cap (the C contract — the
  // RunsEnvelope count>=len(runs) shape, drafts edition).
  return answered(200, { count: ents.length, drafts: rows });
}

// ---------------------------------------------------------------------------
// POST /v1/flows/drafts — drafts_save.
// ---------------------------------------------------------------------------

/** Py truthiness for the "empty body" gate (drafts_save 971: `if
 *  not body` — None/""/0/False/{}/[] all refuse). */
function pyTruthy(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "boolean") return v;
  // A kept literal parses numerically for truthiness (py's `if not
  // body` on the loaded scalar: 0/0.0 refuse, everything else passes).
  if (v instanceof PyNum) return Number(v.literal) !== 0;
  if (typeof v === "number") return v !== 0 && !Number.isNaN(v);
  if (typeof v === "string") return v.length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return true;
}

/** POST /v1/flows/drafts — mirrors _h_drafts_save + drafts_save.
 *  The persist is a PLAIN direct write (no tmp+rename — see header);
 *  success echoes {draftId, stages}. */
export function hDraftsSave(
  draftsDir: string,
  rawBody: Uint8Array,
): DraftResult {
  const parsed = parseStrictBody(rawBody);
  if (!("doc" in parsed)) {
    return {
      status: parsed.status,
      body: dumpsPy(parsed.payload),
      contentType: JSON_CT,
      headers: {},
    };
  }
  let body: unknown = parsed.doc;
  // The drafts_save str arm (963-969) on route()'s parsed ctx.json:
  // "" refuses; anything else re-parses as JSON (failure -> {} ->
  // refuses). The re-parse uses the HOST JSON parser exactly like
  // py's json.loads; objects/arrays then re-parse through the
  // literal-preserving reader for number fidelity.
  if (typeof body === "string") {
    if (body === "") return refused(400, { error: "empty body" });
    const wire: string = body;
    try {
      body = JSON.parse(wire) as unknown;
    } catch {
      body = {};
    }
    if (isPlainObject(body) || Array.isArray(body)) {
      try {
        body = normalizeNumbers(parseJson(wire));
      } catch {
        // Keep the JSON.parse value (unreachable in practice —
        // parseJson accepts everything JSON.parse does).
      }
    }
  }
  if (!pyTruthy(body)) return refused(400, { error: "empty body" });
  const draftId: string = mintDraftId();
  const doc: Record<string, unknown> = composeDraftDoc(
    body,
    draftId,
    Math.floor(Date.now() / 1000) * 1000,
  );
  const drift: string | null = birthRefusalText(doc);
  if (drift !== null) {
    return {
      status: 500,
      body: dumpsPy({ error: "draft composer drift: " + drift }),
      contentType: JSON_CT,
      headers: {},
    };
  }
  try {
    mkdirSync(draftsDir, { recursive: true });
    writeFileSync(join(draftsDir, draftId + ".json"), dumpsCompact(doc), "utf8");
  } catch {
    return {
      status: 500,
      body: dumpsPy({ error: "cannot persist draft" }),
      contentType: JSON_CT,
      headers: {},
    };
  }
  return answered(200, { draftId, stages: doc["stages"] });
}

// ---------------------------------------------------------------------------
// GET /v1/flows/drafts/:id — drafts_get (+ the _h verbatim wrapper).
// ---------------------------------------------------------------------------

/** Read the raw doc file for the get arm: py checks existence
 *  first and lets open() errors PROPAGATE (traceback-500 in
 *  _adapt) — so only ENOENT maps to 404 here; anything else
 *  rethrows for the server's 500 catch. (A raced-away file reads
 *  404 — the sane side of an untestable race.) */
function readDraftFile(draftsDir: string, draftId: string): string {
  try {
    return readFileSync(join(draftsDir, draftId + ".json"), "utf8");
  } catch (exc) {
    if ((exc as { code?: string }).code === "ENOENT") {
      throw { status: 404, payload: { error: "draft not found" } };
    }
    throw exc;
  }
}

/** GET /v1/flows/drafts/:id — mirrors _h_drafts_get + drafts_get
 *  (heal=False: the durationSec/quarantine heal is the C click
 *  door's, never the reader's). */
export function hDraftsGet(draftsDir: string, draftId: string): DraftResult {
  if (!draftIdOk(draftId)) return refused(400, { error: "bad id" });
  let text: string;
  try {
    text = readDraftFile(draftsDir, draftId);
  } catch (exc) {
    if (
      typeof exc === "object" &&
      exc !== null &&
      "status" in (exc as Record<string, unknown>)
    ) {
      const e = exc as {
        status: number;
        payload: Record<string, unknown>;
      };
      return refused(e.status, e.payload);
    }
    throw exc;
  }
  // The _h wrapper (3123-3134): parse the verbatim bytes once (a
  // str would double-encode on the wire); parser TEXT diverges per
  // host language (assert prefix, never bytes), while the
  // not-an-object refusal is a FIXED string (byte-identical).
  try {
    JSON.parse(text);
  } catch (exc) {
    const msg: string = exc instanceof Error ? exc.message : String(exc);
    return {
      status: 500,
      body: dumpsPy({ error: "draft corrupt on disk: " + msg }),
      contentType: JSON_CT,
      headers: {},
    };
  }
  let doc: unknown;
  try {
    doc = normalizeNumbers(parseJson(text));
  } catch {
    doc = JSON.parse(text) as unknown;
  }
  if (!isPlainObject(doc)) {
    return {
      status: 500,
      body: dumpsPy({ error: "draft corrupt on disk: not an object" }),
      contentType: JSON_CT,
      headers: {},
    };
  }
  return answered(200, doc);
}

// ---------------------------------------------------------------------------
// PATCH + GET-result — the draft-stage result loop.
// ---------------------------------------------------------------------------
// STAGE_PATCH_KEYS owned by the admission gate (imported above —
// the want-list voice below joins it in the same fixed order).

/** _load_draft_doc (editor_runs.py 1115-1132): (doc, null) or
 *  (null, reason) with reason in bad_id / "draft not found" /
 *  "draft corrupt on disk". Unlike the get arm, EVERY read/parse
 *  failure here is a reason, never a raise. */
function loadDraftDoc(
  draftsDir: string,
  draftId: string,
): { doc: Record<string, unknown> } | { reason: string } {
  if (!draftIdOk(draftId)) return { reason: "bad_id" };
  let doc: unknown;
  try {
    doc = normalizeNumbers(
      parseJson(readFileSync(join(draftsDir, draftId + ".json"), "utf8")),
    );
  } catch (exc) {
    if ((exc as { code?: string }).code === "ENOENT") {
      return { reason: "draft not found" };
    }
    return { reason: "draft corrupt on disk" };
  }
  if (!isPlainObject(doc) || !Array.isArray(doc["stages"])) {
    return { reason: "draft corrupt on disk" };
  }
  return { doc };
}

/** _stage_row (1135-1141): "" / "/" / >128 refuses to match (a
 *  gone target reconciles, never 404s). */
function stageRow(
  doc: Record<string, unknown>,
  stageId: string,
): Record<string, unknown> | null {
  if (stageId === "" || stageId.includes("/") || stageId.length > 128) {
    return null;
  }
  const stages: unknown[] = doc["stages"] as unknown[];
  for (const st of stages) {
    if (isPlainObject(st) && st["id"] === stageId) return st;
  }
  return null;
}

/** _atomic_write_draft (1099-1112): tmp+rename (resilience law: no
 *  torn docs); failure unlinks the tmp and reports false. */
function atomicWriteDraft(full: string, doc: Record<string, unknown>): boolean {
  const tmp: string = full + ".tmp";
  try {
    writeFileSync(tmp, dumpsCompact(doc), "utf8");
    renameSync(tmp, full);
  } catch {
    try {
      unlinkSync(tmp);
    } catch {
      // The unlink is best-effort, exactly as py's.
    }
    return false;
  }
  return true;
}

/** PATCH /v1/flows/drafts/:id/stages/:sid — mirrors
 *  _h_draft_stage_patch + draft_stage_patch. */
export function hDraftStagePatch(
  draftsDir: string,
  draftId: string,
  stageId: string,
  rawBody: Uint8Array,
): DraftResult {
  const parsed = parseStrictBody(rawBody);
  if (!("doc" in parsed)) {
    return {
      status: parsed.status,
      body: dumpsPy(parsed.payload),
      contentType: JSON_CT,
      headers: {},
    };
  }
  // Structure rides the admission gate (schemastery: which keys,
  // which types, in the door's fixed shape-check order); static
  // refusal texts ride its voice table (one lookup). The dict gates
  // stay PyNum-aware (isRecord excludes the literal-holder, as the
  // door's old isPlainObject did).
  const shape = checkDraftPatch(parsed.doc);
  if (shape.kind !== "ok") {
    if (shape.kind === "unknown-keys") {
      return refused(400, {
        error:
          "unknown stage patch key(s): " +
          shape.unknown.join(", ") +
          " (want " +
          STAGE_PATCH_KEYS.join(", ") +
          ")",
      });
    }
    return refused(400, { error: DRAFT_PATCH_VOICE[shape.kind] });
  }
  const patch: Record<string, unknown> = shape.patch;
  const loaded = loadDraftDoc(draftsDir, draftId);
  if (!("doc" in loaded)) {
    if (loaded.reason === "bad_id") return refused(400, { error: "bad id" });
    if (loaded.reason === "draft corrupt on disk") {
      return {
        status: 500,
        body: dumpsPy({ error: loaded.reason }),
        contentType: JSON_CT,
        headers: {},
      };
    }
    return answered(200, {
      draftId,
      stageId,
      delivered: false,
      reason: loaded.reason,
    });
  }
  const st: Record<string, unknown> | null = stageRow(loaded.doc, stageId);
  if (st === null) {
    return answered(200, {
      draftId,
      stageId,
      delivered: false,
      reason: "stage not found",
    });
  }
  if ("result" in patch) st["result"] = patch["result"];
  if ("runStatus" in patch) st["runStatus"] = patch["runStatus"];
  if ("params" in patch) {
    const merged: Record<string, unknown> = isPlainObject(st["params"])
      ? (st["params"] as Record<string, unknown>)
      : {};
    const incoming: Record<string, unknown> = patch[
      "params"
    ] as Record<string, unknown>;
    for (const k of Object.keys(incoming)) merged[k] = incoming[k];
    st["params"] = merged;
  }
  for (const key of ["inputs", "inputOutputs"] as const) {
    if (key in patch) st[key] = patch[key];
  }
  if (!atomicWriteDraft(join(draftsDir, draftId + ".json"), loaded.doc)) {
    return {
      status: 500,
      body: dumpsPy({ error: "cannot persist draft" }),
      contentType: JSON_CT,
      headers: {},
    };
  }
  return answered(200, {
    draftId,
    stageId,
    delivered: true,
    patched: Object.keys(patch).sort(),
  });
}

/** GET /v1/flows/drafts/:id/stages/:sid/result — mirrors
 *  _h_draft_stage_result + draft_stage_result. */
export function hDraftStageResult(
  draftsDir: string,
  draftId: string,
  stageId: string,
): DraftResult {
  const loaded = loadDraftDoc(draftsDir, draftId);
  if (!("doc" in loaded)) {
    if (loaded.reason === "bad_id") return refused(400, { error: "bad id" });
    return answered(200, { found: false });
  }
  const st: Record<string, unknown> | null = stageRow(loaded.doc, stageId);
  if (st === null || !isPlainObject(st["result"])) {
    return answered(200, { found: false });
  }
  return answered(200, { found: true, result: st["result"] });
}

// ---------------------------------------------------------------------------
// Door-registration seam.
// ---------------------------------------------------------------------------

/** Map a ROUTES handler name to its drafts implementation, or null
 *  when the row is not a drafts door (the dispatcher falls through
 *  to the 404 shape). POST/PATCH ride the caller's raw body (same
 *  strict contract as route()); regex arms ride the caller's match
 *  groups (m[1] = draft_id, m[2] = stage_id). */
export function dispatchDrafts(
  handler: string,
  m: RegExpExecArray | null,
  rawBody: Uint8Array,
  stateRoot: string,
): DraftResult | null {
  const dir: string = join(stateRoot, "drafts");
  if (handler === "_h_drafts_list") return hDraftsList(dir);
  if (handler === "_h_drafts_save") return hDraftsSave(dir, rawBody);
  if (handler === "_h_drafts_get") {
    return hDraftsGet(dir, (m?.[1] as string) ?? "");
  }
  if (handler === "_h_draft_stage_patch") {
    return hDraftStagePatch(
      dir,
      (m?.[1] as string) ?? "",
      (m?.[2] as string) ?? "",
      rawBody,
    );
  }
  if (handler === "_h_draft_stage_result") {
    return hDraftStageResult(
      dir,
      (m?.[1] as string) ?? "",
      (m?.[2] as string) ?? "",
    );
  }
  return null;
}

/** The draft CRUD doors as a self-registering plugin: file-backed
 *  JSON under <stateRoot>/drafts; POST/PATCH ride the caller's raw
 *  body under route()'s strict contract, regex arms ride the match
 *  groups. Matches its own rows inside the listener (dispatchDrafts
 *  answers draft rows and returns null for every other handler —
 *  gating on its answer alone preserves the old fall-through
 *  exactly). No services injected — the door reads nothing through
 *  the context. */
export const draftsDoors: Plugin = {
  name: "gateway-drafts",
  apply(ctx: Context): void {
    ctx.on(
      "gateway/request",
      (req: GatewayRequest): DispatchResult | undefined => {
        const hit = matchRoute(req.method, req.path);
        if (hit === null) return undefined;
        const draft: DispatchResult | null = dispatchDrafts(
          hit.row.handler,
          hit.m,
          req.body,
          req.roots.stateRoot,
        );
        if (draft !== null) return draft;
        return undefined;
      },
    );
  },
};
