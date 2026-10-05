import { Fragment as _Fragment, jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { defineShellDeclaration, StudioShell } from '@melite/card-base/client';
import { ChevronDown, TriangleAlert } from '@melite/card-base/client';
import { cn } from '@melite/card-base/client';
import { fieldsOf, useFormSpec } from "@melite/card-base/client";
import { useMemo } from "react";
import s from "./studio.module.css";
import { StudioPreview } from "./StudioPreview.js";
import { StudioStripPane } from "./StudioStripPane.js";
import { RunRecipeEngine } from "./RunRecipeEngine.js";
import { RunRefsClips } from "./RunRefsClips.js";
import { CallCardsPanel } from "./CallCardsPanel.js";
import { useDocState } from "./useDocState.js";
import { useViewSelection } from "./useViewSelection.js";
import { useFilmSync } from "./useFilmSync.js";
import { useDocEffects } from "./useDocEffects.js";
import { useFilmAudio } from "./useFilmAudio.js";
import { usePromptMutations } from "./usePromptMutations.js";
import { useEnhance } from "./useEnhance.js";
import { useCallMutations } from "./useCallMutations.js";
import { useBeatMutations } from "./useBeatMutations.js";
import { useDerivedView } from "./useDerivedView.js";
export { stemToClip } from "./docModel.js";
// ── The tenant ─────────────────────────────────────────────────────────────
export function VideoTimelineStudio({ stage, running, onSave, upstreams, }) {
    // ── Composition: the monolith's hook blocks, in source order (hook
    // order is load-bearing — each custom hook below holds ONE contiguous
    // section, called here in the original sequence).
    const doc = useDocState(stage);
    const { calls, keyframes, layerA } = doc;
    // THE OVERRIDE LAYER'S SCHEMA TRUTH (hour 22): the knob fold rides
    // the SERVED envelope's walk — the same schemastery serialization
    // every other face consumes (SpecField: type/options/default/bounds)
    // — fetched ONCE here at the tenant. The build-time knob-spec
    // projection is DEAD: it silently dropped `default` and the fold
    // showed "inherit" while the admission gate composed 12.
    const { spec: knobSpec } = useFormSpec("h3-timeline");
    const knobFields = useMemo(() => {
        if (knobSpec === null || knobSpec === undefined)
            return {};
        const out = {};
        for (const f of fieldsOf(knobSpec))
            out[f.name] = f;
        return out;
    }, [knobSpec]);
    const view = useViewSelection(calls, layerA);
    const { selected, fps, totalFrames } = view;
    const film = useFilmSync({ fps, totalFrames, keyframes, calls, setFrameIdx: view.setFrameIdx });
    const { seconds, unwired, guideCount, knobOverrides } = film;
    const fx = useDocEffects({
        totalFrames, setFrameIdx: view.setFrameIdx, selected, setSelected: view.setSelected, calls, keyframes,
        layerA, setLayerA: doc.setLayerA, onSave,
        callCardRefs: view.callCardRefs, beatRowRefs: view.beatRowRefs,
        lastCallsRef: doc.lastCallsRef, lastKeyframesRef: doc.lastKeyframesRef,
        lastLayerARef: doc.lastLayerARef,
    });
    const audio = useFilmAudio({
        stage, upstreams, layerA, setLayerA: doc.setLayerA, setLayerAKey: fx.setLayerAKey,
        fps, frameIdx: view.frameIdx, filmPlaying: film.filmPlaying, filmFpsRef: film.filmFpsRef,
    });
    const pr = usePromptMutations(doc.setCalls);
    const enh = useEnhance();
    const mut = useCallMutations(doc.setCalls, fps);
    const kf = useBeatMutations(keyframes, doc.setKeyframes);
    const derived = useDerivedView({
        upstreams, stage, calls, layerA, keyframes,
        filmMap: audio.filmMap, filmFromDoc: audio.filmFromDoc, selected, fps, totalFrames,
    });
    const handleDuration = (sec) => derived.setFilmDurSec(sec);
    return (
    /* THE SHELL RIDE (2026-09-07): rail/center/bottom as declared
       seams — the stub shellDeclaration comment below is now the
       live shape. The document readout — every structural action is
       a direct gesture on the bar (add = double-click, delete = ✕ /
       the rail card's Delete). */
    _jsx(StudioShell, { className: cn(s.studioRoot), params: _jsxs("div", { className: s.railCol, children: [_jsx("div", { className: s.docBlock, children: _jsxs("div", { className: s.docLines, children: [_jsxs("div", { "data-testid": "tl-doc-readout", className: s.tabular, children: [calls.length, " call", calls.length === 1 ? "" : "s", " \u00B7 ", seconds, "s \u00B7", " ", guideCount, " guide", guideCount === 1 ? "" : "s", knobOverrides > 0 && (_jsxs(_Fragment, { children: [" \u00B7 ", knobOverrides, " call", knobOverrides === 1 ? "" : "s", " with knobs"] }))] }), unwired > 0 && (_jsxs("div", { className: s.warnRow, children: [_jsx(TriangleAlert, { className: cn(s.warnIcon, s.sz12) }), _jsxs("span", { children: [unwired, " keyframe source", unwired === 1 ? "" : "s", " unwired \u2014 wire them below or the run door names them as TODOs."] })] }))] }) }), _jsx(CallCardsPanel, { calls: calls, selected: selected, setSelected: view.setSelected, fps: fps, sourceOptions: derived.sourceOptions, keyframes: keyframes, handleKeyframeMove: kf.handleKeyframeMove, handleKeyframeDelete: kf.handleKeyframeDelete, setKeyframeSource: kf.setKeyframeSource, deps: {
                        selected, fps, layerA, knobFields,
                        callCardRefs: view.callCardRefs,
                        artifactIndex: audio.artifactIndex, linkGroups: derived.linkGroups,
                        refArtifacts: audio.refArtifacts,
                        handlePromptDelete: pr.handlePromptDelete,
                        handlePromptUpdate: pr.handlePromptUpdate,
                        enhanceOne: enh.enhanceOne, undoEnhance: enh.undoEnhance,
                        enhancing: enh.enhancing, enhanceErr: enh.enhanceErr,
                        enhanceUndo: enh.enhanceUndo,
                        setCallSpan: mut.setCallSpan, setCallGuide: mut.setCallGuide,
                        setCallTransition: mut.setCallTransition,
                        setCallRefs: mut.setCallRefs, setCallKnob: mut.setCallKnob,
                        voicePinnedCalls: derived.voicePinnedCalls,
                        audioClipsPresent: derived.audioClipsPresent,
                    } }), selected == null && (_jsxs("details", { "data-testid": "tl-run-panel", className: s.runFold, children: [_jsxs("summary", { className: s.runSummary, children: [_jsx(ChevronDown, { className: cn(s.sz12, s.chev), "aria-hidden": true }), "Run parameters", _jsx("span", { className: s.runSummaryNote, children: "Layer A \u2014 global \u00B7 calls inherit" })] }), _jsxs("div", { className: s.runBody, children: [_jsx(RunRecipeEngine, { stage: stage, layerA: layerA, setLayerAKey: fx.setLayerAKey, setLayerA: doc.setLayerA, refArtifacts: audio.refArtifacts }), _jsx(RunRefsClips, { layerA: layerA, updateAudioClip: audio.updateAudioClip, deleteAudioClip: audio.deleteAudioClip })] })] }))] }), preview: _jsx(StudioPreview, { stage: stage, running: running, filmstrip: derived.filmstrip, filmRef: film.filmRef, filmMap: audio.filmMap, frameIdx: view.frameIdx, barTotal: derived.barTotal, fps: fps, handleFilmTime: film.handleFilmTime, handlePlayingChange: film.handlePlayingChange, onDuration: handleDuration }), 
        /* (Layer B call cards moved into the RAIL — 2026-08-16: the left
            sidebar IS the parameter surface — click a call/beat clip in
            the bar below to select + scroll the rail to it.) */
        /* ── LAYER B ON THE STRIP — pinned bottom, the NLE footer. The
            document IS the calls: drag a card edge to move the cut,
            double-click to edit, pull the last card's tail to grow the
            sequence. A cyan dot marks a call that overrides the run's
            knobs (its window renders differently from the globals). A
            window render previews INSIDE the clip (first frame at rest,
            plays on hover). The BEATS row under the calls is Layer C —
            the prompt segments, clickable. A click on ANY clip (call or
            call) selects it: the rail's call panel scrolls that card /
            into view with its ring. */
        bottom: _jsx(StudioStripPane, { calls: calls, totalFrames: totalFrames, fps: fps, seconds: seconds, barPrompts: derived.barPrompts, barLanes: derived.barLanes, barAudioClips: derived.barAudioClips, barTotal: derived.barTotal, frameIdx: view.frameIdx, callPreviews: derived.callPreviews, selectedBarId: derived.selectedBarId, filmMap: audio.filmMap, handleBarFrame: film.handleBarFrame, handleScrubStart: film.handleScrubStart, handleScrubEnd: film.handleScrubEnd, handleKeyframeAdd: kf.handleKeyframeAdd, handleKeyframeMove: kf.handleKeyframeMove, handleKeyframeDelete: kf.handleKeyframeDelete, handlePromptUpdate: pr.handlePromptUpdate, handlePromptMove: pr.handlePromptMove, handlePromptResize: pr.handlePromptResize, handlePromptDelete: pr.handlePromptDelete, handleExtend: mut.handleExtend, addCallAt: mut.addCallAt, handleTimelineSelect: view.handleTimelineSelect, layerA: layerA, refAudiosBlocked: derived.refAudiosPresent, addAudioClip: audio.addAudioClip, takeAudioFile: audio.takeAudioFile, moveAudioClip: audio.moveAudioClip, deleteAudioClip: audio.deleteAudioClip, updateAudioClip: audio.updateAudioClip, setLayerAKey: fx.setLayerAKey, artifactIndex: audio.artifactIndex, docFromFilm: audio.docFromFilm, keyframes: keyframes }) }));
}
export default VideoTimelineStudio;
/** THE SHELL RIDE, as data (row 5 stroke 4) — LIVE since the
 *  2026-09-07 chrome stroke: the body renders StudioShell with these
 *  seams (the rail IS the parameter surface; the video windows own
 *  the viewport, kind "native" — the card renders no shared
 *  viewport; MotionTimelineBar is the view model on the bottom). */
export const shellDeclaration = defineShellDeclaration({
    preview: { kind: "native" },
    bottom: { kind: "timeline" },
    params: { slots: [] },
});
//# sourceMappingURL=component.js.map
