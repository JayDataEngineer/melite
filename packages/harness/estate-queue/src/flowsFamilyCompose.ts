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
import { modelsService } from "@melite/comfyui-cordis";
import type { RegistryFlow, RegistryStage } from "./flowsData.ts";

/** The families seat's read shape (structural — the models
 * service's allDecls() rows, action arrays intact). */
export type FamilyDeclRow = { readonly id: string };
export type FamilyModelsSeat = { allDecls(): readonly FamilyDeclRow[] };

/** The live family declarations, or [] when the families seat is
 * absent (an unmounted context, an unbooted host). A flow with NO
 * family stage never reads this; a flow WITH one refuses LOUD on
 * the empty seat inside composeOne — the voice names the absent
 * seat, never a silent skip.
 * @param modelsSeat the context's models service when mounted
 *  (the injectable read); the booted singleton otherwise
 * @returns the family declarations, or [] when no seat exists */
export function liveFamilyDecls(modelsSeat?: FamilyModelsSeat | null): readonly FamilyDeclRow[] {
  if (modelsSeat !== undefined && modelsSeat !== null) {
    return modelsSeat.allDecls();
  }
  try {
    return modelsService().allDecls();
  } catch {
    return [];
  }
}

/** One family stage's resolved form: the workflow envelope plus the
 * derived outputs. Null = not a family stage (passthrough). */
function composeOne(
  flowId: string,
  st: RegistryStage,
  decls: readonly FamilyDeclRow[],
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
  // engine's own model-less compose arm passes (service.ts:871) —
  // and the action's facts parser is the gate, refusing nothing
  // here by design.
  const g = new GraphBuilder();
  instantiateAction(
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
  return {
    ...st,
    family: "",
    action: "",
    outputs: derived,
    params: { workflow: g.toJSON() },
  };
}

/** Compose every family-action stage of an expanded flow into its
 * workflow envelope. Flows with no family stage pass through
 * byte-identical (zero lookups, zero overhead).
 * @param flow the EXPANDED registry flow (fromFlow links resolved)
 * @param decls the families seat's declarations (allDecls())
 * @returns the flow with every family stage composed
 * @throws when a family is unregistered, an action undeclared, a
 *  param unadmitted, or a hand-written output contradicts the
 *  action's declaration */
export function composeFamilyStages(
  flow: RegistryFlow,
  decls: readonly FamilyDeclRow[],
): RegistryFlow {
  if (!flow.stages.some((st) => st.family !== "")) return flow;
  return {
    ...flow,
    stages: flow.stages.map((st) => composeOne(flow.id, st, decls)),
  };
}
