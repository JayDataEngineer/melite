/** The closed facts shape the transfer segment reads. The segment
 * reads NOTHING off the row (the transfer is path-based), so the
 * door is the weightless vacuous parse: present to keep the action
 * contract's one-door law, refusing nothing.
 *  @param _raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the empty facts shape */
export function parseTransferRigFacts(_raw) {
    return {};
}
/** The transfer action: the rig copy — KimodoTransferWeights +
 * SaveRiggedModel (GPU KNN weight transfer from a rigged donor
 * onto the clothed target). */
export const transfer = {
    id: "transfer",
    inputs: [],
    outputs: [{ name: "glb", kind: "GLB" }],
    // THE DECLARED SURFACE (the write plane, phase 2): the
    // img-to-mesh card schema's own types and bounds — the family door
    // judges defaults and variant presets against this row. Both keys
    // are the card's bare path strings (required per-arm in compose,
    // never numeric); the rig card's copy lane feeds the same pair
    // (donor_glb → rigged_glb, mesh_glb → target_glb).
    params: [
        { name: "rigged_glb", type: "string" },
        { name: "target_glb", type: "string" },
    ],
    facts: parseTransferRigFacts,
    build({ p, g }) {
        // The family's own admission (moved verbatim from the card —
        // same UI-label law: the surface paints "Rigged source GLB" /
        // "Target GLB").
        const missing = [];
        if (!String(p.rigged_glb || '').trim())
            missing.push('rigged_glb');
        if (!String(p.target_glb || '').trim())
            missing.push('target_glb');
        if (missing.length > 0) {
            const label = {
                rigged_glb: 'Rigged source GLB', target_glb: 'Target GLB',
            };
            throw new Error(`required param(s) ${missing.map((m) => `'${m}' (${label[m]})`).join(', ')} missing on the transfer-rig lane — the rig copy needs the donor rig AND the clothed target`);
        }
        const rigged = g.node('PrimitiveString', { value: p.rigged_glb }).out();
        const target = g.node('PrimitiveString', { value: p.target_glb }).out();
        const outPath = g.node('KimodoTransferWeights', {
            rigged_path: rigged, target_path: target,
        }).out();
        return g.node('SaveRiggedModel', { rigged_path: outPath }).out();
    },
};
//# sourceMappingURL=actions.js.map
