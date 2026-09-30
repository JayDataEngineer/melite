// actions.ts — the family's offered actions (the atom vocabulary,
// stroke 2's card-system work): the bind action the rig card binds for
// its `species` mode. The lane is the anyCreature skeleton bind the
// arm used to own in the card kit (RayCreatureRigBridge — bind the
// mesh onto the caller's anyCreature template GLB) — the family
// composes it now, so the card's mode knob names the family and the
// family owns every node.
//
// The family is weightless (the skeletons ride in the caller's own
// GLB; nothing is downloaded), so the facts door is the vacuous parse
// the tagger precedent established. Creation order IS node-id order
// (the recipe law).
//
// NODE CONTRACT (vendor/melite-poser-nodes/nodes.py —
// RayCreatureRigBridge): height_ratio is a fraction of the creature's
// bind height, max_influences takes the nearest segments, strip_body
// exports only the bound mesh.
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";

/** The closed facts shape the bind segment reads: nothing — the lane
 * is weightless (the skeletons ride in the caller's own GLB). */
export type SpeciesBindFacts = Record<string, never>;

/** The gated params doc the segment reads (the card's schema walk
 * validated types and bounds — a same-process typed boundary). */
export interface SpeciesBindParams {
  mesh_glb: string
  creature_glb: string
  height_ratio: number
  max_influences: number
  strip_body?: boolean
}

/** The weightless door: the family declares no lane_inputs, so there
 * is nothing to parse and nothing that can drift.
 *  @param _raw the resolved lane_inputs (empty for this family)
 *  @returns the vacuous facts shape */
export function parseSpeciesBindFacts(_raw: LaneInputsFacts): SpeciesBindFacts {
  return {};
}

/** The anyCreature species bind: the caller's mesh onto the caller's
 *  creature template, persisted as a rigged GLB. */
export const bind: ComfyActionSpec<SpeciesBindParams, SpeciesBindFacts> = {
  id: "bind",
  outputs: [{ name: "default", kind: "MESH" }],
  params: [],
  facts: parseSpeciesBindFacts,
  build({ p, g }) {
    const creature = g.node("PrimitiveString", { value: p.creature_glb }).out();
    const mesh = g.node("PrimitiveString", { value: p.mesh_glb }).out();
    const bound = g.node("RayCreatureRigBridge", {
      creature_glb: creature,
      mesh_glb: mesh,
      height_ratio: p.height_ratio,
      max_influences: p.max_influences,
      strip_body: p.strip_body === true,
    }).out();
    return g.node("SaveRiggedModel", { rigged_path: bound }).out();
  },
};
