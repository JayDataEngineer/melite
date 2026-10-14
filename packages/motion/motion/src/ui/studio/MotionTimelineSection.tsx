/** MotionTimelineSection — the bottom timeline (StudioShell `bottom`) — moved verbatim from `component.tsx` (MotionCardEditor).

 * Transport header + MotionTimelineBar + edit hint + wire picker modal.
 *
 * The JSX body is the original region sliced line-for-line; the only change
 * is the surrounding function signature (free variables became explicit
 * destructured props). Behavior is IDENTICAL.
 */
import type * as React from "react"
import { Info, Pause, PlayAlt as Play, Plus, RotateCw } from '@melite/card-base/client'
import { Button } from "@deepseek-ai/dsh-client-ui-primitives"
import type { CardStage } from "@melite/contracts"
import type { MotionNpz } from "@melite/formats"
import {
  type TimelineKeyframe, type TimelinePrompt,
} from "@melite-plugin/timeline/ui/timeline"
import { MotionTimelineBar } from "@melite-plugin/timeline/ui/timeline"
import { PaneHeader, PaneShell, Tip, WirePickerModal } from "./kit.tsx"
import { motionCopy } from "./motionCopy.ts"
import s from "./component.module.css"
import { MOTION_PREVIEW_GLB_PARAM } from "./motionParams.ts"

export interface MotionTimelineSectionProps {
  npz: MotionNpz | null
  editMode: boolean
  playing: boolean
  setPlaying: React.Dispatch<React.SetStateAction<boolean>>
  fmt: (s: number) => string
  curSec: number
  totalSec: number
  tlPrompts: TimelinePrompt[]
  targetT: number
  addPromptCard: () => void
  tlKeyframes: TimelineKeyframe[]
  frameIdx: number
  effectiveNpz: MotionNpz | null
  onTimelineExtend: (newTotal: number) => void
  handleTimelineFrameChange: (f: number) => void
  onKeyframeAdd: (trackId: string, frame: number) => string
  onKeyframeMove: (id: string, frame: number) => void
  onKeyframeDelete: (id: string) => void
  onPromptUpdate: (id: string, text: string) => void
  onPromptMove: (id: string, startFrame: number, endFrame: number) => void
  onPromptResize: (id: string, startFrame: number, endFrame: number) => void
  onPromptDelete: (id: string) => void
  bodyWireOpen: boolean
  onWireSlot?: (slotKey: string, upstreamId: string | null, outputName?: string | null) => void
  priorStages: CardStage[]
  bodyWired: boolean
  bodyWiredId: string
  onSave: (params: Record<string, unknown>) => void
  setBodyGlbState: React.Dispatch<React.SetStateAction<string | null>>
  setBodyNotice: React.Dispatch<React.SetStateAction<string | null>>
  setBodyWireOpen: React.Dispatch<React.SetStateAction<boolean>>
}

