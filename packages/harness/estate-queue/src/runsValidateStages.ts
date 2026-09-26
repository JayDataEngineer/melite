// runsValidateStages.ts — stage-row + flow-construction validators split from
// runsValidate.ts (pure move, zero logic changes): strict-body admission,
// stage rows, wires, the card gate, kinds, engines, flow_from_body.
import { coerceWireArrays, coerceWireNumbers, unwrapItemArrays } from '@melite/comfyui-card-kit'
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
import { coerceRecord, minLengthRefusal } from "./runsValidateRefusals.ts";

// ── strict body ──────
// Key split owned by the admission gate; the FlowError prose stays here.
export function strictBody(body: Record<string, unknown>): void {
  const offense = checkStrictBody(body);
  if (offense.bad.length > 0) {
    throw new FlowError(
      "request body carries retired runner knob(s) " +
        JSON.stringify(offense.bad) +
        " — the runner never reads these (silent-drop class); " +
        "remove them",
    );
  }
  if (offense.carry.length > 0) {
    throw new FlowError(
      "request body carries retired pipe-carry key(s) " +
        JSON.stringify(offense.carry) +
        " — the 2026-08-10 stowaway wire: no gateway ever " +
        "stashed it (flow_doc was never emitted). The revive " +
        "rail is the draft (draft_id) + the run registry; card " +
        "bodies carry params only",
    );
  }
}

