// actions.ts — the fit family's declared actions (the atom
// vocabulary, stroke 4): the fit-seat verb's backend. The meld fit
// laws own the nodes (FitRow/FitProp carry no checkpoint, so the
// family is weightless); the flow row routes, this declaration owns
// the graph. The proof's framing (768/1.2/50/64/transparent) is
// FIXED here — a verb's framing is not a bench surface (SubActionMod
// law: knobs never join a card schema; the 2026-09-16 retirement
// order keeps the fit CARD dead — the family is the sanctioned
// seam, not a card revival).
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import type { OutputHandle } from "@melite/comfyui-card-kit/graph";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";

/** The fit-seat facts door: the seat reads NOTHING off a lane
 *  (analytic bone-scale fitting — no weights load), so the door is
 *  the weightless vacuous parse, present to keep the action
 *  contract's one-door law, refusing nothing.
 *  @param _raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the empty facts shape */
export function parseFitFacts(_raw: LaneInputsFacts): Record<string, never> {
  return {}
}

/** The seat verb's request: the two files the caller names. */
type SeatParams = {
  readonly body: string;
  readonly prop: string;
};

/** THE FIT ROW — the FitRow node's own declared defaults, verbatim
 *  (vendor/comfyui_extensions/melter-poser-nodes/fit_nodes.py:105).
 *  A fit verb with no named bone is a socket fit on a default row;
 *  naming a bone or a grip alignment is the Blender/MCP lane's door
 *  (the skills plane), not this flow's request schema. */
export const FIT_ROW = {
  model_name: "prop",
  bone: "",
  align: "socket",
  position: "0,0,0",
  rotation: "0,0,0",
  fit_ratio: 0.0,
  fit_ref_bone: "",
  fit_ref_bone2: "",
  seat_ratio: 0.22,
  finger_bone: "",
  thumb_bone: "",
  target_width: 0.0,
} as const;

/** The seat action (the flow 'fit-seat' the meld chips drive):
 *  FitRow (the analytic fit row) → FitProp (body ∪ prop under the
 *  row) → the 4-view proof sheet. */
export const seat: ComfyActionSpec<SeatParams, Record<string, never>> = {
  id: "seat",
  laneIndependent: true,
  outputs: [{ name: "seat", kind: "mesh" }],
  // THE BODY AND THE PROP ARE THE REQUEST (both are files the caller
  // names, both gate-validated by the flow's initialValidators); THE
  // FIT ROW IS THE VERB'S (stroke-89's law: a knob never joins the
  // request schema, and the door's own type admits only photo/glb/
  // bake_params — a stage spelling `$fit_ratio` names a key no flow
  // can declare, and the merged worker refuses it by name). The row's
  // twelve fields are the FitRow node's own declared defaults, named
  // here once so the declaration owns the verb's vocabulary.
  params: [{ name: "body" }, { name: "prop" }],
  facts: parseFitFacts,
  build({ p, g }): OutputHandle {
    const row = g.node("FitRow", { ...FIT_ROW });
    const seatNode = g.node("FitProp", {
      body_glb_path: p.body,
      prop_glb_path: p.prop,
      row_json: row.out(0),
    });
    return g.node("RayRenderGLBViews", {
      glb_path: seatNode.out(0),
      resolution: 768,
      framing: 1.2,
      focal_length: 50,
      samples: 64,
      transparent: true,
    }).out(0);
  },
};
