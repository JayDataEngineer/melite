// actions.ts — the family's offered actions (the atom vocabulary,
// stroke 3): the transfer action the img-to-mesh card binds (the
// third boarding seat). The segment factory is the legacy
// transferRigArm verbatim (two mount-path constants feed the GPU
// KNN weight transfer; SaveRiggedModel persists the written GLB),
// with the card's required-pair admission moved in (the family
// owns its own "the rig copy needs the donor rig AND the clothed
// target" voice). The lane stays as the byte-oracle, proven in
// tests/action.spec.ts. The family is path-based (no checkpoints —
// the door is the vacuous parse, the tagger precedent).
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";

/** The closed facts shape the transfer segment reads. The segment
 * reads NOTHING off the row (the transfer is path-based), so the
 * door is the weightless vacuous parse: present to keep the action
 * contract's one-door law, refusing nothing.
 *  @param _raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the empty facts shape */
export function parseTransferRigFacts(_raw: LaneInputsFacts): Record<string, never> {
  return {}
}

/** The gated params doc the transfer segment reads (the card's
 * schema walk validated types and bounds — a same-process typed
 * boundary). */
export type TransferRigParams = Record<string, unknown>;

/** The transfer action: the rig copy — KimodoTransferWeights +
 * SaveRiggedModel (GPU KNN weight transfer from a rigged donor
 * onto the clothed target). */
export const transfer: ComfyActionSpec<TransferRigParams, Record<string, never>> = {
  id: "transfer",
  outputs: [{ name: "glb", kind: "GLB" }],
  params: [],
  facts: parseTransferRigFacts,
  build({ p, g }) {
    // The family's own admission (moved verbatim from the card —
    // same UI-label law: the surface paints "Rigged source GLB" /
    // "Target GLB").
    const missing: Array<string> = []
    if (!String(p.rigged_glb || '').trim()) missing.push('rigged_glb')
    if (!String(p.target_glb || '').trim()) missing.push('target_glb')
    if (missing.length > 0) {
      const label: Record<string, string> = {
        rigged_glb: 'Rigged source GLB', target_glb: 'Target GLB',
      }
      throw new Error(
        `required param(s) ${missing.map((m) => `'${m}' (${label[m]})`).join(', ')} missing on the transfer_rig lane — the rig copy needs the donor rig AND the clothed target`)
    }
    const rigged = g.node('PrimitiveString', { value: p.rigged_glb as string }).out()
    const target = g.node('PrimitiveString', { value: p.target_glb as string }).out()
    const outPath = g.node('KimodoTransferWeights', {
      rigged_path: rigged, target_path: target,
    }).out()
    return g.node('SaveRiggedModel', { rigged_path: outPath }).out()
  },
};
