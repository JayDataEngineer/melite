// The validate door — the _h_flows_validate port (python/gateway.py:2719).
//
// P4 EXECUTION STROKE (ladder P4; the pure half of infra/python/flow.py): the
// compile door with NO engine POST, NO queue slot, NO GPU, NO sidecar.
// The three arms mirror the py door exactly:
//
//   {model}       -> strict body, artifact sweep, compose phase 1.
//   {flow}        -> named-flow compile (existence + identifier loud;
//                    loadable flows STUB (unported half — see below).
//   {flow_inline} -> flow_from_body + compile + pin sweep (PURE port).
//   bare          -> the inline shape as itself.
//
// PURE / IMPURE SPLIT (what this stroke ports, and what it refuses):
//   PORTED (byte-identical bodies on the wall): _strict_body texts,
//   flow_from_body + Flow construction validators (wires, kinds with
//   the derived engine table, branches, $channels), to_graph's door
//   view, _validate_batch_rows, _workflow_sweep (comfyui pin), the
//   artifact-ref sweep, cost_preview's empty-queue shape, and the
//   cordis CLI compose arm (the SAME CLI py shells —
//   packages/engines/comfyui/compose/__init__.py:151 — same argv, same
//   cwd, same facts file, so refusal stderr lines are identical).
//   STUBBED (HTTP 400, code-identical, text-native): non-cordis
//   compose arms (the python schema registries — audio_cpp,
//   anycreature, autoremesher, skintokens — return live graphs py
//   validates in-process; there is no TS plane for them in this
//   stroke), and the card-requires gate (needs card classes +
//   estate config + vendor disk — the wall proves it passes for
//   every golden mid, so the skip is verdict-safe on the pinned
//   estate).
//   PORTED 2026-09-08 (the flows-port lane): loadable named flows
//   ride the TS registry (doors/flowsRegistry.ts — the flow.py
//   authoring plane, killed the same stroke) through the SAME
//   flowFromBody/compile/sweep pipeline as inline bodies, with the
//   compile-time initial gate (photo/glb/dialect) ahead of it.
//   PORTED NATIVE 2026-09-08 (the AI-ladder probe found the gap):
//   card= stages validate against the TS single declaration —
//   cardGate resolves the live card registry (loadCardDefs, the
//   compose door's own cache) at plugin apply and runs the
//   Schemastery schema parse per stage; the model-present gate text
//   stays byte-identical, the schema refusal envelope is
//   "schema refused body — <schemastery msg>" (field+floor named,
//   e.g. "$.seed expected number >= -1 but got -2").
//
// DERIVED TABLES (no hardcodes per QUEUE LANE LAW — each is pinned by
// the wall against live py, so drift fails LOUD, never silent):
//   ENGINE_TABLE   — engine -> {plugin, default_output}: probed live
//     from infra/python/plugins.py scan_engines + DEFAULT_OUTPUT (anycreature/
//     mesh, audio_cpp/audio, comfyui/image, sim/text,
//     skintokens/mesh — autoremesher retired 2026-09-07). The wall
//     re-derives it per run.
//   PYDANTIC_PIN   — the min_length/model_type message shapes this
//     stroke fakes (pydantic 2.13 URLs): only reachable through the
//     empty-string and CLI-rim channels, both pinned byte-exact.
//   The (comfyui.comfyui) compose prefix rides ENGINE_TABLE[comfyui]
//   (plugin dir name + engine type, as scan_engines reports them).
//
// STAMP OVERLAY (gateway.py _route_stamp_overlay 702-751, shared
// via ctx.cardRegistry.overlayCardParams — the SAME service method
// the start door's phase-1 runs, so validate+start compose identical
// params): family defaults + the selected variant's
// resolver_defaults, absent-keys-only, filtered to the card field
// surface; R1 variant/quant keys consumed. Missing-required
// refusals are value-free, so the overlay is invisible on every
// byte leg; on variant routes (krea-2-raw's steps=52) it is
// load-bearing — the CLI merges only family defaults, exactly as
// card_compose does after the py overlay.
//
// RETRIES/TIMEOUT_S QUIRK (flow.py:1463-1470): flow_from_body pulls
// stage fields BY NAME and never passes retries/timeout_s to
// Stage(...) — they clear the STAGE_KEYS extras check and are then
// silently dropped. Mirrored (dropped), pinned by a wall leg.
//
// PYDICT / PYSET / PYENUMERATE EDGES: set(dict) is the KEY set;
// enumerate() iterates dict KEYS and throws TypeError on
// non-iterables; sorted() is codepoint order. Mirrored structurally
// (pySetOfKeys / pyEnumerate below) so the 500-class legs agree by
// status — the wall asserts bytes where py is deterministic and
// status where py throws interpreter texts.
//
// Erasable-syntax TS only (estate convention): no enums, import
// type for types, .ts specifiers for relative imports.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { CardDefinition } from "@comfyui/cordis";
import type { Context, Plugin } from "@deepseek-ai/cordis";
import type { DispatchResult } from "@melite/gateway-core";
import type { GatewayRequest } from "@melite/gateway-core";
import { matchRoute } from "@melite/gateway-core";
import { CardArmError, needCardRegistry } from "./flowsCard.ts";
import type { CardRegistryService, ModelFactsRow } from "./flowsCard.ts";
import {
  expandRegistryFlow,
  getRegistryFlow,
  registryFlowToInline,
  registryInitialsError,
} from "./flowsRegistry.ts";
import {
  checkStrictBody,
  DOOR_KEYS,
  isRecord,
  isStringField,
  parseStrictJson,
} from "@melite/gateway-core";

/** The door answer — mirrors _h_* (status, payload); the dispatcher
 *  runs normalize4xx + serializePy over it exactly as route()+_adapt
 *  do (ctx.ts). */
export interface FlowsValidateAnswer {
  status: number;
  payload: Record<string, unknown>;
}

// ── derived tables ──────────────────────────────────────────────
// ENGINE_TABLE: engine_type -> {plugin_id, default_output kind}.
// MONO-ENGINE LAW (operator order, 2026-09-08: "we are building an
// api caller for comfyui, not having engines anymore"): ComfyUI is
// the only engine. The old engine tiers (cpp/audio-cpp,
// cpp/skintokens, cpp/autoremesher, node/anycreature, sim —
// estate-owned subprocess compute, every card decl-only and never
// composable) are QUARANTINED to vendor/retired-engines/ pending
// rebirth as vendored ComfyUI custom nodes. Probed live from
// infra/python/plugins.py scan_engines(); the wall re-derives per run.
const ENGINE_TABLE: Record<string, { plugin: string; def: string }> = {
  comfyui: { plugin: "comfyui", def: "image" },
};

// ── closed vocabularies (infra/python/flow.py Kind / SkipWhen order) ──────
const KIND_VOCAB: readonly string[] = [
  "text",
  "image",
  "video",
  "audio",
  "mesh",
  "num",
  "lora",
  "seg",
];
const SKIP_VOCAB: readonly string[] = ["present", "absent"];

// _INLINE_TOP_KEYS sorted (flow.py:dead/allowed messages).
const INLINE_TOP_SORTED: readonly string[] = ["description", "id", "stages"];
// sorted(STAGE_KEYS) (flow.py:250-259) — the extras message lists them.
const STAGE_KEYS_SORTED: readonly string[] = [
  "card",
  "card_io",
  "description",
  "engine",
  "expected",
  "id",
  "inputs",
  "outputs",
  "params",
  "retries",
  "skip_when",
  "timeout_s",
];

// ── strict-body vocab (python/gateway.py:230-245) ───────────────────
// Owned by the admission gate (src/core/params.ts — the SSOT shared
// with the start door); the envelope lift the modelArm used to own
// here moved to CardRegistryService.overlayCardParams (doors/
// flowsCard.ts — the SAME lift the start door runs, so
// validate+start compose identical params). The id REs below stay here (flow-construction semantics,
// not envelope admission).

const FLOW_ID_RE: RegExp = /^[a-z_][a-z0-9_-]*$/;
// Pydantic message pin (see header): the faked 2.13 shapes.
const PYDANTIC_URL: string = "https://errors.pydantic.dev/2.13/v/";

// ── repo anchoring (the uploads.ts pattern: MELITE_REPO_ROOT else
// file-anchored; parity needs it unset-or-equal — py REPO is
// source-anchored and knows no override) ─────────────────────────
function resolveRepoRoot(): string {
  const override: string = process.env["MELITE_REPO_ROOT"] ?? "";
  if (override !== "") return override;
  const here: string = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..", "..", "..", "..");
}

