import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Info, Pause, PlayAlt as Play, Plus, RotateCw } from '@melite/card-base/client';
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { MotionTimelineBar } from "@melite-plugin/timeline/ui/timeline";
import { PaneHeader, PaneShell, Tip, WirePickerModal } from "./kit.js";
import s from "./component.module.css";
import { MOTION_PREVIEW_GLB_PARAM } from "./motionParams.js";
export function MotionTimelineSection({ npz, editMode, playing, setPlaying, fmt, curSec, totalSec, tlPrompts, targetT, addPromptCard, tlKeyframes, frameIdx, effectiveNpz, onTimelineExtend, handleTimelineFrameChange, onKeyframeAdd, onKeyframeMove, onKeyframeDelete, onPromptUpdate, onPromptMove, onPromptResize, onPromptDelete, bodyWireOpen, onWireSlot, priorStages, bodyWired, bodyWiredId, onSave, setBodyGlbState, setBodyNotice, setBodyWireOpen, }) {
    /* v8 ignore next 1 -- targetT ≥ 1 from every constructor (probe 2026-09-19): the empty-timeline face is the zero-frame fence */
    const emptyTimelineFace = !targetT && (_jsxs("div", { className: s.timelineEmpty, children: [_jsx(Info, { className: s.i14 }), "Run the card \u2014 the timeline appears with the motion"] }));
    return (_jsxs(_Fragment, { children: [_jsxs(PaneShell, { className: s.timelineShell, children: [_jsx(PaneHeader, { variant: "strip", className: s.transportHead, lead: _jsxs(_Fragment, { children: [_jsx(Tip, { tip: !npz
                                        ? "Run the card first — nothing to play yet"
                                        : editMode
                                            ? "Pause playback while refining"
                                            : playing
                                                ? "Pause (Space)"
                                                : "Play (Space)", children: _jsx("span", { className: s.contents, children: _jsx(Button, { variant: "ghost", onClick: () => setPlaying((p) => !p), disabled: editMode || !npz, "aria-label": playing ? "Pause (Space)" : "Play (Space)", className: s.playBtn, children: playing ? _jsx(Pause, { className: s.i14 }) : _jsx(Play, { className: s.playIcon }) }) }) }), _jsx("div", { className: s.timeWrap, children: npz ? (_jsxs("span", { className: s.timeText, children: [fmt(curSec), " / ", fmt(totalSec)] })) : (_jsxs("span", { className: s.noMotion, children: [_jsx(Info, { className: s.i14 }), "No motion yet \u2014 run the card"] })) }), npz && (_jsx("div", { className: s.fpsChip, children: `${npz.fps.toFixed(0)} fps · ${npz.T}f` }))] }), hint: _jsxs("span", { className: s.hintWrap, children: [_jsxs("span", { className: s.hintTitle, children: ["Timeline \u00B7 prompt cards", tlPrompts.length > 0 ? ` (${tlPrompts.length})` : ""] }), _jsx(Tip, { tip: /* v8 ignore next -- targetT = max(baseT≥1, …) ≥ 1 from every constructor (probe 2026-09-19) */ targetT > 0 ? "Add a new prompt card — splits the last card so you can type a distinct motion for that segment" : "Loading the timeline…", children: _jsx("span", { className: s.contents, children: _jsxs(Button, { variant: "ghost", onClick: addPromptCard, disabled: targetT <= 0, className: s.addCardBtn, children: [_jsx(Plus, { className: s.i12 }), "Add prompt card"] }) }) })] }) }), targetT > 0 && (_jsx(MotionTimelineBar, { prompts: tlPrompts, keyframes: tlKeyframes, frameIdx: frameIdx, totalFrames: targetT, fps: effectiveNpz?.fps ?? 30, onExtend: onTimelineExtend, onFrameChange: handleTimelineFrameChange, onKeyframeAdd: onKeyframeAdd, onKeyframeMove: onKeyframeMove, onKeyframeDelete: onKeyframeDelete, onPromptUpdate: onPromptUpdate, onPromptMove: onPromptMove, onPromptResize: onPromptResize, onPromptDelete: onPromptDelete })), emptyTimelineFace] }), editMode && (_jsxs("div", { className: s.editHintBar, children: [_jsx(RotateCw, { className: s.editHintIcon }), _jsxs("span", { children: ["Drag joints to refine the pose at this frame (IK moves the chain).", _jsx("b", { className: s.editHintStrong, children: " Repose" }), " patches rotations for the edited frame and saves it as the chain start. Hit Run when ready \u2014 kimodo conditions on it. Finger/toe tip rotations are approximate (translate edits)."] })] })), bodyWireOpen && onWireSlot && (_jsx(WirePickerModal, { slot: MOTION_PREVIEW_GLB_PARAM, priorStages: priorStages, currentId: bodyWired ? bodyWiredId : "", currentOutput: null, onPick: (upstreamId) => {
                    onWireSlot(MOTION_PREVIEW_GLB_PARAM, upstreamId, null);
                    onSave({ [MOTION_PREVIEW_GLB_PARAM]: null });
                    setBodyGlbState(null);
                    setBodyNotice(null);
                    setBodyWireOpen(false);
                }, onUnwire: () => {
                    onWireSlot(MOTION_PREVIEW_GLB_PARAM, null, null);
                    onSave({ [MOTION_PREVIEW_GLB_PARAM]: null });
                    setBodyWireOpen(false);
                }, onClose: () => setBodyWireOpen(false) }))] }));
}
//# sourceMappingURL=MotionTimelineSection.js.map
