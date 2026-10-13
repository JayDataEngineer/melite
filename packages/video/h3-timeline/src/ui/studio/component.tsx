/**
 * VideoTimelineStudio — tenant #4, the timeline card's wide authoring
 * surface (dev_docs/design/video-timeline-card.md §3 D3 + §7 S5 + §10).
 *
 * WHAT IT IS: the DOCUMENT, editable — with the THREE-LAYER control
 * system usable (2026-08-15 rework — "the card [REDACTED 2026-11-05], it is missing 95%
 * of the features discussed"):
 *
 *   LAYER A    the Run panel (tl-run-panel) — in the LEFT SIDEBAR (the
 *              rail IS the parameter surface — the viewport belongs to
 *              the video): global values every model
 *              call inherits — Recipe (preset/fps/audio mode/continuity/
 *              seed) + Engine (shift/sampler/scheduler/steps/accel) +
 *              positioned audio clips (audio_clips — NLE-style Music row).
 *              Legacy docs with audio_stem are converted to clips on load.
 *              These write the doc-level keys; calls inherit them, per-call
 *              overrides REPLACE them (backend CALL_KNOB_KEYS, §10.3).
 *   LAYER B    the call cards (data-call-card): ONE entity per MODEL
 *              CALL — the prompt (a `text` prompt, or `beats` prompt
 *              segments — Layer C WITHIN the call), the span (start/end
 *              frames, synced both ways with the bar), the three guide
 *              sources (image/clip/audio — anchored at the call's
 *              start), and the "Call knobs" fold (per-call REPLACE over
 *              Layer A; absent knob = inherit; a call with overrides
 *              shows a cyan dot on its bar clip).
 *   LAYER C    prompt beats — SEGMENTS WITHIN a call (2026-08-16, the
 *              B/C conflation fix: a beat is a SUBSET of a model call,
 *              never the timeline entity). Segments join into the
 *              call's ONE prompt with time markers ("(0.0-4.2s): …")
 *              and NEVER cut — cuts land on CALL boundaries. A segment
 *              may CROSS a call boundary (one unbroken bar, ≥1 frame
 *              owned by its call): the compiler slices it at the
 *              window cut with window-local markers — the user never
 *              slices manually. The strip
 *              (MotionTimelineBar) shows CALLS: cut an edge = a new
 *              model call at that timestamp, the window render previews
 *              inside the clip (hover plays it), and the BEATS row
 *              under the calls renders the segments. Clicking a CALL or
 *              BEAT clip SELECTS it — the LEFT SIDEBAR SHIFTS MODE (the
 *              mode-switching rail, 2026-08-16): global params (Layer A +
 *              compact call rows) ⇄ THAT item's full editor (its card,
 *              scrolled + ringed). A click on the EMPTY timeline — or the
 *              rail's back button — shifts back to global.
 *
 * THE VIEW MODEL is MotionTimelineBar (the pose-studio DOM clips — the
 * 2026-08-14 model that REPLACED the vendored viser canvas; D3's
 * component reference predates that retirement). Reused, not forked:
 * the bar is the interaction model, and this tenant passes its own
 * lanes/labels/packed mode.
 *
 * E1 (the pattern, dev_docs/design/card-studio-pattern.md §3): a studio is a
 * param editor. The registry's `writes` set (cardStudios.ts) is the
 * DECLARED surface — the document keys + every Layer A doc key the run
 * panel owns; the E4 contract test drives real gestures and asserts
 * every onSave key ∈ that set.
 *
 * FRAMES: the document's end_frame is EXCLUSIVE (calls tile 0..T exactly —
 * plan_windows' contiguity rule); the bar's end_frame is INCLUSIVE (the
 * last frame index). The hydrate/serialize helpers are the ONLY places
 * that translate (prompt.end = call.end - 1).
 *
 * SPLIT (2026-09-06): pure move into focused modules under ui/studio/
 * (doc model + hydrate, ref utils, use- hooks, Run/Call/Studio panes) —
 * every logic line below the imports is verbatim from the monolith.
 */
import type { CardStage } from "@melite/contracts"
import { defineShellDeclaration, StudioShell } from '@melite/card-base/client'
import { ChevronDown, TriangleAlert } from '@melite/card-base/client'
import { cn } from '@melite/card-base/client'
import { fieldsOf, useFormSpec, type SpecField } from "@melite/card-base/client"
import { useMemo } from "react"
import s from "./studio.module.css"
import { StudioPreview } from "./StudioPreview.tsx"
import { StudioStripPane } from "./StudioStripPane.tsx"
import { RunRecipeEngine } from "./RunRecipeEngine.tsx"
import { RunRefsClips } from "./RunRefsClips.tsx"
import { CallCardsPanel } from "./CallCardsPanel.tsx"
import { useShownDoc } from "./useShownDoc.ts"
import { useStudioViewSync } from "./useStudioViewSync.ts"
import { useViewSelection } from "./useViewSelection.ts"
import { useFilmSync } from "./useFilmSync.ts"
import { useFilmAudio } from "./useFilmAudio.ts"
import { usePromptMutations } from "./usePromptMutations.ts"
import { useEnhance } from "./useEnhance.ts"
import { useCallMutations } from "./useCallMutations.ts"
import { useBeatMutations } from "./useBeatMutations.ts"
import { useDerivedView } from "./useDerivedView.ts"

