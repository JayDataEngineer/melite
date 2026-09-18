/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { MotionTimelineBar } from "@melite-plugin/timeline/ui/timeline"
import type { TimelineKeyframe, TimelinePrompt } from "@melite-plugin/timeline/ui/timeline"
import { PaneHeader, PaneShell } from "@melite/card-base"
import { VIDEO_TIMELINE_TRACKS } from "./docModel"
import type { DocCall, DocKeyframe, LayerA, SetLayerAKey } from "./docModel"

/** Pinned strip: the bar IS the document (monolith lines 4078–4162).
 *
 *  The chrome rides the shared kit (2026-09-07): PaneShell + the
 *  strip PaneHeader — the same box/header the motion bar carries
 *  (the aspirational TimelineFooter twin is deleted; this pane is
 *  the one strip). */
export function StudioStripPane({
  calls, totalFrames, fps, seconds,
  barPrompts, barLanes, barAudioClips, barTotal, frameIdx,
  callPreviews, selectedBarId, filmMap,
  handleBarFrame, handleScrubStart, handleScrubEnd,
  handleKeyframeAdd, handleKeyframeMove, handleKeyframeDelete,
  handlePromptUpdate, handlePromptMove, handlePromptResize, handlePromptDelete,
  handleExtend, addCallAt, handleTimelineSelect,
  layerA, addAudioClip, takeAudioFile, moveAudioClip, deleteAudioClip,
  setLayerAKey, artifactIndex, docFromFilm, keyframes,
}: {
  calls: DocCall[]
  totalFrames: number
  fps: number
  seconds: string
  barPrompts: TimelinePrompt[]
  barLanes: TimelineKeyframe[]
  barAudioClips: Array<{ id: string; name: string; start_frame: number; dur_frames: number; gain?: number }>
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
  addAudioClip: (name: string, src: string, startFrame: number) => void
  takeAudioFile: (file: File, startFrame: number) => void
  moveAudioClip: (clipId: string, docFrame: number) => void
  deleteAudioClip: (clipId: string) => void
  setLayerAKey: SetLayerAKey
  artifactIndex: { byUrl: Map<string, string> }
  docFromFilm: (g: number) => number
  keyframes: DocKeyframe[]
}) {
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
      audioLayers={[{
        id: "music", label: "Music", stem: layerA.audio_stem ?? null,
        // (Layer A NLE) positioned clips — the row upgrades from the
        // one bed to a DaVinci track when clips exist; the stem bed
        // rendering stays for stem-only docs (byte-identical).
        clips: barAudioClips,
      }]}
      // (no onAudioDrop: the bar only calls it when onAudioDropAt is
      // absent — this pane always passes it. Dead-arm cut.)
      // Dead-arm cut on every door below: the single literal "music"
      // layer means the bar always passes id === "music".
      onAudioDropAt={(_id, url, frame) => {
        // POSITIONED drop (NLE): a known artifact lands as a CLIP at
        // the drop frame; a foreign URL writes nothing.
        const name = artifactIndex.byUrl.get(url)
        if (name) addAudioClip(name, name, docFromFilm(frame))
      }}
      onAudioFileDrop={(_id, file, frame) => {
        takeAudioFile(file, docFromFilm(frame))
      }}
      onAudioClipMove={(_id, clipId, frame) => {
        moveAudioClip(clipId, docFromFilm(frame))
      }}
      onAudioClipDelete={(_id, clipId) => {
        deleteAudioClip(clipId)
      }}
      onAudioDetach={() => {
        // Clear all clips (Layer A NLE: clips are the ONLY audio UI).
        setLayerAKey("audio_clips", undefined)
        // Also clear legacy stem if present (old docs round-trip
        // clean after detach — stem won't re-convert on next load).
        setLayerAKey("audio_stem", undefined)
      }}
    />
  </PaneShell>
  )
}
