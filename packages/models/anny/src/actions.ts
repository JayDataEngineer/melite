// actions.ts — the family's offered actions (the atom vocabulary,
// stroke 3): the compose action the anny card binds. The body is
// the staging + turnaround tail, composed here (the body's three
// arms: an attached GLB renders as-is; empty bakes the body from the
// identity sliders; the 8-view sheet saves under the anny_<view>
// convention). The wire is pinned to committed goldens in
// tests/golden/ — recorded while the card's legacy body existed and
// the oracle compared them. Creation order IS node-id order
// (the recipe law). Keys the segment never reads ride unvalidated.
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { positive, renderGLBViews } from "@melite/comfyui-card-kit";
import type { OutputHandle } from "@melite/comfyui-card-kit/graph";
import { ANNY_MORPH_LABELS, ANNY_MORPH_RANGE, ANNY_MORPH_DEFAULT } from "@melite/comfyui-card-kit/morphs";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";

/** The served identity space's 11 dims, in its label order (the
 * bake validator names the same eleven — moved verbatim from the
 * card; the DECL's defaults carry the same labels). */
const PHENOTYPE_DIMS = [
  'gender', 'age', 'muscle', 'weight', 'height', 'proportions',
  'cupsize', 'firmness', 'african', 'asian', 'caucasian',
] as const

/** THE 254 MORPH ROWS OF THE DECLARED SURFACE — one row per served
 * local-change label, at the served range. Both members are the ONE
 * door-pinned sources (morphs.ts): a hand-copied 254-row block here
 * would be a second truth drifting against the pin's wall. */
const MORPH_PARAMS = ANNY_MORPH_LABELS.map(
  (label) => ({ name: label, type: "number", bounds: ANNY_MORPH_RANGE }) as const,
)

/** The closed facts shape the compose segment reads. The segment
 * reads NOTHING off the row (the anny bake is parametric — no
 * checkpoint loads), so the door is the weightless vacuous parse
 * (the tagger precedent): present to keep the action contract's
 * one-door law, refusing nothing.
 *  @param _raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the empty facts shape */
export function parseAnnyFacts(_raw: LaneInputsFacts): Record<string, never> {
  return {}
}

/** The gated params doc the compose segment reads (the card's
 * schema walk validated types and bounds — a same-process typed
 * boundary). */
export type AnnyParams = Record<string, unknown>;

/** The compose action: the body's three arms + the 8-view
 * turnaround sheet (the anny_t1 segment, family-owned). */
export const compose: ComfyActionSpec<AnnyParams, Record<string, never>> = {
  id: "compose",
  inputs: [],
  outputs: [{ name: "sheet", kind: "IMAGE" }],
  // THE DECLARED SURFACE (the write plane, phase 2): the anny
  // card schema's own types and bounds — the family door judges
  // defaults and variant presets against this row. The 254 morph
  // rows are the served labels at the served range (MORPH_PARAMS);
  // the transparent enum is the card's background vocabulary.
  params: [
    { name: "body_glb", type: "string" },
    { name: "gender", type: "number", bounds: [0, 1] },
    { name: "age", type: "number", bounds: [0, 1] },
    { name: "muscle", type: "number", bounds: [0, 1] },
    { name: "weight", type: "number", bounds: [0, 1] },
    { name: "height", type: "number", bounds: [0, 1] },
    { name: "proportions", type: "number", bounds: [0, 1] },
    { name: "cupsize", type: "number", bounds: [0, 1] },
    { name: "firmness", type: "number", bounds: [0, 1] },
    { name: "african", type: "number", bounds: [0, 1] },
    { name: "asian", type: "number", bounds: [0, 1] },
    { name: "caucasian", type: "number", bounds: [0, 1] },
    ...MORPH_PARAMS,
    { name: "resolution", type: "number", bounds: [256, 2048] },
    { name: "framing", type: "number", bounds: [1, 3] },
    { name: "focal_length", type: "number", bounds: [10, 400] },
    { name: "samples", type: "number", bounds: [1, 4096] },
    { name: "transparent", type: "enum", options: ["true", "false"] },
  ],
  facts: parseAnnyFacts,
  build({ p, g }): OutputHandle {
    // THE BODY, three arms — a GLB is NEVER required (stroke 89):
    // 1. an attached GLB renders as-is;
    // 2. empty → the identity sliders BAKE the body
    //    (AnnyParamsToGlb: params_json → glb_path — parametric
    //    end-to-end; untouched sliders = the neutral bake).
    const body = String(p.body_glb ?? '').trim()
    // THE MORPHS (stroke 90): sparse local_changes — only NON-ZERO
    // entries ride the wire (absent = the engine's own 0; the pin
    // pins every default at 0, so untouched sliders never ship).
    const localChanges: Record<string, number> = {}
    for (const label of ANNY_MORPH_LABELS) {
      const v = Number(p[label])
      if (Number.isFinite(v) && v !== ANNY_MORPH_DEFAULT) localChanges[label] = v
    }
    const bodyPath = body !== ''
      ? g.node('PrimitiveString', { value: body }).out()
      : g.node('AnnyParamsToGlb', {
          params_json: JSON.stringify({
            dialect: 'authored',
            phenotype: PHENOTYPE_DIMS.map((dim) => Number(p[dim] ?? 0.5)),
            local_changes: localChanges,
          }),
        }).out()
    const glbPath = g.node('CompositeCharacter', { body_glb_path: bodyPath }).out()
    return renderGLBViews(g, glbPath, {
      resolution: positive('resolution', p.resolution),
      framing: positive('framing', p.framing),
      focal_length: positive('focal_length', p.focal_length),
      samples: positive('samples', p.samples),
      transparent: String(p.transparent).toLowerCase() !== 'false',
    }, 'anny')
  },
};

