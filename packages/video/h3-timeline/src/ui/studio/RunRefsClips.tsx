/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { Button, Input } from "@deepseek-ai/dsh-client-ui-primitives"
import { ControlRow, NumberControl, SelectControl } from "./kit"
import s from "./studio.module.css"
import type { LayerA, SetLayerAKey } from "./docModel"
import { RefPickerRow } from "./RefPickerRow"

/** Layer A rail: run-level identity refs + audio-clips upload (3189–3315). */
export function RunRefsClips({
  layerA, setLayerAKey, isRef2va, refArtifacts, takeAudioFile, audioUploadRef,
}: {
  layerA: LayerA
  setLayerAKey: SetLayerAKey
  isRef2va: boolean
  refArtifacts: Array<{ name: string; url: string }>
  takeAudioFile: (file: File, startFrame: number) => void
  audioUploadRef: { current: HTMLInputElement | null }
}) {
  return (
    <>
    {/* Identity refs — the Ref2VA route's RUN-LEVEL defaults
        (ride every window); a call's own refs REPLACE these
        for its windows. Hidden on FL2VA (the graph drops
        refs there — the run door refuses them loudly). */}
    {isRef2va && (
    <div className={s.group} data-testid="tl-refs-panel">
      <div className={s.refsHead}>
        <span className={s.groupTitle}>
          Identity refs (ref2va)
        </span>
        <span className={s.refsNote}>
          ride EVERY window · identity across seams
        </span>
      </div>
      <RefPickerRow
        label="Ref images"
        ariaLabel="ref images (run)"
        testId="tl-ref-images-run"
        value={layerA.h3_ref_images}
        onChange={(v) => setLayerAKey("h3_ref_images", v)}
        genre="image"
        cap={10}
        artifacts={refArtifacts}
      />
      <RefPickerRow
        label="Ref videos"
        ariaLabel="ref videos (run)"
        testId="tl-ref-videos-run"
        value={layerA.h3_ref_videos}
        onChange={(v) => setLayerAKey("h3_ref_videos", v)}
        genre="video"
        cap={3}
        artifacts={refArtifacts}
      />
      <RefPickerRow
        label="Ref audios"
        ariaLabel="ref audios (run)"
        testId="tl-ref-audios-run"
        value={layerA.h3_ref_audios}
        onChange={(v) => setLayerAKey("h3_ref_audios", v)}
        genre="audio"
        cap={3}
        artifacts={refArtifacts}
      />
      <RefPickerRow
        label="Ref video audios"
        ariaLabel="ref video audios (run)"
        testId="tl-ref-video-audios-run"
        value={layerA.h3_ref_video_audios}
        onChange={(v) => setLayerAKey("h3_ref_video_audios", v)}
        genre="audio"
        cap={3}
        artifacts={refArtifacts}
      />
      <ControlRow label="Ref size">
        <SelectControl
          ariaLabel="Ref image size (run)"
          width="w-40"
          mono
          value={typeof layerA.h3_ref_image_size === "string" ? layerA.h3_ref_image_size : undefined}
          onChange={(v) => {
            // R2V COMBO — legal values are "match"|"max" ONLY
            // (a number fails ComfyUI validation). Empty =
            // inherit the template's "match" (his V7 default).
            setLayerAKey("h3_ref_image_size", v)
          }}
          options={["match", "max"]}
          emptyLabel="match (V7 default)"
        />
      </ControlRow>
      {/* Ref audio trim (plaguekind parity: TrimAudioDuration) —
          start/duration seconds applied to EVERY ref audio. */}
      <ControlRow label="Audio trim start (s)">
        <NumberControl
          ariaLabel="Ref audio trim start (run)"
          value={layerA.h3_ref_audio_trim_start}
          onChange={(v) => setLayerAKey("h3_ref_audio_trim_start", v)}
          min={0} step={0.5}
          placeholder="0"
          width="w-32"
        />
      </ControlRow>
      <ControlRow label="Audio trim length (s)">
        <NumberControl
          ariaLabel="Ref audio trim duration (run)"
          value={layerA.h3_ref_audio_trim_duration}
          onChange={(v) => setLayerAKey("h3_ref_audio_trim_duration", v)}
          min={0.5} step={0.5}
          placeholder="full"
          width="w-32"
        />
      </ControlRow>
    </div>
    )}
    {/* (Layer A NLE) the UPLOAD door: audio files land as clips
        on the Music row at frame 0 (drag them anywhere after);
        OS-dropping a file onto the row lands it AT the drop. */}
    <div className={s.clipsRow}>
      <span className={s.clipsTitle}>
        Clips
      </span>
      <Button
        type="button"
        data-testid="tl-audio-upload"
        onClick={() => audioUploadRef.current?.click()}
        className={s.uploadAudio}
      >
        ⤴ Upload audio
      </Button>
      <span className={s.clipsNote}>
        {layerA.audio_clips?.length
          ? `${layerA.audio_clips.length} clip${layerA.audio_clips.length === 1 ? "" : "s"} on the Music row — drag to move, × to remove`
          : "none — upload or drop a file on the Music row"}
      </span>
      <input
        ref={audioUploadRef}
        type="file"
        accept="audio/*"
        multiple
        className={s.hiddenInput}
        onChange={(e) => {
          const fs = Array.from(e.target.files ?? [])
          fs.forEach((f) => takeAudioFile(f, 0))
          e.target.value = ""   // same-file re-pick works
        }}
      />
    </div>
    </>
  )
}
