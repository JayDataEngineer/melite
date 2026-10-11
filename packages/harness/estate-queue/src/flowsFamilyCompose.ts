// flowsFamilyCompose.ts — the family-action stage interpreter (the
// atom vocabulary, stroke 4 — the flow plane's estimator half). A
// registry stage that names a FAMILY plus one of its declared
// actions composes HERE, at expansion time: the flow row owns
// routing only, the family's DECL owns the nodes — the same
// hierarchy a card stage rides (the card dispatches
// ACTION_BINDINGS; the flow dispatches family+action directly, no
// card face — the SubActionMod law: a verb's knobs never join any
// card schema; they ride the family's own action declaration).
//
// WIRE PARITY: the composed stage lands as the exact envelope a
// raw `workflow:` stage landed — params.workflow carries the
// serialized graph, $-refs ride verbatim (the inline compile and
// the merged worker own their resolution, exactly as for raw
// graphs), outputs derive from the ACTION's declared outputs (the
// derivation law: the row never hand-mirrors what the declaration
// already owns; a contradicting hand-write refuses LOUD).
import { declaredAction, instantiateAction } from "@melite/comfyui-card-kit";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import type { OutputHandle } from "@melite/comfyui-card-kit/graph";
import { modelsService } from "@melite/comfyui-cordis";
import type { EngineJson } from "@melite/comfyui-cordis";
import type { RegistryFlow, RegistryStage } from "./flowsData.ts";

/** The families seat's read shape (structural — the models
 * service's allDecls() rows, action arrays intact). */
export type FamilyDeclRow = { readonly id: string };
export type FamilyModelsSeat = { allDecls(): readonly FamilyDeclRow[] };

/** How the family seat answered, which is three different facts:
 *  `seated` (the table holds families), `bare` (the owner is mounted
 *  and the table holds none — a lane that mounted the catalog
 *  provider without the family plugins), and `absent` (no seat at
 *  all: an unmounted context whose singleton never booted). The
 *  refusal must name which one it is — a family that is merely
 *  unregistered is a different defect from a lane with no table.
 *  A flow with NO family stage never reads this. */
export type FamilySeatState = "seated" | "bare" | "absent";

/** The live family declarations, and how the seat answered. A flow
 *  WITH a family stage refuses LOUD on an unanswering seat inside
 *  composeOne, in the seat's own voice.
 * @param modelsSeat the context's models service when mounted
 *  (the injectable read); the booted singleton otherwise
 * @returns the declarations (empty on an unanswering seat) and the
 *  state that produced them */
export function liveFamilySeat(
  modelsSeat?: FamilyModelsSeat | null,
): { readonly decls: readonly FamilyDeclRow[]; readonly state: FamilySeatState } {
  if (modelsSeat !== undefined && modelsSeat !== null) {
    const decls = modelsSeat.allDecls();
    return { decls, state: decls.length === 0 ? "bare" : "seated" };
  }
  try {
    const decls = modelsService().allDecls();
    return { decls, state: decls.length === 0 ? "bare" : "seated" };
  } catch {
    return { decls: [], state: "absent" };
  }
}

/** The live family declarations, for the callers that only need the
 *  rows. A refusal composed from these alone cannot tell an absent
 *  seat from an unregistered family — use {@link liveFamilySeat}.
 * @param modelsSeat the context's models service when mounted
 * @returns the family declarations, or [] when no seat answers */
export function liveFamilyDecls(modelsSeat?: FamilyModelsSeat | null): readonly FamilyDeclRow[] {
  return liveFamilySeat(modelsSeat).decls;
}

/** One family stage's resolved form: the workflow envelope plus the
 * derived outputs. The row itself = not a family stage (passthrough;
 * round-23 audit Q3 — the return is non-nullable, the early return
 * hands back the row). */
