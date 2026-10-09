/** The closed facts shape the remesh segment reads. The segment
 * reads NOTHING off the row (the AutoRemesher binary owns its own
 * weights), so the door is the weightless vacuous parse: present
 * to keep the action contract's one-door law, refusing nothing.
 *  @param _raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the empty facts shape */
export function parseAutoRemesherFacts(_raw) {
    return {};
}
/** The remesh action: the single AutoRemesher node — GLB in,
 * remeshed GLB out under <run>/remeshed (the family constant
 * shape, never a knob). */
export const remesh = {
    id: "remesh",
    inputs: [],
    outputs: [{ name: "glb", kind: "GLB" }],
    // THE DECLARED SURFACE (the write plane, phase 2): the
    // quad-remesh card schema's own types and bounds — the family
    // door judges defaults and variant presets against this row.
    // smooth_normal is absent: the AutoRemesher node hardcodes
    // --smooth-normal 0.0, so this segment reads no such row. The
    // node's filename_prefix rides the run id, never a knob.
    params: [
        { name: "input", type: "string" },
        // THE BUDGET CLASS (the node's required combo — the card's preset
        // knob is the declared surface; '' wired a refusal once the pack
        // enumified the input, 2026-10-09).
        { name: "preset", type: "string" },
        { name: "target_quads", type: "number", bounds: [0, 200000] },
        { name: "edge_scaling", type: "number", bounds: [0, 4] },
        { name: "sharp_edge", type: "number", bounds: [0, 180] },
        { name: "adaptivity", type: "number", bounds: [0, 2] },
        { name: "anisotropy", type: "number", bounds: [0, 4] },
    ],
    facts: parseAutoRemesherFacts,
    build({ p, g, runId }) {
        const input = String(p.input || '');
        // Family constant, never a knob (stable).
        const prefix = `${runId}/remeshed`;
        return g.node('AutoRemesher', {
            glb_path: input,
            // THE NODE'S REQUIRED COMBO (preset_ids — nodes.py INPUT_TYPES):
            // '' wired a wiring-judge refusal once the pack enumified the
            // input; the card schema defaults the class (hero).
            preset: String(p.preset || 'hero'),
            target_quads: p.target_quads,
            filename_prefix: prefix,
            edge_scaling: p.edge_scaling,
            sharp_edge: p.sharp_edge,
            adaptivity: p.adaptivity,
            anisotropy: p.anisotropy,
        }).out();
    },
};
//# sourceMappingURL=actions.js.map
