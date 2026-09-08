/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { Button } from "@melite/ui/button"
import { Input, NumberControl, Textarea, cn } from "@melite/ui"
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
    <div className="space-y-1" data-testid="tl-call-beats">
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] uppercase tracking-wide text-muted-foreground/40">Prompt segments</span>
        <span className="text-[9px] text-muted-foreground/35">
          join into one prompt with time markers — they never cut
        </span>
        <Button variant="ghost"
          onClick={() => addBeatSegment(i)}
          aria-label={`Add segment to call ${i}`}
          className="ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded border border-white/15 text-[10px] leading-none text-muted-foreground/70 transition-colors hover:border-brand/50 hover:text-brand"
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
            "flex items-center gap-1.5 rounded transition-colors",
            callSelected && selected?.beatIdx === j
              ? "bg-cyan-400/[0.08] ring-1 ring-cyan-400/50"
              : "",
          )}
        >
          <Input
            value={seg.text}
            placeholder={`segment ${j + 1} — the action, camera, mood over these frames`}
            aria-label={`Call ${i} segment ${j} text`}
            data-testid="tl-call-beat-text"
            onChange={(e) => setBeatSegment(i, j, { text: e.target.value })}
            className={cn(
              "min-w-0 flex-1 h-auto rounded border bg-black/30 px-1.5 py-0.5 text-[10px] leading-snug outline-none",
              seg.text.trim()
                ? "border-white/10 text-foreground/90 focus:border-brand/60"
                : "border-amber-400/40 text-amber-300/90 placeholder:text-amber-300/40 focus:border-amber-300/70",
            )}
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
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] text-brand/80 transition-colors hover:bg-brand/15 hover:text-brand disabled:opacity-30"
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
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] text-muted-foreground/60 transition-colors hover:bg-white/10 hover:text-foreground"
            >
              {"\u21a9"}
            </Button>
          )}
          {enhanceErr["call-" + i + "-beat-" + j] && (
            <span className="text-[8px] leading-tight text-destructive" data-testid="tl-beat-enhance-error">
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
          <span className="text-[9px] text-muted-foreground/40">–</span>
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
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-destructive/80 hover:text-white"
          >
            ×
          </Button>
        </div>
      ))}
    </div>
  ) : (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-wide text-muted-foreground/40">the prompt this call sends to H3</span>
        <span className="flex items-center gap-1">
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
            className="rounded px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-brand/80 transition-colors hover:bg-brand/15 hover:text-brand disabled:opacity-30"
          >
            {enhancing["call-" + i] === true ? "enhancing…" : "\u2728 H3 style"}
          </Button>
          {enhanceUndo["call-" + i] !== undefined && (
            <Button
              type="button"
              aria-label={"Undo enhance call " + i + " prompt"}
              data-testid="tl-call-enhance-undo"
              onClick={() => undoEnhance("call-" + i, (t) => handlePromptUpdate("call-" + i, t))}
              className="rounded px-1 py-0.5 text-[9px] text-muted-foreground/60 transition-colors hover:bg-white/10 hover:text-foreground"
            >
              {"\u21a9 undo"}
            </Button>
          )}
        </span>
      </div>
      {enhanceErr["call-" + i] && (
        <span className="text-[8px] leading-tight text-destructive" data-testid="tl-call-enhance-error">
          {enhanceErr["call-" + i]}
        </span>
      )}
      <Textarea
        value={c.text ?? ""}
        placeholder="describe the action, camera, and mood for this call — empty calls refuse the plan"
        aria-label={`Call ${i} prompt`}
        data-testid="tl-call-prompt"
        rows={2}
        onChange={(e) => handlePromptUpdate(`call-${i}`, e.target.value)}
        className={cn(
          "min-h-[2.25rem] w-full h-auto resize-y rounded border bg-black/30 px-2 py-1 text-[11px] leading-snug outline-none",
          (c.text ?? "").trim()
            ? "border-white/10 text-foreground/90 focus:border-brand/60"
            : "border-amber-400/40 text-amber-300/90 placeholder:text-amber-300/40 focus:border-amber-300/70",
        )}
      />
      <Button variant="ghost"
        onClick={() => addBeatSegment(i)}
        aria-label={`Add segment to call ${i}`}
        className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground/40 transition-colors hover:text-brand"
      >
        + prompt segments
      </Button>
    </div>
  )}
    </>
  )
}
