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
//# sourceMappingURL=actions.js.map