// ── python repr/str mirrors ─────────────────────────────────────
// pyReprStr: python repr() of a str — single quotes, backslash +
// quote + C0 escapes, \xXX for other non-printables; printable
// unicode rides verbatim (py semantics; UTF-16/astral divergence is
// documented — wall legs are ASCII).
function pyReprStr(s: string): string {
  let out: string = "'";
  for (const ch of s) {
    const cp: number = (ch as string).codePointAt(0) ?? 0;
    if (ch === "'") out += "\\'";
    else if (ch === "\\") out += "\\\\";
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else if (cp < 0x20 || (cp >= 0x7f && cp <= 0x9f)) {
      out += "\\x" + cp.toString(16).padStart(2, "0");
    } else out += ch;
  }
  return out + "'";
}

// The pydantic message truncation (probed live 2026-09-07 against
// the estate's pydantic, including multi-char-escape heads: the rule
// sits on the QUOTED repr — len > 50 -> first 25 + "..." + last 24).
function pyTruncatedRepr(s: string): string {
  const r: string = pyReprStr(s);
  if ([...r].length > 50) {
    const chars: string[] = [...r];
    return chars.slice(0, 25).join("") + "..." + chars.slice(-24).join("");
  }
  return r;
}

// pyReprJson: python str()/repr() of decoded JSON — None/True/False,
// ints verbatim, single-quoted strings, [...]
// lists, insertion-ordered {'k': v} dicts. Floats are best-effort
// (py str(1.0) is "1.0", JSON/JS says "1" — no wall leg floats).
function pyReprJson(v: unknown): string {
  if (v === null || v === undefined) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  if (typeof v === "string") return pyReprStr(v);
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return "[" + v.map(pyReprJson).join(", ") + "]";
  if (typeof v === "object") {
    const parts: string[] = [];
    for (const k of Object.keys(v as Record<string, unknown>)) {
      parts.push(pyReprStr(k) + ": " + pyReprJson((v as Record<string, unknown>)[k]));
    }
    return "{" + parts.join(", ") + "}";
  }
  return String(v);
}

// The [...] of sorted strings py embeds in messages (repr(sorted)).
function pyReprStrList(items: string[]): string {
  return "[" + [...items].sort().map(pyReprStr).join(", ") + "]";
}

// pyStr: python str() for the coerced scalars flow_from_body applies
// (str(id), str(engine), str(description), str(label)). True/False/
// None spellings matter; floats are best-effort (see pyReprJson).
function pyStr(v: unknown): string {
  if (typeof v === "string") return v;
  if (v === true) return "True";
  if (v === false) return "False";
  if (v === null || v === undefined) return "None";
  if (typeof v === "number") return String(v);
  return pyReprJson(v);
}

// pySetOfKeys: set(st) — dicts yield KEYS, lists/strings yield
// items/chars, anything else throws TypeError (the 500-class legs
// agree by status through the server catch, as py does through
// _adapt). Dict elements of a list are unhashable in py (500) but
// holdable in a JS Set — documented edge, no wall leg.
function pySetOfKeys(v: unknown): Set<unknown> {
  if (typeof v === "string") return new Set([...v]);
  if (Array.isArray(v)) return new Set(v);
  if (typeof v === "object" && v !== null) return new Set(Object.keys(v));
  throw new TypeError("'" + typeof v + "' object is not iterable");
}

// ── flow errors (infra/python/flow.py FlowError — the door's 400 language) ─
class FlowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FlowError";
  }
}

// ── strict body (python/gateway.py:248 _strict_body, verbatim) ──────
// Key split owned by the admission gate; the FlowError prose stays here.
function strictBody(body: Record<string, unknown>): void {
  const offense = checkStrictBody(body);
  if (offense.bad.length > 0) {
    throw new FlowError(
      "request body carries retired runner knob(s) " +
        pyReprStrList(offense.bad) +
        " — the runner never reads these (silent-drop class); " +
        "remove them",
    );
  }
  if (offense.carry.length > 0) {
    throw new FlowError(
      "request body carries retired pipe-carry key(s) " +
        pyReprStrList(offense.carry) +
        " — the 2026-08-10 stowaway wire: no gateway ever " +
        "stashed it (flow_doc was never emitted). The revive " +
        "rail is the draft (draft_id) + the run registry; card " +
        "bodies carry params only",
    );
  }
}

// A gateway ValidationError (python/gateway.py:114 — code always set,
// default invalid_request; str(e) is the verbatim legacy text).
interface Refusal {
  message: string;
  code: string;
  loc?: string;
  expected?: string;
  got?: string;
}

function refusalEnvelope(r: Refusal): Record<string, unknown> {
  const body: Record<string, unknown> = { error: r.message, code: r.code };
  if (r.loc !== undefined) body["loc"] = r.loc;
  if (r.expected !== undefined) body["expected"] = r.expected;
  if (r.got !== undefined) body["got"] = r.got;
  return body;
}

// ── inline edges / kinds / branches ─────────────────────────────
type Edge = { kind: "initial"; key: string } | { kind: "stage"; stage: string; output: string };

function edgeRef(e: Edge): string {
  return e.kind === "initial" ? "__initial__." + e.key : e.stage + "." + e.output;
}

function inlineKind(where: string, value: unknown): string {
  // Leaf-type structure rides the admission gate (schemastery); the
  // closed-vocab membership + FlowError prose stay here (py voice).
  if (!isStringField(value)) {
    throw new FlowError(where + ": kind " + pyReprJson(value) + " is not a string");
  }
  if (!(KIND_VOCAB as readonly string[]).includes(value)) {
    throw new FlowError(
      where +
        ": " +
        pyReprStr(value) +
        " is not a Kind — the closed vocabulary is " +
        pyReprJson([...KIND_VOCAB]),
    );
  }
  return value;
}

function inlineEdge(where: string, value: unknown): Edge {
  if (!isRecord(value)) {
    throw new FlowError(
      where +
        ": edge " +
        pyReprJson(value) +
        ' is not an object — use {"initial": key} ' +
        'or {"stage": id, "output": name}',
    );
  }
  const keys: string[] = Object.keys(value);
  if (keys.length === 1 && keys[0] === "initial") {
    // str(value["initial"]) — mirrors FromInitial(key=str(...));
    // the empty-string min_length refusal is faked byte-exact below.
    return { kind: "initial", key: pyStr((value as Record<string, unknown>)["initial"]) };
  }
  if (keys.length === 2 && keys.includes("stage") && keys.includes("output")) {
    const rec: Record<string, unknown> = value as Record<string, unknown>;
    return { kind: "stage", stage: pyStr(rec["stage"]), output: pyStr(rec["output"]) };
  }
  throw new FlowError(
    where +
      ": edge keys " +
      pyReprStrList(keys) +
      ' are not an edge shape — exactly {"initial": key} ' +
      'or {"stage": id, "output": name}',
  );
}

interface StageSkip {
  initial: string;
  when: string;
}

function inlineSkip(where: string, value: unknown): StageSkip | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) {
    throw new FlowError(
      where +
        ": skip_when " +
        pyReprJson(value) +
        ' is not an object — use {"initial": ' +
        "key, \"when\": present|absent}",
    );
  }
  const keys: string[] = Object.keys(value);
  if (keys.length !== 2 || !keys.includes("initial") || !keys.includes("when")) {
    throw new FlowError(
      where +
        ": skip_when keys " +
        pyReprStrList(keys) +
        ' are not a branch shape — exactly {"initial": key, ' +
        '"when": present|absent}',
    );
  }
  const rec: Record<string, unknown> = value;
  const when: unknown = rec["when"];
  if (!isStringField(when) || !(SKIP_VOCAB as readonly string[]).includes(when)) {
    throw new FlowError(
      where +
        ": " +
        pyReprJson(when) +
        " is not a branch condition — the closed vocabulary " +
        "is " +
        pyReprJson([...SKIP_VOCAB]),
    );
  }
  const initial: unknown = rec["initial"];
  if (!isStringField(initial) || initial === "") {
    throw new FlowError(
      where + ": skip initial " + pyReprJson(initial) + " is not a non-empty string",
    );
  }
  return { initial, when };
}

// ── pydantic-shape fakes (pinned — see header PYDANTIC_PIN) ─────
// Only the empty-string min_length channel is reachable through
// flow_from_body (every other scalar is str()'d or dict()'d first);
// the message is deterministic given the installed pydantic.
function minLengthRefusal(cls: string, field: string): string {
  return (
    "1 validation error for " +
    cls +
    "\n" +
    field +
    "\n  String should have at least 1 character " +
    "[type=string_too_short, input_value='', input_type=str]\n" +
    "    For further information visit " +
    PYDANTIC_URL +
    "string_too_short"
  );
}

// py's container type names for the AttributeError/TypeError texts
// flow_from_body surfaces ("'int' object has no attribute 'items'").
function pyTypeName(v: unknown): string {
  if (v === null || v === undefined) return "NoneType";
  if (Array.isArray(v)) return "list";
  if (typeof v === "string") return "str";
  if (typeof v === "boolean") return "bool";
  if (typeof v === "number") return Number.isInteger(v) ? "int" : "float";
  if (typeof v === "object") return "dict";
  return typeof v;
}

