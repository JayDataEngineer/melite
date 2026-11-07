// Tier 2 — the melite-poser-nodes blocks (the 3D card consensus,
// anny/fit/skin). One place per multi-node consensus. The 8-view
// turnaround block (renderGLBViews / renderGLBViewsNode) died with the
// blender lane (operator 2026-11-01: melite carries no blender — the
// RayRenderGLBViews renderer was deleted from the pack); what remains
// is the row guard the schemas pin (positive amounts).
/** Row guard: an inherent amount must be a positive finite number
 *  (zero or negative is nonsense, never a silently clamped render). */
export function positive(name, v) {
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) {
        throw new Error(`${name} = ${show(v)}: a positive number is required (never silently clamped)`);
    }
    return v;
}
function show(v) {
    const s = JSON.stringify(v);
    return s === undefined ? String(v) : s;
}
//# sourceMappingURL=poser-kit.js.map