/** The 8 named view slots (front..front_left), slot order IS the
 *  RayRenderGLBViews output order — the studio composes the sheet
 *  client-side. */
const VIEW_NAMES = ['front', 'front_right', 'right', 'back_right', 'back', 'back_left', 'left', 'front_left'];
/** The 8-view render node itself — the consensus the three poser
 *  families share, for a card whose declared output is the ARTIFACT
 *  and whose renderer stays a terminal.
 *  @param g the graph builder
 *  @param glbPath the mesh to render
 *  @param k the rendered knobs, verbatim onto the node
 *  @returns the render node's ref (its 8 outputs are the view slots) */
export function renderGLBViewsNode(g, glbPath, k) {
    return g.node('RayRenderGLBViews', {
        glb_path: glbPath,
        resolution: k.resolution,
        framing: k.framing,
        focal_length: k.focal_length,
        samples: k.samples,
        transparent: k.transparent,
    });
}
/** The turnaround tail: the render node + one SaveImage per view
 *  under the `<prefix>_<view>` convention (creation order IS the
 *  node-id order).
 *  @param g the graph builder
 *  @param glbPath the mesh to render
 *  @param k the rendered knobs, verbatim onto the node
 *  @param prefix the filename prefix each view saves under
 *  @returns the LAST view's handle — the sheet's terminal output */
export function renderGLBViews(g, glbPath, k, prefix) {
    const views = renderGLBViewsNode(g, glbPath, k);
    let last = views.out(0);
    for (const [i, view] of VIEW_NAMES.entries()) {
        last = g.node('SaveImage', { images: views.out(i), filename_prefix: `${prefix}_${view}` }).out(0);
    }
    return last;
}
/** Row guard: an inherent amount must be a positive finite number
 *  (zero or negative is nonsense, never a silently clamped render). */
export function positive(name, v) {
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) {
        throw new Error(`${name} = ${show(v)}: a positive number is required (never silently clamped)`);
    }
    return v;
}
/** Row guard: a ratio/width must be a non-negative finite number. */
export function nonNegative(name, v) {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
        throw new Error(`${name} = ${show(v)}: negative is nonsense (never silently clamped)`);
    }
    return v;
}
/** The strict transparent law (skin schema's pinned lax-wire
 *  contract): bool verbatim; "true"/"1"/"yes" and "false"/"0"/"no"
 *  coerce; garbage refuses LOUD, never a silent default. */
export function strictTransparent(v) {
    if (typeof v === 'boolean')
        return v;
    if (typeof v === 'string') {
        const s = v.trim().toLowerCase();
        if (s === 'true' || s === '1' || s === 'yes')
            return true;
        if (s === 'false' || s === '0' || s === 'no')
            return false;
    }
    throw new Error(`transparent = ${show(v)}: true | false`);
}
/** Row guard: a wire x,y,z string (fit position/rotation) — three
 *  comma parts, each a number, carried VERBATIM into the graph. */
export function vecShape(name, v) {
    const raw = typeof v === 'string' ? v : '';
    const parts = raw.split(',');
    if (parts.length !== 3 || parts.some((p) => p.trim() === '' || !Number.isFinite(Number(p.trim())))) {
        throw new Error(`${name} = ${show(raw)}: want x,y,z`);
    }
    return raw;
}
function show(v) {
    const s = JSON.stringify(v);
    return s === undefined ? String(v) : s;
}
//# sourceMappingURL=poser-kit.js.map
