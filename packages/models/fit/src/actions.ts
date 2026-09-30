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

/** Every fit knob rides VERBATIM — a $-ref passes through
 *  untyped-by-design (the inline compile and the merged worker own
 *  resolution, exactly as the retired hand literal's refs rode). */
type SeatParams = {
  readonly body: string;
  readonly prop: string;
  readonly model_name: string;
  readonly bone: string;
  readonly align: string;
  readonly position: string;
  readonly rotation: string;
  readonly fit_ratio: string | number;
  readonly fit_ref_bone: string;
  readonly fit_ref_bone2: string;
  readonly seat_ratio: string | number;
  readonly finger_bone: string;
  readonly thumb_bone: string;
  readonly target_width: string | number;
};

/** The seat action (the flow 'fit-seat' the meld chips drive):
 *  FitRow (the analytic fit row) → FitProp (body ∪ prop under the
 *  row) → the 4-view proof sheet. */
export const seat: ComfyActionSpec<SeatParams, Record<string, never>> = {
  id: "seat",
  laneIndependent: true,
  outputs: [{ name: "seat", kind: "mesh" }],
  params: [
    { name: "body" },
    { name: "prop" },
    { name: "model_name" },
    { name: "bone" },
    { name: "align" },
    { name: "position" },
    { name: "rotation" },
    { name: "fit_ratio" },
    { name: "fit_ref_bone" },
    { name: "fit_ref_bone2" },
    { name: "seat_ratio" },
    { name: "finger_bone" },
    { name: "thumb_bone" },
    { name: "target_width" },
  ],
  facts: parseFitFacts,
  build({ p, g }): OutputHandle {
    const row = g.node("FitRow", {
      model_name: p.model_name,
      bone: p.bone,
      align: p.align,
      position: p.position,
      rotation: p.rotation,
      fit_ratio: p.fit_ratio,
      fit_ref_bone: p.fit_ref_bone,
      fit_ref_bone2: p.fit_ref_bone2,
      seat_ratio: p.seat_ratio,
      finger_bone: p.finger_bone,
      thumb_bone: p.thumb_bone,
      target_width: p.target_width,
    });
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
