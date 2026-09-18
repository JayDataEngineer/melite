/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { Button } from "@deepseek-ai/dsh-client-ui-primitives"
import { OverlayKnob, SectionLabel, SpecAtom, Tip } from "@melite/card-base"
import { cn } from "@melite/card-base/chrome"
import { ChevronDown, X } from "@melite/card-base/icons"
import s from "./studio.module.css"
import { GUIDE_KINDS, KNOB_ORDER, VIDEO_TIMELINE_TRACKS } from "./docModel"
import type { DocCall } from "./docModel"
import type { GuideKind } from "./docModel"
import { readAsDataURL } from "@melite/card-base/chrome"
import { SourceRow } from "@melite/card-base/form"
import { FirstFrameSlot, SeamControls } from "./CallFrameSubcard"
import { CallCardPrompt } from "./CallCardPrompt"
import { REF_UPLOAD_SPEC, refGenreOf, splitRefList } from "./refUtils"
import type { CallCardDeps } from "./CallCardsPanel"

/** THE SEAM-CARRY TRUTH (mirror of the card's own law): a chained
 *  window's delivered frames are its span MINUS the carry its seam
 *  consumes — extend defaults 39 (snapped to the 5/22/39/56 latent
 *  steps), cut+prev_sec carries prev_sec×24 snapped. First windows
 *  and hard cuts deliver their whole span. */
const CARRY_LEGAL = [5, 22, 39, 56]
const snapCarry = (frames: number): number => {
  let best = CARRY_LEGAL[0] as number
  for (const v of CARRY_LEGAL) {
    if (Math.abs(v - frames) < Math.abs(best - frames)) best = v
  }
  return best
}
export const deliveredFrames = (c: DocCall, i: number): number => {
  const span = c.end_frame - c.start_frame
  if (i === 0 || c.transition === "cut") {
    const secs = c.first_frame_prev_sec
    const carry = secs != null ? snapCarry(secs * 24) : 0
    return Math.max(0, span - carry)
  }
  const secs = c.first_frame_prev_sec
  return Math.max(0, span - (secs != null ? snapCarry(secs * 24) : 39))
}

/** ONE ref bucket — the estate's SourceRow per chip (the operator's
 *  2026-09-13 law: SourceRow owns EVERY input slot): pick from the
 *  available artifacts, upload inline (data: URL chip), remove via
 *  clear. The wire form is the comma string (the card's wireList
 *  law — trimmed entries, empties absent). */
