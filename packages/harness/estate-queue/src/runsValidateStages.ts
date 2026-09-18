// runsValidateStages.ts — stage-row + flow-construction validators split from
// runsValidate.ts (pure move, zero logic changes): strict-body admission,
// stage rows, wires, the card gate, kinds, engines, flow_from_body.
import { engineIdOk } from "@melite/engine-contract";
import type { CardDefinition } from "@melite/comfyui-cordis";
import { checkStrictBody } from "./runsGates.ts";
import {
  ENGINE_TABLE,
  FLOW_ID_RE,
  INLINE_TOP_SORTED,
  STAGE_KEYS_SORTED,
  FlowError,
  needCardRegistry,
} from "./runsValidateShared.ts";
import type {
  CardRegistryLike,
  Edge,
  Flow,
  StageRow,
  StageSkip,
} from "./runsValidateShared.ts";
import { edgeRef, inlineEdge, inlineKind, inlineSkip } from "./runsValidateInline.ts";
import {
  minLengthRefusal,
  pyDictCoerce,
  pyTypeName,
  stageIdRefusal,
} from "./runsValidateRefusals.ts";
import {
  pyReprJson,
  pyReprStr,
  pyReprStrList,
  pySetOfKeys,
  pyStr,
} from "./runsValidatePyRepr.ts";

// ── strict body (python/gateway.py:248 _strict_body, verbatim) ──────
// Key split owned by the admission gate; the FlowError prose stays here.
export function strictBody(body: Record<string, unknown>): void {
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

// Build one stage row from a JSON stage (flow.py:1425-1477): the
// extras gate runs OUTSIDE the per-stage try (py line 1435 —
// set(st) on a non-dict stage with extras dies with AttributeError
// on .get; sorted() on mixed extras dies with TypeError), then the
// isinstance gate, then the per-name pulls inside the try whose
// FlowErrors pass through bare and every other exception wraps as
// "stage[i] refuses:".
export function buildStageRow(i: number, st: unknown): StageRow {
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
    /* v8 ignore next -- unreachable: dict extras are all strings
       (Object.keys), and non-dict stages die at the .get TypeError
       above — no mixed survivor reaches the sort (2026-09-12) */
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
export function wiresResolve(flowId: string, stages: StageRow[]): void {
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
export function cardGate(
  flowId: string,
  st: StageRow,
  cards?: CardRegistryLike | null,
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
    def.schema(st.params);
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
export function kindsOk(
  flowId: string,
  stages: StageRow[],
  engineDefaults: Record<string, string | null>,
  cards?: CardRegistryLike | null,
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
        /* v8 ignore start -- the table never carries null (non-nullable
           defs): deferred ({}) callers miss at the `in`, full callers
           always hit a string (2026-09-12) */
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
        /* v8 ignore stop */
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
      const upstreamKind: string = upstream.get(inp.edge.output) as string; // the has() above proves presence
      const receivingKind: string = effectiveExpected.get(inp.name) as string; // the match above proves presence
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
export function validateEngines(flow: Flow, cards?: CardRegistryLike | null): Flow {
  const engineDefaults: Record<string, string | null> = {};
  for (const st of flow.stages) {
    const row: { plugin: string; def: string } | undefined =
      st.engine.startsWith("mcp:") && engineIdOk(st.engine)
        ? { plugin: "mcp-client", def: "image" }
        : ENGINE_TABLE[st.engine];
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
export function flowFromBody(body: unknown, cards?: CardRegistryLike | null): Flow {
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