export function MotionTimelineSection({
  npz, editMode, playing, setPlaying, fmt, curSec, totalSec,
  tlPrompts, targetT, addPromptCard, tlKeyframes, frameIdx, effectiveNpz,
  onTimelineExtend, handleTimelineFrameChange,
  onKeyframeAdd, onKeyframeMove, onKeyframeDelete,
  onPromptUpdate, onPromptMove, onPromptResize, onPromptDelete,
  bodyWireOpen, onWireSlot, priorStages, bodyWired, bodyWiredId,
  onSave, setBodyGlbState, setBodyNotice, setBodyWireOpen,
}: MotionTimelineSectionProps) {
  /* v8 ignore next 1 -- targetT ≥ 1 from every constructor (probe 2026-09-19): the empty-timeline face is the zero-frame fence */
  const emptyTimelineFace = !targetT && (<div className={s.timelineEmpty}><Info className={s.i14} />{motionCopy.emptyTimeline}</div>)
  return (
 <>
 <PaneShell className={s.timelineShell}>
 {/* ── Bar header = transport + label + "add a card" ───────────────
 Play/pause/time live HERE now (was its own row above). The Add
 button is the discoverable "add a card" affordance: the viser bar's
 click-to-append path needs empty space after the last prompt; our
 seed fills [0, T-1] edge-to-edge (matching the demo), so that path is
 unreachable. It carves a new empty card out of the last prompt's tail
 (see carveNewPromptCard). Each card is one motion segment; ≥2 cards
 trigger the model's multi-prompt composition (kimodo_model.py
 _generate). */}
 <PaneHeader
 variant="strip"
 className={s.transportHead}
 lead={<>
 <Tip
 tip={!npz
 ? "Run the card first — nothing to play yet"
 : editMode
 ? "Pause playback while refining"
 : playing
 ? motionCopy.pauseSpace
 : motionCopy.playSpace}
 >
 <span className={s.contents}>
 <Button variant="ghost"
 onClick={() => setPlaying((p) => !p)}
 disabled={editMode || !npz}
 aria-label={playing ? motionCopy.pauseSpace : motionCopy.playSpace}
 className={s.playBtn}
 >
 {playing ? <Pause className={s.i14} /> : <Play className={s.playIcon} />}
 </Button>
 </span>
 </Tip>
 <div className={s.timeWrap}>
 {npz ? (
 <span className={s.timeText}>
 {fmt(curSec)} / {fmt(totalSec)}
 </span>
 ) : (
 <span className={s.noMotion}>
 <Info className={s.i14} />
 {motionCopy.noMotion}
 </span>
 )}
 </div>
 {npz && (
 <div className={s.fpsChip}>
 {motionCopy.fpsChip({ fps: npz.fps.toFixed(0), frames: npz.T })}
 </div>
 )}
 </>
 }
 hint={
 <span className={s.hintWrap}>
 <span className={s.hintTitle}>
 {motionCopy.timelineTitle}{tlPrompts.length > 0 ? ` (${tlPrompts.length})` : ""}
 </span>
 <Tip
 tip={/* v8 ignore next -- targetT = max(baseT≥1, …) ≥ 1 from every constructor (probe 2026-09-19) */ targetT > 0 ? "Add a new prompt card — splits the last card so you can type a distinct motion for that segment" : "Loading the timeline…"}
 >
 <span className={s.contents}>
 <Button variant="ghost"
 onClick={addPromptCard}
 disabled={targetT <= 0}
 className={s.addCardBtn}
 >
 <Plus className={s.i12} />
 {motionCopy.addPromptCard}
 </Button>
 </span>
 </Tip>
 </span>
 }
 />
 {targetT > 0 && (
 <MotionTimelineBar
 prompts={tlPrompts}
 keyframes={tlKeyframes}
 frameIdx={frameIdx}
 totalFrames={targetT}
 fps={effectiveNpz?.fps ?? 30}
 onExtend={onTimelineExtend}
 onFrameChange={handleTimelineFrameChange}
 onKeyframeAdd={onKeyframeAdd}
 onKeyframeMove={onKeyframeMove}
 onKeyframeDelete={onKeyframeDelete}
 onPromptUpdate={onPromptUpdate}
 onPromptMove={onPromptMove}
 onPromptResize={onPromptResize}
 onPromptDelete={onPromptDelete}
 />
 )}
 {/* No motion yet → the bar's shell + transport still render (the
 play button explains WHY: "Run the card first"); this placeholder
 keeps the bar's box instead of the whole block vanishing. */}
 {emptyTimelineFace}
 </PaneShell>

 {editMode && (
 <div className={s.editHintBar}>
 <RotateCw className={s.editHintIcon} />
 <span>
 {motionCopy.editHintLead}
 <b className={s.editHintStrong}> {motionCopy.repose}</b> {motionCopy.editHintTail}
 </span>
 </div>
 )}

 {/* Wire picker — link the preview body to an earlier 3D card's GLB
     output. The SAME modal SlotGrid uses (one wire UX everywhere); the
     write contract is the mask studio's: a wire writes the graph edge
     AND clears the slot param (wired XOR attached — the falsy-injection
     guard can't shadow the live wire), an unwire clears both. */}
 {bodyWireOpen && onWireSlot && (
 <WirePickerModal
 slot={MOTION_PREVIEW_GLB_PARAM}
 priorStages={priorStages}
 currentId={bodyWired ? bodyWiredId : ""}
 currentOutput={null}
 onPick={(upstreamId) => {
 onWireSlot(MOTION_PREVIEW_GLB_PARAM, upstreamId, null)
 onSave({ [MOTION_PREVIEW_GLB_PARAM]: null })
 setBodyGlbState(null)
 setBodyNotice(null)
 setBodyWireOpen(false)
 }}
 onUnwire={() => {
 onWireSlot(MOTION_PREVIEW_GLB_PARAM, null, null)
 onSave({ [MOTION_PREVIEW_GLB_PARAM]: null })
 setBodyWireOpen(false)
 }}
 onClose={() => setBodyWireOpen(false)}
 />
 )}
 </>
  )
}
