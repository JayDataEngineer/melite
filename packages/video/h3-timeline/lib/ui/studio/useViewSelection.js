/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { useRef, useState } from "react";
export function useViewSelection(calls, layerA) {
    // View state (resets every mount — never persisted to params).
    const [frameIdx, setFrameIdx] = useState(0);
    // Selection state (2026-08-16, the user's directive: click a CALL or
    // BEAT clip in the bar → the LEFT SIDEBAR populates that item's
    // inputs/options — the rail scrolls the selected call card / segment
    // row into view with its ring).
    const [selected, setSelected] = useState(null);
    const callCardRefs = useRef([]);
    const beatRowRefs = useRef([]);
    /** Bar clip id → the sidebar selection. `call-N` → that call's card;
     * `beat-i-j` → call i's segment j (Layer C). null = a click on the
     * empty timeline — the sidebar shifts back to global params (the
     * mode-switching rail: global ⇄ the selected item). */
    const handleTimelineSelect = (id) => {
        if (id === null) {
            setSelected(null);
            return;
        }
        const callMatch = /^call-(\d+)$/.exec(id);
        const beatMatch = /^beat-(\d+)-(\d+)$/.exec(id);
        let next = null;
        if (beatMatch)
            next = { callIdx: Number(beatMatch[1]), beatIdx: Number(beatMatch[2]) };
        else if (callMatch)
            next = { callIdx: Number(callMatch[1]) };
        setSelected(next);
    };
    const fps = layerA.fps;
    const totalFrames = calls.length ? calls[calls.length - 1].end_frame : 1;
    return {
        frameIdx, setFrameIdx, selected, setSelected,
        callCardRefs, beatRowRefs, handleTimelineSelect, fps, totalFrames,
    };
}
//# sourceMappingURL=useViewSelection.js.map
