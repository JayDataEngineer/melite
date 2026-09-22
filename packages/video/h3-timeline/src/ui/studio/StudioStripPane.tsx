/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { useRef } from "react"
import { MotionTimelineBar } from "@melite-plugin/timeline/ui/timeline"
import type { TimelineKeyframe, TimelinePrompt } from "@melite-plugin/timeline/ui/timeline"
import { useSquareProvider } from "@melite/card-base/form"
import type { SpecField } from "@melite/card-base/spec"
import { fetchMediaLibrary } from "@melite/card-base/media-library"
import { PaneHeader, PaneShell } from "@melite/card-base"
import s from "./studio.module.css"
import { VIDEO_TIMELINE_TRACKS } from "./docModel"
import type { DocCall, DocKeyframe, LayerA, SetLayerAKey } from "./docModel"

/** Pinned strip: the bar IS the document (monolith lines 4078–4162).
 *
 *  The chrome rides the shared kit (2026-09-07): PaneShell + the
 *  strip PaneHeader — the same box/header the motion bar carries
 *  (the aspirational TimelineFooter twin is deleted; this pane is
 *  the one strip). */
// audio-kind rows only — both picker sources (the run's artifacts
// and the media library) narrow to what a clip lane can hold.
const AUDIO_ROW_RE = /\.(mp3|wav|flac|ogg|m4a|aac|aif|aiff|opus|webm)(\?|$)/i
type LaneCls = "dialogue" | "sfx" | "music"
const LANE_OF: Record<string, LaneCls> = { "audio:dialogue": "dialogue", "audio:sfx": "sfx", "audio:music": "music" }
/** THE DEP LAW (2026-09-22, the From-media freeze): the provider's
 *  modal effect keys on the loadMedia FUNCTION'S IDENTITY — an
 *  inline arrow in the component is a fresh identity every render,
 *  and the effect re-fires per render into an infinite load loop
 *  that freezes the card (the base's own comment: the 4GB OOM). The
 *  audio filter wrapper lives at MODULE SCOPE — one identity,
 *  forever; the effect fires once per modal opening. */
const loadAudioMedia = async (_kind: string, signal: AbortSignal) => {
  const rows = await fetchMediaLibrary("all", signal)
  return rows.filter((r) => AUDIO_ROW_RE.test(r.url) || AUDIO_ROW_RE.test(r.name))
}

