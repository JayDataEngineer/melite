/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { Button, Input } from "@deepseek-ai/dsh-client-ui-primitives"
import { NumberControl } from "./kit"
import { cn } from "@melite/card-base/chrome"
import s from "./studio.module.css"
import type { DocBeatSegment, DocCall } from "./docModel"
import type { TimelineSelection } from "./useViewSelection"

/** One call's prompt editor: text XOR beat segments + ✨ (lines 3468–3640). */
export function CallCardPrompt({
  c, i, callSelected, segmentMode, selected,
  handlePromptUpdate, setBeatSegment, addBeatSegment, deleteBeatSegment,
  enhanceOne, undoEnhance, enhancing, enhanceErr, enhanceUndo, beatRowRefs,
}: {
  c: DocCall
  i: number
  callSelected: boolean
  segmentMode: boolean
  selected: TimelineSelection | null
  handlePromptUpdate: (id: string, text: string) => void
  setBeatSegment: (i: number, j: number, patch: Partial<DocBeatSegment>) => void
  addBeatSegment: (i: number) => void
  deleteBeatSegment: (i: number, j: number) => void
  enhanceOne: (key: string, text: string, apply: (t: string) => void) => void
  undoEnhance: (key: string, apply: (t: string) => void) => void
  enhancing: Record<string, boolean>
  enhanceErr: Record<string, string | null>
  enhanceUndo: Record<string, string>
  beatRowRefs: { current: (HTMLDivElement | null)[][] }
}) {
  return (
    <>
  {/* The prompt — `text` XOR `beats`. Text mode: the
      textarea (empty = a visible TODO (amber) the plan
      names before any GPU work). Segment mode: Layer C
      rows — they join into the call's ONE prompt with
      time markers and NEVER cut (cuts land on call
      boundaries). */}
  {segmentMode ? (
    <div className={s.beatsWrap} data-testid="tl-call-beats">
      <div className={s.beatsHead}>
        <span className={s.beatsTitle}>Prompt segments</span>
        <span className={s.beatsNote}>
          join into one prompt with time markers — they never cut
        </span>
        <Button variant="ghost"
          onClick={() => addBeatSegment(i)}
          aria-label={`Add segment to call ${i}`}
          className={s.addSeg}
        >
          +
        </Button>
      </div>
      {c.beats!.map((seg, j) => (
        <div
          key={j}
          data-beat-segment={j}
          data-selected={callSelected && selected?.beatIdx === j ? "true" : undefined}
          ref={(el) => { beatRowRefs.current[i] ??= []; beatRowRefs.current[i]![j] = el }}
          className={cn(
            s.beatRow,
            callSelected && selected?.beatIdx === j && s.beatRowSel,
          )}
        >
          <Input
            value={seg.text}
            placeholder={`segment ${j + 1} — the action, camera, mood over these frames`}
            aria-label={`Call ${i} segment ${j} text`}
            data-testid="tl-call-beat-text"
            onChange={(e) => setBeatSegment(i, j, { text: e.target.value })}
            className={cn(s.textIn, !seg.text.trim() && s.textInEmpty)}
          />
          <Button
            type="button"
            title="Rewrite this segment in H3 cinematic style"
            aria-label={"Enhance call " + i + " segment " + j}
            data-testid="tl-beat-enhance"
            disabled={!seg.text.trim() || enhancing["call-" + i + "-beat-" + j] === true}
            onClick={() => void enhanceOne(
              "call-" + i + "-beat-" + j, seg.text,
              (t) => setBeatSegment(i, j, { text: t }),
            )}
            className={s.iconMini}
          >
            {enhancing["call-" + i + "-beat-" + j] === true ? "…" : "\u2728"}
          </Button>
          {enhanceUndo["call-" + i + "-beat-" + j] !== undefined && (
            <Button
              type="button"
              title="Restore the pre-enhancement text"
              aria-label={"Undo enhance call " + i + " segment " + j}
              data-testid="tl-beat-enhance-undo"
              onClick={() => undoEnhance("call-" + i + "-beat-" + j, (t) => setBeatSegment(i, j, { text: t }))}
              className={cn(s.iconMini, s.iconMiniMut)}
            >
              {"\u21a9"}
            </Button>
          )}
          {enhanceErr["call-" + i + "-beat-" + j] && (
            <span className={s.beatErr} data-testid="tl-beat-enhance-error">
              {enhanceErr["call-" + i + "-beat-" + j]}
            </span>
          )}
          <NumberControl
            value={seg.start_frame}
            ariaLabel={`Call ${i} segment ${j} start frame`}
            onChange={(v) => {
              if (v !== undefined) setBeatSegment(i, j, { start_frame: Math.round(v) })
            }}
            min={0} step={1}
            align="center"
            width="w-14"
            size="sm"
            placeholder=""
          />
          <span className={s.beatDash}>–</span>
          <NumberControl
            value={seg.end_frame}
            ariaLabel={`Call ${i} segment ${j} end frame`}
            onChange={(v) => {
              if (v !== undefined) setBeatSegment(i, j, { end_frame: Math.round(v) })
            }}
            min={0} step={1}
            align="center"
            width="w-14"
            size="sm"
            placeholder=""
          />
          <Button variant="ghost"
            onClick={() => deleteBeatSegment(i, j)}
            aria-label={`Delete call ${i} segment ${j}`}
            className={s.beatDel}
          >
            ×
          </Button>
        </div>
      ))}
    </div>
  ) : (
    <div className={s.beatsWrap}>
      <div className={s.textHead}>
        <span className={s.textLabel}>the prompt this call sends to H3</span>
        <span className={s.enhanceRow}>
          <Button
            type="button"
            title="Rewrite this call's prompt in H3 cinematic style"
            aria-label={"Enhance call " + i + " prompt"}
            data-testid="tl-call-enhance"
            disabled={!(c.text ?? "").trim() || enhancing["call-" + i] === true}
            onClick={() => void enhanceOne(
              "call-" + i, c.text ?? "",
              (t) => handlePromptUpdate("call-" + i, t),
            )}
            className={s.enhanceBtn}
          >
            {enhancing["call-" + i] === true ? "enhancing…" : "\u2728 H3 style"}
          </Button>
          {enhanceUndo["call-" + i] !== undefined && (
            <Button
              type="button"
              aria-label={"Undo enhance call " + i + " prompt"}
              data-testid="tl-call-enhance-undo"
              onClick={() => undoEnhance("call-" + i, (t) => handlePromptUpdate("call-" + i, t))}
              className={s.undoBtn}
            >
              {"\u21a9 undo"}
            </Button>
          )}
        </span>
      </div>
      {enhanceErr["call-" + i] && (
        <span className={s.beatErr} data-testid="tl-call-enhance-error">
          {enhanceErr["call-" + i]}
        </span>
      )}
      <textarea
        value={c.text ?? ""}
        placeholder="describe the action, camera, and mood for this call — empty calls refuse the plan"
        aria-label={`Call ${i} prompt`}
        data-testid="tl-call-prompt"
        rows={2}
        onChange={(e) => handlePromptUpdate(`call-${i}`, e.target.value)}
        className={cn(s.promptBox, !(c.text ?? "").trim() && s.promptBoxEmpty)}
      />
      <Button variant="ghost"
        onClick={() => addBeatSegment(i)}
        aria-label={`Add segment to call ${i}`}
        className={s.addSegText}
      >
        + prompt segments
      </Button>
    </div>
  )}
    </>
  )
}