// dict(st.get("params") or {}) — the real dict() constructor
// semantics: mappings copy; strings/lists are pair sequences (each
// element a length-2 sequence — strings count); anything else is a
// TypeError; unhashable keys are a TypeError. Deterministic texts,
// ported verbatim (wrapped as "stage[i] refuses:" by the caller).
function pyDictCoerce(v: unknown): Record<string, unknown> {
  if (typeof v === "object" && v !== null && !Array.isArray(v)) {
    return { ...(v as Record<string, unknown>) };
  }
  if (typeof v === "string" || Array.isArray(v)) {
    const out: Record<string, unknown> = {};
    const seq: ArrayLike<unknown> = v as ArrayLike<unknown>;
    for (let i = 0; i < seq.length; i++) {
      const el: unknown = seq[i];
      if (typeof el !== "string" && !Array.isArray(el)) {
        throw new Error(
          "cannot convert dictionary update sequence element #" + i + " to a sequence",
        );
      }
      const pair: ArrayLike<unknown> = el as ArrayLike<unknown>;
      if (pair.length !== 2) {
        throw new Error(
          "dictionary update sequence element #" +
            i +
            " has length " +
            [...(el as string)].length +
            "; 2 is required",
        );
      }
      const key: unknown = pair[0];
      if (typeof key === "object" && key !== null) {
        throw new Error(
          "unhashable type: '" + (Array.isArray(key) ? "list" : "dict") + "'",
        );
      }
      out[pyStr(key)] = pair[1];
    }
    return out;
  }
  throw new Error("'" + pyTypeName(v) + "' object is not iterable");
}

// Renderers for the Stage value_error input_value fake: the kwargs
// flow_from_body passes to Stage(**...) — PARSED edges/kinds/skip,
// coerced params — with pydantic-model and str-Enum reprs.
function renderEdge(e: Edge): string {
  if (e.kind === "initial") return "FromInitial(key=" + pyReprStr(e.key) + ")";
  return "FromStage(stage=" + pyReprStr(e.stage) + ", output=" + pyReprStr(e.output) + ")";
}

function renderKind(kind: string): string {
  return "<Kind." + kind + ": " + pyReprStr(kind) + ">";
}

function renderSkip(skip: StageSkip | null): string {
  if (skip === null) return "None";
  return (
    "StageSkip(initial=" +
    pyReprStr(skip.initial) +
    ", when=<SkipWhen." +
    skip.when +
    ": " +
    pyReprStr(skip.when) +
    ">)"
  );
}

function renderStrMap(entries: Array<{ name: string; kind: string }>): string {
  return (
    "{" + entries.map((e) => pyReprStr(e.name) + ": " + renderKind(e.kind)).join(", ") + "}"
  );
}

function renderEdgeMap(entries: Array<{ name: string; edge: Edge }>): string {
  return (
    "{" + entries.map((e) => pyReprStr(e.name) + ": " + renderEdge(e.edge)).join(", ") + "}"
  );
}

// The Stage _id_legal refusal (Stage._id_legal is a mode=after
// validator raising FlowError — pydantic wraps it as value_error
// over the FULL Stage kwargs; flow_from_body surfaces the whole
// ValidationError under "stage[i] refuses:").
function stageIdRefusal(
  id: string,
  engine: string,
  description: string,
  params: Record<string, unknown>,
  inputs: Array<{ name: string; edge: Edge }>,
  outputs: Array<{ name: string; kind: string }>,
  expected: Array<{ name: string; kind: string }>,
  card: string,
  cardIo: Array<{ name: string; kind: string }>,
  skipWhen: StageSkip | null,
): string {
  const kwargs: string =
    "{'id': " +
    pyReprStr(id) +
    ", 'engine': " +
    pyReprStr(engine) +
    ", 'description': " +
    pyReprStr(description) +
    ", 'params': " +
    pyReprJson(params) +
    ", 'inputs': " +
    renderEdgeMap(inputs) +
    ", 'outputs': " +
    renderStrMap(outputs) +
    ", 'expected': " +
    renderStrMap(expected) +
    ", 'card': " +
    pyReprStr(card) +
    ", 'card_io': " +
    renderStrMap(cardIo) +
    ", 'skip_when': " +
    renderSkip(skipWhen) +
    "}";
  return (
    "1 validation error for Stage\n" +
    "  Value error, stage id " +
    pyReprStr(id) +
    " is not a legal identifier [type=value_error, input_value=" +
    pyTruncatedReprRaw(kwargs) +
    ", input_type=dict]\n" +
    "    For further information visit " +
    PYDANTIC_URL +
    "value_error"
  );
}

// ── stage rows ──────────────────────────────────────────────────
interface StageRow {
  id: string;
  engine: string;
  description: string;
  params: Record<string, unknown>;
  inputs: Array<{ name: string; edge: Edge }>;
  outputs: Array<{ name: string; kind: string }>;
  expected: Array<{ name: string; kind: string }>;
  card: string;
  cardIo: Array<{ name: string; kind: string }>;
  skipWhen: StageSkip | null;
}

interface Flow {
  id: string;
  description: string;
  stages: StageRow[];
}

// Truncation over an ALREADY-repr'd display (dict/model displays
// carry no outer quotes — slice the display itself).
function pyTruncatedReprRaw(display: string): string {
  if ([...display].length > 50) {
    const chars: string[] = [...display];
    return chars.slice(0, 25).join("") + "..." + chars.slice(-24).join("");
  }
  return display;
}

// Build one stage row from a JSON stage (flow.py:1425-1477): the
// extras gate runs OUTSIDE the per-stage try (py line 1435 —
// set(st) on a non-dict stage with extras dies with AttributeError
// on .get; sorted() on mixed extras dies with TypeError), then the
// isinstance gate, then the per-name pulls inside the try whose
// FlowErrors pass through bare and every other exception wraps as
// "stage[i] refuses:".
function buildStageRow(i: number, st: unknown): StageRow {
  const where: string = "stage[" + i + "]";
  // sorted(set(st) - STAGE_KEYS) — the SET contains whatever st
  // yields (list items, dict keys); non-string survivors kill
  // sorted() exactly as py dies.
  const rawExtras: unknown[] = [...pySetOfKeys(st)].filter(
    (k) => typeof k !== "string" || !(STAGE_KEYS_SORTED as readonly string[]).includes(k),
  );
  if (rawExtras.length > 0) {
    if (typeof st !== "object" || st === null || Array.isArray(st)) {
      throw new TypeError("'" + pyTypeName(st) + "' object has no attribute 'get'");
    }
    if (rawExtras.some((k) => typeof k !== "string")) {
      throw new TypeError("'<' not supported between instances");
    }
    const rawId: unknown = (st as Record<string, unknown>)["id"] ?? "<no id>";
    throw new FlowError(
      where +
        " " +
        pyReprJson(rawId) +
        ": body carries unknown field(s) " +
        pyReprStrList(rawExtras as string[]) +
        " — the schema declares " +
        pyReprJson([...STAGE_KEYS_SORTED]) +
        " (extra=forbid at the door)",
    );
  }
  if (typeof st !== "object" || st === null || Array.isArray(st)) {
    throw new FlowError(where + ": " + pyReprJson(st) + " is not an object");
  }
  try {
    const rec: Record<string, unknown> = st as Record<string, unknown>;
    // (st.get("inputs") or {}) — falsy rides {}, truthy must be a
    // dict (.items() AttributeError text by container type).
    const rawInputs: unknown = rec["inputs"] || {};
    if (typeof rawInputs !== "object" || rawInputs === null || Array.isArray(rawInputs)) {
      throw new Error("'" + pyTypeName(rawInputs) + "' object has no attribute 'items'");
    }
    const inputs: Array<{ name: string; edge: Edge }> = Object.entries(
      rawInputs as Record<string, unknown>,
    ).map(([name, edge]) => ({
      name,
      edge: inlineEdge(where + " input " + pyReprStr(name), edge),
    }));
    const rawOutputs: unknown = rec["outputs"] || {};
    if (typeof rawOutputs !== "object" || rawOutputs === null || Array.isArray(rawOutputs)) {
      throw new Error("'" + pyTypeName(rawOutputs) + "' object has no attribute 'items'");
    }
    const outputs: Array<{ name: string; kind: string }> = [];
    for (const [name, kind] of Object.entries(rawOutputs as Record<string, unknown>)) {
      outputs.push({ name, kind: inlineKind(where + " output " + pyReprStr(name), kind) });
    }
    const rawExpected: unknown = rec["expected"] || {};
    if (typeof rawExpected !== "object" || rawExpected === null || Array.isArray(rawExpected)) {
      throw new Error("'" + pyTypeName(rawExpected) + "' object has no attribute 'items'");
    }
    const expected: Array<{ name: string; kind: string }> = [];
    for (const [name, kind] of Object.entries(rawExpected as Record<string, unknown>)) {
      expected.push({ name, kind: inlineKind(where + " expected " + pyReprStr(name), kind) });
    }
    const rawCardIo: unknown = rec["card_io"] || {};
    if (typeof rawCardIo !== "object" || rawCardIo === null || Array.isArray(rawCardIo)) {
      throw new Error("'" + pyTypeName(rawCardIo) + "' object has no attribute 'items'");
    }
    const cardIo: Array<{ name: string; kind: string }> = [];
    for (const [name, kind] of Object.entries(rawCardIo as Record<string, unknown>)) {
      cardIo.push({ name, kind: inlineKind(where + " card_io " + pyReprStr(name), kind) });
    }
    const skipWhen: StageSkip | null = inlineSkip(where, rec["skip_when"] ?? null);
    // dict(st.get("params") or {}) — real dict() coercion semantics.
    const params: Record<string, unknown> = pyDictCoerce(rec["params"] || {});
    // Stage pydantic fields in DEFINITION order: id/engine
    // min_length=1 (faked field errors), then the _id_legal
    // after-validator (the value_error fake over the full kwargs).
    // str(st.get("id", "")) — missing rides "", present rides str().
    const id: string = "id" in rec ? pyStr(rec["id"]) : "";
    if (id === "") throw new FlowError(where + " refuses: " + minLengthRefusal("Stage", "id"));
    const engine: string = "engine" in rec ? pyStr(rec["engine"]) : "";
    if (engine === "") {
      throw new FlowError(where + " refuses: " + minLengthRefusal("Stage", "engine"));
    }
    const description: string = "description" in rec ? pyStr(rec["description"]) : "";
    const card: string = pyStr(rec["card"] || "");
    if (!FLOW_ID_RE.test(id)) {
      throw new FlowError(
        where +
          " refuses: " +
          stageIdRefusal(id, engine, description, params, inputs, outputs, expected, card, cardIo, skipWhen),
      );
    }
    // FromInitial(key) min_length=1 — the empty-key fake (raised by
    // _inline_edge's own FromInitial(...) construction, before any
    // Stage check — unreachable here, kept for shape faithfulness).
    for (const inp of inputs) {
      if (inp.edge.kind === "initial" && inp.edge.key === "") {
        throw new FlowError(where + " refuses: " + minLengthRefusal("FromInitial", "key"));
      }
    }
    return { id, engine, description, params, inputs, outputs, expected, card, cardIo, skipWhen };
  } catch (e) {
    if (e instanceof FlowError) throw e;
    throw new FlowError(where + " refuses: " + (e as Error).message);
  }
}

