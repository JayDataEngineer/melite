// runsValidateRefusals.ts — refusal code builders split from runsValidate.ts
// (pure move, zero logic changes): pydantic-shape fakes, dict coercion,
// and the Stage value_error renderers.
import { PYDANTIC_URL } from "./runsValidateShared.ts";
import type { Edge, StageSkip } from "./runsValidateShared.ts";
import { pyReprJson, pyReprStr, pyStr } from "./runsValidatePyRepr.ts";

// ── pydantic-shape fakes (pinned — see header PYDANTIC_PIN) ─────
// Only the empty-string min_length channel is reachable through
// flow_from_body (every other scalar is str()'d or dict()'d first);
// the message is deterministic given the installed pydantic.
export function minLengthRefusal(cls: string, field: string): string {
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
export function pyTypeName(v: unknown): string {
  /* v8 ignore next -- falsy values ride {} through every caller's `||`
     (buildStageRow pulls, pyDictCoerce entry): null/undefined never reach
     the name read (2026-09-12) */
  if (v === null || v === undefined) return "NoneType";
  if (Array.isArray(v)) return "list";
  if (typeof v === "string") return "str";
  if (typeof v === "boolean") return "bool";
  if (typeof v === "number") return Number.isInteger(v) ? "int" : "float";
  /* v8 ignore next -- every caller refuses non-records before the
     name is read (class instances pass the object guards through to
     later, louder gates): a plain dict never reaches here (2026-09-12) */
  if (typeof v === "object") return "dict";
  return typeof v;
}

// dict(st.get("params") or {}) — the real dict() constructor
// semantics: mappings copy; strings/lists are pair sequences (each
// element a length-2 sequence — strings count); anything else is a
// TypeError; unhashable keys are a TypeError. Deterministic texts,
// ported verbatim (wrapped as "stage[i] refuses:" by the caller).
export function pyDictCoerce(v: unknown): Record<string, unknown> {
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
export function renderEdge(e: Edge): string {
  if (e.kind === "initial") return "FromInitial(key=" + pyReprStr(e.key) + ")";
  return "FromStage(stage=" + pyReprStr(e.stage) + ", output=" + pyReprStr(e.output) + ")";
}

export function renderKind(kind: string): string {
  return "<Kind." + kind + ": " + pyReprStr(kind) + ">";
}

export function renderSkip(skip: StageSkip | null): string {
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

export function renderStrMap(entries: Array<{ name: string; kind: string }>): string {
  return (
    "{" + entries.map((e) => pyReprStr(e.name) + ": " + renderKind(e.kind)).join(", ") + "}"
  );
}

export function renderEdgeMap(entries: Array<{ name: string; edge: Edge }>): string {
  return (
    "{" + entries.map((e) => pyReprStr(e.name) + ": " + renderEdge(e.edge)).join(", ") + "}"
  );
}

// The Stage _id_legal refusal (Stage._id_legal is a mode=after
// validator raising FlowError — pydantic wraps it as value_error
// over the FULL Stage kwargs; flow_from_body surfaces the whole
// ValidationError under "stage[i] refuses:").
export function stageIdRefusal(
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

// Truncation over an ALREADY-repr'd display (dict/model displays
// carry no outer quotes — slice the display itself).
export function pyTruncatedReprRaw(display: string): string {
  /* v8 ignore next -- the kwargs display is always >50 chars (fixed
     ten-field shape): the short arm never fires (2026-09-12) */
  if ([...display].length > 50) {
    const chars: string[] = [...display];
    return chars.slice(0, 25).join("") + "..." + chars.slice(-24).join("");
  }
  /* v8 ignore next -- same proof as above (2026-09-12) */
  return display;
}
