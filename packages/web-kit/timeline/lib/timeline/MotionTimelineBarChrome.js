import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * MotionTimelineBarChrome — the bar's pinned + ruler + playhead chrome
 * (split from MotionTimelineBar.tsx, pure move): the label gutter
 * (zoom cluster + lane heads), the scrollable content shell with the
 * click-away deselect, the ruler, the playhead. Lane bodies live in
 * MotionTimelineBarLanes.
 */
import { Film, ListMusic, Mic, Music, Upload, Zap, ZoomIn, ZoomOut } from "./icons.js";
import { Button, IconCloseOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives';
import { AUDIO_CARDS_H, AUDIO_H, GUTTER_W, LANE_H, RULER_H, ZOOM_STEP, fmtTimecode, rgb } from "./MotionTimelineBarLayout.js";
import { Tip } from "@melite/card-base/client";
import css from "./timeline.module.css";
import { useState } from "react";
import { timelineCopy } from "../timelineCopy.js";
import { LaneHead } from "./LaneHead.js";
/** The pinned label gutter (bar line 820): the zoom cluster + lane
 *  heads. The Fit pin reads the live scale — the body is the bar's. */
export function TimelineGutter(props) {
    const { scale, scrollRef, frameIdx, promptsHeight, promptsLabel, beats, beatsLabel, beatsHeight, audioLayers, onAudioDetach, tracks, audioClipCards, onTrackAdd, kfLaneCards, } = props;
    const { zoom, anchorRef, frameToPx, setPpf, setBasePpf, fitPpf, effPpf, basePpf, } = scale;
    return (_jsx(_Fragment, { children: _jsxs("div", { className: css.gutter, style: { width: GUTTER_W }, children: [_jsxs("div", { className: css.zoomRow, style: { height: RULER_H }, children: [_jsx(Tip, { tip: "Zoom out (back toward fit)", children: _jsx(Button, { variant: "ghost", size: "sm", onClick: () => zoom(1 / ZOOM_STEP), "aria-label": timelineCopy.zoomOutAria, className: css.zoomBtn, children: _jsx(ZoomOut, {}) }) }), _jsx(Tip, { tip: "Fit the whole motion in view", children: _jsxs(Button, { variant: "ghost", size: "sm", onClick: () => {
                                    anchorRef.current = { frame: frameIdx, off: frameToPx(frameIdx) - (scrollRef.current?.scrollLeft ?? 0) };
                                    setPpf(Math.max(1, fitPpf));
                                    setBasePpf(Math.max(1, fitPpf));
                                }, className: css.zoomPct, children: [Math.round((effPpf / (basePpf ?? fitPpf)) * 100), "%"] }) }), _jsx(Tip, { tip: "Zoom in \u2014 more pixels per frame (the bar scrolls horizontally)", children: _jsx(Button, { variant: "ghost", size: "sm", onClick: () => zoom(ZOOM_STEP), "aria-label": timelineCopy.zoomInAria, className: css.zoomBtn, children: _jsx(ZoomIn, {}) }) })] }), _jsx(LaneHead, { variant: "prompts", glyph: _jsx(Film, { "aria-hidden": true }), label: promptsLabel, height: promptsHeight }), beats && (_jsx(LaneHead, { variant: "beats", glyph: _jsx(ListMusic, { "aria-hidden": true }), label: beatsLabel, height: beatsHeight })), audioLayers?.map((L) => {
                    // (2026-09-22, the D-M-E card law) the lane's OWN glyph +
                    // accent — dialogue a mic, sfx a bolt, music the note; the
                    // accent tints the glyph so the gutter reads like the clips.
                    const Glyph = L.icon === "mic" ? Mic : L.icon === "zap" ? Zap : Music;
                    return (_jsx(LaneHead, { variant: "audio", iconAttr: L.icon ?? "music", glyph: _jsx(Glyph, { "aria-hidden": true }), label: L.label, accent: L.accent, height: audioClipCards ? AUDIO_CARDS_H : AUDIO_H, title: L.stem
                            ? timelineCopy.audioBedTitle({ stem: L.stem })
                            : timelineCopy.audioDropTitle, door: L.onUpload && (_jsx(Button, { variant: "ghost", size: "sm", "data-audio-upload": L.id, "aria-label": timelineCopy.addClipAria({ label: L.label }), title: timelineCopy.addClipTitle({ label: L.label }), className: css.uploadBtn, onClick: (e) => { L.onUpload?.(e.currentTarget); }, children: _jsx(Upload, { "aria-hidden": true }) })), detach: (L.stem || (L.clips?.length ?? 0) > 0) && onAudioDetach && (_jsx(Button, { variant: "ghost", size: "sm", onClick: () => onAudioDetach(L.id), "aria-label": timelineCopy.detachAria({ label: L.label }), className: css.detachBtn, children: _jsx(IconCloseOutlineRegular, {}) })) }, L.id));
                }), tracks.map((t) => (_jsx(LaneHead, { variant: "kf", dotColor: rgb(t.color ?? [176, 180, 186]), label: t.name, height: kfLaneCards ? AUDIO_CARDS_H : LANE_H, title: timelineCopy.kfLaneTitle({ track: t.name }), door: onTrackAdd && (_jsx(Button, { variant: "ghost", size: "sm", "data-track-upload": t.uuid, "aria-label": timelineCopy.addTrackAria({ track: t.name }), title: timelineCopy.addTrackTitle({ track: t.name }), className: css.uploadBtn, onClick: (e) => { onTrackAdd?.(t.uuid, e.currentTarget); }, children: _jsx(Upload, { "aria-hidden": true }) })) }, t.uuid)))] }) }));
}
/** The scrollable shell + click-away deselect (bar line 921). */
export function TimelineContent(props) {
    const { scrollRef, contentW, suppressClickRef, onSelect, children } = props;
    return (_jsx(_Fragment, { children: _jsx("div", { className: css.contentWrap, children: _jsx("div", { ref: scrollRef, "data-testid": "motion-timeline-scroll", className: css.scroller, children: _jsx("div", { "data-testid": "motion-timeline-content", className: css.content, style: { width: contentW, minWidth: "100%" }, onClick: (e) => {
                        // Click-away deselect (the sidebar shifts back to global
                        // params): a true click on empty timeline — not a clip (the
                        // clip's own select wins; stopPropagation isn't needed since
                        // we check the target's ancestors), and never the click a
                        // browser fires right after a real drag's pointerup.
                        if (suppressClickRef.current) {
                            suppressClickRef.current = false;
                            return;
                        }
                        // Click-away deselect … plus the RULER: parking the
                        // playhead is a SEEK, never a deselect (audit F3 — a
                        // plain playhead click used to kick the sidebar's call
                        // editor back to global; DaVinci: playhead moves never
                        // change selection).
                        if (e.target.closest('[data-prompt-clip],[data-beat-clip],[data-testid="motion-timeline-ruler"]'))
                            return;
                        onSelect?.(null);
                    }, children: children }) }) }) }));
}
/** The ruler: ticks + sticky timecode. NOT a scrub surface (operator
 *  2026-11: the scrub gesture belongs to the playhead CAP alone — the
 *  white circle at the top of the line — never the bar's middle); its
 *  gestures are the double-click ADD (bar line 947) and the
 *  single-click SEEK (P6: a click on the time line moves the playhead —
 *  a jump, never a drag — or faces why not). */
export function TimelineRuler(props) {
    const { ticks, stepSec, fps, frameIdx, barBg, frameToPx, frameAt, onPromptAdd, onSeekFrame, } = props;
    // THE CLICK RECEIPT (P6's voice): every ruler click announces where
    // the playhead went — or why it didn't. A seek that announces
    // itself is still a receipt.
    const [clickVoice, setClickVoice] = useState("");
    return (_jsx(_Fragment, { children: _jsx(Tip, { fill: true, tip: onPromptAdd
                ? "Drag the playhead cap to scrub — double-click here to add a call at that frame"
                : "Drag the playhead cap to scrub", children: _jsxs("div", { "data-testid": "motion-timeline-ruler", className: css.ruler, style: { height: RULER_H }, onClick: (e) => {
                    // P6 SINGLE-CLICK SEEK: the NLE parity — click the time
                    // line and the playhead jumps to that frame (a jump, never
                    // a drag; the drag session is never entered, so the scrub
                    // law holds). The tenant resolves through onSeekFrame; when
                    // no seat is wired the chrome faces the reason instead of
                    // voiding (P6's either half).
                    const f = frameAt(e.clientX);
                    if (f == null)
                        return;
                    if (onSeekFrame) {
                        onSeekFrame(f);
                        setClickVoice(`playhead ${fmtTimecode(f, fps)}`);
                    }
                    else {
                        setClickVoice("ruler click seeks when the tenant wires the seek seat — drag the playhead cap to scrub");
                    }
                }, onDoubleClick: (e) => {
                    if (!onPromptAdd)
                        return;
                    // UNclamped (the tail-pull precedent): a double-click
                    // PAST the end means "append" — the tenant resolves.
                    const f = frameAt(e.clientX);
                    if (f != null)
                        onPromptAdd(f);
                }, children: [_jsx("span", { "data-testid": "motion-timeline-click-voice", "aria-live": "polite", className: css.timecode, style: { display: clickVoice ? undefined : "none" }, children: clickVoice }), ticks.map((s) => (_jsxs("div", { className: css.tick, style: { left: frameToPx(s * fps) }, children: [_jsx("div", { className: css.tickLine }), _jsx("span", { className: css.tickLabel, children: timelineCopy.tickSeconds({ value: stepSec < 1 ? s.toFixed(1) : String(s) }) })] }, s))), _jsx("span", { "data-testid": "motion-timeline-timecode", className: css.timecode, style: { background: barBg, boxShadow: "2px 0 6px -2px color-mix(in srgb, var(--dsw-alias-bg-base) 80%, transparent)" }, children: fmtTimecode(frameIdx, fps) })] }) }) }));
}
/** The playhead, spanning every row (bar line 1517). The cap at its
 *  top is THE scrub handle (operator 2026-11: the gesture lives on
 *  the white circle, never the bar's middle) — the line itself
 *  SWALLOWS its pixels (E2-10: pointer-dead is pass-through, and the
 *  pass-through woke every seat beneath — the ruler's seek over the
 *  ruler band, clip drags over clips, click-away deselect over empty
 *  track. The line intercepts and eats the gesture: no session, no
 *  seek, no select. The cap is carved out — a press bubbling from the
 *  cap still opens the scrub). */
export function TimelinePlayhead(props) {
    const { frameIdx, frameToPx, playhead, onGrab } = props;
    // THE SWALLOW GUARD: a press bubbling up from the cap is the scrub's
    // own — every other target on this 2px column is silence.
    const fromCap = (e) => e.target?.closest?.('[data-testid="motion-timeline-playhead-cap"]') != null;
    // Inert + capturing: the press's pointer is captured to the line so
    // a press-drag-release starting here can never land its click on the
    // content's click-away seat (or the ruler's) — the gesture dies here.
    const swallow = (e) => {
        if (fromCap(e))
            return;
        e.stopPropagation();
        e.preventDefault();
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        }
        catch (captureErr) {
            // No capture face (jsdom/happy-dom): the stopPropagation above
            // already holds the silence — capture is the drag-tail's lock.
            void captureErr;
        }
    };
    const swallowClick = (e) => {
        if (fromCap(e))
            return;
        e.stopPropagation();
        e.preventDefault();
    };
    return (_jsx(_Fragment, { children: _jsx("div", { "data-testid": "motion-timeline-playhead", className: css.playhead, style: {
                left: frameToPx(frameIdx),
                width: 2,
                background: playhead,
                boxShadow: `0 0 6px color-mix(in srgb, ${playhead} 40%, transparent)`,
                transform: "translateX(-50%)",
            }, onPointerDown: swallow, onPointerUp: swallowClick, onPointerCancel: swallowClick, onClick: swallowClick, onDoubleClick: swallowClick, children: _jsx("span", { "data-testid": "motion-timeline-playhead-cap", className: css.playheadCap, style: { background: playhead }, onPointerDown: onGrab }) }) }));
}
//# sourceMappingURL=MotionTimelineBarChrome.js.map