// ── Flow construction validators (infra/python/flow.py, pure subset) ─────
// _wires_resolve (flow.py:769): illegal flow id, duplicate ids
// (own loop FIRST), then earlier-stage edges. Plain FlowErrors —
// flow_from_body digs them out of the ValidationError wrapper, so
// the door prints them bare.
function wiresResolve(flowId: string, stages: StageRow[]): void {
  if (!FLOW_ID_RE.test(flowId)) {
    throw new FlowError("flow id " + pyReprStr(flowId) + " is not a legal identifier");
  }
  const seen: Set<string> = new Set();
  for (const st of stages) {
    if (seen.has(st.id)) {
      throw new FlowError("duplicate stage id " + pyReprStr(st.id));
    }
    seen.add(st.id);
  }
  const done: string[] = [];
  for (const st of stages) {
    for (const inp of st.inputs) {
      const edge: Edge = inp.edge;
      if (edge.kind !== "stage") continue;
      if (!done.includes(edge.stage)) {
        throw new FlowError(
          "stage " +
            pyReprStr(st.id) +
            " input " +
            pyReprStr(inp.name) +
            " wires to " +
            pyReprStr(edgeRef(edge)) +
            " — not an EARLIER stage (known earlier: " +
            (done.length > 0 ? pyReprJson([...done].sort()) : "none") +
            ")",
        );
      }
    }
    done.push(st.id);
  }
}

// cardDefs — the live card registry for the card-stage lattice,
// cardGate — the CARD-STAGE LATTICE body gate (infra/python/flow.py:793
// _card_params_gate -> stage_params.validate_stage_params, PORTED
// NATIVE 2026-09-08): (1) the model gate stays byte-identical (the
// wall pins it); (2) the schema pass rides the TS single
// declaration — the registry's Schemastery schema parse, the same
// validator compose runs, never a second truth.
// (Stroke 2a: the defs map rides the service — the old module cache
// resolved ONCE at plugin apply is gone; the loader gates this
// door on the card-registry provider, so defsSync() is primed here.
// The registry arg is optional only for pre-service callers —
// card stages without it throw LOUD.)
function cardGate(
  flowId: string,
  st: StageRow,
  cards?: CardRegistryService | null,
): void {
  const defs: Map<string, CardDefinition> = needCardRegistry(cards, "cardGate").defsSync();
  const def = defs.get(st.card);
  // requiresModel: false (pure-tool cards, boarded: []) skips the
  // {model:} demand — the py row.requires_model parity. Unknown
  // cards still hit the model gate first (order preserved: the wall
  // pins the model-gate text verbatim).
  if (def?.requiresModel !== false) {
    const model: unknown = st.params["model"];
    if (!model || !String(model).trim()) {
      throw new FlowError(
        "flow " +
          pyReprStr(flowId) +
          " stage " +
          pyReprStr(st.id) +
          ": card " +
          pyReprStr(st.card) +
          " requires params.model (the model row id the card composes " +
          "against — see GET /v1/models) — the flow-stage equivalent " +
          "of the {model:} door",
      );
    }
  }
  if (def === undefined) {
    throw new FlowError(
      "flow " +
        pyReprStr(flowId) +
        " stage " +
        pyReprStr(st.id) +
        ": card " +
        pyReprStr(st.card) +
        " is not a registered card (the card set boots from " +
        "src/cards — see GET /v1/tools for the served surface)",
    );
  }
  try {
    def.schema(st.params ?? {});
  } catch (exc) {
    const msg = exc instanceof Error ? exc.message : String(exc);
    throw new FlowError(
      "flow " +
        pyReprStr(flowId) +
        " stage " +
        pyReprStr(st.id) +
        ": card " +
        pyReprStr(st.card) +
        " schema refused body — " +
        msg,
    );
  }
}

// kindsOk with engineDefaults ({} at construction = deferred,
// the ENGINE_TABLE at validate_engines = full).
function kindsOk(
  flowId: string,
  stages: StageRow[],
  engineDefaults: Record<string, string | null>,
  cards?: CardRegistryService | null,
): void {
  // The lattice gate is its own pass BEFORE kinds (flow.py:793
  // docstring: "Runs BEFORE _validate_kinds").
  for (const st of stages) {
    if (st.card) cardGate(flowId, st, cards);
  }
  const outputsByStage: Map<string, Map<string, string>> = new Map();
  for (const st of stages) {
    const effectiveExpected: Map<string, string> = new Map(
      st.expected.map((e) => [e.name, e.kind]),
    );
    const inputNames: Set<string> = new Set(st.inputs.map((i) => i.name));
    const expectedNames: Set<string> = new Set(effectiveExpected.keys());
    const onlyInput: string[] = [...inputNames].filter((k) => !expectedNames.has(k)).sort();
    const onlyExpected: string[] = [...expectedNames].filter((k) => !inputNames.has(k)).sort();
    if (onlyInput.length > 0 || onlyExpected.length > 0) {
      const bits: string[] = [];
      if (onlyInput.length > 0) bits.push("wired but untyped: " + pyReprJson(onlyInput));
      if (onlyExpected.length > 0) bits.push("typed but unwired: " + pyReprJson(onlyExpected));
      throw new FlowError(
        "flow " +
          pyReprStr(flowId) +
          " stage " +
          pyReprStr(st.id) +
          ": inputs/expected mismatch (" +
          bits.join("; ") +
          ") — every input needs an expected Kind, every expected " +
          "Kind needs an input",
      );
    }
    const resolved: Map<string, string> = new Map();
    for (const o of st.outputs) resolved.set(o.name, o.kind);
    for (const o of st.cardIo) resolved.set(o.name, o.kind);
    if (resolved.size === 0 && !st.card) {
      if (st.engine in engineDefaults) {
        const def: string | null = engineDefaults[st.engine] ?? null;
        if (def === null) {
          throw new FlowError(
            "flow " +
              pyReprStr(flowId) +
              " stage " +
              pyReprStr(st.id) +
              ": engine " +
              pyReprStr(st.engine) +
              " declares no default_output and stage declares no " +
              "outputs — add outputs={'default': <Kind>} on the stage, " +
              "or set DEFAULT_OUTPUT on the engine",
          );
        }
        resolved.set("default", def);
      }
      // else: defer; the validate_engines() pass fills it in.
    }
    if (resolved.size > 0) outputsByStage.set(st.id, resolved);
    // else: defer; the validate_engines() pass fills it in (a stage
    // with no entry reads as upstream-unknown downstream — skipped,
    // never refused — until the full pass).
    for (const inp of st.inputs) {
      if (inp.edge.kind !== "stage") continue;
      const upstream: Map<string, string> | undefined = outputsByStage.get(inp.edge.stage);
      if (upstream === undefined) continue; // later stage or deferred
      if (!upstream.has(inp.edge.output)) {
        throw new FlowError(
          "flow " +
            pyReprStr(flowId) +
            " stage " +
            pyReprStr(st.id) +
            " input " +
            pyReprStr(inp.name) +
            ": stage " +
            pyReprStr(inp.edge.stage) +
            " has no output named " +
            pyReprStr(inp.edge.output) +
            " (declared outputs: " +
            pyReprJson([...upstream.keys()].sort()) +
            ")",
        );
      }
      const upstreamKind: string = upstream.get(inp.edge.output) ?? "";
      const receivingKind: string = effectiveExpected.get(inp.name) ?? "";
      if (upstreamKind !== receivingKind) {
        throw new FlowError(
          "flow " +
            pyReprStr(flowId) +
            " stage " +
            pyReprStr(st.id) +
            " input " +
            pyReprStr(inp.name) +
            ": expected " +
            receivingKind +
            ", got " +
            upstreamKind +
            " from stage " +
            pyReprStr(inp.edge.stage) +
            " output " +
            pyReprStr(inp.edge.output) +
            " — must be " +
            receivingKind,
        );
      }
    }
  }
}

