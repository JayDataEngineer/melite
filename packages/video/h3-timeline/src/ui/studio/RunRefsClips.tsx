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
import { useState } from "react"
import { Button, Input, Menu } from "@deepseek-ai/dsh-client-ui-primitives"
import { SectionLabel } from "@melite/card-base/client"
import s from "./studio.module.css"
import type { LayerA } from "./docModel.ts"
import { studioCopy } from "./studioCopy.ts"

/** Layer A rail: the audio-clips upload door (3189–3315, refs cut) +
 * THE LANE INSPECTOR (2026-09-22): every clip's lane and words/event
 * text — the authored half of the D-M-E law (the text is what tells
 * the model WHAT the audio is; the pin is the other half). */
export function RunRefsClips({
  layerA, updateAudioClip, deleteAudioClip,
}: {
  layerA: LayerA
  updateAudioClip: (clipId: string, patch: { class?: "dialogue" | "sfx" | "music", text?: string }) => void
  deleteAudioClip: (clipId: string) => void
}) {
  const clipCount = layerA.audio_clips?.length ?? 0
  // THE DSH MENU SELECT (the S7 sweep; assets-tab SelectField idiom):
  // owner-held open id (one lane menu open at a time), trigger Button
  // rendered in place, compact portal rows, check selection.
  const [openLane, setOpenLane] = useState<string | null>(null)
  const laneRows = [
    { id: "dialogue" as const, label: studioCopy.laneDialogue },
    { id: "music" as const, label: studioCopy.laneMusic },
    { id: "sfx" as const, label: studioCopy.laneSfx },
  ]
  return (
    <>
    {/* (2026-09-22, the lane-picker law) the bespoke UPLOAD BUTTON is
        DEAD — the add door is the ⤴ beside each lane title in the
        timeline gutter below (the generic From flow / From media /
        From file grammar). This row keeps the count + the guard hint. */}
    <div className={s.clipsRow}>
      {/* THE SECTION-HEAD GRAMMAR (F5, 2026-11-05): SectionLabel, the
          same face every studio section rides. */}
      <SectionLabel>{studioCopy.clipsTitle}</SectionLabel>
      <span className={s.clipsNote}>
        {clipCount > 0 ? studioCopy.clipsCountNote(clipCount) : studioCopy.clipsEmptyHint}
      </span>
      {/* THE DOOR-GUARD HINT (2026-09-22, the operator's overlap
          law): clips PIN their windows — and a pinned window's
          normal audio inputs stand down (music pin ⇒ no bed slice
          there; dialogue/sfx pin ⇒ ref audios mute there). The hint
          states the guard BEFORE the Run press; the compose owns the
          wall regardless of the UI. */}
      <span className={s.clipsHint} data-testid="tl-clips-lane-hint">
        {studioCopy.clipsGuardHint}
      </span>
    </div>
    {(layerA.audio_clips?.length ?? 0) > 0 && (
      <div className={s.laneInspector} data-testid="tl-lane-inspector">
        <SectionLabel>{studioCopy.lanesInspectorTitle}</SectionLabel>
        {(layerA.audio_clips!).map((c) => {
          const cls = c.class ?? (c.text ? "dialogue" : "music")
          return (
            <div key={c.id} className={s.laneRow} data-testid="tl-lane-row" data-clip={c.name} data-lane={cls}>
              <span className={s.laneName} title={c.src}>{c.name}</span>
              <Menu
                open={openLane === c.id}
                onClose={() => { setOpenLane(null) }}
                compact
                portal
                items={laneRows}
                selectedId={cls}
                onSelect={(id) => { setOpenLane(null); updateAudioClip(c.id, { class: id as "dialogue" | "sfx" | "music" }) }}
                anchor={
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={s.laneSelect}
                    data-testid="tl-lane-class"
                    aria-label={studioCopy.laneSelectLabel(c.name)}
                    onClick={() => { setOpenLane(openLane === c.id ? null : c.id) }}
                  >
                    {laneRows.find((r) => r.id === cls)?.label ?? ""}
                  </Button>
                }
              />
              <Input
                className={s.laneText}
                data-testid="tl-lane-text"
                type="text"
                placeholder={cls === "dialogue"
                  ? studioCopy.dialoguePlaceholder
                  : cls === "sfx"
                    ? studioCopy.sfxPlaceholder
                    : studioCopy.musicPlaceholder}
                value={c.text ?? ""}
                onChange={(e) => updateAudioClip(c.id, { text: e.target.value })}
              />
              <Button
                variant="ghost"
                className={s.laneDelete}
                data-testid="tl-lane-delete"
                title={studioCopy.removeClip}
                onClick={() => deleteAudioClip(c.id)}
              >
                ×
              </Button>
            </div>
          )
        })}
      </div>
    )}
    </>
  )
}
