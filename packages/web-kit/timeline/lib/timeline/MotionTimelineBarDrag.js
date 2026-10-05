/**
 * MotionTimelineBarDrag — the bar's one global pointer session (split
 * from MotionTimelineBar.tsx, pure move): scrub + clip drag/resize +
 * keyframe drag, the pose-studio pattern (window listeners + live-ref
 * drag state). Bodies below are the bar's.
 */
import { useEffect, useRef, useState } from "react";
import { DRAG_ARM_PX, clamp } from "./MotionTimelineBarLayout.js";
/** The bar's pointer-session state + gesture entry points (bar line 369). */
export function useTimelineDragSession(opts) {
    const { T1, effPpf, ppf, dragScale, setPpf, setBasePpf, setDragScale, prompts, audioLayers, packed, xToFrame, keepTailVisible, onFrameChange, onScrubStart, onScrubEnd, onSelect, onKeyframeMove, onPromptMove, onPromptResize, onExtend, onAudioClipMove, } = opts;
    // The clip/diamond being dragged (drag ring highlight only — position is
    // committed live through the callbacks, so the element tracks the cursor).
    const [dragId, setDragId] = useState(null);
    const dragRef = useRef(null);
    // A drag that actually traveled suppresses the synthetic click the
    // browser fires right after its pointerup — a drag is a move/cut
    // gesture, never a deselect; only a true click on empty timeline is.
    const suppressClickRef = useRef(false);
    // The card with the furthest end (the tail). Live ref so the window
    // pointermove handler (which closes over render values) always sees the
    // current one after extend/delete re-renders.
    const lastPromptRef = useRef(null);
    lastPromptRef.current = prompts.length
        ? prompts.reduce((a, b) => (b.end_frame > a.end_frame ? b : a)).uuid
        : null;
    // The HEAD card (smallest start — packed tenants keep prompts sorted,
    // loose ones don't). Its left grip is structurally dead (frame-0 wall;
    // the tenants ignore start changes at index 0), so it renders DISABLED
    // (audit F7: an honest affordance, not a lying cursor).
    const firstPromptRef = useRef(null);
    firstPromptRef.current = prompts.length
        ? prompts.reduce((a, b) => (b.start_frame < a.start_frame ? b : a)).uuid
        : null;
    // Live prompts mirror — drag handlers read CURRENT card bounds (extends
    // mutate them mid-gesture; the pointerdown snapshot goes stale instantly).
    const promptsRef = useRef(prompts);
    promptsRef.current = prompts;
    const startDrag = (e, d) => {
        if (e.button !== 0)
            return;
        e.stopPropagation();
        e.preventDefault();
        // Stamp the envelope at gesture start — the extend-release pin test
        // (audit F4b) compares it against T1 on pointerup.
        dragRef.current = { ...d, t1AtStart: T1 };
        setDragScale(effPpf);
        if (d.kind !== "scrub")
            setDragId(d.id);
    };
    // ── One global pointer session: scrub + clip drag/resize + keyframe drag.
    // The pose-studio pattern (window listeners + live-ref drag state) — the
    // handlers below are pure math on the ORIGINAL positions + the pixel
    // delta, so rapid re-renders can't desync a drag. Delta is in FRAMES via
    // the current px-per-frame (scroll-independent).
    useEffect(() => {
        const endDrag = () => {
            const d = dragRef.current;
            dragRef.current = null;
            setDragId(null);
            setDragScale(null);
            // The pointerup that ended a REAL drag still fires a click — arm
            // the suppress so the content's deselect handler skips it.
            if (d?.moved)
                suppressClickRef.current = true;
            // EXTEND-RELEASE PIN (audit F4b, DaVinci "no rubber band"): while
            // the scale is still the LIVE fit (ppf unpinned) a gesture that
            // GREW the doc must PIN the frozen gesture scale before the freeze
            // clears — otherwise effPpf falls back to a fit over the BIGGER
            // doc and the whole sequence visibly snaps smaller on release,
            // taking back the tail the user just pulled. The absolute-scale
            // law: growth SCROLLS, never rescales. (Gesture-stable reads: ppf
            // is null for the whole gesture — only a zoom button could pin it
            // mid-drag, and a held pointer makes that impossible; dragScale is
            // set once at startDrag.)
            const grewDoc = d ? T1 > (d.t1AtStart ?? T1) : false;
            if (d && grewDoc && ppf == null && dragScale != null) {
                setPpf(dragScale);
                setBasePpf(dragScale);
            }
            // SCRUB END (2026-09-01, the davinci 1:1 round): the scrub drag's
            // lifetime is an INTERACTION STATE, not a timer — the tenant pairs
            // this with onScrubStart to gate player time reports strictly
            // (a seek's own late-arriving onTime must never yank the released
            // thumb back).
            if (d && d.kind === "scrub")
                onScrubEnd?.();
            // A keyframe pointerup with no movement = click → seek to it
            // (pose-studio pin parity: click a pin to jump).
            if (d && d.kind === "kf" && !d.moved)
                onFrameChange(d.frame);
            // A prompt pointerup with no movement = click → SELECT the clip
            // (the tenant's sidebar populates that call's inputs/options).
            // The kind check narrows the union before `moved` (scrub has none).
            if (d
                && (d.kind === "prompt-move" || d.kind === "prompt-l" || d.kind === "prompt-r")
                && !d.moved) {
                onSelect?.(d.id);
            }
            // (Layer A NLE) an audio-clip pointerup with no movement = a click
            // on the clip — not a deselect of the timeline's selection.
            if (d && d.kind === "audio-clip" && !d.moved)
                suppressClickRef.current = true;
        };
        const onMove = (e) => {
            const d = dragRef.current;
            if (!d)
                return;
            // SELF-HEAL (2026-08-15, "sometimes the first endpoint gets stuck,
            // stretching the card"): a swallowed pointerup — the browser firing
            // pointercancel for a native pan, alt-tab, focus theft — left the
            // drag ALIVE, and later button-less mouse moves kept resizing the
            // card with no press at all. A mouse pointermove with ZERO buttons
            // ends the session; a real drag always reports its held buttons, and
            // synthetic/test events carry no pointerType and pass through.
            if (e.pointerType === "mouse" && e.buttons === 0) {
                endDrag();
                return;
            }
            if (d.kind === "scrub") {
                if (Math.abs(e.clientX - d.startX) > 2)
                    d.moved = true;
                const f = xToFrame(e.clientX);
                if (f != null)
                    onFrameChange(f);
                return;
            }
            const dxF = (e.clientX - d.startX) / effPpf;
            if (Math.abs(e.clientX - d.startX) > DRAG_ARM_PX)
                d.moved = true;
            if (d.kind === "kf") {
                onKeyframeMove(d.id, clamp(Math.round(d.frame + dxF), 0, T1));
            }
            else if (d.kind === "audio-clip") {
                // (Layer A NLE law) TRANSLATE the clip: duration constant, the
                // body drag never resizes. Bounds: [0, T1 - dur] against the
                // envelope, and loose no-overlap against the layer's OTHER
                // clips (one frame of air each side — clips are a sequence on
                // one track, same rule as the motion cards).
                const L = audioLayers?.find((x) => x.id === d.layerId);
                const others = (L?.clips ?? []).filter((c) => c.id !== d.id);
                const prevEnd = others
                    .filter((c) => c.start_frame < d.startF)
                    .reduce((m, c) => Math.max(m ?? 0, c.start_frame + c.dur_frames), null);
                const nextStart = others
                    .filter((c) => c.start_frame > d.startF)
                    .reduce((m, c) => Math.min(m ?? T1, c.start_frame), null);
                let ns = clamp(Math.round(d.startF + dxF), 0, Math.max(0, T1 - d.durF));
                if (prevEnd != null)
                    ns = Math.max(ns, prevEnd + 1);
                if (nextStart != null)
                    ns = Math.min(ns, Math.max(0, nextStart - 1 - d.durF));
                onAudioClipMove?.(d.layerId, d.id, ns);
            }
            else {
                // NO-OVERLAP (2026-08-15, "the prompt cards can overlap — they get
                // tangled; they should be prevented from going over each other in
                // the first place"): cards are a SEQUENCE, not a pile. Every
                // gesture is bounded by the dragged card's positional neighbors —
                // a move slides within its slot (duration constant), an edge stops
                // one frame short of the neighbor. The TAIL keeps its past-the-
                // wall freedom (extend); the first card keeps frame 0.
                const neighborsOf = (id) => {
                    const sorted = [...promptsRef.current].sort((a, b) => a.start_frame - b.start_frame);
                    const i = sorted.findIndex((p) => p.uuid === id);
                    if (i === -1)
                        return { prevEnd: null, prevStart: null, nextStart: null, nextEnd: null };
                    return {
                        prevEnd: i > 0 ? sorted[i - 1].end_frame : null,
                        prevStart: i > 0 ? sorted[i - 1].start_frame : null,
                        nextStart: i < sorted.length - 1 ? sorted[i + 1].start_frame : null,
                        nextEnd: i < sorted.length - 1 ? sorted[i + 1].end_frame : null,
                    };
                };
                if (d.kind === "prompt-move") {
                    // BODY DRAG = MOVE, NEVER RESIZE (two 2026-08-15 reports):
                    // (1) "dragging right would STRETCH from the first second
                    // instead of move the prompt card" — the old flush-tail branch
                    // grew the END while the START sat pinned at 0. (2) The first
                    // fix's clamp parked the full-span seed dead ("can no longer
                    // click and drag"). The contract that answers both: a body drag
                    // TRANSLATES the card — DURATION constant, start AND end move
                    // together — and when the LAST card is dragged past the wall it
                    // moves into new territory with the envelope growing to fit
                    // (DaVinci's rule, the same one the right-edge grip follows;
                    // the dragged distance becomes room on the left). Non-last
                    // cards clamp at T1; nothing ever grows leftward past frame 0.
                    const live = promptsRef.current.find((x) => x.uuid === d.id);
                    const endF = live?.end_frame ?? d.endF;
                    const startF = live?.start_frame ?? d.startF;
                    const dur = Math.max(1, endF - startF);
                    const { prevEnd, prevStart, nextStart, nextEnd } = neighborsOf(d.id);
                    let ns = Math.max(0, Math.round(d.startF + dxF));
                    if (prevEnd != null) {
                        // …PACKED: the start is the CUT shared with the previous
                        // card — a body drag travels it like an edge drag (down to
                        // one frame of the previous card's span — prevStart+1, the
                        // prompt-l rule). Loose (motion): stop one frame past its
                        // END (the cards can't touch).
                        ns = Math.max(ns, packed ? (prevStart ?? 0) + 1 : prevEnd + 1);
                    }
                    const ne = ns + dur;
                    if (ne > T1 && d.id === lastPromptRef.current) {
                        // The tail card moves past the wall — grow the timeline to
                        // fit the MOVED card (never its duration: dur is untouched).
                        onExtend(ne + 1);
                        onPromptMove(d.id, ns, ne);
                        keepTailVisible(ne);
                    }
                    else {
                        const maxNs = Math.max(0, T1 - dur);
                        let c = clamp(ns, 0, maxNs);
                        // Stop one frame short of the next card… PACKED: the END is
                        // the CUT shared with the next card — it travels with the
                        // drag (up to one frame of the next card's span — the
                        // prompt-r rule). Loose: one frame before its START.
                        if (nextStart != null) {
                            c = Math.min(c, Math.max(0, packed ? (nextEnd ?? T1) - 1 - dur : nextStart - 1 - dur));
                        }
                        onPromptMove(d.id, c, c + dur);
                    }
                }
                else if (d.kind === "prompt-l") {
                    // LIVE far edge (2026-08-15, "the first endpoint gets stuck,
                    // stretching the card"): committing the pointerdown SNAPSHOT
                    // end teleported the far edge whenever anything else had touched
                    // the card since the grab (a prior extend, the envelope
                    // rescale) — the near edge tracked the cursor while the far one
                    // sat at a stale frame: a stretched card. The dragged edge keeps
                    // the delta math (position-independent, immune to scroll/zoom).
                    const live = promptsRef.current.find((x) => x.uuid === d.id);
                    const endF = live?.end_frame ?? d.endF;
                    const { prevEnd, prevStart } = neighborsOf(d.id);
                    let ns = clamp(Math.round(d.startF + dxF), 0, endF - 1);
                    if (prevEnd != null) {
                        // PACKED: the left edge is the CUT shared with the previous
                        // card — it may travel the previous card's whole span (down
                        // to prevStart+1, one frame of it survives). Loose (motion):
                        // the cards can't touch, stop one frame past its END.
                        ns = Math.max(ns, packed ? (prevStart ?? 0) + 1 : prevEnd + 1);
                    }
                    onPromptResize(d.id, ns, endF);
                    // TRIM-FOLLOW (audit F5b, DaVinci parity): an edge drag scrubs
                    // the viewer to the trim frame — the playhead rides the cut
                    // being made, so the indicator and the edit point stay linked
                    // mid-gesture (rAF-coalesced downstream by the player wrapper).
                    onFrameChange(ns);
                }
                else {
                    // prompt-r — LIVE start for the same reason.
                    const live = promptsRef.current.find((x) => x.uuid === d.id);
                    const startF = live?.start_frame ?? d.startF;
                    const { nextStart, nextEnd } = neighborsOf(d.id);
                    let ne = Math.round(d.endF + dxF);
                    if (ne > T1 && d.id === lastPromptRef.current) {
                        // The tail extends the timeline instead of hitting a wall —
                        // DaVinci's rule: the sequence grows to fit its content. The
                        // parent (onExtend) grows the envelope + syncs duration_sec, so
                        // the next Run generates the longer motion.
                        onExtend(ne + 1);
                    }
                    else {
                        ne = clamp(ne, startF + 1, T1);
                        // Stop one frame short of the next card…
                        if (nextStart != null) {
                            // …PACKED: the right edge is the CUT shared with the next
                            // card — it may travel the next card's whole span (up to
                            // nextEnd-1, one frame of it survives). Loose (motion):
                            // the cards can't touch, stop one frame before its START.
                            ne = Math.min(ne, Math.max(startF + 1, packed ? (nextEnd ?? T1) - 1 : nextStart - 1));
                        }
                    }
                    onPromptResize(d.id, startF, ne);
                    onFrameChange(ne); // TRIM-FOLLOW (audit F5b): the playhead rides the trimmed edge.
                    if (d.id === lastPromptRef.current)
                        keepTailVisible(ne);
                }
            }
        };
        // pointercancel = the browser taking the gesture (touch pan, pen
        // palm) — WITHOUT this the drag outlived the finger and ghost-resized.
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", endDrag);
        window.addEventListener("pointercancel", endDrag);
        return () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", endDrag);
            window.removeEventListener("pointercancel", endDrag);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [T1, effPpf, onFrameChange, onKeyframeMove, onPromptMove, onPromptResize, onExtend]);
    const seek = (e) => {
        if (e.button !== 0)
            return;
        dragRef.current = { kind: "scrub", startX: e.clientX, moved: false };
        onScrubStart?.();
        const f = xToFrame(e.clientX);
        if (f != null)
            onFrameChange(f);
    };
    return {
        dragId,
        dragRef,
        suppressClickRef,
        lastPromptRef,
        firstPromptRef,
        promptsRef,
        startDrag,
        seek,
    };
}
//# sourceMappingURL=MotionTimelineBarDrag.js.map
