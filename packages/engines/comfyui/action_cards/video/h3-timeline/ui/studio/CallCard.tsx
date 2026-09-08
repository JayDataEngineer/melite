/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { ChevronDown, X } from "lucide-react"
import { Button } from "@melite/ui/button"
import { Input, NumberControl, Tip, cn } from "@melite/ui"
import { GUIDE_KINDS, KNOB_ORDER, VIDEO_TIMELINE_TRACKS } from "./docModel"
import type { DocCall } from "./docModel"
import { splitRefList } from "./refUtils"
import type { GuideKind } from "./docModel"
import { BeatKnobControl } from "./BeatKnobControl"
import { CallFrameSubcard } from "./CallFrameSubcard"
import { RefPickerRow } from "./RefPickerRow"
import { CallCardPrompt } from "./CallCardPrompt"
import type { CallCardDeps } from "./CallCardsPanel"

/** One focused model-call card (monolith lines 3418–3466 + 3641–3844;
 *  the prompt block lives in CallCardPrompt). */
export function CallCard({
  c, i, deps,
}: {
  c: DocCall
  i: number
  deps: CallCardDeps
}) {
  const {
    selected, fps, callCardRefs, beatRowRefs, artifactIndex, linkGroups,
    isRef2va, refArtifacts,
    handlePromptDelete, handlePromptUpdate,
    setBeatSegment, addBeatSegment, deleteBeatSegment,
    enhanceOne, undoEnhance, enhancing, enhanceErr, enhanceUndo,
    setCallSpan, setCallGuide, setCallPrevSec, setCallTransition,
    setCallRefs, setCallKnob,
  } = deps
  // Focused mode: only the SELECTED call's card renders — the
  // rail is that call's editor (the others are one click away
  // via their bar clips / the back button).
  if (selected != null && i !== selected.callIdx) return null
  const activeKnobs = c.knobs ? Object.keys(c.knobs).length : 0
  const segmentMode = !!c.beats?.length
  const callSelected = selected?.callIdx === i
  return (
    <div
      key={i}
      data-call-card={i}
      data-guides={GUIDE_KINDS.filter((k) => (c[k] ?? "").trim()).join(" ") || undefined}
      data-knobs={activeKnobs || undefined}
      data-selected={callSelected ? "true" : undefined}
      ref={(el) => { callCardRefs.current[i] = el }}
      className={cn(
        "px-0.5 py-1.5 transition-colors",
        callSelected && "bg-brand/[0.05] ring-1 ring-brand/40",
      )}
    >
      {/* Card header — the call identity + span readout. */}
      <div className="flex items-center gap-2 pb-1">
        <span className="shrink-0 text-[9px] font-semibold uppercase tabular-nums text-muted-foreground/60">
          #{i} · Model call {i + 1}
        </span>
        <span className="shrink-0 text-[9px] tabular-nums text-muted-foreground/50" title={`frames ${c.start_frame}–${c.end_frame} (end exclusive)`}>
          frames {c.start_frame}–{c.end_frame} · {((c.end_frame - c.start_frame) / fps).toFixed(1)}s
        </span>
        {activeKnobs > 0 && (
          <span className="shrink-0 rounded border border-cyan-400/30 bg-cyan-400/10 px-1 py-px text-[8px] font-semibold uppercase tracking-wide text-cyan-300">
            {activeKnobs} knob{activeKnobs === 1 ? "" : "s"}
          </span>
        )}
        {/* Delete this call card (2026-08-16: "Delete button
            should delete a card here") — same handler as the
            bar clip's hover ✕: the freed span merges into the
            neighbor; deleting the only call resets to the
            starter doc (the plan REQUIRES ≥1 call). The stale
            guard then returns the rail to global. */}
        <Tip tip="Delete this call — its span merges into the neighbor">
          <Button variant="ghost"
            onClick={() => handlePromptDelete(`call-${i}`)}
            aria-label={`Delete call ${i}`}
            className="ml-auto flex h-5 shrink-0 items-center gap-1 rounded border border-white/10 px-1.5 text-[9px] uppercase tracking-wide text-muted-foreground/50 transition-colors hover:border-destructive/60 hover:bg-destructive/80 hover:text-white"
          >
            <X className="h-2.5 w-2.5" aria-hidden /> Delete
          </Button>
        </Tip>
      </div>
          <CallCardPrompt
            c={c}
            i={i}
            callSelected={callSelected}
            segmentMode={segmentMode}
            selected={selected}
            handlePromptUpdate={handlePromptUpdate}
            setBeatSegment={setBeatSegment}
            addBeatSegment={addBeatSegment}
            deleteBeatSegment={deleteBeatSegment}
            enhanceOne={enhanceOne}
            undoEnhance={undoEnhance}
            enhancing={enhancing}
            enhanceErr={enhanceErr}
            enhanceUndo={enhanceUndo}
            beatRowRefs={beatRowRefs}
          />

    {/* The span — editable frames, synced both ways with the
        bar (an edge drag moves the cut; typing here does too,
        rippling into the neighbor). */}
    <div className="flex items-center gap-1.5 pb-1 pt-1">
      <span className="text-[9px] uppercase tracking-wide text-muted-foreground/40">Span</span>
      <NumberControl
        ariaLabel={`Call ${i} start frame`}
        value={c.start_frame}
        onChange={(v) => { if (v !== undefined) setCallSpan(i, "start", Math.round(v)) }}
        min={0} step={1}
        align="center"
        width="w-16"
        placeholder=""
      />
      <span className="text-[9px] text-muted-foreground/40">–</span>
      <NumberControl
        ariaLabel={`Call ${i} end frame`}
        value={c.end_frame}
        onChange={(v) => { if (v !== undefined) setCallSpan(i, "end", Math.round(v)) }}
        min={0} step={1}
        align="center"
        width="w-16"
        placeholder=""
      />
      <span className="text-[9px] text-muted-foreground/35">end exclusive · edit ripples the cut into the neighbor</span>
    </div>

    {/* ── The frame conditioners — the SUBCARDS (the
        qwen-img-edit-2511 input pattern, upgraded 2026-08-24
        to FULL image inputs — upload / OS drop / tray drop /
        LINK TO PREVIOUS OUTPUT, the same affordances every
        other image slot has): FIRST frame (the opening still
        — `image`, which a seam turns into the window's
        first_frame — plus the prev-video continuation
        option) and LAST frame (the closing still, pinned at
        the call's final frame). */}
    <div className="flex items-stretch gap-2">
      <CallFrameSubcard
        label="First frame"
        hint="the opening still — anchors frame 0 of the window"
        testId="tl-first-frame"
        callIndex={i}
        value={c.image}
        onChange={(source) => setCallGuide(i, "image", source)}
        nameToUrl={artifactIndex.byName}
        urlToName={artifactIndex.byUrl}
        links={linkGroups}
        prevSec={c.first_frame_prev_sec}
        onPrevSec={(sec) => setCallPrevSec(i, sec)}
        transition={c.transition}
        onTransition={(t) => setCallTransition(i, t)}
        prevDisabled={i === 0}
        prevNote={i === 0
          ? "the first call has no previous video to continue from"
          : undefined}
      />
      <CallFrameSubcard
        label="Last frame"
        hint="the closing still — pinned at the call's final frame"
        testId="tl-last-frame"
        callIndex={i}
        value={c.last_frame}
        onChange={(source) => setCallGuide(i, "last_frame", source)}
        nameToUrl={artifactIndex.byName}
        urlToName={artifactIndex.byUrl}
        links={linkGroups}
      />
    </div>

    {/* Per-call reference images: NO freetext input here
        (2026-09-02) — the artifact-system picker in the
        Identity-refs subpanel below owns this field
        (pick from available artifacts or upload inline);
        this raw-text input writing the same key was the
        half of the freetext bug the picker surgery
        missed. The cap badge stays — it reads the same
        chips the picker writes. */}
    {(() => {
        const extraCount = splitRefList(c.refs?.images).length
        const guidePresent = !!(c.image ?? "").trim() ? 1 : 0
        const total = extraCount + guidePresent
        if (total === 0) return null
        return (
          <div className="flex items-center gap-1.5" data-testid="tl-call-ref-images">
            <span
              className={cn(
                "shrink-0 rounded border border-white/10 bg-black/30 px-1 py-px font-mono text-[9px] tabular-nums",
                total > 10 ? "text-amber-400" : "text-cyan-300/80",
              )}
              title={total > 10 ? `${total} refs total — exceeds the 10-image cap` : `${total} ref image${total === 1 ? "" : "s"} (guide + extras) — managed in Identity refs below`}
            >
              refs {total}/10
            </span>
          </div>
        )
      })()}

    {/* The guides — the call's own clip/audio sources
        (anchored at the cut, in-point semantics). The IMAGE
        input moved into the First-frame subcard above —
        `image` IS the first-frame source. */}
    <div className="flex items-center gap-2">
      {(["clip", "audio"] as GuideKind[]).map((kind) => {
        const track = VIDEO_TIMELINE_TRACKS.find((t) => t.uuid === kind)!
        const color = `rgb(${track.color?.[0] ?? 176}, ${track.color?.[1] ?? 180}, ${track.color?.[2] ?? 186})`
        const src = c[kind] ?? ""
        return (
          <span key={kind} className="relative shrink-0">
            <span
              className="pointer-events-none absolute left-1.5 top-1/2 z-10 h-1.5 w-1.5 -translate-y-1/2 rotate-45"
              style={{ background: src.trim() ? color : "transparent", border: `1px solid ${color}77` }}
              aria-hidden
            />
            <Input
              list="tl-kf-sources"
              value={src}
              placeholder={kind}
              aria-label={`Call ${i} ${kind} guide`}
              data-testid="tl-call-guide"
              onChange={(e) => setCallGuide(i, kind, e.target.value)}
              className={cn(
                "w-28 h-auto rounded border bg-black/30 pl-4 pr-1.5 py-0.5 font-mono text-[10px] outline-none",
                src.trim()
                  ? "border-white/10 text-foreground/90 focus:border-brand/60"
                  : "border-white/[0.06] text-muted-foreground/70 placeholder:text-muted-foreground/55 focus:border-brand/40",
              )}
            />
          </span>
        )
      })}
    </div>

    {/* Per-call identity refs (Ref2VA route only): each
        model call conditions on ITS OWN references —
        REPLACE the run-level refs for this call's
        windows; empty = inherit the run defaults. */}
    {isRef2va && (
      <div className="rounded border border-white/[0.07] bg-white/[0.015] p-1.5" data-testid="tl-call-refs">
        <div className="flex items-baseline justify-between">
          <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/50">
            Identity refs (this call)
          </span>
          <span className="text-[8px] text-muted-foreground/40">
            replaces run refs · empty = inherit
          </span>
        </div>
        <div className="mt-1 space-y-1">
          {([
            ["images", "Ref images", "image", 10] as const,
          ]).map(([key, label, genre, cap]) => (
            <RefPickerRow
              key={key}
              label={label}
              ariaLabel={`call ${i} ${label}`}
              testId="tl-call-ref-picker"
              value={c.refs?.[key]}
              onChange={(v) => setCallRefs(i, key, v ?? "")}
              genre={genre}
              cap={cap}
              artifacts={refArtifacts}
            />
          ))}
          {/* (2026-09-02 truth-in-UI) per-call refs.videos/
            audios were OFFERED here but the compiler never
            stages or wires them — dead controls writing
            values nothing reads. Videos/audios/video_audios
            ride at RUN level (the bundle bus is global);
            per-call is the image bus (t4r ref_image slots). */}
          <p className="text-[8px] text-muted-foreground/40">
            per-call refs are the image bus — ref videos / audios ride at run level
          </p>
        </div>
      </div>
    )}

    {/* Call knobs — the Layer B REPLACE fold: per-call
        overrides of the run's global values. Every control's
        empty state is "inherit" (absent → the window inherits
        Layer A; the backend's CALL_KNOB_KEYS vocabulary —
        audio_mode is recipe-level and never appears here). */}
    <details className="group mt-1">
      <summary className="flex cursor-pointer select-none items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/50 hover:text-muted-foreground/80">
        <ChevronDown className="h-2.5 w-2.5 transition-transform group-open:rotate-180" aria-hidden />
        Call knobs
        {activeKnobs > 0 && (
          <span className="rounded border border-cyan-400/30 bg-cyan-400/10 px-1 text-[8px] text-cyan-300">
            {activeKnobs}
          </span>
        )}
      </summary>
      <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-white/[0.06] pt-1.5">
        {KNOB_ORDER.map((knob) => (
          <BeatKnobControl
            key={knob}
            callIndex={i}
            knob={knob}
            value={c.knobs?.[knob]}
            onChange={(key, v) => setCallKnob(i, key, v)}
          />
        ))}
      </div>
    </details>
  </div>
  )
}