// validateEngines (flow.py:1066): every stage's engine through the
// bus — here the wall-pinned ENGINE_TABLE (existence + DEFAULT_OUTPUT);
// then the FULL kind pass. Unknown-engine text mirrors
// plugins.load_engine verbatim (infra/python/plugins.py:479).
function validateEngines(flow: Flow, cards?: CardRegistryService | null): Flow {
  const engineDefaults: Record<string, string | null> = {};
  for (const st of flow.stages) {
    const row: { plugin: string; def: string } | undefined = ENGINE_TABLE[st.engine];
    if (row === undefined) {
      throw new FlowError(
        "flow " +
          pyReprStr(flow.id) +
          " stage " +
          pyReprStr(st.id) +
          ": engine " +
          pyReprStr(st.engine) +
          " — no engine plugin for type " +
          pyReprStr(st.engine) +
          " (no packages/*/engines/*/engine.py or engine.yaml declares it)",
      );
    }
    engineDefaults[st.engine] = row.def;
  }
  kindsOk(flow.id, flow.stages, engineDefaults, cards);
  return flow;
}

// flowFromBody (flow.py:1388): JSON body -> validated Flow.
function flowFromBody(body: unknown, cards?: CardRegistryService | null): Flow {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new FlowError("flow body must be a JSON object");
  }
  const rec: Record<string, unknown> = body as Record<string, unknown>;
  const dead: string[] = Object.keys(rec).filter(
    (k) => !(INLINE_TOP_SORTED as readonly string[]).includes(k),
  );
  if (dead.length > 0) {
    throw new FlowError(
      "flow body carries unknown keys " +
        pyReprStrList(dead) +
        " — allowed: " +
        pyReprJson([...INLINE_TOP_SORTED]),
    );
  }
  if (!("id" in rec) || !("stages" in rec)) {
    throw new FlowError(
      "flow body needs at least id and stages — got keys " + pyReprStrList(Object.keys(rec)),
    );
  }
  const stagesIn: unknown = rec["stages"];
  if (!Array.isArray(stagesIn) || stagesIn.length === 0) {
    throw new FlowError("flow stages must be a non-empty list");
  }
  const rows: StageRow[] = [];
  for (let i = 0; i < stagesIn.length; i++) {
    rows.push(buildStageRow(i, stagesIn[i]));
  }
  const flowId: string = pyStr(rec["id"]);
  // Flow(...) construction: wires + deferred kinds (the pydantic
  // native id/… refusals surface here — only "" is reachable, faked).
  if (flowId === "") {
    throw new FlowError(minLengthRefusal("Flow", "id"));
  }
  wiresResolve(flowId, rows);
  kindsOk(flowId, rows, {}, cards);
  const flow: Flow = { id: flowId, description: pyStr(rec["description"] ?? ""), stages: rows };
  return validateEngines(flow, cards);
}

// ── branch prune (flow.py:659 pruned_for — verbatim) ────────────
function prunedFor(flow: Flow, body: Record<string, unknown>, cards?: CardRegistryService | null): { flow: Flow; pruned: string[] } {
  if (!flow.stages.some((st) => st.skipWhen !== null)) return { flow, pruned: [] };
  const pruned: Map<string, StageSkip> = new Map();
  const kept: StageRow[] = [];
  for (const st of flow.stages) {
    const cond: StageSkip | null = st.skipWhen;
    if (cond === null) {
      kept.push(st);
      continue;
    }
    const present: boolean = body[cond.initial] !== undefined && body[cond.initial] !== null;
    const fire: boolean = cond.when === "present" ? present : !present;
    if (fire) pruned.set(st.id, cond);
    else kept.push(st);
  }
  if (kept.length === 0) {
    throw new FlowError(
      "flow " +
        pyReprStr(flow.id) +
        ": the branch pruned every stage (fired: " +
        pyReprJson([...pruned.keys()].sort()) +
        ") — a run with no stages never registers",
    );
  }
  const merged: StageRow[] = [];
  for (const st of kept) {
    const hitsPruned: boolean = st.inputs.some(
      (i) => i.edge.kind === "stage" && pruned.has(i.edge.stage),
    );
    if (!hitsPruned) {
      merged.push(st);
      continue;
    }
    const newInputs: Array<{ name: string; edge: Edge }> = st.inputs.map((i) => ({ ...i }));
    for (const inp of newInputs) {
      if (inp.edge.kind !== "stage" || !pruned.has(inp.edge.stage)) continue;
      const cond: StageSkip = pruned.get(inp.edge.stage) as StageSkip;
      if (cond.when !== "present") {
        throw new FlowError(
          "flow " +
            pyReprStr(flow.id) +
            " stage " +
            pyReprStr(st.id) +
            " input " +
            pyReprStr(inp.name) +
            " wires FromStage(" +
            pyReprStr(edgeRef(inp.edge as { kind: "stage"; stage: string; output: string })) +
            ") to pruned stage " +
            " (branch " +
            pyReprStr(cond.initial) +
            " fired) — no request key to merge (absent-trigger prunes " +
            "carry nothing)",
        );
      }
      inp.edge = { kind: "initial", key: cond.initial };
    }
    merged.push({ ...st, inputs: newInputs });
  }
  // RECONSTRUCTED — every construction validator re-runs (TS scope:
  // wires + deferred kinds; card/tool/validators are no-ops here).
  wiresResolve(flow.id, merged);
  kindsOk(flow.id, merged, {}, cards);
  return { flow: { id: flow.id, description: flow.description, stages: merged }, pruned: [...pruned.keys()] };
}

// ── to_graph door view (flow.py:958 — card-less subset) ─────────
interface GraphNode {
  id: string;
  engine: string;
  description: string;
  inputFrom: string[];
  inputNames: string[];
  outputs: Array<{ name: string; kind: string }>;
  params: unknown;
}

function toGraph(flow: Flow): GraphNode[] {
  return flow.stages.map((st) => {
    const outputs: Array<{ name: string; kind: string }> = [];
    if (st.outputs.length > 0) {
      for (const o of st.outputs) outputs.push({ ...o });
    } else if (st.cardIo.length > 0) {
      for (const o of st.cardIo) outputs.push({ ...o });
    } else {
      // validateEngines already refused unknown engines and the
      // table carries a default for every known one — the
      // try/except-unknown shape of to_graph collapses to the table.
      const row: { plugin: string; def: string } | undefined = ENGINE_TABLE[st.engine];
      if (row !== undefined) outputs.push({ name: "default", kind: row.def });
    }
    return {
      id: st.id,
      engine: st.engine,
      description: st.description,
      inputFrom: st.inputs.map((i) => edgeRef(i.edge)),
      inputNames: st.inputs.map((i) => i.name),
      outputs,
      params: st.params,
    };
  });
}

// _dollar_tokens (flow_graph.py:33): whole-string $-tokens.
function dollarTokens(params: unknown): string[] {
  const out: string[] = [];
  const walk = (v: unknown): void => {
    if (typeof v === "string") {
      if (v.startsWith("$") && v.length > 1) out.push(v.slice(1));
    } else if (Array.isArray(v)) {
      for (const item of v) walk(item);
    } else if (typeof v === "object" && v !== null) {
      for (const val of Object.values(v as Record<string, unknown>)) walk(val);
    }
  };
  walk(params);
  return out;
}

