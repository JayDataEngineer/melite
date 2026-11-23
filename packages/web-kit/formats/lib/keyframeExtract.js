/**
 * Extract keyframe frame indices from a motion's per-frame joint trajectory.
 *
 * @param framesJoints  Per-frame joint positions. Shape: [frame][joint][3].
 *                       (result.motion.frames_soma77_3d from the pose API.)
 * @param segments      Optional prompt segments. When present (>1), their
 *                       boundaries are used directly instead of velocity
 *                       detection — they ARE the semantic keyframes.
 */
export function extractKeyframeFrames(framesJoints, segments, opts = {}) {
    if (!framesJoints?.length)
        return [];
    const total = framesJoints.length;
    const minSpacing = opts.minSpacing ?? Math.max(2, Math.floor(total / 12));
    const includeEndpoints = opts.includeEndpoints ?? true;
    let raw;
    if (segments && segments.length > 1) {
        // Multi-prompt: segment boundaries are the keyframes.
        raw = new Set();
        for (const seg of segments) {
            raw.add(seg.start_frame);
            raw.add(seg.end_frame);
        }
        // Also include the peak if provided — it's often a strong anchor.
    }
    else {
        // Single-prompt (or no segments): velocity-minima detection.
        raw = new Set(velocityMinima(framesJoints));
    }
    // Enforce endpoints.
    if (includeEndpoints) {
        raw.add(0);
        raw.add(total - 1);
    }
    // Dedupe + sort + enforce min spacing (greedy — keep first, skip too-close).
    const sorted = Array.from(raw).sort((a, b) => a - b)
        .filter(f => f >= 0 && f < total);
    const out = [];
    for (const f of sorted) {
        if (out.length === 0 || f - out[out.length - 1] >= minSpacing) {
            out.push(f);
        }
        else if (f === total - 1) {
            // Always keep the last frame even if close to the previous — it's
            // the end-anchor. Proof (2026-09-12): reaching here means out is
            // non-empty and f - prev < minSpacing with f === total - 1, so the
            // end-anchor unconditionally replaces its too-close predecessor.
            out[out.length - 1] = f;
        }
    }
    return out;
}
/**
 * Per-frame velocity (total squared joint displacement). Exposed for the
 * optional velocity-curve visualization in the timeline.
 */
export function frameVelocities(framesJoints) {
    const v = new Array(framesJoints.length).fill(0);
    for (let f = 1; f < framesJoints.length; f++) {
        const a = framesJoints[f - 1];
        const b = framesJoints[f];
        let sum = 0;
        const n = Math.min(a.length, b.length);
        for (let j = 0; j < n; j++) {
            const aj = a[j], bj = b[j];
            const dx = bj[0] - aj[0];
            const dy = bj[1] - aj[1];
            const dz = bj[2] - aj[2];
            sum += dx * dx + dy * dy + dz * dz;
        }
        v[f] = sum;
    }
    v[0] = v[1] ?? 0;
    return v;
}
/** Local minima of the velocity curve → holds / extremes = good anchors. */
function velocityMinima(framesJoints) {
    const v = frameVelocities(framesJoints);
    const minima = [];
    // A frame is a local minimum if it's lower than its neighbors. Use a
    // smoothing window of 2 to avoid jitter-induced false minima.
    for (let f = 2; f < v.length - 2; f++) {
        if (v[f] < v[f - 1] && v[f] < v[f + 1] && v[f] < v[f - 2] && v[f] < v[f + 2]) {
            minima.push(f);
        }
    }
    return minima;
}
//# sourceMappingURL=keyframeExtract.js.map