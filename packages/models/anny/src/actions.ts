// actions.ts — the family's offered actions (the atom vocabulary,
// stroke 3): the compose action the anny card binds. The body is
// the card's own staging + turnaround tail moved verbatim (the
// body's three arms: an attached GLB renders as-is; empty bakes
// the body from the identity sliders; the 8-view sheet saves under
// the anny_<view> convention). The lane stays as the byte-oracle,
// proven in tests/action.spec.ts. Creation order IS node-id order
// (the recipe law). Keys the segment never reads ride unvalidated.
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import type { OutputHandle } from "@melite/comfyui-card-kit/graph";
import { ANNY_MORPH_LABELS, ANNY_MORPH_DEFAULT } from "@melite/comfyui-card-kit/morphs";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";

/** The served identity space's 11 dims, in its label order (the
 * bake validator names the same eleven — moved verbatim from the
 * card; the DECL's defaults carry the same labels). */
const PHENOTYPE_DIMS = [
  'gender', 'age', 'muscle', 'weight', 'height', 'proportions',
  'cupsize', 'firmness', 'african', 'asian', 'caucasian',
] as const

/** The 8 named view slots (moved verbatim from the kit's poser
 * block), slot order IS the RayRenderGLBViews output order — the
 * studio composes the sheet client-side. */
const VIEW_NAMES: readonly string[] = ['front', 'front_right', 'right', 'back_right', 'back', 'back_left', 'left', 'front_left']

/** Row guard: an inherent amount must be a positive finite number
 * (zero or negative is nonsense, never a silently clamped render —
 * moved verbatim from the kit's poser block). */
function positive(name: string, v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) {
    throw new Error(`${name} = ${JSON.stringify(v)}: a positive number is required (never silently clamped)`)
  }
  return v
}

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
  outputs: [{ name: "sheet", kind: "IMAGE" }],
  params: [],
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
    const views = g.node('RayRenderGLBViews', {
      glb_path: glbPath,
      resolution: positive('resolution', p.resolution),
      framing: positive('framing', p.framing),
      focal_length: positive('focal_length', p.focal_length),
      samples: positive('samples', p.samples),
      transparent: String(p.transparent).toLowerCase() !== 'false',
    })
    let last: OutputHandle = views.out(0)
    for (const [i, view] of VIEW_NAMES.entries()) {
      last = g.node('SaveImage', { images: views.out(i), filename_prefix: `anny_${view}` }).out()
    }
    return last
  },
};
