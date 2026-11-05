// actions.ts — the family's offered actions (the atom vocabulary,
// stroke 2's card-system work): the rig action the rig card binds for
// its `auto` mode. The lane is the SOMA-77 weight transfer the arm
// used to own in the card kit (KimodoExportFBX with the template's
// hand-painted weights, shipped in the autorig pack) — the family
// composes it now, so the card's mode knob names the family and the
// family owns every node.
//
// The family is weightless (no checkpoint rides: the weights SHIP in
// the pack), so the facts door is the vacuous parse the tagger
// precedent established. Creation order IS node-id order (the recipe
// law).
//
// NODE CONTRACT (vendor/melite-autorig-nodes/nodes.py — KimodoExportFBX):
// the node takes the source GLB and writes the rigged GLB itself
// (source_glb + preserve_texture — the node IS the output capture).
// preserve_texture True keeps the source textures and False strips to
// flat SOMA-blue. The file_format knob (glb|fbx — the fbx arm converted
// through headless Blender, the Unity import door) and decimate_ratio
// died with the blender lane (operator 2026-11-01: melite carries no
// blender); GLB is the node's only output format.
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";

/** The closed facts shape the rig segment reads: nothing — the lane
 * is weightless (every wire value comes from params). */
export type SomaRigFacts = Record<string, never>;

/** The gated params doc the segment reads (the card's schema walk
 * validated types and bounds — a same-process typed boundary; the
 * arm reads its own subset of the card's surface). */
export interface SomaRigParams {
  mesh_glb: string
  preserve_texture?: boolean
}

/** The weightless door: the family declares no lane_inputs, so there
 * is nothing to parse and nothing that can drift.
 *  @param _raw the resolved lane_inputs (empty for this family)
 *  @returns the vacuous facts shape */
export function parseSomaRigFacts(_raw: LaneInputsFacts): SomaRigFacts {
  return {};
}

/** The SOMA-77 rig: the mesh in, the template's hand-painted weights
 *  applied through the autorig pack's export node. */
export const rig: ComfyActionSpec<SomaRigParams, SomaRigFacts> = {
  id: "rig",
  inputs: [],
  outputs: [{ name: "default", kind: "MESH" }],
  // THE DECLARED SURFACE (the write plane, phase 2): the rig
  // card schema's own types and bounds — the family door judges
  // defaults and variant presets against this row. The auto lane's
  // rows only: the mesh and the KimodoExportFBX texture knob. (The
  // file_format and decimate_ratio rows died with the blender lane.)
  params: [
    { name: "mesh_glb", type: "string" },
    { name: "preserve_texture", type: "boolean" },
  ],
  facts: parseSomaRigFacts,
  build({ p, g }) {
    const source = g.node("PrimitiveString", { value: p.mesh_glb }).out();
    return g.node("KimodoExportFBX", {
      source_glb: source,
      preserve_texture: p.preserve_texture === true,
    }).out();
  },
};
