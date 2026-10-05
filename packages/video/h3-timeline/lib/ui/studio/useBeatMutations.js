import { KIND_OF_TRACK } from "./docModel.js";
import { kfIndexOf } from "./docCalls.js";
/** Legacy keyframe gestures (tenant §9) — prompt segments cut 2026-09-15. */
export function useBeatMutations(keyframes, setKeyframes) {
    // (2026-09-15, the operator's cut: NO prompt segments, NO prompt
    // beats — the four segment mutators (handleBeatAdd / addBeatSegment
    // / setBeatSegment / deleteBeatSegment) are deleted; the call's
    // prompt is ONE textarea. This hook now owns the legacy keyframe
    // gestures only.)
    // ── Keyframe gestures (legacy/frame-exact escape hatch — beats carry
    // their guides now; hand keyframes render + edit only when present) ─────
    const handleKeyframeAdd = (trackId, frame) => {
        const kind = KIND_OF_TRACK[trackId] ?? "image";
        // Return the index-derived uuid of the slot the new keyframe will
        // occupy (the bar binds the diamond to it immediately).
        const id = `kf-${keyframes.length}`;
        setKeyframes((prev) => [...prev, { frame, kind, source: "" }]);
        return id;
    };
    const handleKeyframeMove = (id, frame) => {
        const i = kfIndexOf(id);
        setKeyframes((prev) => {
            if (i < 0 || i >= prev.length || prev[i].frame === frame)
                return prev;
            const next = [...prev];
            next[i] = { ...prev[i], frame };
            return next;
        });
    };
    const handleKeyframeDelete = (id) => {
        const i = kfIndexOf(id);
        setKeyframes((prev) => (i < 0 || i >= prev.length ? prev : prev.filter((_, j) => j !== i)));
    };
    const setKeyframeSource = (i, source) => {
        setKeyframes((prev) => {
            if (i < 0 || i >= prev.length || prev[i].source === source)
                return prev;
            const next = [...prev];
            next[i] = { ...prev[i], source };
            return next;
        });
    };
    return {
        handleKeyframeAdd, handleKeyframeMove, handleKeyframeDelete, setKeyframeSource,
    };
}
//# sourceMappingURL=useBeatMutations.js.map