// Build one stage row from a JSON stage: the extras gate runs
// OUTSIDE the per-stage try (a non-object stage with extras
// refuses on the keys walk — never a silent coerce), then the
// object gate, then the per-name pulls inside the try whose
// FlowErrors pass through bare and every other exception wraps as
// "stage[i] refuses:".
export function buildStageRow(i: number, st: unknown): StageRow {
  const where: string = "stage[" + i + "]";
  const isRow: boolean = typeof st === "object" && st !== null && !Array.isArray(st);
  // unknown keys = the stage object's own keys minus the legal set.
  // (a non-object row has no keys to walk — the object gate below
  // owns its refusal voice; Object.keys(null) would throw a
  // TypeError over that voice: 2026-09-25.)
  const rawExtras: unknown[] = isRow
    ? [...new Set(Object.keys(st as Record<string, unknown>))].filter(
      (k) => typeof k !== "string" || !(STAGE_KEYS_SORTED as readonly string[]).includes(k),
    )
    : [];
  if (rawExtras.length > 0) {
    // (a non-object row cannot reach here: isRow gated the keys walk,
    // so rawExtras is empty for it and the object gate below owns its
    // voice — the TypeError guard that used to sit here was dead)
    const rawId: unknown = (st as Record<string, unknown>)["id"] ?? "<no id>";
    throw new FlowError(
      where +
        " " +
        JSON.stringify(rawId) +
        ": body carries unknown field(s) " +
        JSON.stringify(rawExtras as string[]) +
        " — the schema declares " +
        JSON.stringify([...STAGE_KEYS_SORTED]) +
        " (extra=forbid at the door)",
    );
  }
  if (typeof st !== "object" || st === null || Array.isArray(st)) {
    throw new FlowError(where + ": " + JSON.stringify(st) + " is not an object");
  }
  try {
    const rec: Record<string, unknown> = st as Record<string, unknown>;
    // (st.get("inputs") or {}) — falsy rides {}, truthy must be a
    // dict (.items() AttributeError text by container type).
    const rawInputs: unknown = rec["inputs"] || {};
    if (typeof rawInputs !== "object" || rawInputs === null || Array.isArray(rawInputs)) {
      throw new Error(where + " inputs must be an object");
    }
    const inputs: Array<{ name: string; edge: Edge }> = Object.entries(
      rawInputs as Record<string, unknown>,
    ).map(([name, edge]) => ({
      name,
      edge: inlineEdge(where + " input " + JSON.stringify(name), edge),
    }));
    const rawOutputs: unknown = rec["outputs"] || {};
    if (typeof rawOutputs !== "object" || rawOutputs === null || Array.isArray(rawOutputs)) {
      throw new Error(where + " outputs must be an object");
    }
    const outputs: Array<{ name: string; kind: string }> = [];
    for (const [name, kind] of Object.entries(rawOutputs as Record<string, unknown>)) {
      outputs.push({ name, kind: inlineKind(where + " output " + JSON.stringify(name), kind) });
    }
    const rawExpected: unknown = rec["expected"] || {};
    if (typeof rawExpected !== "object" || rawExpected === null || Array.isArray(rawExpected)) {
      throw new Error(where + " expected must be an object");
    }
    const expected: Array<{ name: string; kind: string }> = [];
    for (const [name, kind] of Object.entries(rawExpected as Record<string, unknown>)) {
      expected.push({ name, kind: inlineKind(where + " expected " + JSON.stringify(name), kind) });
    }
    const rawCardIo: unknown = rec["card_io"] || {};
    if (typeof rawCardIo !== "object" || rawCardIo === null || Array.isArray(rawCardIo)) {
      throw new Error(where + " card_io must be an object");
    }
    const cardIo: Array<{ name: string; kind: string }> = [];
    for (const [name, kind] of Object.entries(rawCardIo as Record<string, unknown>)) {
      cardIo.push({ name, kind: inlineKind(where + " card_io " + JSON.stringify(name), kind) });
    }
    const skipWhen: StageSkip | null = inlineSkip(where, rec["skip_when"] ?? null);
    // params defaults to {} — strict record, never a throw.
    const params: Record<string, unknown> = coerceRecord(rec["params"] || {});
    // Stage fields in DEFINITION order: id/engine
    // id/engine refuse empty first, then the id-legal check over
    // the full record.
    // missing rides "", present rides String().
    const id: string = "id" in rec ? String(rec["id"] ?? "") : "";
    if (id === "") throw new FlowError(where + " refuses: " + minLengthRefusal("Stage", "id"));
    const engine: string = "engine" in rec ? String(rec["engine"] ?? "") : "";
    if (engine === "") {
      throw new FlowError(where + " refuses: " + minLengthRefusal("Stage", "engine"));
    }
    const description: string = "description" in rec ? String(rec["description"] ?? "") : "";
    const card: string = String(rec["card"] || "");
    // (THE CARD FOLD NOTE, attempt-035's dead-route receipt
    // 2026-09-24: validate's cardGate COMPOSES card stages through
    // the registry — the feature stands. The dead route was the
    // TOOL seat DROPPING card in foldConnects: validate saw a
    // cardless row, start's flow_inline card gate never fired, and
    // the engine answered `node carries no inline workflow`. The
    // fold now keeps card — start refuses loud, never cryptic.)
    if (!FLOW_ID_RE.test(id)) {
      throw new FlowError(
        where +
          " refuses: " +
"stage id " + JSON.stringify(id) + " is not a legal identifier",
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

// ── Flow construction validators (pure subset) ─────
// _wires_resolve: illegal flow id, duplicate ids
// (own loop FIRST), then earlier-stage edges. Plain FlowErrors
// flow_from_body digs them out of the ValidationError wrapper, so
// the door prints them bare.
export function wiresResolve(flowId: string, stages: StageRow[]): void {
  if (!FLOW_ID_RE.test(flowId)) {
    throw new FlowError("flow id " + JSON.stringify(flowId) + " is not a legal identifier");
  }
  const seen: Set<string> = new Set();
  for (const st of stages) {
    if (seen.has(st.id)) {
      throw new FlowError("duplicate stage id " + JSON.stringify(st.id));
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
            JSON.stringify(st.id) +
            " input " +
            JSON.stringify(inp.name) +
            " wires to " +
            JSON.stringify(edgeRef(edge)) +
            " — not an EARLIER stage (known earlier: " +
            (done.length > 0 ? JSON.stringify([...done].sort()) : "none") +
            ")",
        );
      }
    }
    done.push(st.id);
  }
}

// cardDefs — the live card registry for the card-stage lattice,
// cardGate — the CARD-STAGE LATTICE body gate (
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
  // {model:} demand — the row.requires_model. Unknown
  // cards still hit the model gate first (order preserved: the wall
  // pins the model-gate text verbatim).
  if (def?.requiresModel !== false) {
    const model: unknown = st.params["model"];
    if (!model || !String(model).trim()) {
      throw new FlowError(
        "flow " +
          JSON.stringify(flowId) +
          " stage " +
          JSON.stringify(st.id) +
          ": card " +
          JSON.stringify(st.card) +
          " requires params.model (the model row id the card composes " +
          "against — see GET /v1/models) — the flow-stage equivalent " +
          "of the {model:} door",
      );
    }
  }
  if (def === undefined) {
    throw new FlowError(
      "flow " +
        JSON.stringify(flowId) +
        " stage " +
        JSON.stringify(st.id) +
        ": card " +
        JSON.stringify(st.card) +
        " is not a registered card (the card set boots from " +
        "src/cards — see GET /v1/tools for the served surface)",
    );
  }
  try {
    // THE WIRE-COERCION FAMILY AT THE LATTICE SEAT (attempt-035's
    // bench receipts, 2026-09-24): `$.duration expected number but
    // got 12` and `$.ref_images expected array but got [object
    // Object]` — the same corruption the compose door already
    // guards. The lattice runs the SAME validator compose runs;
    // it now reads through the SAME coercion (shape unwrap →
    // schema-derived array fill → schema-derived numeric fill).
    const carrier = (def.schemaCarrier ?? def.schema) as unknown as {
      dict?: Record<string, { type?: string }>
    }
    def.schema(
      coerceWireNumbers(carrier, coerceWireArrays(carrier, unwrapItemArrays(st.params))),
    );
  } catch (exc) {
    const msg = exc instanceof Error ? exc.message : String(exc);
    throw new FlowError(
      "flow " +
        JSON.stringify(flowId) +
        " stage " +
        JSON.stringify(st.id) +
        ": card " +
        JSON.stringify(st.card) +
        " schema refused body — " +
        msg,
    );
  }
}

/** THE SNAPSHOT-COERCION LAW (roadmap 2026-09-26 — BRIEF14 finding
 *  #2, the stringified persisted snapshot): the wire-corruption
 *  family's compose/lattice seats restore the numbers the GRAPH
 *  sees, but the card snapshot rode `door.requestBody` VERBATIM —
 *  the raw dsh-encoded body, every declared numeric a string
 *  (`"dur_frames": "110"`). Type integrity was unprovable from the
 *  request sidecar alone. The stamp now runs the SAME family
 *  (shape unwrap → array fill → numeric fill, schema-derived
 *  through the card's own carrier — never a stringly guess) so the
 *  persisted snapshot carries the numbers the card actually
 *  received. Envelope keys the schema doesn't declare ride
 *  untouched, and an unknown card rides verbatim (nothing to
 *  derive from). */
export function coerceSnapshotBody(
  def: CardDefinition | undefined,
  body: Record<string, unknown>,
): Record<string, unknown> {
  if (def === undefined) return body;
  const carrier = (def.schemaCarrier ?? def.schema) as unknown as {
    dict?: Record<string, { type?: string }>
  };
  return coerceWireNumbers(
    carrier,
    coerceWireArrays(carrier, unwrapItemArrays(body)),
  ) as Record<string, unknown>;
}

// kindsOk with engineDefaults ({} at construction = deferred,
// the ENGINE_TABLE at validate_engines = full).
export function kindsOk(
  flowId: string,
  stages: StageRow[],
  engineDefaults: Record<string, string | null>,
  cards?: CardRegistryLike | null,
): void {
  // The lattice gate is its own pass BEFORE kinds (
  // docstring: "Runs BEFORE _validate_kinds").
  for (const st of stages) {
    if (st.card) cardGate(flowId, st, cards);
  }
  // THE DERIVATION LAW (roadmap §12): a card stage's input kind
  // DERIVES from the card's own flowKinds.inputs when the port is
  // declared — the registry's hand-written expected is the override
  // for initials the card cannot know, never a mirror to hand-copy
  // and rot. A hand-written kind the card CONTRADICTS refuses LOUD
  // (never compiles a lie).
  let cardPorts: Map<string, Map<string, string>> | null = null;
  for (const st of stages) {
    if (!st.card) continue;
    const defs = needCardRegistry(cards, "kindsOk").defsSync();
    const def = defs.get(st.card);
    const ports = def?.flowKinds?.inputs;
    if (ports === undefined || Object.keys(ports).length === 0) continue;
    if (cardPorts === null) cardPorts = new Map();
    cardPorts.set(st.id, new Map(Object.entries(ports)));
  }
  const outputsByStage: Map<string, Map<string, string>> = new Map();
  for (const st of stages) {
    const effectiveExpected: Map<string, string> = new Map(
      st.expected.map((e) => [e.name, e.kind]),
    );
    const portKinds: Map<string, string> | undefined = cardPorts?.get(st.id);
    const inputNames: Set<string> = new Set(st.inputs.map((i) => i.name));
    // the contradiction sweep FIRST (a loud, named refusal beats
    // the generic mismatch text for the same row)
    if (portKinds !== undefined) {
      for (const [name, kind] of effectiveExpected) {
        const cardKind: string | undefined = portKinds.get(name);
        if (cardKind !== undefined && cardKind !== kind) {
          throw new FlowError(
            "flow " +
              JSON.stringify(flowId) +
              " stage " +
              JSON.stringify(st.id) +
              " input " +
              JSON.stringify(name) +
              ": expected kind " +
              JSON.stringify(kind) +
              " contradicts card " +
              JSON.stringify(st.card) +
              " (the card declares " +
              JSON.stringify(cardKind) +
              ") — the card's own port declaration is the truth",
          );
        }
      }
      for (const name of inputNames) {
        const cardKind: string | undefined = portKinds.get(name);
        if (cardKind !== undefined && !effectiveExpected.has(name)) {
          effectiveExpected.set(name, cardKind);
        }
      }
    }
    const expectedNames: Set<string> = new Set(effectiveExpected.keys());
    const onlyInput: string[] = [...inputNames].filter((k) => !expectedNames.has(k)).sort();
    const onlyExpected: string[] = [...expectedNames].filter((k) => !inputNames.has(k)).sort();
    if (onlyInput.length > 0 || onlyExpected.length > 0) {
      const bits: string[] = [];
      if (onlyInput.length > 0) bits.push("wired but untyped: " + JSON.stringify(onlyInput));
      if (onlyExpected.length > 0) bits.push("typed but unwired: " + JSON.stringify(onlyExpected));
      throw new FlowError(
        "flow " +
          JSON.stringify(flowId) +
          " stage " +
          JSON.stringify(st.id) +
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
              JSON.stringify(flowId) +
              " stage " +
              JSON.stringify(st.id) +
              ": engine " +
              JSON.stringify(st.engine) +
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
            JSON.stringify(flowId) +
            " stage " +
            JSON.stringify(st.id) +
            " input " +
            JSON.stringify(inp.name) +
            ": stage " +
            JSON.stringify(inp.edge.stage) +
            " has no output named " +
            JSON.stringify(inp.edge.output) +
            " (declared outputs: " +
            JSON.stringify([...upstream.keys()].sort()) +
            ")",
        );
      }
      const upstreamKind: string = upstream.get(inp.edge.output) as string; // the has() above proves presence
      const receivingKind: string = effectiveExpected.get(inp.name) as string; // the match above proves presence
      if (upstreamKind !== receivingKind) {
        throw new FlowError(
          "flow " +
            JSON.stringify(flowId) +
            " stage " +
            JSON.stringify(st.id) +
            " input " +
            JSON.stringify(inp.name) +
            ": expected " +
            receivingKind +
            ", got " +
            upstreamKind +
            " from stage " +
            JSON.stringify(inp.edge.stage) +
            " output " +
            JSON.stringify(inp.edge.output) +
            " — must be " +
            receivingKind,
        );
      }
    }
  }
}

