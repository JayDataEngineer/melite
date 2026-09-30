// actions.ts — the family's offered actions (the atom vocabulary,
// stroke 3): the remesh action the quad-remesh card binds. The
// segment factory is the legacy quadRemeshLane verbatim (ONE-IMPLEMENTATION
// rule: the AutoRemesher node IS the lane); the input + smooth_normal
// admission stays on the card. The lane stays as the byte-oracle,
// proven in tests/action.spec.ts. The family is weightless (no
// checkpoint loads — the door is the vacuous parse, the tagger
// precedent).
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";

/** The closed facts shape the remesh segment reads. The segment
 * reads NOTHING off the row (the AutoRemesher binary owns its own
 * weights), so the door is the weightless vacuous parse: present
 * to keep the action contract's one-door law, refusing nothing.
 *  @param _raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the empty facts shape */
export function parseAutoRemesherFacts(_raw: LaneInputsFacts): Record<string, never> {
  return {}
}

/** The gated params doc the remesh segment reads (the card's
 * schema walk validated types and bounds — a same-process typed
 * boundary). */
export type AutoRemesherParams = Record<string, unknown>;

/** The remesh action: the single AutoRemesher node — GLB in,
 * remeshed GLB out under <run>/remeshed (the family constant
 * shape, never a knob). */
export const remesh: ComfyActionSpec<AutoRemesherParams, Record<string, never>> = {
  id: "remesh",
  outputs: [{ name: "glb", kind: "GLB" }],
  params: [],
  facts: parseAutoRemesherFacts,
  build({ p, g, runId }) {
    const input = String(p.input || '')
    // Family constant, never a knob (stable).
    const prefix = `${runId}/remeshed`
    return g.node('AutoRemesher', {
      glb_path: input,
      preset: '',
      target_quads: p.target_quads as number,
      filename_prefix: prefix,
      edge_scaling: p.edge_scaling as number,
      sharp_edge: p.sharp_edge as number,
      adaptivity: p.adaptivity as number,
      anisotropy: p.anisotropy as number,
    }).out()
  },
};
