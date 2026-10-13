/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { Button } from "@deepseek-ai/dsh-client-ui-primitives"
import { useState } from "react"
import { OverlayKnob, SectionLabel, SpecAtom, Tip, fetchMediaLibrary } from "@melite/card-base/client"
import { cn } from '@melite/card-base/client'
import { ChevronDown, X } from '@melite/card-base/client'
import s from "./studio.module.css"
import { trackColor,  GUIDE_KINDS, KNOB_ORDER, VIDEO_TIMELINE_TRACKS } from "./docModel.ts"
import type { ReactNode } from "react"
import type { DocCall } from "./docModel.ts"
import type { GuideKind } from "./docModel.ts"
import { readAsDataURL } from '@melite/card-base/client'
import { SourceRow } from '@melite/card-base/client'
import { FirstFrameSlot, GuideSlot, SeamControls } from "./CallFrameSubcard.tsx"
import { CallCardPrompt } from "./CallCardPrompt.tsx"
import { FOREIGN_URL_REFUSAL, REF_UPLOAD_SPEC, declaredShortName } from "./refUtils.ts"
import { parseSpecNumber } from "./docGrid.ts"
import {
  IMAGE_BUS_SLOTS,
  REF_CAPS,
  deliveredFrames,
  normalizeDeclaredRefs,
  refGenreOf,
  splitRefList,
} from "@melite/models-h3/timelineContract"
import type { CallCardDeps } from "./CallCardsPanel.tsx"
import { studioCopy } from "./studioCopy.ts"

/** A CARD-LEVEL reference chip (the Layer A/B canon, 2026-10-24):
 *  display-only — the studio never writes the declared surface (the
 *  agent path owns it), so there is no edit door to lie about. It
 *  renders only while this call's lane states no chips (the inherit
 *  arm); a stated lane REPLACES the defaults. The full URL rides
 *  the title; a dead URL shows its broken thumb honestly. */
function DeclaredChip({ url, kind }: { url: string; kind: "image" | "video" | "audio" | "mod" }) {
  const short = declaredShortName(url)
  return (
    <span
      className={s.declaredChip}
      data-testid="tl-declared-ref"
      title={`card-level default — rides this window while the call states no chips of its own (a stated lane replaces it; edit via the card params)\n${url}`}
    >
      {kind === "image" ? <img src={url} alt={short} className={s.declaredThumb} /> : null}
      <span className={s.declaredName}>{short}</span>
      <span className={s.declaredTag}>card</span>
    </span>
  )
}

/** ONE ref bucket — the estate's SourceRow per chip (the operator's
 *  2026-09-13 law: SourceRow owns EVERY input slot): pick from the
 *  available artifacts, upload inline (data: URL chip), remove via
 *  clear. The wire form is the comma string (the card's wireList
 *  law — trimmed entries, empties absent).
 *
 *  ONE BUCKET SINCE 2026-10-31 (the rail-law audit's S1): the image
 *  lane — a ~130-line inline copy of this exact bucket — rides THIS
 *  component through its parameterization (anchor slot, bus-count
 *  offset, custom count title, over-bus wording). The wall
 *  (studio-call-buckets.spec.tsx) drives both seats through one
 *  face; a second inline copy is a contract break. */
