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
// rigged_path rides empty on this arm (no npz to load), file_format
// glb|fbx (fbx converts through headless Blender — the Unity import
// door), preserve_texture True keeps the source textures and False
// strips to flat SOMA-blue, decimate_ratio 0 is off.
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
  decimate_ratio: number
  file_format?: string
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
  // rows only: the mesh, the file format, and the two KimodoExportFBX knobs.
  params: [
    { name: "mesh_glb", type: "string" },
    { name: "preserve_texture", type: "boolean" },
    { name: "decimate_ratio", type: "number", bounds: [0, 1] },
    { name: "file_format", type: "enum", options: ["glb", "fbx"] },
  ],
  facts: parseSomaRigFacts,
  build({ p, g }) {
    const source = g.node("PrimitiveString", { value: p.mesh_glb }).out();
    const empty = g.node("PrimitiveString", { value: "" }).out();
    return g.node("KimodoExportFBX", {
      rigged_path: empty,
      source_glb: source,
      // CLOSED (the preserve_texture precedent): the card's
      // vocabulary gates glb|fbx, and anything else rides glb —
      // the node never receives a format it cannot spell.
      file_format: p.file_format === "fbx" ? "fbx" : "glb",
      preserve_texture: p.preserve_texture === true,
      decimate_ratio: p.decimate_ratio,
    }).out();
  },
};