export function StudioStripPane({
  calls, totalFrames, fps, seconds,
  barPrompts, barLanes, barAudioClips, barTotal, frameIdx,
  callPreviews, selectedBarId, filmMap,
  handleBarFrame, handleScrubStart, handleScrubEnd,
  handleKeyframeAdd, handleKeyframeMove, handleKeyframeDelete,
  handlePromptUpdate, handlePromptMove, handlePromptResize, handlePromptDelete,
  handleExtend, addCallAt, handleTimelineSelect,
  layerA, refAudiosBlocked, addAudioClip, takeAudioFile, moveAudioClip, deleteAudioClip,
  updateAudioClip,
  setLayerAKey, artifactIndex, docFromFilm, keyframes,
}: {
  calls: DocCall[]
  totalFrames: number
  fps: number
  seconds: string
  barPrompts: TimelinePrompt[]
  barLanes: TimelineKeyframe[]
  barAudioClips: Array<{ id: string; name: string; start_frame: number; dur_frames: number; gain?: number; class?: "dialogue" | "sfx" | "music"; text?: string }>
  barTotal: number
  frameIdx: number
  callPreviews: Record<string, string>
  selectedBarId: string | null
  filmMap: { fps?: number } | null
  handleBarFrame: (frame: number) => void
  handleScrubStart: () => void
  handleScrubEnd: () => void
  handleKeyframeAdd: (trackId: string, frame: number) => string
  handleKeyframeMove: (id: string, frame: number) => void
  handleKeyframeDelete: (id: string) => void
  handlePromptUpdate: (id: string, text: string) => void
  handlePromptMove: (id: string, s: number, e: number) => void
  handlePromptResize: (id: string, s: number, e: number) => void
  handlePromptDelete: (id: string) => void
  handleExtend: (newTotal: number) => void
  addCallAt: (frame: number) => void
  handleTimelineSelect: (id: string | null) => void
  layerA: LayerA
  /** THE BLOCKER (2026-09-22): reference audio wired on any call —
   * the D-M-E lanes LOCK (no adds on any lane) until it is cleared. */
  refAudiosBlocked: boolean
  addAudioClip: (name: string, src: string, startFrame: number, cls?: "dialogue" | "sfx" | "music") => void
  takeAudioFile: (file: File, startFrame: number, cls?: "dialogue" | "sfx" | "music") => void
  moveAudioClip: (clipId: string, docFrame: number) => void
  deleteAudioClip: (clipId: string) => void
  updateAudioClip: (clipId: string, patch: { class?: "dialogue" | "sfx" | "music", text?: string }) => void
  setLayerAKey: SetLayerAKey
  artifactIndex: { byUrl: Map<string, string> }
  docFromFilm: (g: number) => number
  keyframes: DocKeyframe[]
}) {
  // ── THE LANE PICKER (2026-09-22, the operator's law: the add door
  // is an upload icon beside each lane TITLE in the gutter, opening
  // the GENERIC source grammar — never a bespoke upload button). The
  // provider is the estate's ONE definition (the same three-entry
  // menu, the same picker modal the call cards ride); the lanes'
  // pseudo-fields route the pick back through the SAME verbs the lane
  // drops use. THE BLOCKER holds at this door too.
  const pickLane = useRef<LaneCls>("music")
  const laneField = (lane: LaneCls): SpecField =>
    ({ name: `audio:${lane}`, label: lane, type: "file" })
  const { square, wireMenu } = useSquareProvider(
    (name, v) => {
      // From flow / From media — v is the picked URL; the artifact
      // index names it when it can (the same door as a lane drop).
      if (typeof v !== "string" || v === "") return
      if (refAudiosBlocked) return
      const label = artifactIndex.byUrl.get(v) ?? v
      addAudioClip(label, v, 0, LANE_OF[name] ?? "music")
    },
    {
      // From flow: the run's own artifacts, audio rows only.
      candidates: Array.from(artifactIndex.byUrl.entries())
        .filter(([url]) => AUDIO_ROW_RE.test(url))
        .map(([url, name2]) => ({ id: url, label: name2, url })),
      // From media: the estate library through its one door, audio
      // rows only — the STABLE module-level wrapper (THE DEP LAW:
      // never an inline arrow here).
      loadMedia: loadAudioMedia,
      // From file: the OS dialog, audio family — the clip verb.
      accept: "audio/*",
      onFile: (file: File) => {
        if (!refAudiosBlocked) takeAudioFile(file, 0, pickLane.current)
      },
    },
  )
  const openLanePicker = (lane: LaneCls) => (anchor: HTMLElement): void => {
    pickLane.current = lane
    // (the slot-shape proof) type 'file' always hosts; the verb is
    // optional in the InputSquareVerbs interface — both belts ride ?.
    square(laneField(lane))?.verbs.onPick?.(anchor)
  }
  return (
  <PaneShell>
    <PaneHeader
      title="Timeline"
      meta={
        <>
          {calls.length} call{calls.length === 1 ? "" : "s"} · {totalFrames} fr · {fps} fps · {seconds}s
        </>
      }
      hint={
        <>
          one card = one model call · drag an edge = move the cut · double-click = edit · pull the tail = extend · cyan dot = knobs override · click a call = edit it in the left panel
        </>
      }
    />
    <div className={s.blockerWrap}>
      {refAudiosBlocked && (
        <div data-testid="tl-lane-blocker" className={s.laneBlocker}>
          reference audio is wired on a call — the dialogue / music / SFX lanes are LOCKED (the clips and the audio inputs are mutually exclusive; clear the call's Ref audios to place clips)
        </div>
      )}
    <MotionTimelineBar
      prompts={barPrompts}
      keyframes={barLanes}
      frameIdx={frameIdx}
      totalFrames={barTotal}
      fps={filmMap?.fps ?? fps}
      initialSeconds={10}
      onFrameChange={handleBarFrame}
      onScrubStart={handleScrubStart}
      onScrubEnd={handleScrubEnd}
      onKeyframeAdd={(trackId, frame) => handleKeyframeAdd(trackId, docFromFilm(frame))}
      onKeyframeMove={(id, frame) => handleKeyframeMove(id, docFromFilm(frame))}
      onKeyframeDelete={handleKeyframeDelete}
      onPromptUpdate={handlePromptUpdate}
      onPromptMove={(id, s, e) => handlePromptMove(id, docFromFilm(s), docFromFilm(e))}
      onPromptResize={(id, s, e) => handlePromptResize(id, docFromFilm(s), docFromFilm(e))}
      onPromptDelete={handlePromptDelete}
      onExtend={(newTotal) => handleExtend(newTotal - barTotal + totalFrames)}
      tracks={keyframes.length ? VIDEO_TIMELINE_TRACKS : []}
      packed
      promptsLabel="Calls"
      laneHint="frame-exact legacy keyframes — guides attach to their call in the panel above"
      emptyPromptsHint="No calls — double-click the timeline to add one"
      promptsHeight={64}
      onPromptAdd={(frame) => addCallAt(docFromFilm(frame))}
      previews={callPreviews}
      selectedId={selectedBarId}
      onSelect={handleTimelineSelect}
      // THE THREE AUDIO LANES (D-M-E, 2026-09-22): dialogue, music,
      // sfx — one H3 audio input each. The lane id routes drops; the
      // effective class of a legacy clip (absent field) matches the
      // compose's auto law: text → dialogue, else music.
      // (2026-09-22, the operator's card law) the D-M-E lanes render
      // their clips as SMALL CALL CARDS — accent gradient, class glyph
      // (mic / note / bolt), name + span — at the cards lane height.
      audioClipCards
      audioLayers={[
        { id: "dialogue", label: "Dialogue", icon: "mic", accent: "#22d3ee",
          onUpload: refAudiosBlocked ? undefined : openLanePicker("dialogue"),
          clips: barAudioClips.filter((c) => (c.class ?? (c.text ? "dialogue" : "music")) === "dialogue") },
        { id: "music", label: "Music", icon: "music", accent: "#a78bfa", stem: layerA.audio_stem ?? null,
          // (Layer A NLE) positioned clips — the row upgrades from the
          // one bed to a DaVinci track when clips exist; the stem bed
          // rendering stays for stem-only docs (byte-identical).
          onUpload: refAudiosBlocked ? undefined : openLanePicker("music"),
          clips: barAudioClips.filter((c) => (c.class ?? (c.text ? "dialogue" : "music")) === "music") },
        { id: "sfx", label: "SFX", icon: "zap", accent: "#fb923c",
          onUpload: refAudiosBlocked ? undefined : openLanePicker("sfx"),
          clips: barAudioClips.filter((c) => (c.class ?? (c.text ? "dialogue" : "music")) === "sfx") },
      ]}
      onAudioDropAt={(id, url, frame) => {
        // POSITIONED drop (NLE): a known artifact lands as a CLIP on
        // the dropped LANE at the drop frame; a foreign URL writes
        // nothing. THE BLOCKER: reference audio present → the drop is
        // refused on EVERY lane (mutual exclusion, not a hint).
        if (refAudiosBlocked) return
        const name = artifactIndex.byUrl.get(url)
        if (name) addAudioClip(name, name, docFromFilm(frame), id as "dialogue" | "music" | "sfx")
      }}
      onAudioFileDrop={(id, file, frame) => {
        // THE BLOCKER: same law, same refusal — no file adds either.
        if (refAudiosBlocked) return
        takeAudioFile(file, docFromFilm(frame), id as "dialogue" | "music" | "sfx")
      }}
      onAudioClipMove={(_id, clipId, frame) => {
        moveAudioClip(clipId, docFromFilm(frame))
      }}
      onAudioClipDelete={(_id, clipId) => {
        deleteAudioClip(clipId)
      }}
      onAudioDetach={(layerId) => {
        // Per-lane detach (D-M-E): clear the lane's clips only; the
        // music lane also releases the legacy stem (old docs
        // round-trip clean — stem won't re-convert on next load).
        // setLayerAKey carries the filtered array (layerA is the
        // current render's doc — the filter reads it).
        const laneCls = layerId === "music" ? "music" : layerId === "sfx" ? "sfx" : "dialogue"
        const kept = (layerA.audio_clips ?? []).filter((c) =>
          (c.class ?? (c.text ? "dialogue" : "music")) !== laneCls)
        setLayerAKey("audio_clips", kept.length ? kept : undefined)
        if (layerId === "music") setLayerAKey("audio_stem", undefined)
      }}
    />
    {/* the lane picker's anchored menu + modal + hidden file input —
        the provider's own tree, mounted once for all three lanes. */}
    {wireMenu}
    </div>
  </PaneShell>
  )
}