function RefsBucket({
  label, kind, accept, cap, countOffset = 0, overWord = "over cap", countTestId, countTitle,
  addLabel, anchorSlot, value, artifacts, onChange, disabled, disabledHint, declared, errorTestId,
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
  /** Seats the count's total against the cap when a lane carries a
   * slot OUTSIDE the chips (the image bus counts its anchor). */
  countOffset?: number
  /** The over-cap tail's word ("over cap" — the image bus: "over bus"). */
  overWord?: string
  /** The count tail's testid (the image lane's face: tl-call-ref-images). */
  countTestId?: string
  /** The count tail's hover title, computed at the seat when a lane's
   * wording carries lane-specific law (the image bus's slicing note).
   * Without it the bucket's own default tail titles the arm. */
  countTitle?: (info: { total: number; cap: number; over: boolean; overrides: boolean; declaredCount: number }) => string
  /** The add-row's label (defaults to `+ ${label.toLowerCase()}` —
   *  the image lane's short verb overrides its long lane label). */
  addLabel?: string
  /** A lane's seat ahead of the chips (the image bus's first-frame
   *  anchor slot + its truth note). */
  anchorSlot?: ReactNode
  /** THE DOOR GUARD, UX arm (2026-09-22): true grays the bucket — a
   * pinned window owns its audio conditioning and the normal input
   * stands down for THIS window (the compose owns the real wall). */
  disabled?: boolean
  disabledHint?: string
  value: string | undefined
  artifacts: Array<{ name: string; url: string }>
  onChange: (next: string) => void
  /** THE DECLARED SURFACE (the Layer A/B canon): card-level defaults
   *  — inherit-arm display only (see DeclaredChip). */
  declared: string[]
  /** THE VISIBLE REFUSAL FACE (the every-seat law, 2026-10-26): the
   *  bucket's upload errors render here — a drop that neither
   *  commits nor refuses is THE SILENT DROP (the operator's
   *  "can't upload on some slots"). */
  errorTestId: string
}) {
  const [fileError, setFileError] = useState<string | null>(null)
  const chips = splitRefList(value)
  // THE CANON IN THE VIEW: a stated call lane rides INSTEAD of the
  // declared lane; an absent call lane inherits it. The cap guards
  // the EFFECTIVE list (the compose's own law) and the tail names
  // the arm — the operator never guesses which surface the window
  // hears. The redundant-copy rows died with the merge: a stated
  // chip replaces, it never duplicates.
  const overrides = chips.length > 0
  const bus = overrides ? chips : declared
  const total = countOffset + bus.length
  const over = total > cap
  const shown = chips.map((ch, idx) => ({ ch, idx }))
  const candidates = artifacts
    .filter((a) => refGenreOf(a.name, a.url) === kind && !chips.includes(a.name))
    .map((a) => ({ id: a.name, label: a.name, url: a.url }))
  const setChips = (next: string[]): void => onChange(next.length ? next.join(", ") : "")
  const up = REF_UPLOAD_SPEC[kind]
  const disabledTitle = disabledHint ?? "pinned window — this input stands down"
  const tailTitle = countTitle !== undefined
    ? countTitle({ total, cap, over, overrides, declaredCount: declared.length })
    : disabled
      ? disabledTitle
      : over ? `${bus.length} claimed — the bus holds ${cap}` : overrides ? `${bus.length} of ${cap} — this call overrides the card defaults` : declared.length > 0 ? `${bus.length} of ${cap} — the card defaults (add a chip to override)` : `${bus.length} of ${cap}`
  // THE PICK TRANSLATION (the slot grammar): a From-flow pick hands
  // the candidate's URL — the refs wire carries artifact NAMES (the
  // estate re-resolves names each run). A data: URL or bare name
  // rides verbatim.
  const chipOf = (v: string): string => {
    const byUrl = candidates.find((c) => c.url === v)
    return byUrl !== undefined ? byUrl.id : v
  }
  // THE FOREIGN-URL REFUSAL (the upload audit's M1, 2026-10-26): a
  // picked URL that is not this run's artifact committed VERBATIM and
  // died later at the run's refs resolution — the anchor refuses the
  // identical gesture at the seat, so the buckets do too. A bare
  // name still rides (the wire law: the estate re-resolves names).
  // The literal is ONE since the rail-law audit's H2 (2026-10-31):
  // refUtils.ts owns the words, every seat speaks them.
  const commitChip = (v: string): boolean => {
    if (/^https?:\/\//.test(v) && !candidates.some((c) => c.url === v)) {
      setFileError(FOREIGN_URL_REFUSAL)
      return false
    }
    return true
  }
  // THE UPLOAD LAW, ONE ARM (the rail-law audit's H1, 2026-10-31 —
  // the edit and add rows carried two copies of it): cap check with
  // the visible refusal, read as data: URL, replace the chip at
  // `at` or append when null. A drop that neither commits nor
  // refuses is THE SILENT DROP.
  const commitUpload = async (f: File, at: number | null): Promise<void> => {
    if (f.size > up.maxMb * 1024 * 1024) {
      setFileError(`file too large (max ${up.maxMb} MB)`)
      return
    }
    try {
      const data = await readAsDataURL(f)
      setFileError(null)
      setChips(at === null ? [...chips, data] : chips.map((x, idx) => (idx === at ? data : x)))
    } catch {
      setFileError("could not read that file")
    }
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
          <BusCount
            total={total}
            cap={cap}
            over={over}
            overWord={overWord}
            pinned={disabled === true}
            overrides={overrides}
            title={tailTitle}
            testId={countTestId}
          />
        }
      >
        {label}
      </SectionLabel>
      <div className={s.chips} style={disabled ? { opacity: 0.45, pointerEvents: "none" } : undefined}>
        {anchorSlot}
        {/* THE CANON, INHERIT ARM: the card defaults render only
            while this call states no chips of its own — the count
            tail names the arm so the surface never lies. */}
        {!overrides && declared.map((url) => (
          <DeclaredChip key={`declared-${url}`} url={url} kind={kind} />
        ))}
        {shown.map(({ ch: chip, idx: ci }) => (
          <SourceRow
            key={`${chip}-${ci}`}
            label={chip.startsWith("data:") ? `upload ${ci + 1}` : chip}
            kind={kind === "image" ? "image" : "file"}
            accept={accept}
            value={chip.startsWith("data:") ? null : chip}
            onEdit={(v) => {
              if (v === "") setChips(chips.filter((_, x) => x !== ci))
              else if (commitChip(v)) { setFileError(null); setChips(chips.map((x, idx) => (idx === ci ? chipOf(v) : x))) }
            }}
            candidates={candidates}
          loadMedia={fetchMediaLibrary}
            onFile={(f) => { void commitUpload(f, ci) }}
          />
        ))}
        <SourceRow
          label={addLabel ?? `+ ${label.toLowerCase()}`}
          kind={kind === "image" ? "image" : "file"}
          accept={accept}
          value={null}
          onEdit={(v) => { if (v !== "" && commitChip(v)) { setFileError(null); setChips([...chips, chipOf(v)]) } }}
          candidates={candidates}
          loadMedia={fetchMediaLibrary}
          onFile={(f) => { void commitUpload(f, null) }}
        />
      </div>
      {fileError && (
        <span data-testid={errorTestId} className={s.fileErr}>
          {fileError}
        </span>
      )}
    </div>
  )
}

