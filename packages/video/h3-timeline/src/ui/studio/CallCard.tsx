/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { Button } from "@deepseek-ai/dsh-client-ui-primitives"
import { OverlayKnob, SectionLabel, SpecAtom, Tip } from "@melite/card-base/client"
import { cn } from '@melite/card-base/client'
import { ChevronDown, X } from '@melite/card-base/client'
import s from "./studio.module.css"
import { GUIDE_KINDS, KNOB_ORDER, VIDEO_TIMELINE_TRACKS } from "./docModel.ts"
import type { DocCall } from "./docModel.ts"
import type { GuideKind } from "./docModel.ts"
import { readAsDataURL } from '@melite/card-base/client'
import { SourceRow } from '@melite/card-base/client'
import { FirstFrameSlot, SeamControls } from "./CallFrameSubcard.tsx"
import { CallCardPrompt } from "./CallCardPrompt.tsx"
import { REF_UPLOAD_SPEC, declaredShortName } from "./refUtils.ts"
import {
  IMAGE_BUS_SLOTS,
  REF_CAPS,
  deliveredFrames,
  mergeDeclaredRefs,
  normalizeDeclaredRefs,
  refGenreOf,
  splitRefList,
} from "@melite/models-h3/timelineContract"
import type { CallCardDeps } from "./CallCardsPanel.tsx"

/** A CARD-LEVEL reference chip (2026-09-23, the operator: the
 *  agent-persisted card-level refs showed NOWHERE): display-only — the
 *  studio never writes the declared surface (the agent path owns it),
 *  so there is no edit door to lie about. The full URL rides the
 *  title; a dead URL shows its broken thumb honestly. */
function DeclaredChip({ url, kind }: { url: string; kind: "image" | "video" | "audio" }) {
  const short = declaredShortName(url)
  return (
    <span
      className={s.declaredChip}
      data-testid="tl-declared-ref"
      title={`card-level reference — rides every window's bus (edit via the card params, not this call)\n${url}`}
    >
      {kind === "image" ? <img src={url} alt={short} className={s.declaredThumb} /> : null}
      <span className={s.declaredName}>{short}</span>
      <span className={s.declaredTag}>card</span>
    </span>
  )
}

/** A REDUNDANT per-call copy (H4, 2026-09-23 — no hole left): a
 *  per-call chip already riding card-level hides from the lane (the
 *  bus dedupes it) — but hiding is not stranding. This row names
 *  the copy and offers its × : stripping the per-call copy changes
 *  NOTHING on the bus (the value still rides card-level), so the
 *  door cannot lie. */
function RedundantRow({ name, onStrip }: { name: string; onStrip: () => void }) {
  const short = name.startsWith("data:") ? `upload (${name.length} chars)` : declaredShortName(name)
  return (
    <span
      className={s.redundantRow}
      data-testid="tl-redundant-ref"
      title={`redundant per-call copy — already rides card-level, so the bus ignores this entry\n${name}\n× strips the copy (the bus is unchanged)`}
    >
      <span className={s.redundantName}>⟡ {short}</span>
      <button type="button" className={s.redundantX} data-testid="tl-redundant-strip" onClick={onStrip} title="strip the redundant per-call copy">
        ×
      </button>
    </span>
  )
}
/** ONE ref bucket — the estate's SourceRow per chip (the operator's
 *  2026-09-13 law: SourceRow owns EVERY input slot): pick from the
 *  available artifacts, upload inline (data: URL chip), remove via
 *  clear. The wire form is the comma string (the card's wireList
 *  law — trimmed entries, empties absent). */