function RefsBucket({
  label, kind, accept, cap, value, artifacts, onChange,
}: {
  label: string
  kind: "image" | "video" | "audio"
  /** THE OS PICKER FILTER (2026-09-18, the two-audio fix): the lane's
   *  MIME family — without it the hidden file input's IMAGE-ONLY
   *  accept grays out every audio and video in the dialog (you
   *  literally could not add even one from file). */
  accept?: string
  /** Bundle cap (3 videos, 3 audios — the image lane owns the 9-slot
   * image bus: slot 1 anchor + slots 2-9 refs). */
  cap: number
  value: string | undefined
  artifacts: Array<{ name: string; url: string }>
  onChange: (next: string) => void
}) {
  const chips = splitRefList(value)
  const over = chips.length > cap
  const candidates = artifacts
    .filter((a) => refGenreOf(a.name, a.url) === kind && !chips.includes(a.name))
    .map((a) => ({ id: a.name, label: a.name, url: a.url }))
  const setChips = (next: string[]): void => onChange(next.length ? next.join(", ") : "")
  const up = REF_UPLOAD_SPEC[kind]
  // THE PICK TRANSLATION (the slot grammar): a From-flow pick hands
  // the candidate's URL — the refs wire carries artifact NAMES (the
  // estate re-resolves names each run). A data: URL or bare name
  // rides verbatim.
  const chipOf = (v: string): string => {
    const byUrl = candidates.find((c) => c.url === v)
    return byUrl !== undefined ? byUrl.id : v
  }
  return (
    <div className={s.refRow} data-testid="tl-call-ref-bucket">
      <SectionLabel
        tail={
          <span
            className={over ? s.refCountOver : undefined}
            title={over ? `${chips.length} claimed — the bus holds ${cap}` : `${chips.length} of ${cap}`}
          >
            {chips.length}/{cap}{over ? " over cap" : ""}
          </span>
        }
      >
        {label}
      </SectionLabel>
      <div className={s.chips}>
        {chips.map((chip, ci) => (
          <SourceRow
            key={`${chip}-${ci}`}
            label={chip.startsWith("data:") ? `upload ${ci + 1}` : chip}
            kind={kind === "image" ? "image" : "file"}
            accept={accept}
            value={chip.startsWith("data:") ? null : chip}
            onEdit={(v) => {
              if (v === "") setChips(chips.filter((_, x) => x !== ci))
              else setChips(chips.map((x, idx) => (idx === ci ? chipOf(v) : x)))
            }}
            candidates={candidates}
            onFile={async (f) => {
              try {
                const data = await readAsDataURL(f)
                setChips(chips.map((x, idx) => (idx === ci ? data : x)))
              } catch { /* unreadable — the pickers never throw */ }
            }}
          />
        ))}
        <SourceRow
          label={`+ ${label.toLowerCase()}`}
          kind={kind === "image" ? "image" : "file"}
          accept={accept}
          value={null}
          onEdit={(v) => { if (v !== "") setChips([...chips, chipOf(v)]) }}
          candidates={candidates}
          onFile={async (f) => {
            if (f.size > up.maxMb * 1024 * 1024) return
            try {
              setChips([...chips, await readAsDataURL(f)])
            } catch { /* unreadable — the pickers never throw */ }
          }}
        />
      </div>
    </div>
  )
}

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
    selected, fps, layerA, knobFields, callCardRefs, artifactIndex, linkGroups,
    isRef2va, refArtifacts,
    handlePromptDelete, handlePromptUpdate,
    enhanceOne, undoEnhance, enhancing, enhanceErr, enhanceUndo,
    setCallSpan, setCallGuide, setCallPrevSec, setCallTransition,
    setCallRefs, setCallKnob,
  } = deps
  // Focused mode: only the SELECTED call's card renders — the
  // rail is that call's editor (the others are one click away
  // via their bar clips / the back button).
  if (selected != null && i !== selected.callIdx) return null
  const activeKnobs = c.knobs ? Object.keys(c.knobs).length : 0
  const callSelected = selected?.callIdx === i
  return (
    <div
      key={i}
      data-call-card={i}
      data-guides={GUIDE_KINDS.filter((k) => (c[k] ?? "").trim()).join(" ") || undefined}
      data-knobs={activeKnobs || undefined}
      data-selected={callSelected ? "true" : undefined}
      ref={(el) => { callCardRefs.current[i] = el }}
      className={cn(s.callCard, callSelected && s.callCardSel)}
    >
      {/* Card header — the call identity + span readout. */}
      <div className={s.cardHead}>
        <span className={s.cardId}>
          #{i} · Model call {i + 1}
        </span>
        <span
          className={s.cardSpan}
          title={`frames ${c.start_frame}–${c.end_frame} (end exclusive) — delivered ${deliveredFrames(c, i)}f after the seam's carry`}
        >
          frames {c.start_frame}–{c.end_frame} · span {((c.end_frame - c.start_frame) / fps).toFixed(1)}s → delivered {(deliveredFrames(c, i) / fps).toFixed(1)}s
        </span>
        {activeKnobs > 0 && (
          <span className={s.knobTag}>
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
            className={s.delBtn}
          >
            <X className={s.sz10} aria-hidden /> Delete
          </Button>
        </Tip>
      </div>
          <CallCardPrompt
            c={c}
            i={i}
            handlePromptUpdate={handlePromptUpdate}
            enhanceOne={enhanceOne}
            undoEnhance={undoEnhance}
            enhancing={enhancing}
            enhanceErr={enhanceErr}
            enhanceUndo={enhanceUndo}
          />

    {/* The span — editable frames, synced both ways with the
        bar (an edge drag moves the cut; typing here does too,
        rippling into the neighbor). */}
    <div className={s.spanRow}>
      <span className={s.spanLabel}>Span</span>
      <SpecAtom
        f={{ name: `call_${i}_start_frame`, label: `Call ${i} start frame`, type: "number", min: 0, step: 1 }}
        value={c.start_frame}
        placeholder=""
        onEdit={(_, v) => {
          const n = typeof v === "string" && v.trim() !== "" ? Number(v) : undefined
          if (n !== undefined) setCallSpan(i, "start", Math.round(n))
        }}
      />
      <span className={s.spanDash}>–</span>
      <SpecAtom
        f={{ name: `call_${i}_end_frame`, label: `Call ${i} end frame`, type: "number", min: 0, step: 1 }}
        value={c.end_frame}
        placeholder=""
        onEdit={(_, v) => {
          const n = typeof v === "string" && v.trim() !== "" ? Number(v) : undefined
          if (n !== undefined) setCallSpan(i, "end", Math.round(n))
        }}
      />
      <span className={s.spanNote}>end exclusive · edit ripples the cut into the neighbor</span>
    </div>

    {/* ── THE REFERENCE BUNDLE — ONE bus, the model's own topology
        (operator correction, 2026-09-18: "you put first frame in a
        different category than reference image — they are complete
        alien concepts in the UI"). At the model level there is ONE
        image bus: slot 1 = the first frame (the anchor — it starts
        the window and sizes it), slots 2-9 = reference images, then
        3 video lanes and 3 audio lanes. The UI mirrors the bundle
        or it lies — the anchor renders in the SAME lane grammar as
        the ref chips, never in an alien box. The seam controls ride
        under the bus (the seam is the call's join, not a slot). */}
    <div className={s.callRefs} data-testid="tl-call-refs">
      {/* ONE conformed head (2026-09-18, the operator's typography
          conviction: "this is not the same text or font as the
          generic system we made" — the panel's head and lane labels
          ride the kit's SectionLabel grammar, the same face every
          other studio section uses. No hand-rolled spans.) */}
      <SectionLabel>Reference bundle (this call)</SectionLabel>
      <div className={s.callRefsBody}>
        {/* THE IMAGE LANE — the 9-slot bus: anchor first, then the
            ref chips, then the add-row. One grammar, one family. */}
        {(() => {
          const chips = splitRefList(c.refs?.images)
          const anchor = (c.image ?? "").trim() !== "" ? 1 : 0
          const total = anchor + chips.length
          const over = total > 9
          const candidates = refArtifacts
            .filter((a) => refGenreOf(a.name, a.url) === "image" && !chips.includes(a.name))
            .map((a) => ({ id: a.name, label: a.name, url: a.url }))
          const setChips = (next: string[]): void =>
            setCallRefs(i, "images", next.length ? next.join(", ") : "")
          const up = REF_UPLOAD_SPEC.image
          // THE PICK TRANSLATION (the slot grammar): a From-flow pick
          // hands the candidate's URL — the refs wire carries artifact
          // NAMES (the estate re-resolves names each run). A data: URL
          // or bare name rides verbatim.
          const chipOf = (v: string): string => {
            const byUrl = candidates.find((cand) => cand.url === v)
            return byUrl !== undefined ? byUrl.id : v
          }
          return (
            <div className={s.refRow} data-testid="tl-call-ref-bucket">
              <SectionLabel
                tail={
                  <span
                    className={over ? s.refCountOver : undefined}
                    title={over
                      ? `${total} image slots claimed — the bus holds 9 (1 anchor + 8 refs); the compose slices the overflow`
                      : `${total} of 9 image slots on the bus`}
                    data-testid="tl-call-ref-images"
                  >
                    {total}/9{over ? " over bus" : ""}
                  </span>
                }
              >
                Images — slot 1 anchors · slots 2–9 reference
              </SectionLabel>
              <div className={s.chips}>
                <FirstFrameSlot
                  testId="tl-first-frame"
                  callIndex={i}
                  value={c.image}
                  onChange={(source) => setCallGuide(i, "image", source)}
                  nameToUrl={artifactIndex.byName}
                  urlToName={artifactIndex.byUrl}
                  links={linkGroups}
                />
                {chips.map((chip, ci) => (
                  <SourceRow
                    key={`${chip}-${ci}`}
                    label={chip.startsWith("data:") ? `upload ${ci + 1}` : chip}
                    kind="image"
                    value={chip.startsWith("data:") ? null : chip}
                    onEdit={(v) => {
                      if (v === "") setChips(chips.filter((_, x) => x !== ci))
                      else setChips(chips.map((x, idx) => (idx === ci ? chipOf(v) : x)))
                    }}
                    candidates={candidates}
                    onFile={async (f) => {
                      try {
                        const data = await readAsDataURL(f)
                        setChips(chips.map((x, idx) => (idx === ci ? data : x)))
                      } catch { /* unreadable — the pickers never throw */ }
                    }}
                  />
                ))}
                <SourceRow
                  label="+ ref image"
                  kind="image"
                  value={null}
                  onEdit={(v) => { if (v !== "") setChips([...chips, chipOf(v)]) }}
                  candidates={candidates}
                  onFile={async (f) => {
                    if (f.size > up.maxMb * 1024 * 1024) return
                    try {
                      setChips([...chips, await readAsDataURL(f)])
                    } catch { /* unreadable — the pickers never throw */ }
                  }}
                />
              </div>
            </div>
          )
        })()}
        {/* THE BUS ORDER (2026-09-18, the operator's conviction:
            "it's ref img -> SEAMS for no reason -> Audio -> Videos"
            — the lanes render in the bundle's OWN wire order (images
            1–9, videos, audios) and the seam rides AFTER the bus:
            the seam is the call's join, never a lane between lanes. */}
        <RefsBucket
          label="Ref videos"
          kind="video"
          accept="video/*"
          cap={3}
          value={c.refs?.videos}
          artifacts={refArtifacts}
          onChange={(v) => setCallRefs(i, "videos", v)}
        />
        <RefsBucket
          label="Ref audios"
          kind="audio"
          accept="audio/*"
          cap={3}
          value={c.refs?.audios}
          artifacts={refArtifacts}
          onChange={(v) => setCallRefs(i, "audios", v)}
        />
        {/* THE SEAM — the call's join (cut vs extend + the prev
            continuation). LAST ROW under the bus, after every lane:
            the seam is the call's join, never a lane between
            lanes. */}
        <SeamControls
          callIndex={i}
          testId="tl-first-frame"
          prevSec={c.first_frame_prev_sec}
          onPrevSec={(sec) => setCallPrevSec(i, sec)}
          transition={c.transition}
          onTransition={(t) => setCallTransition(i, t)}
          prevDisabled={i === 0}
          prevNote={i === 0
            ? "the first call has no previous video to continue from"
            : undefined}
        />
      </div>
    </div>

    {/* The guides — the call's own clip/audio sources
        (anchored at the cut, in-point semantics). The IMAGE
        input rides the bundle's anchor slot above —
        `image` IS the first-frame source. */}
    <div className={s.guidesRow}>
      {(["clip", "audio"] as GuideKind[]).map((kind) => {
        const track = VIDEO_TIMELINE_TRACKS.find((t) => t.uuid === kind)!
        // Dead-arm cut: every VIDEO_TIMELINE_TRACKS entry carries a
        // color triple (docModel.ts literal) and both map keys exist —
        // color is never null, so ?. / ?? never fire.
        const color = `rgb(${track.color![0]}, ${track.color![1]}, ${track.color![2]})`
        const src = c[kind] ?? ""
        return (
          <span key={kind} className={s.guideWrap}>
            <span
              className={s.guideDot}
              style={{ background: src.trim() ? color : "transparent", border: `1px solid ${color}77` }}
              aria-hidden
            />
            {/* RAW INPUT, not the DSH Input primitive — the primitive's
                own wrap/input styling out-cascades any override on it
                (reported twice: the gray highlight box would not die).
                A native input with the studio skin owns every pixel. */}
            <input
              list="tl-kf-sources"
              value={src}
              placeholder={kind}
              aria-label={`Call ${i} ${kind} guide`}
              data-testid="tl-call-guide"
              onChange={(e) => setCallGuide(i, kind, e.target.value)}
              className={cn(s.guideRaw, !src.trim() && s.guideInEmpty)}
            />
          </span>
        )
      })}
    </div>

    {/* Call knobs — the Layer B REPLACE fold: per-call
        overrides of the run's global values. THE OVERRIDE LAYER
        (hour 22): the generic OverlayKnob over the SERVED envelope's
        SpecField walk — an unset knob shows EXACTLY what composes
        (the run's stamp, else the schema's own default the admission
        gate fills; 'inherit' only when no schema truth exists). The
        backend's CALL_KNOB_KEYS vocabulary — audio_mode is
        recipe-level and never appears here. */}
    <details className={s.knobFold}>
      <summary className={s.knobSummary}>
        <ChevronDown className={cn(s.sz10, s.chev)} aria-hidden />
        Call knobs
        {activeKnobs > 0 && (
          <span className={s.knobCount}>
            {activeKnobs}
          </span>
        )}
      </summary>
      <div className={s.knobGrid}>
        {KNOB_ORDER.map((knob) => (
          <OverlayKnob
            key={knob}
            name={knob}
            field={knobFields[knob]}
            value={c.knobs?.[knob]}
            base={(layerA as unknown as Record<string, unknown> | undefined)?.[knob]}
            ariaLabel={`Call ${i} knob: ${knob}`}
            onEdit={(v) => setCallKnob(i, knob, v)}
          />
        ))}
      </div>
    </details>
  </div>
  )
}