/** THE BUS COUNT FACE (the rail-law audit's H5, 2026-10-31 — the
 *  count tail lived as three hand-rolled spellings): `n/cap`, the
 *  over word, the guard dot, the arm dot. The hover title stays at
 *  the seat (lane law wording); the FACE is one spelling.
 * @param total claimed slots (chips, or inherited defaults, + the
 *  lane's out-of-chips seats like the anchor).
 * @param cap the bus's slot count.
 * @param over total past the cap (red + the over word).
 * @param overWord the over-tail's word ("over cap" / "over bus").
 * @param pinned the door guard's stand-down dot.
 * @param overrides a stated lane replaces the declared defaults.
 * @param title the hover title (the seat's own law wording).
 * @param testId the count face's testid. */
function BusCount({
  total, cap, over, overWord = "over cap", pinned = false, overrides = false, title, testId,
}: {
  total: number
  cap: number
  over: boolean
  overWord?: string
  pinned?: boolean
  overrides?: boolean
  title: string
  testId?: string
}) {
  return (
    <span
      className={over || pinned ? s.refCountOver : undefined}
      title={title}
      data-testid={testId}
    >
      {total}/{cap}{over ? ` ${overWord}` : ""}{pinned ? " · pinned" : ""}{overrides ? " · overrides" : ""}
    </span>
  )
}

/** THE MODS LANE (2026-10-24, the operator's compound report: "at
 *  layer B, i do not see a refmod spot") — reusable reference-mod
 *  packs, engine-side .safetensors under models/refmods/. NOT an
 *  artifact bucket: packs are engine files, never run artifacts, so
 *  there is no upload door and no From-flow candidates — the chips
 *  are free-text PATHS (a picked path commits its stem; the compose
 *  refuses a non-.safetensors entry loud). Same wire form as the
 *  other lanes (the comma string), the canon's override display
 *  (stated lane replaces; absent inherits), same cap tail. */