function RefsBucket({
  label, kind, accept, cap, value, artifacts, onChange, disabled, disabledHint, declared,
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
  /** THE DOOR GUARD, UX arm (2026-09-22): true grays the bucket — a
   * pinned window owns its audio conditioning and the normal input
   * stands down for THIS window (the compose owns the real wall). */
  disabled?: boolean
  disabledHint?: string
  value: string | undefined
  artifacts: Array<{ name: string; url: string }>
  onChange: (next: string) => void
  /** THE DECLARED SURFACE (2026-09-23): card-level refs ride ahead of
   * the per-call chips in bus order (declared PRIMARY, per-call
   * appended deduped — the compose's mergeRefs twin). Display-only. */
  declared: string[]
}) {
  const chips = splitRefList(value)
  // per-call chips already riding as card-level hide (the bus dedupes
  // them) — true indices address the wire, never the view.
  const shown = chips
    .map((ch, idx) => ({ ch, idx }))
    .filter(({ ch }) => !declared.includes(ch))
  const bus = mergeDeclaredRefs(declared, chips)
  const over = bus.length > cap
  const candidates = artifacts
    .filter((a) => refGenreOf(a.name, a.url) === kind && !chips.includes(a.name))
    .map((a) => ({ id: a.name, label: a.name, url: a.url }))
  const setChips = (next: string[]): void => onChange(next.length ? next.join(", ") : "")
  // THE REDUNDANT COPIES (H4 — no hole left): per-call chips already
  // riding card-level hide from the lane but NOT from the door —
  // each names itself with a × that strips the copy (the bus is
  // unchanged: the value still rides card-level).
  const redundant = chips.filter((ch) => declared.includes(ch))
  const up = REF_UPLOAD_SPEC[kind]
  const disabledTitle = disabledHint ?? "pinned window — this input stands down"
  // THE PICK TRANSLATION (the slot grammar): a From-flow pick hands
  // the candidate's URL — the refs wire carries artifact NAMES (the
  // estate re-resolves names each run). A data: URL or bare name
  // rides verbatim.
  const chipOf = (v: string): string => {
    const byUrl = candidates.find((c) => c.url === v)
    return byUrl !== undefined ? byUrl.id : v
  }
  return (
    <div
      className={s.refRow}
      data-testid="tl-call-ref-bucket"
      data-disabled={disabled ? "true" : undefined}
      title={disabled ? disabledTitle : undefined}
    >
      <SectionLabel
        tail={
          <span
            className={over ? s.refCountOver : disabled ? s.refCountOver : undefined}
            title={disabled
              ? disabledTitle
              : over ? `${bus.length} claimed — the bus holds ${cap}` : `${bus.length} of ${cap}${declared.length ? ` (${declared.length} card-level)` : ""}`}
          >
            {bus.length}/{cap}{over ? " over cap" : ""}{disabled ? " · pinned" : ""}
          </span>
        }
      >
        {label}
      </SectionLabel>
      <div className={s.chips} style={disabled ? { opacity: 0.45, pointerEvents: "none" } : undefined}>
        {declared.map((url) => (
          <DeclaredChip key={`declared-${url}`} url={url} kind={kind} />
        ))}
        {shown.map(({ ch: chip, idx: ci }) => (
          <SourceRow
            key={`${chip}-${ci}`}
            label={chip.startsWith("data:") ? `upload ${ci + 1}` : chip}
            /* v8 ignore next -- RefsBucket mounts only as video/audio (its two call sites); the image lane is separate inline JSX (probe 2026-09-19) */
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
          /* v8 ignore next -- RefsBucket mounts only as video/audio (its two call sites); the image lane is separate inline JSX (probe 2026-09-19) */
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
        {redundant.map((name) => (
          <RedundantRow
            key={`redundant-${name}`}
            name={name}
            onStrip={() => setChips(chips.filter((ch) => ch !== name))}
          />
        ))}
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
    refArtifacts,
    handlePromptDelete, handlePromptUpdate,
    enhanceOne, undoEnhance, enhancing, enhanceErr, enhanceUndo,
    setCallSpan, setCallGuide, setCallTransition,
    setCallRefs, setCallKnob,
    voicePinnedCalls,
    audioClipsPresent,
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
          // THE DECLARED SURFACE (2026-09-23): card-level refs ride
          // ahead of the per-call chips in bus order (the compose's
          // mergeRefs twin) — the bundle shows what rides, not just
          // what this call owns. True indices address the wire.
          const declared = normalizeDeclaredRefs(layerA?.ref_images)
          const bus = mergeDeclaredRefs(declared, chips)
          const shown = chips
            .map((ch, idx) => ({ ch, idx }))
            .filter(({ ch }) => !declared.includes(ch))
          // THE REDUNDANT COPIES (H4 — same door as the buckets).
          const redundant = chips.filter((ch) => declared.includes(ch))
          const anchor = (c.image ?? "").trim() !== "" ? 1 : 0
          const total = anchor + bus.length
          const over = total > IMAGE_BUS_SLOTS
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
                      ? `${total} image slots claimed — the bus holds ${IMAGE_BUS_SLOTS} (1 anchor + ${REF_CAPS.images} refs); the compose slices the overflow`
                      : `${total} of ${IMAGE_BUS_SLOTS} image slots on the bus${declared.length ? ` (${declared.length} card-level)` : ""}`}
                    data-testid="tl-call-ref-images"
                  >
                    {total}/{IMAGE_BUS_SLOTS}{over ? " over bus" : ""}
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
                {declared.map((url) => (
                  <DeclaredChip key={`declared-${url}`} url={url} kind="image" />
                ))}
                {shown.map(({ ch: chip, idx: ci }) => (
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
                {redundant.map((name) => (
                  <RedundantRow
                    key={`redundant-${name}`}
                    name={name}
                    onStrip={() => setChips(chips.filter((ch) => ch !== name))}
                  />
                ))}
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
          cap={REF_CAPS.videos}
          value={c.refs?.videos}
          artifacts={refArtifacts}
          onChange={(v) => setCallRefs(i, "videos", v)}
          declared={normalizeDeclaredRefs(layerA?.ref_videos)}
        />
        <RefsBucket
          label="Ref audios"
          kind="audio"
          accept="audio/*"
          cap={REF_CAPS.audios}
          value={c.refs?.audios}
          artifacts={refArtifacts}
          onChange={(v) => setCallRefs(i, "audios", v)}
          declared={normalizeDeclaredRefs(layerA?.ref_audios)}
          disabled={audioClipsPresent || (voicePinnedCalls?.has(i) ?? false)}
          disabledHint={audioClipsPresent
            ? "THE BLOCKER: the timeline carries audio clips — the clips own the model's audio inputs; clear the D-M-E lanes to use reference audio"
            : "a dialogue/sfx clip pins this window — the pin owns its audio conditioning (remove the clip or move it to hear this input again)"}
        />
        {/* THE SEAM — the call's join (carried vs cut; the carry
            itself is automatic — drift control, never authored). LAST
            ROW under the bus, after every lane: the seam is the
            call's join, never a lane between lanes. */}
        <SeamControls
          callIndex={i}
          transition={c.transition}
          onTransition={(t) => setCallTransition(i, t)}
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