// validateEngines: every stage's engine through the
// bus — here the wall-pinned ENGINE_TABLE (existence + DEFAULT_OUTPUT);
// then the FULL kind pass. Unknown-engine text mirrors
// plugins.load_engine verbatim.
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
          JSON.stringify(flow.id) +
          " stage " +
          JSON.stringify(st.id) +
          ": engine " +
          JSON.stringify(st.engine) +
          " — no engine plugin for type " +
          JSON.stringify(st.engine) +
          " (no engine plugin declares it)",
      );
    }
    engineDefaults[st.engine] = row.def;
  }
  kindsOk(flow.id, flow.stages, engineDefaults, cards);
  return flow;
}

// flowFromBody: JSON body -> validated Flow.
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
        JSON.stringify(dead) +
        " — allowed: " +
        JSON.stringify([...INLINE_TOP_SORTED]),
    );
  }
  if (!("id" in rec) || !("stages" in rec)) {
    throw new FlowError(
      "flow body needs at least id and stages — got keys " + JSON.stringify(Object.keys(rec)),
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
  const flowId: string = String(rec["id"] ?? "");
  // Flow construction: wires + deferred kinds.
  if (flowId === "") {
    throw new FlowError(minLengthRefusal("Flow", "id"));
  }
  wiresResolve(flowId, rows);
  kindsOk(flowId, rows, {}, cards);
  const flow: Flow = { id: flowId, description: String(rec["description"] ?? ""), stages: rows };
  return validateEngines(flow, cards);
}