function ModsBucket({
  label, cap, value, onChange, declared,
}: {
  label: string
  cap: number
  value: string | undefined
  onChange: (next: string) => void
  declared: string[]
}) {
  const chips = splitRefList(value)
  // THE CANON IN THE VIEW (the compose's override law, mirrored):
  // a stated call lane rides INSTEAD of the declared mods; absent
  // inherits. The tail names the arm.
  const overrides = chips.length > 0
  const bus = overrides ? chips : declared
  const over = bus.length > cap
  const setChips = (next: string[]): void => onChange(next.length ? next.join(", ") : "")
  return (
    <div className={s.refRow} data-testid="tl-call-mods-bucket">
      <SectionLabel
        tail={
          <BusCount
            total={bus.length}
            cap={cap}
            over={over}
            overrides={overrides}
            title={over
              ? `${bus.length} claimed — the loader holds ${cap} slots (the compose refuses the overflow loud)`
              : overrides ? `${bus.length} of ${cap} — this call overrides the card mods` : declared.length > 0 ? `${bus.length} of ${cap} — the card mods (add a path to override)` : `${bus.length} of ${cap}`}
            testId="tl-call-mods-count"
          />
        }
      >
        {label}
      </SectionLabel>
      <div className={s.chips}>
        {!overrides && declared.map((path) => (
          <DeclaredChip key={`declared-${path}`} url={path} kind="mod" />
        ))}
        {chips.map((chip, ci) => (
          <span
            key={`${chip}-${ci}`}
            className={s.declaredChip}
            data-testid="tl-call-mod-chip"
            title={`engine-side pack — the compose stems it into the loader (must be .safetensors under models/refmods/)\n${chip}`}
          >
            <span className={s.declaredName}>{chip}</span>
            <button
              type="button"
              className={s.declaredTag}
              data-testid="tl-call-mod-strip"
              onClick={() => setChips(chips.filter((_, x) => x !== ci))}
              title={studioCopy.removePack}
            >
              ×
            </button>
          </span>
        ))}
        {/* THE PATH DOOR: packs are engine-side files, never run
            artifacts — there is no picker and no upload (the wire
            provider owns asset slots; this is free text). The
            compose refuses a non-.safetensors entry loud. */}
        <form
          className={s.modPathForm}
          data-testid="tl-call-mod-form"
          onSubmit={(e) => {
            e.preventDefault()
            const el = e.currentTarget.elements.namedItem("mod-path")
            if (el instanceof HTMLInputElement && el.value.trim() !== "") {
              setChips([...chips, el.value.trim()])
              el.value = ""
            }
          }}
        >
          <input
            type="text"
            name="mod-path"
            placeholder={studioCopy.modPathPlaceholder}
            aria-label={studioCopy.modPathAria}
            data-testid="tl-call-mod-path"
          />
          <button type="submit" data-testid="tl-call-mod-add">+ add</button>
        </form>
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
  // THE EVERY-SEAT LAW (2026-10-26): the image lane's upload errors
  // render beside the lane — never the silent drop.
  const {
    selected, fps, layerA, knobFields, callCardRefs, artifactIndex, linkGroups, guideLinks,
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
          const n = parseSpecNumber(v)
          if (n !== undefined) setCallSpan(i, "start", Math.round(n))
        }}
      />
      <span className={s.spanDash}>–</span>
      <SpecAtom
        f={{ name: `call_${i}_end_frame`, label: `Call ${i} end frame`, type: "number", min: 0, step: 1 }}
        value={c.end_frame}
        placeholder=""
        onEdit={(_, v) => {
          const n = parseSpecNumber(v)
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
        {/* THE IMAGE LANE — the 9-slot bus: anchor first, then the
            ref chips, then the add-row. One grammar, one family —
            ONE bucket since 2026-10-31 (the rail-law audit's S1):
            this lane is RefsBucket's third seat, parameterized (the
            anchor slot rides ahead of the chips, the count counts
            the anchor against the bus, the over-word is the bus's
            own). No inline second copy. */}
        <RefsBucket
          label={studioCopy.imagesBusLabel}
          kind="image"
          cap={IMAGE_BUS_SLOTS}
          countOffset={(c.image ?? "").trim() !== "" ? 1 : 0}
          overWord="over bus"
          countTestId="tl-call-ref-images"
          countTitle={({ total, over, overrides, declaredCount }) =>
            over
              ? `${total} image slots claimed — the bus holds ${IMAGE_BUS_SLOTS} (1 anchor + ${REF_CAPS.images} refs); the compose slices the overflow`
              : `${total} of ${IMAGE_BUS_SLOTS} image slots on the bus${overrides ? " — this call overrides the card defaults" : declaredCount > 0 ? " — the card defaults (add a chip to override)" : ""}`}
          addLabel="+ ref image"
          anchorSlot={
            <>
              <FirstFrameSlot
                testId="tl-first-frame"
                callIndex={i}
                value={c.image}
                onChange={(source) => setCallGuide(i, "image", source)}
                nameToUrl={artifactIndex.byName}
                urlToName={artifactIndex.byUrl}
                links={linkGroups}
              />
              {/* THE ANCHOR TRUTH (2026-10-24): every window rides
                  the reference arm — the i2v first-frame input is
                  an orphaned marker. Slot 1 is the ANCHOR
                  REFERENCE (the strongest identity pull); the
                  first frame generates under its guidance. */}
              <span className={s.spanNote} data-testid="tl-anchor-truth">
                slot 1 = anchor reference — it guides the first frame, it never pins it
              </span>
            </>
          }
          value={c.refs?.images}
          artifacts={refArtifacts}
          onChange={(next) => setCallRefs(i, "images", next)}
          declared={normalizeDeclaredRefs(layerA?.ref_images)}
          errorTestId="tl-call-ref-images-error"
        />
        {/* THE BUS ORDER (2026-09-18, the operator's conviction:
            "it's ref img -> SEAMS for no reason -> Audio -> Videos"
            — the lanes render in the bundle's OWN wire order (images
            1–9, videos, audios) and the seam rides AFTER the bus:
            the seam is the call's join, never a lane between lanes. */}
        <RefsBucket
          label={studioCopy.refVideos}
          kind="video"
          accept="video/*"
          cap={REF_CAPS.videos}
          value={c.refs?.videos}
          artifacts={refArtifacts}
          onChange={(v) => setCallRefs(i, "videos", v)}
          declared={normalizeDeclaredRefs(layerA?.ref_videos)}
          errorTestId="tl-call-ref-videos-error"
        />
        <RefsBucket
          label={studioCopy.refAudios}
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
          errorTestId="tl-call-ref-audios-error"
        />
        {/* THE MODS LANE (2026-10-24): reference-mod packs —
            conditioning tokens through all DiT blocks; spends no
            bundle-bus slot, so it combines with every lane above
            and never flips the window's arm. Path chips only
            (engine-side packs under models/refmods/). */}
        <ModsBucket
          label={studioCopy.refMods}
          cap={REF_CAPS.refmods}
          value={c.refs?.mods}
          onChange={(v) => setCallRefs(i, "mods", v)}
          declared={normalizeDeclaredRefs(layerA?.ref_mods)}
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
        `image` IS the first-frame source. The clip/audio seats
        ride GuideSlot — the SourceRow grammar (the rail-law
        audit's square gap b, 2026-10-31: the datalist hand-roll
        died; one grammar with every source in the system). */}
    <div className={s.guidesRow}>
      {(["clip", "audio"] as const).map((kind) => {
        const track = VIDEO_TIMELINE_TRACKS.find((t) => t.uuid === kind)!
        return (
          <GuideSlot
            key={kind}
            kind={kind}
            callIndex={i}
            value={c[kind]}
            onChange={(source) => setCallGuide(i, kind, source)}
            nameToUrl={artifactIndex.byName}
            urlToName={artifactIndex.byUrl}
            links={kind === "clip" ? guideLinks.clip : guideLinks.audio}
            trackColorHex={trackColor(track)}
          />
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