export { stemToClip } from "./docModel.ts"

// ── The tenant ─────────────────────────────────────────────────────────────

export function VideoTimelineStudio({
  stage,
  running,
  onSave,
  upstreams,
}: {
  stage: CardStage
  running: boolean
  onSave: (params: Record<string, unknown>) => void
  upstreams?: CardStage[]
}) {
  // ── Composition: the monolith's hook blocks, in source order (hook
  // order is load-bearing — each custom hook below holds ONE contiguous
  // section, called here in the original sequence).
  // THE COLLAPSE (the rework): the shown doc is f(row, ops) — no
  // mirror, no guard, no persist loop. Every gesture commits
  // straight through onSave; stated-but-unsettled writes ride the
  // op overlay until the durable doc contains them.
  const doc = useShownDoc(stage, onSave)
  const { calls, keyframes, layerA } = doc
  // THE OVERRIDE LAYER'S SCHEMA TRUTH (hour 22): the knob fold rides
  // the SERVED envelope's walk — the same schemastery serialization
  // every other face consumes (SpecField: type/options/default/bounds)
  // — fetched ONCE here at the tenant. The build-time knob-spec
  // projection is DEAD: it silently dropped `default` and the fold
  // showed "inherit" while the admission gate composed 12.
  const { spec: knobSpec } = useFormSpec("h3-timeline")
  const knobFields = useMemo(() => {
    if (knobSpec === null || knobSpec === undefined) return {}
    const out: Record<string, SpecField> = {}
    for (const f of fieldsOf(knobSpec)) out[f.name] = f
    return out
  }, [knobSpec])
  const view = useViewSelection(calls, layerA)
  const { selected, fps, totalFrames } = view
  const film = useFilmSync({ fps, totalFrames, keyframes, calls, setFrameIdx: view.setFrameIdx })
  const { seconds, unwired, guideCount, knobOverrides } = film
  useStudioViewSync({
    totalFrames, setFrameIdx: view.setFrameIdx, selected, setSelected: view.setSelected, calls,
    callCardRefs: view.callCardRefs, beatRowRefs: view.beatRowRefs,
  })
  const audio = useFilmAudio({
    stage, upstreams, layerA, setLayerA: doc.updateLayerA, setLayerAKey: doc.setLayerAKey,
    fps, frameIdx: view.frameIdx, filmPlaying: film.filmPlaying, filmFpsRef: film.filmFpsRef,
  })
  const pr = usePromptMutations(doc.updateCalls)
  const enh = useEnhance()
  const mut = useCallMutations(doc.updateCalls, fps)
  const kf = useBeatMutations(keyframes, doc.updateKeyframes)
  const derived = useDerivedView({
    upstreams, stage, calls, layerA, keyframes,
    filmMap: audio.filmMap, filmFromDoc: audio.filmFromDoc, selected, fps, totalFrames,
  })
  const handleDuration = (sec: number) => derived.setFilmDurSec(sec)

  return (
    /* THE SHELL RIDE (2026-09-07): rail/center/bottom as declared
       seams — the stub shellDeclaration comment below is now the
       live shape. The document readout — every structural action is
       a direct gesture on the bar (add = double-click, delete = ✕ /
       the rail card's Delete). */
    <StudioShell className={cn(s.studioRoot)}
      params={
        <div className={s.railCol}>
          <div className={s.docBlock}>
          <div className={s.docLines}>
            <div data-testid="tl-doc-readout" className={s.tabular}>
              {calls.length} call{calls.length === 1 ? "" : "s"} · {seconds}s ·{" "}
              {guideCount} guide{guideCount === 1 ? "" : "s"}
              {knobOverrides > 0 && (
                <> · {knobOverrides} call{knobOverrides === 1 ? "" : "s"} with knobs</>
              )}
            </div>
            {/* NO empty-prompt banner (2026-09-15, the operator's
                catch): the plan's own gate refuses empty prompts at
                the door with a typed receipt, and the empty
                textarea's placeholder already says it at the exact
                point of entry — a rail banner is a third voice for
                a law already spoken twice. The gate itself is
                untouched (card.ts compose refusal). */}
            {unwired > 0 && (
              <div className={s.warnRow}>
                <TriangleAlert className={cn(s.warnIcon, s.sz12)} />
                <span>
                  {unwired} keyframe source{unwired === 1 ? "" : "s"} unwired — wire them below or the run door
                  names them as TODOs.
                </span>
              </div>
            )}
          </div>
          </div>

          {/* ── LAYER A — the Run panel, IN THE RAIL, AT THE BOTTOM
              (the operator's hour-7 order, 2026-09-13: "run paramteres
              is suppoesd to be an optional to unfold at the bottom of
              the input parmaeters"). The INPUT parameters — the call
              cards — own the top of the rail; the Run fold is the
              OPTIONAL global layer beneath them, CLOSED by default
              (the hour-7 law, restored 2026-09-21 by the CI-seat
              repair: a parallel lane's no-loss commit had flipped it
              open with a claim of "like every other card" — no
              operator receipt, and the browser wall never reran; the
              wall is the law and it says closed).
              Content unchanged: Recipe (preset/fps/audio/continuity/
              seed) + Engine (shift/sampler/scheduler/steps/accel) +
              the master audio stem (MIX).
              GLOBAL MODE ONLY (the mode-switching rail, 2026-08-16: the
              sidebar shows the global params until a call/beat clip is
              selected in the bar — then it swaps to THAT item's editor;
              a click on the empty timeline swaps back). */}
          <CallCardsPanel
            calls={calls}
            selected={selected}
            setSelected={view.setSelected}
            fps={fps}
            sourceOptions={derived.sourceOptions}
            keyframes={keyframes}
            handleKeyframeMove={kf.handleKeyframeMove}
            handleKeyframeDelete={kf.handleKeyframeDelete}
            setKeyframeSource={kf.setKeyframeSource}
            deps={{
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
            }}
          />
          {selected == null && (
          <details data-testid="tl-run-panel" className={s.runFold}>
            <summary className={s.runSummary}>
              <ChevronDown className={cn(s.sz12, s.chev)} aria-hidden />
              Run parameters
              <span className={s.runSummaryNote}>
                Layer A — global · calls inherit
              </span>
            </summary>
            <div className={s.runBody}>
          <RunRecipeEngine
            stage={stage}
            layerA={layerA}
            setLayerAKey={doc.setLayerAKey}
            setLayerA={doc.updateLayerA}
            refArtifacts={audio.refArtifacts}
          />
          {/* RunAdvancedPanels is DEAD (the generic-seam law): CardForm
           * above already renders every SLA leaf, every post leaf, and
           * the loras mod section — the second SpecPanel + ModLane
           * mount rendered all of it TWICE (the doubled SLA + doubled
           * Modifiers the operator caught). */}
          <RunRefsClips
            layerA={layerA}
            updateAudioClip={audio.updateAudioClip}
            deleteAudioClip={audio.deleteAudioClip}
          />
            </div>
          </details>
          )}
        </div>
      }
      preview={
          <StudioPreview
            stage={stage}
            running={running}
            filmstrip={derived.filmstrip}
            filmRef={film.filmRef}
            filmMap={audio.filmMap}
            frameIdx={view.frameIdx}
            barTotal={derived.barTotal}
            fps={fps}
            handleFilmTime={film.handleFilmTime}
            handlePlayingChange={film.handlePlayingChange}
            onDuration={handleDuration}
          />
      }
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
      bottom={
          <StudioStripPane
            calls={calls}
            totalFrames={totalFrames}
            fps={fps}
            seconds={seconds}
            barPrompts={derived.barPrompts}
            barLanes={derived.barLanes}
            barAudioClips={derived.barAudioClips}
            barTotal={derived.barTotal}
            frameIdx={view.frameIdx}
            callPreviews={derived.callPreviews}
            selectedBarId={derived.selectedBarId}
            filmMap={audio.filmMap}
            handleBarFrame={film.handleBarFrame}
            handleScrubStart={film.handleScrubStart}
            handleScrubEnd={film.handleScrubEnd}
            handleKeyframeAdd={kf.handleKeyframeAdd}
            handleKeyframeMove={kf.handleKeyframeMove}
            handleKeyframeDelete={kf.handleKeyframeDelete}
            handlePromptUpdate={pr.handlePromptUpdate}
            handlePromptMove={pr.handlePromptMove}
            handlePromptResize={pr.handlePromptResize}
            handlePromptDelete={pr.handlePromptDelete}
            handleExtend={mut.handleExtend}
            addCallAt={mut.addCallAt}
            handleTimelineSelect={view.handleTimelineSelect}
            layerA={layerA}
            refAudiosBlocked={derived.refAudiosPresent}
            addAudioClip={audio.addAudioClip}
            takeAudioFile={audio.takeAudioFile}
            moveAudioClip={audio.moveAudioClip}
            deleteAudioClip={audio.deleteAudioClip}
            updateAudioClip={audio.updateAudioClip}
            setLayerAKey={doc.setLayerAKey}
            artifactIndex={audio.artifactIndex}
            docFromFilm={audio.docFromFilm}
            keyframes={keyframes}
          />
      }
    />
  )
}
export default VideoTimelineStudio

/** THE SHELL RIDE, as data (row 5 stroke 4) — LIVE since the
 *  2026-09-07 chrome stroke: the body renders StudioShell with these
 *  seams (the rail IS the parameter surface; the video windows own
 *  the viewport, kind "native" — the card renders no shared
 *  viewport; MotionTimelineBar is the view model on the bottom). */
export const shellDeclaration = defineShellDeclaration({
  preview: { kind: "native" },
  bottom: { kind: "timeline" },
  params: { slots: [] },
})