function composeOne(
  flowId: string,
  st: RegistryStage,
  decls: readonly FamilyDeclRow[],
  seatState: FamilySeatState,
): RegistryStage {
  if (st.family === "") return st;
  // Either/or is the row contract (flowsData's RegistryStage): a
  // stage naming BOTH would compose a graph the card gate then
  // judges — refuse the contradiction at admission.
  if (st.card !== "") {
    throw new Error(
      "flow '" + flowId + "' stage '" + st.id + "' names card '" + st.card +
      "' AND family '" + st.family + "' — a stage routes through one plane, never both",
    );
  }
  const decl = decls.find((d) => d.id === st.family);
  if (decl === undefined) {
    const registered = decls.map((d) => d.id).sort().join(", ") || "none";
    const where = "flow '" + flowId + "' stage '" + st.id + "' naming family '" + st.family + "'";
    // THE SEAT'S OWN VOICE PER CONDITION. An absent seat and a bare
    // mount are environment facts and each has its own repair; only
    // the third — a seated table without this family — is a
    // registration fact. Collapsing all three into "no such family"
    // named a typo where the lane had no table to ask.
    if (seatState === "absent") {
      throw new Error(
        "[models] no ModelsService for " + where +
        " — doors inject 'models' and pass ctx.models " +
        "(the manifest's engine-model-catalog row provides at boot)",
      );
    }
    if (seatState === "bare") {
      throw new Error(
        where + " — the models seat is mounted with ZERO families " +
        "(registered: none): this lane mounted the bare catalog " +
        "provider without the families row, so no family can resolve",
      );
    }
    throw new Error(
      "flow '" + flowId + "' stage '" + st.id + "' names family '" + st.family +
      "' — no such family in the models seat (registered: " + registered + ")",
    );
  }
  let action: ReturnType<typeof declaredAction>;
  try {
    action = declaredAction(decl, st.action);
  } catch (e) {
    // The kit's voice is card-plane ("the card's binding refused at
    // boarding"); re-voice for the flow door, keeping its declared
    // list in the parenthetical. (declaredAction throws Error only —
    // the String arm is the never-fired defensive half.)
    throw new Error(
      "flow '" + flowId + "' stage '" + st.id + "' names action '" + st.action +
      "' the family '" + st.family + "' does not declare (" +
      (e instanceof Error ? e.message : /* v8 ignore next */ String(e)) + ")",
    );
  }
  // LANE-INDEPENDENCE (the admission under the derivation): a flow
  // row composes against the model-less facts shape, so the action
  // must read nothing off a lane — a lane-bound action named by a
  // flow would compose a WRONG graph silently (its facts door
  // degrades or blames lane_inputs it never receives).
  if (action.laneIndependent !== true) {
    throw new Error(
      "flow '" + flowId + "' stage '" + st.id + "' names action '" + st.family +
      "." + st.action + "' — the action is lane-bound (its facts door reads a " +
      "resolved model row); only lane-independent actions compose from a flow row",
    );
  }
  // THE ADMISSION CONTRACT (the lowest level, one voice): every
  // params key must be a declared action param — the same class of
  // refusal the card plane speaks ("unknown param(s) on the
  // image-gen card: out_dir"), fired BEFORE any node composes.
  const declared = new Set(action.params.map((p) => p.name));
  const unknown = Object.keys(st.params).filter((k) => !declared.has(k));
  if (unknown.length > 0) {
    throw new Error(
      "unknown param(s) on the " + st.family + "." + st.action + " action: " +
      unknown.sort().join(", "),
    );
  }
  // THE DERIVATION LAW (roadmap §12, the family half): outputs
  // derive from the action's own declaration; a hand-write that
  // contradicts it refuses LOUD — never two spellings of one truth.
  const derived: Record<string, string> = {};
  for (const o of action.outputs) derived[o.name] = o.kind;
  for (const [name, kind] of Object.entries(st.outputs)) {
    if (derived[name] !== kind) {
      throw new Error(
        "flow '" + flowId + "' stage '" + st.id + "' hand-writes output '" + name +
        "' as '" + kind + "' but the " + st.family + "." + st.action +
        " action declares '" + String(derived[name]) + "' — the row routes, the declaration owns the truth",
      );
    }
  }
  // The family's facts row for the interpreter: the estimator-class
  // actions declare vacuous doors (no checkpoint, no encoder), so
  // the weightless row IS the honest shape — the same field set the
  // engine's own model-less compose arm passes (service.ts:941;
  // round-23 audit Q5 repinned the cite) — same keys, deliberate
  // value differences: id carries the family here and '' there,
  // card is '' here where the engine arm carries the card id — and
  // the action's facts parser is the gate, refusing nothing
  // here by design.
  const g = new GraphBuilder();
  const handle: OutputHandle = instantiateAction(
    action,
    st.params as Record<string, unknown>,
    {
      id: st.family,
      card: "",
      family: st.family,
      defaults: {},
      lane_inputs: {},
      variants: [],
      variant_groups: [],
      outputs: [],
      mods: [],
    },
    g,
    "",
  );
  // THE PRODUCER IS THE ACTION'S OWN HANDLE (the multi-save law).
  // The merge resolves a stage's channels to producer nodes two ways:
  // a declared output_nodes row, or — failing that — a single Save
  // node, which refuses outright when the graph saves more than once.
  // An action that writes several artifacts (the turnaround sheet, the
  // albedo/normal/sidecar trio) hit that refusal every time, because
  // the composition declared no producer at all. The handle build()
  // returns IS the producer for the action's FIRST declared output,
  // named by the action's own declaration — never guessed from node
  // order. The declared path wins in the merge, so single-save
  // actions keep their behavior: they also declare, and declaration
  // won there too.
  const producer: Record<string, EngineJson> = {};
  const firstOutput = action.outputs[0];
  if (firstOutput !== undefined) {
    producer[firstOutput.name] = handle.nodeId;
  }
  return {
    ...st,
    family: "",
    action: "",
    outputs: derived,
    params: { workflow: g.toJSON(), output_nodes: producer },
  };
}

/** Compose every family-action stage of an expanded flow into its
 * workflow envelope. Flows with no family stage pass through
 * byte-identical (zero lookups, zero overhead).
 * @param flow the EXPANDED registry flow (fromFlow links resolved)
 * @param decls the families seat's declarations (allDecls())
 * @param seatState how the seat answered, so a refusal names the
 *  condition it found (see {@link liveFamilySeat}) — REQUIRED, no
 *  default (round-23 audit Q4): a caller that assumes "seated" on an
 *  unbooted lane gets the unregistered-family voice for an
 *  environment fact, the exact collapse the seat-voice law forbids
 * @returns the flow with every family stage composed
 * @throws when the seat cannot answer, a family is unregistered, an
 *  action undeclared, a param unadmitted, or a hand-written output
 *  contradicts the action's declaration */
export function composeFamilyStages(
  flow: RegistryFlow,
  decls: readonly FamilyDeclRow[],
  seatState: FamilySeatState,
): RegistryFlow {
  if (!flow.stages.some((st) => st.family !== "")) return flow;
  return {
    ...flow,
    stages: flow.stages.map((st) => composeOne(flow.id, st, decls, seatState)),
  };
}
