/** The weightless door: the family declares no lane_inputs, so there
 * is nothing to parse and nothing that can drift.
 *  @param _raw the resolved lane_inputs (empty for this family)
 *  @returns the vacuous facts shape */
export function parseSpeciesBindFacts(_raw) {
    return {};
}
/** The anyCreature species bind: the caller's mesh onto the caller's
 *  creature template, persisted as a rigged GLB. */
export const bind = {
    id: "bind",
    inputs: [],
    outputs: [{ name: "default", kind: "MESH" }],
    // THE DECLARED SURFACE (the write plane, phase 2): the rig
    // card schema's own types and bounds — the family door judges
    // defaults and variant presets against this row. The species
    // lane's rows only: the two GLB paths and the three
    // RayCreatureRigBridge knobs. The copy lane's donor_glb and the
    // auto lane's knobs belong to the transfer-rig and gem-soma
    // actions, not here.
    params: [
        { name: "mesh_glb", type: "string" },
        { name: "creature_glb", type: "string" },
        { name: "height_ratio", type: "number", bounds: [0.05, 10] },
        { name: "max_influences", type: "number", bounds: [1, 8] },
        { name: "strip_body", type: "boolean" },
    ],
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
//# sourceMappingURL=actions.js.map
