/** The weightless door: the family declares no lane_inputs, so there
 * is nothing to parse and nothing that can drift.
 *  @param _raw the resolved lane_inputs (empty for this family)
 *  @returns the vacuous facts shape */
export function parseSomaRigFacts(_raw) {
    return {};
}
/** The SOMA-77 rig: the mesh in, the template's hand-painted weights
 *  applied through the autorig pack's export node. */
export const rig = {
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
//# sourceMappingURL=actions.js.map
