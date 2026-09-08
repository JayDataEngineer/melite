/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { Button } from "@melite/ui/button"
import { ControlRow, Input, NumberControl, SelectControl } from "@melite/ui"
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
    <div className="space-y-1.5" data-testid="tl-refs-panel">
      <div className="flex items-baseline justify-between">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/50">
          Identity refs (ref2va)
        </span>
        <span className="text-[8px] text-muted-foreground/40">
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
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/50">
        Clips
      </span>
      <Button
        type="button"
        data-testid="tl-audio-upload"
        onClick={() => audioUploadRef.current?.click()}
        className="rounded border border-violet-300/30 bg-violet-400/10 px-2 py-0.5 text-[10px] font-medium text-violet-200/90 transition-colors hover:border-violet-300/60 hover:bg-violet-400/20"
      >
        ⤴ Upload audio
      </Button>
      <span className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground/60">
        {layerA.audio_clips?.length
          ? `${layerA.audio_clips.length} clip${layerA.audio_clips.length === 1 ? "" : "s"} on the Music row — drag to move, × to remove`
          : "none — upload or drop a file on the Music row"}
      </span>
      <Input
        ref={audioUploadRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
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