/** The estimator facts door: the estimation chain reads NOTHING off
 *  a lane (no checkpoint, no encoder — the MHR regression and the
 *  SAM chain are checkpoint-free python), so the door is the
 *  weightless vacuous parse, exactly like compose's.
 *  @param _raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the empty facts shape */
export function parseEstimatorFacts(_raw: LaneInputsFacts): Record<string, never> {
  return {}
}

/** The estimator photo→body chain (the hmr-estimate verb's
 *  estimator engine — the flow 'anny-hmr-estimator'):
 *  SAM 3D Body → grounded anny GLB, every link license-cleared for
 *  sale (SOMA-X Apache-2.0; sam-3d-body SAM License §1(a)/§5(a)).
 *  The person_index stays FIXED at the loudest detection (0) — the
 *  verb's own person picker is a chip knob, never a bench surface
 *  (SubActionMod law). */
export const estimate_photo: ComfyActionSpec<{ readonly photo: string }, Record<string, never>> = {
  id: "estimate_photo",
  inputs: [],
  laneIndependent: true,
  outputs: [{ name: "body", kind: "mesh" }],
  // THE DECLARED SURFACE (the write plane, phase 2): the one photo
  // the verb reads — no anny card schema row exists for it (the
  // person index is FIXED at 0 in build below), so the type is the
  // anny-hmr-estimator flow row's own initial kind: its `photo`
  // validator admits an image path.
  params: [{ name: "photo", type: "string" }],
  facts: parseEstimatorFacts,
  build({ p, g }): OutputHandle {
    const load = g.node('LoadImage', { image: String(p.photo) })
    return g.node('Sam3dBodyImageToAnny', { image: load.out(0), person_index: 0 }).out(0)
  },
};

/** The verbatim bake (the preset-load verb's backend — the flow
 *  'anny-params'): authored 11-dim rows and re-instantiated
 *  estimated params bake bit-exact (AnnyParamsToGlb — the body is
 *  parametric end-to-end, stroke 89). params_json rides verbatim —
 *  the bake validator (bake_params) judged the json at the flow's
 *  initial gate; the action never re-parses what the door owns. */
export const bake: ComfyActionSpec<{ readonly params_json: string }, Record<string, never>> = {
  id: "bake",
  inputs: [],
  laneIndependent: true,
  outputs: [{ name: "body", kind: "mesh" }],
  // THE DECLARED SURFACE (the write plane, phase 2): the one json
  // the verb reads. No anny card schema row exists for it (the 11
  // dims and the local changes ride INSIDE the json, not beside it),
  // so the type is the anny-params flow row's own initial kind — its
  // `bake_params` validator admits the dialect string.
  params: [{ name: "params_json", type: "string" }],
  facts: parseEstimatorFacts,
  build({ p, g }): OutputHandle {
    return g.node('AnnyParamsToGlb', { params_json: String(p.params_json) }).out(0)
  },
};
