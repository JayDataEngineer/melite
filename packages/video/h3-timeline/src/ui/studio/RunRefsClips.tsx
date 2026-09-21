/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx.
 *
 * THE LAYER A/B LAW REWORK (2026-09-17): the RUN-LEVEL identity
 * refs panel is GONE — refs are PER-CALL (a call's SourceRow group
 * in CallCard); nothing at run level ever staged them. What remains
 * is the legitimate Layer A NLE concept: the positioned AUDIO CLIPS
 * bed (the Music row). THE DIALOGUE HALF (2026-09-21): a clip that
 * spans a window CONDITIONS that window (the model hears it — the
 * lip-sync lane, one of the 3 audio lanes; a full bus refuses loud
 * at compose), mixes over the final cut at film time (the audible
 * authority), and ducks the generated voice under the real clip.
 * Music-only clips (no window overlap) overlay clean, no lane.
 */
import { Button } from "@deepseek-ai/dsh-client-ui-primitives"
import s from "./studio.module.css"
import type { LayerA } from "./docModel"

/** Layer A rail: the audio-clips upload door (3189–3315, refs cut). */
export function RunRefsClips({
  layerA, takeAudioFile, audioUploadRef,
}: {
  layerA: LayerA
  takeAudioFile: (file: File, startFrame: number) => void
  audioUploadRef: { current: HTMLInputElement | null }
}) {
  return (
    <>
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