// compile (flow.py:732): prune, then to_graph, then the unresolved
// $channel gate (flow_graph.py:169 — per-node pool, ALL bad joined).
function compileFlow(
  flow: Flow,
  body: Record<string, unknown>,
  cards?: CardRegistryService | null,
): { nodes: GraphNode[]; skipped: string[] } {
  const { flow: built, pruned } = prunedFor(flow, body, cards);
  const nodes: GraphNode[] = toGraph(built);
  const bad: string[] = [];
  for (const node of nodes) {
    const pool: Set<string> = new Set(node.inputNames);
    for (const ref of node.inputFrom) {
      if (ref.startsWith("__initial__.")) pool.add(ref.split(".", 2)[1] ?? "");
      else pool.add(ref);
    }
    const sortedPool: string[] = [...pool].sort();
    for (const token of dollarTokens(node.params)) {
      if (!pool.has(token)) {
        bad.push(
          "stage " +
            pyReprStr(node.id) +
            " references $" +
            token +
            " (available: " +
            (sortedPool.length > 0 ? sortedPool.join(", ") : "nothing") +
            ")",
        );
      }
    }
  }
  if (bad.length > 0) {
    throw new FlowError("unresolved $channel(s): " + bad.join("; "));
  }
  return { nodes, skipped: pruned };
}

// ── batch rows (python/gateway.py:2856 _validate_batch_rows) ────────
function batchRows(body: unknown, firstError: string, cards?: CardRegistryService | null): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [
    { scope: "flow", error: firstError, code: "flow_compile", loc: "flow" },
  ];
  const stages: unknown =
    typeof body === "object" && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>)["stages"]
      : undefined;
  if (!Array.isArray(stages)) return rows;
  for (let i = 0; i < stages.length; i++) {
    const st: unknown = stages[i];
    // st.get("id", "stage[%d]" % i) then str() — a present null
    // labels "None", not the default.
    const label: string =
      typeof st === "object" && st !== null && !Array.isArray(st)
        ? pyStr("id" in (st as Record<string, unknown>) ? (st as Record<string, unknown>)["id"] : "stage[" + i + "]")
        : "stage[" + i + "]";
    if (typeof st === "object" && st !== null && !Array.isArray(st)) {
      const stripped: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(st as Record<string, unknown>)) {
        if (k !== "inputs" && k !== "expected") stripped[k] = v;
      }
      try {
        flowFromBody({ id: "probe", stages: [stripped] }, cards);
      } catch (e) {
        if (e instanceof FlowError) {
          rows.push({ stage: label, error: e.message, code: "flow_compile" });
        } else {
          throw e;
        }
      }
    }
  }
  for (const wrow of sweepWorkflows(body)) rows.push(wrow);
  return rows;
}

// ── pin sweep (python/gateway.py:2827 _workflow_sweep +
// compose/__init__.py:198 validate_workflow) ─────────────────────
let pinCache: Set<string> | null = null;

function pinNodeClasses(): Set<string> {
  if (pinCache !== null) return pinCache;
  try {
    const pinPath: string = join(resolveRepoRoot(), "packages", "engines", "comfyui", "data", "object_info.json");
    const obj: unknown = JSON.parse(readFileSync(pinPath, "utf8"));
    pinCache =
      typeof obj === "object" && obj !== null
        ? new Set(Object.keys(obj as Record<string, unknown>))
        : new Set();
  } catch {
    // an unreadable pin must not brick the door — empty set makes
    // every class "unknown" (compose/__init__.py:190-194).
    pinCache = new Set();
  }
  return pinCache;
}

function validateWorkflow(params: unknown): string[] {
  const wf: unknown =
    typeof params === "object" && params !== null && !Array.isArray(params)
      ? (params as Record<string, unknown>)["workflow"]
      : undefined;
  if (typeof wf !== "object" || wf === null || Array.isArray(wf)) return [];
  const wfRec: Record<string, unknown> = wf as Record<string, unknown>;
  const raw: unknown =
    typeof wfRec["workflow"] === "object" && wfRec["workflow"] !== null && !Array.isArray(wfRec["workflow"])
      ? wfRec["workflow"]
      : wf;
  const known: Set<string> = pinNodeClasses();
  const rows: string[] = [];
  for (const [nodeId, node] of Object.entries(raw as Record<string, unknown>)) {
    const cls: unknown =
      typeof node === "object" && node !== null && !Array.isArray(node)
        ? (node as Record<string, unknown>)["class_type"]
        : undefined;
    if (cls === undefined || cls === null) {
      rows.push("workflow node " + pyReprStr(nodeId) + ": no class_type");
    } else if (!known.has(pyStr(cls))) {
      rows.push(
        "workflow node " +
          pyReprStr(nodeId) +
          ": class_type " +
          pyReprStr(pyStr(cls)) +
          " is not in the pinned object_info (" +
          known.size +
          " pinned classes) — refresh the pin or fix the class name",
      );
    }
  }
  return rows;
}

function sweepWorkflows(body: unknown): Array<Record<string, unknown>> {
  const stages: unknown =
    typeof body === "object" && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>)["stages"]
      : undefined;
  if (!Array.isArray(stages)) return [];
  const rows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < stages.length; i++) {
    const st: unknown = stages[i];
    if (typeof st !== "object" || st === null || Array.isArray(st)) continue;
    const rec: Record<string, unknown> = st as Record<string, unknown>;
    const engine: unknown = rec["engine"];
    const label: string = pyStr("id" in rec ? rec["id"] : "stage[" + i + "]");
    if (typeof engine !== "string") continue;
    // Only engines exporting validate_workflow are swept (comfyui
    // today — compose/__init__.py:198; the bus try/except-continue
    // collapses to this since the table is the bus here).
    if (engine !== "comfyui") continue;
    if (typeof rec["params"] !== "object" || rec["params"] === null || Array.isArray(rec["params"])) {
      continue;
    }
    for (const wrow of validateWorkflow(rec["params"])) {
      rows.push({ stage: label, error: wrow, code: "workflow_pin" });
    }
  }
  return rows;
}

// ── artifact-ref sweep (infra/python/artifact_refs.py + gateway.py:617) ───
const ASSET_RUNS_PREFIX: string = "/v1/assets/runs/";

function stateRoots(): { outRoot: string; testOutRoot: string } {
  // artifact_refs.py:39 — REPO-anchored, no env override (the sweep
  // knows no MELITE_STATE_ROOT; mirroring exactly).
  const runs: string = join(resolveRepoRoot(), "data", "runs");
  return { outRoot: join(runs, "output"), testOutRoot: join(runs, "test-output") };
}

function resolveArtifactFile(ref: string, outRoot: string): string {
  const raw: string = String(ref ?? "").trim();
  if (raw === "") throw new Error("empty artifact ref (nothing to resolve)");
  if (raw.includes("..")) throw new Error("artifact ref refuses traversal: " + pyReprStr(raw));
  let cand: string;
  if (raw.startsWith(ASSET_RUNS_PREFIX)) {
    const rel: string = raw.slice(ASSET_RUNS_PREFIX.length);
    if (rel === "" || rel.endsWith("/") || !rel.includes("/")) {
      throw new Error(
        "malformed artifact URL (want /v1/assets/runs/<run_id>/<file>): " + pyReprStr(raw),
      );
    }
    cand = join(outRoot, rel);
  } else if (raw.includes("/") && !raw.startsWith("/")) {
    cand = join(outRoot, raw);
  } else if (raw.startsWith("/")) {
    cand = raw;
  } else {
    throw new Error(
      "artifact ref is a bare " +
        pyReprStr(raw) +
        " — not an absolute path, an artifact URL " +
        "(/v1/assets/runs/<run>/<file>), or a runs-relative " +
        "<run>/<file> (a bare filename lives in the ComfyUI input " +
        "dir and is the caller's staging concern, never a disk lookup)",
    );
  }
  const absCand: string = resolve(cand);
  const absRoot: string = resolve(outRoot);
  // os.path.commonpath([abs_cand, abs_root]) != abs_root ⟺ the
  // join escaped the root (no absolute escape smuggled through
  // form 3, e.g. a leading // or symlink prefix).
  const relToRoot: string = relative(absRoot, absCand);
  if (relToRoot === ".." || relToRoot.startsWith(".." + sep)) {
    throw new Error("artifact ref escapes the output root: " + pyReprStr(raw));
  }
  let isFile: boolean = false;
  try {
    isFile = statSync(absCand).isFile();
  } catch {
    isFile = false;
  }
  if (!isFile) {
    const run: string = raw.startsWith(ASSET_RUNS_PREFIX)
      ? raw.slice(ASSET_RUNS_PREFIX.length).split("/", 2)[0] ?? "?"
      : "?";
    throw new Error(
      "artifact not found on disk: " +
        pyReprStr(raw) +
        " (looked up " +
        absCand +
        ") — the upstream run may have been pruned, or the ref was " +
        "never an output of run " +
        run,
    );
  }
  return absCand;
}

