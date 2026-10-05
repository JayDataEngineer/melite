import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Download, EyeAlt as Eye, EyeOff, ImagePlus, Link2, Move, PersonStanding, RefreshCw, RotateCcw, Target, X, } from '@melite/card-base/client';
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { SpecPanel } from "@melite/card-base/client";
import { InputSquare, MESH_SQUARE_ACCEPT, isMeshUrl } from '@melite/card-base/client';
import { Tip } from "./kit.js";
import { cn } from '@melite/card-base/client';
import s from "./component.module.css";
import { MOTION_PREVIEW_GLB_PARAM } from "./motionParams.js";
export function MotionRail({ effectiveNpz, showSkeleton, setShowSkeleton, inPlace, setInPlace, editMode, toggleEdit, fullbodyKfAtFrame, frameIdx, stampConstraintAtFrame, editableJoints, handleRepose, reposing, keptEdit, discardKeptEdit, kimodoSpec, kimodoError, paramValues, onParamEdit, exportOpen, setExportOpen, bgImage, bgInputRef, handleBgFile, setBg, bodySrc, bodyWired, bodyWiredUpstream, bodyWiredUrl, handleBodyFile, toast, attachBody, onWireSlot, bodySlotIdx, onSave, stage, setBodyWireOpen, bodyNotice, }) {
    return (_jsxs("div", { className: s.railGrid, children: [_jsx("span", { className: s.railGroupLabel, children: "View" }), _jsx(Tip, { tip: effectiveNpz ? "Show the joint skeleton over the mesh" : "Loading mannequin…", children: _jsx("span", { className: s.contents, children: _jsxs(Button, { variant: "ghost", onClick: () => setShowSkeleton((s) => !s), disabled: !effectiveNpz, className: cn(s.railBtn, showSkeleton ? s.railBtnActive : s.railBtnIdle), children: [showSkeleton ? _jsx(Eye, { className: s.i14 }) : _jsx(EyeOff, { className: s.i14 }), "Skeleton"] }) }) }), _jsx(Tip, { tip: !effectiveNpz
                    ? "Loading mannequin…"
                    : inPlace
                        ? "Pinned at the origin — same motion, no travel (treadmill). Toggle to play the root's travel across the stage."
                        : "Playing the root's travel across the stage. Toggle to pin the figure at the origin — same motion, no travel.", children: _jsx("span", { className: s.contents, children: _jsxs(Button, { variant: "ghost", onClick: () => setInPlace((v) => !v), disabled: !effectiveNpz, "aria-pressed": inPlace, className: cn(s.railBtn, inPlace ? s.railBtnActive : s.railBtnIdle), children: [_jsx(Target, { className: s.i14 }), "In-place"] }) }) }), _jsx("span", { className: s.railGroupLabelMt, children: "Pose" }), _jsx(Tip, { tip: !effectiveNpz
                    ? "Loading mannequin…"
                    : editMode
                        ? "Exit edit mode — keeps the refined pose on the character at this frame"
                        : "Drag joints to refine the pose at this frame", children: _jsx("span", { className: s.contents, children: _jsxs(Button, { variant: "ghost", onClick: toggleEdit, disabled: !effectiveNpz, className: cn(s.railBtn, editMode ? s.railBtnEditActive : s.railBtnIdle), children: [_jsx(Move, { className: s.i14 }), editMode ? "Done" : "Refine pose"] }) }) }), editMode && (_jsxs(_Fragment, { children: [_jsx(Tip, { tip: fullbodyKfAtFrame
                            ? `Update the full-body keyframe at frame ${frameIdx + 1} with this pose`
                            : `Write this pose into the timeline as a full-body keyframe at frame ${frameIdx + 1}`, children: _jsx("span", { className: s.contents, children: _jsxs(Button, { variant: "ghost", onClick: stampConstraintAtFrame, disabled: !editableJoints, className: s.stampBtn, children: [_jsx(Target, { className: s.i14 }), "Stamp"] }) }) }), _jsx(Tip, { tip: "Chain the edited pose as the starting point \u2014 kimodo conditions the next generation on it. Hit Run when ready.", children: _jsx("span", { className: s.contents, children: _jsxs(Button, { variant: "ghost", onClick: handleRepose, disabled: reposing || !editableJoints, className: s.reposeBtn, children: [_jsx(RefreshCw, { className: reposing ? s.spinIcon : s.i14 }), reposing ? "Reposing…" : "Repose"] }) }) })] })), !editMode && keptEdit && keptEdit.frame === frameIdx && (_jsx(Tip, { tip: "Discard the refined pose at this frame \u2014 revert to the raw motion", children: _jsxs(Button, { variant: "ghost", onClick: discardKeptEdit, className: s.railBtnDanger, children: [_jsx(RotateCcw, { className: s.i14 }), "Reset pose"] }) })), _jsx(SpecPanel, { model: "kimodo", spec: kimodoSpec, error: kimodoError, values: paramValues, onEdit: onParamEdit, sections: [
                    {
                        title: "Generation",
                        testid: "mo-gen-panel",
                        rows: [
                            { name: "duration_sec" }, { name: "diffusion_steps" },
                            { name: "num_samples" }, { name: "num_transition_frames" },
                        ],
                    },
                    {
                        title: "Guidance",
                        testid: "mo-guide-panel",
                        rows: [{ name: "cfg_weight_a" }, { name: "cfg_weight_b" }],
                    },
                    {
                        title: "Clock",
                        testid: "mo-clock-panel",
                        rows: [{ name: "seed" }],
                    },
                ] }), _jsx("span", { className: s.railGroupLabelMt, children: "Output" }), _jsx(Tip, { tip: !effectiveNpz
                    ? "Loading mannequin…"
                    : exportOpen
                        ? "Close the export panel"
                        : "Frame a shot with the stage rectangle — no run needed; exports mesh / openpose / depth at the typed pixel size", children: _jsx("span", { className: s.contents, children: _jsxs(Button, { variant: "ghost", onClick: () => setExportOpen((o) => !o), disabled: !effectiveNpz, "aria-pressed": exportOpen, className: cn(s.railBtn, exportOpen ? s.railBtnActive : s.railBtnIdle), children: [_jsx(Download, { className: s.i14 }), "Export"] }) }) }), _jsx(Tip, { tip: bgImage
                    ? "Replace the background image behind the mannequin (or drop an asset/file on the stage)"
                    : "Set a background image behind the mannequin — click to pick, or drop an asset/file on the stage", children: _jsxs(Button, { variant: "ghost", onClick: () => bgInputRef.current?.click(), className: s.bgBtnIdle, children: [_jsx(ImagePlus, { className: s.i14 }), "Background"] }) }), bgImage && (_jsx(Tip, { tip: "Clear the background image", children: _jsxs(Button, { variant: "ghost", onClick: () => setBg(null), "aria-label": "Clear the background image", className: s.railBtnDanger, children: [_jsx(X, { className: s.i14 }), "Clear"] }) })), _jsx("input", { ref: bgInputRef, type: "file", accept: "image/*", className: s.hiddenInput, onChange: (e) => handleBgFile(e.target.files?.[0] ?? null) }), _jsx("span", { className: s.railGroupLabelMt, children: "Preview body" }), _jsx("div", { "data-motion-body": true, className: s.bodySquareWrap, children: _jsx(InputSquare, { label: MOTION_PREVIEW_GLB_PARAM, value: bodySrc || undefined, badge: bodyWired ? bodyWiredUpstream.title : undefined, metric: bodyWired && !bodyWiredUrl ? "waiting for upstream" : undefined, emptyIcon: _jsx(PersonStanding, { className: s.bodyEmptyIcon }), accept: MESH_SQUARE_ACCEPT, showFileAction: true, onFile: handleBodyFile, onAsset: (url) => {
                        if (!isMeshUrl(url)) {
                            toast("error", "Preview body must be a .glb or .gltf (SOMAX-rigged character).");
                            return;
                        }
                        attachBody(url);
                    }, onClear: bodyWired
                        ? () => {
                            onWireSlot?.(MOTION_PREVIEW_GLB_PARAM, null, null);
                            onSave({ ...stage.params, [MOTION_PREVIEW_GLB_PARAM]: null });
                        }
                        : () => attachBody(null), actions: onWireSlot && bodySlotIdx >= 0 && (_jsx(Tip, { tip: "Wire from an earlier card's GLB output", children: _jsx(Button, { variant: "ghost", type: "button", onClick: (e) => { e.stopPropagation(); setBodyWireOpen(true); }, "aria-label": "Wire the preview body from an earlier card", "data-motion-body-wire": true, className: cn(s.wireBtn, bodyWired ? s.wireBtnOn : s.wireBtnOff), children: _jsx(Link2, { className: s.i12 }) }) })) }) }), bodyNotice && (_jsx("p", { "data-motion-body-error": true, className: s.bodyNotice, children: bodyNotice.includes("converting through the queue")
                    ? bodyNotice
                    : `${bodyNotice} — previewing on the neutral mannequin.` }))] }));
}
//# sourceMappingURL=MotionRail.js.map