// _ref_locations (artifact_refs.py:106): the stack-DFS verbatim
// (LIFO pop — order matters when several refs dangle; the wall's
// legs dangle one).
function refLocations(body: unknown): Array<{ location: string; ref: string }> {
  const out: Array<{ location: string; ref: string }> = [];
  const stack: Array<{ node: unknown; path: string }> = [{ node: body, path: "$" }];
  while (stack.length > 0) {
    const top: { node: unknown; path: string } = stack.pop() as { node: unknown; path: string };
    const node: unknown = top.node;
    const path: string = top.path;
    if (typeof node === "object" && node !== null && !Array.isArray(node)) {
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        stack.push({ node: value, path: path + "." + key });
      }
    } else if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        stack.push({ node: node[i], path: path + "[" + i + "]" });
      }
    } else if (typeof node === "string" && node.startsWith(ASSET_RUNS_PREFIX)) {
      out.push({ location: path, ref: node });
    }
  }
  return out;
}

function findDanglingRefs(body: Record<string, unknown>): Array<[string, string, string]> {
  const { outRoot, testOutRoot } = stateRoots();
  const dangling: Array<[string, string, string]> = [];
  for (const { location, ref } of refLocations(body)) {
    let live: boolean = false;
    let primaryErr: Error | null = null;
    for (const root of [outRoot, testOutRoot]) {
      try {
        resolveArtifactFile(ref, root);
        live = true;
        break;
      } catch (e) {
        if (primaryErr === null) primaryErr = e as Error;
      }
    }
    // the refusal quotes the PRIMARY root lookup (artifact_refs.py:161).
    if (!live) dangling.push([location, ref, (primaryErr as Error).message]);
  }
  return dangling;
}

// ── model facts + model-dir scan (resolve_model's TS mirror) ────
// (Stroke 2a: the facts/route/mids caches that lived here are
// CardRegistryService state now — this door reads them through its
// injected service. The absent-facts degrade survives at the
// modelArm call site, which catches the service's strict read.)

// ── the cordis CLI compose arm ──────────────────────────────────
// packages/engines/comfyui/compose/__init__.py:110 — same argv, same
// cwd (repo root), same facts file. rc!=0 -> the plugins.compose
// ValidationError text verbatim; rc==0 -> the FlowGraph rim refusal
// (the rim model_validates the stdout STRING — always a model_type
// refusal — faked byte-exact under PYDANTIC_PIN).
function composeViaCli(fam: string, card: string, params: Record<string, unknown>): Refusal | null {
  const repo: string = resolveRepoRoot();
  const cli: string = join(repo, "packages", "engines", "comfyui", "cordis", "src", "cli.ts");
  const facts: string = join(
    repo,
    "packages",
    "engines",
    "comfyui",
    "cordis",
    "data",
    "model-facts.json",
  );
  if (!existsSync(cli) || !existsSync(facts)) {
    throw new FlowError(
      "cordis compose plane incomplete: cli.ts=" +
        String(existsSync(cli)) +
        " facts=" +
        String(existsSync(facts)),
    );
  }
  const argv: string[] = [
    "--experimental-strip-types",
    "--no-warnings",
    cli,
    "compose",
    "--card",
    card,
    "--model",
    fam,
    "--facts",
    facts,
    "--params",
    JSON.stringify(params),
  ];
  // run_id "" (phase 1) carries no --run-id flag (compose:155).
  let stdout: string;
  try {
    stdout = execFileSync(process.execPath, argv, {
      cwd: repo,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 16 * 1024 * 1024,
    }) as string;
  } catch (e) {
    const status: unknown = (e as { status?: unknown }).status;
    const stderr: string = String((e as { stderr?: unknown }).stderr ?? "");
    if (typeof status === "number") {
      const lines: string[] = stderr
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l !== "");
      const detail: string = lines.length > 0 ? (lines[lines.length - 1] as string) : "no detail (rc=" + status + ")";
      const row: { plugin: string; def: string } = ENGINE_TABLE["comfyui"] as {
        plugin: string;
        def: string;
      };
      return {
        message:
          "card_compose phase 1: card_compose rc=" +
          status +
          " (" +
          row.plugin +
          ".comfyui): " +
          detail,
        code: "card_compose",
      };
    }
    throw e;
  }
  // rc 0 with graph text on stdout: the rim PARSES it (the py rim's
  // wrap — infra/python/plugins.py card_compose seam, 2026-09-07: CLI JSON text
  // -> one stage row carrying the full node map). Validate only
  // needs "composed OK" — the graph itself rides the start path.
  // A non-JSON text throws (py's json.loads raises the same class
  // of uncaught decode error — parity by construction).
  const text: string = typeof stdout === "string" ? stdout : String(stdout ?? "");
  JSON.parse(text);
  return null satisfies Refusal | null;
}

// ── {model} arm (gateway.py:595 resolve_card_model, ported subset) ─
function modelArm(body: Record<string, unknown>, cards?: CardRegistryService | null): FlowsValidateAnswer {
  const mid: string = pyStr(body["model"]);
  try {
    strictBody(body);
  } catch (e) {
    if (e instanceof FlowError) {
      return { status: 400, payload: refusalEnvelope({ message: e.message, code: "invalid_request" }) };
    }
    throw e;
  }
  // resolve_request's door count (gateway.py:279): the {model} arm
  // re-checks ambiguity — a body naming two doors refuses here,
  // before the artifact sweep.
  const doors: string[] = (["flow", "flow_inline", "model"] as string[]).filter((k) => k in body);
  if (doors.length > 1) {
    return {
      status: 400,
      payload: refusalEnvelope({
        message:
          "ambiguous request: names " +
          pyReprJson(doors) +
          " — provide exactly one of flow, flow_inline, model",
        code: "invalid_request",
      }),
    };
  }
  // ARTIFACT-REF GATE first (gateway.py:617).
  try {
    const dangling: Array<[string, string, string]> = findDanglingRefs(body);
    if (dangling.length > 0) {
      const [location, ref, why] = dangling[0] as [string, string, string];
      return {
        status: 400,
        payload: refusalEnvelope({
          message: "dangling artifact ref at " + pyReprStr(location) + ": " + ref + " (" + why + ")",
          code: "invalid_request",
        }),
      };
    }
  } catch (e) {
    if (e instanceof FlowError) {
      return { status: 400, payload: refusalEnvelope({ message: e.message, code: "invalid_request" }) };
    }
    throw e;
  }
  // CARD REQUIRES LAW: skipped (unported half — needs card classes +
  // estate config + vendor disk; wall-pinned passing for the corpus).
  if (!FLOW_ID_RE.test(mid)) {
    return {
      status: 400,
      payload: refusalEnvelope({
        message: "model id " + pyReprStr(mid) + " is not a legal identifier",
        code: "invalid_request",
      }),
    };
  }
  const svc: CardRegistryService = needCardRegistry(cards, "modelArm");
  // Resolution degrades to {} when the facts file is absent (the old
  // cordisFacts degrade — the resolves check below then answers from
  // the catalog alone; the strict overlay further down still throws
  // LOUD, exactly as the old overlayCardParams did).
  let facts: Record<string, ModelFactsRow>;
  try {
    facts = svc.modelFacts();
  } catch {
    facts = {};
  }
  const resolves: boolean =
    mid in facts || svc.resolveCardFamily(mid, facts) in facts || svc.modelMids().has(mid);
  if (!resolves) {
    return {
      status: 400,
      payload: refusalEnvelope({
        message:
          "no model unit for model: " +
          mid +
          " (no .catalog.models row " +
          mid +
          " in the frozen discovery catalog and no family declares route " +
          mid +
          " in its variants' cells — checked the class tree's _routes map)",
        code: "invalid_request",
      }),
    };
  }
  const fam: string = svc.resolveCardFamily(mid, facts);
  const famRow: ModelFactsRow | undefined = facts[fam];
  if (famRow === undefined) {
    // Non-cordis compose arm (python schema registry — unported
    // half): verdict + code parity, native text.
    return {
      status: 400,
      payload: refusalEnvelope({
        message:
          "card_compose phase 1: model " +
          pyReprStr(mid) +
          " composes outside the cordis plane (python schema arm — " +
          "unported half in this stroke)",
        code: "card_compose",
      }),
    };
  }
  // THE ROUTE-LENS STAMP OVERLAY (gateway.py _route_stamp_overlay
  // 705-751, shared with the start door via doors/flowsCard.ts):
  // family defaults + the selected variant's resolver_defaults,
  // absent-keys-only, filtered to the card field surface; the R1
  // variant/quant contract keys are consumed (matched against the
  // facts matrix, never ridden to compose). Invisible on every
  // byte leg (the CLI merges the same family defaults anyway;
  // missing-required refusals are value-free) and load-bearing on
  // variant routes (krea-2-raw's steps=52).
  let overlaid: { fam: string; card: string; params: Record<string, unknown> };
  try {
    overlaid = svc.overlayCardParams(body, mid);
  } catch (e) {
    if (e instanceof CardArmError) {
      return {
        status: 400,
        payload: refusalEnvelope({ message: e.message, code: e.code }),
      };
    }
    throw e;
  }
  const params: Record<string, unknown> = overlaid.params;
  const refused: Refusal | null = composeViaCli(overlaid.fam, overlaid.card, params);
  if (refused !== null) {
    return { status: 400, payload: refusalEnvelope(refused) };
  }
  // composed OK — py's 200 shape verbatim (gateway.py cost block:
  // queue truth, engine medians unknown at validate time so stages
  // is empty; key order ok/model/card/cost is the wire order).
  return {
    status: 200,
    payload: {
      ok: true,
      model: mid,
      card: true,
      cost: { queue_depth: 0, eta_queue_s: null, stages: [] },
    },
  };
}

// ── {flow} arm (gateway.py:2756 — existence + identifier; loadable
// flows arm (gateway.py:2756 — existence + identifier; the
// declarations ride the TS registry (doors/flowsRegistry.ts — the
// flow.py authoring plane, ported 2026-09-08), compiled through the
// SAME flowFromBody/compile/sweep pipeline as inline bodies) ──────
function namedArm(body: Record<string, unknown>, cards?: CardRegistryService | null): FlowsValidateAnswer {
  const name: string = pyStr(body["flow"]);
  if (!FLOW_ID_RE.test(name)) {
    return {
      status: 400,
      payload: { error: "flow name " + pyReprStr(name) + " is not a legal identifier", code: "flow_compile", loc: "flow" },
    };
  }
  const decl = getRegistryFlow(name);
  if (decl === undefined) {
    // Unknown names keep the retired-oracle voice byte-identical
    // (the wall pins it; the registry is the TS home — the path is
    // the py address, retained like every other retired voice).
    return {
      status: 400,
      payload: { error: "no flow at flows/" + name + "/flow.py", code: "flow_compile", loc: "flow" },
    };
  }
  const expanded = expandRegistryFlow(decl);
  // THE COMPILE-TIME DOOR (operator order, 2026-09-06): present
  // initials refuse BEFORE any compile/register — fail-fast, the
  // artifact-sweep precedent (absent initials ride).
  const repo: string = resolveRepoRoot();
  const badInitial: string | null = registryInitialsError(expanded, body, {
    repoRoot: repo,
    stateRoot: process.env["MELITE_STATE_ROOT"] ?? join(repo, "data", "runs"),
    kindsPath: join(repo, "packages", "web", "dsh", "media-plugin", "media-kinds.json"),
  });
  if (badInitial !== null) {
    return {
      status: 400,
      payload: { error: badInitial, code: "flow_compile", loc: "flow" },
    };
  }
  return serveSubject(registryFlowToInline(expanded), body, cards);
}

// ── inline arm (gateway.py:2778 + 2856 + 2827) ──────────────────
function costPreview(engineTypes: string[]): Record<string, unknown> {
  // A fresh Gateway: depth 0, eta null, medians unknown
  // (gateway.py:1872 cost_preview — no engine stats).
  return {
    queue_depth: 0,
    eta_queue_s: null,
    stages: engineTypes.map((et) => ({ engine: et, median_s: null, samples: 0 })),
  };
}

function inlineArm(full: unknown, cards?: CardRegistryService | null): FlowsValidateAnswer {
  const fullRec: Record<string, unknown> =
    typeof full === "object" && full !== null && !Array.isArray(full)
      ? (full as Record<string, unknown>)
      : {};
  const hasInline: boolean =
    typeof full === "object" && full !== null && !Array.isArray(full) && "flow_inline" in fullRec;
  const envelope: unknown = hasInline ? fullRec["flow_inline"] : undefined;
  const subject: unknown = envelope !== undefined && envelope !== null ? envelope : full;
  return serveSubject(subject, fullRec, cards);
}

// ── the shared compile-serve tail (flowFromBody -> compile ->
// pin sweep -> the 200 shape; the inline arm and the named arm
// both ride it — one validator, never two) ──────────────────────
function serveSubject(
  subject: unknown,
  fullRec: Record<string, unknown>,
  cards?: CardRegistryService | null,
): FlowsValidateAnswer {
  let flow: Flow;
  try {
    flow = flowFromBody(subject, cards);
  } catch (e) {
    if (e instanceof FlowError) {
      return {
        status: 400,
        payload: {
          error: e.message,
          code: "flow_compile",
          loc: "flow",
          errors: batchRows(subject, e.message, cards),
        },
      };
    }
    throw e;
  }
  let compiled: { nodes: GraphNode[]; skipped: string[] };
  try {
    compiled = compileFlow(flow, fullRec, cards);
  } catch (e) {
    if (e instanceof FlowError) {
      return {
        status: 400,
        payload: {
          error: e.message,
          code: "flow_compile",
          loc: "flow",
          errors: batchRows(subject, e.message, cards),
        },
      };
    }
    throw e;
  }
  const wfRows: Array<Record<string, unknown>> = sweepWorkflows(subject);
  if (wfRows.length > 0) {
    const first: Record<string, unknown> = wfRows[0] as Record<string, unknown>;
    return {
      status: 400,
      payload: {
        error: first["error"],
        code: "workflow_pin",
        loc: (first["stage"] ?? "flow") as string,
        errors: wfRows,
      },
    };
  }
  return {
    status: 200,
    payload: {
      ok: true,
      skipped: compiled.skipped,
      flow: flow.id,
      cost: costPreview(compiled.nodes.map((n) => n.engine)),
      stages: compiled.nodes.map((n) => ({
        id: n.id,
        engine: n.engine,
        description: n.description,
        inputs: n.inputFrom,
        outputs: Object.fromEntries(n.outputs.map((o) => [o.name, o.kind])),
      })),
    },
  };
}

// ── the door ────────────────────────────────────────────────────
export function handleFlowsValidate(doc: unknown, cards?: CardRegistryService | null): FlowsValidateAnswer {
  if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
    // Non-dict bodies skip every guard and hit flow_from_body's
    // "flow body must be a JSON object" (gateway.py:2786).
    return inlineArm(doc, cards);
  }
  const body: Record<string, unknown> = doc as Record<string, unknown>;
  // _h_flows_validate arm order: {model} first (gateway.py:2740).
  if ("model" in body) return modelArm(body, cards);
  // Named-flow condition verbatim (gateway.py:2756): a body carrying
  // BOTH a flow name and inline shape is an inline body whose
  // unknown-keys refusal names the offender.
  if ("flow" in body && !("flow_inline" in body) && !("model" in body) && !("stages" in body)) {
    return namedArm(body, cards);
  }
  return inlineArm(body, cards);
}

/** The flows validate door (_h_flows_validate) as a self-registering
 *  plugin: strict-parse under route()'s strict contract, every 4xx
 *  envelope rides normalize4xx, byte-identical to route()+_adapt.
 *  Matches its own row inside the listener — no central table.
 *  Reads the card registry through ctx.cardRegistry (the loader
 *  gates this door on the card-registry provider, so the sync
 *  validators always see a primed registry — no apply-time preload,
 *  no module cache). */
export const validateDoors: Plugin = {
  name: "gateway-validate",
  inject: ["gatewayError", "cardRegistry"],
  apply(ctx: Context): void {
    ctx.on(
      "gateway/request",
      (req: GatewayRequest): DispatchResult | undefined => {
        const hit = matchRoute(req.method, req.path);
        if (hit === null || hit.row.handler !== "_h_flows_validate") {
          return undefined;
        }
        const errors = ctx.gatewayError;
        const parsed: { doc: unknown } | {
          status: number;
          payload: Record<string, unknown>;
        } = parseStrictJson(req.body);
        if (!("doc" in parsed)) {
          return {
            status: parsed.status,
            body: errors.serializePy(parsed.payload),
            contentType: "application/json",
            headers: {},
          };
        }
        const answered: {
          status: number;
          payload: Record<string, unknown>;
        } = handleFlowsValidate(parsed.doc, ctx.cardRegistry);
        errors.normalize4xx(answered.status, answered.payload);
        return {
          status: answered.status,
          body: errors.serializePy(answered.payload),
          contentType: "application/json",
          headers: {},
        };
      },
    );
  },
};
