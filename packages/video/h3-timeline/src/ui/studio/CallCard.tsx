/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import {
  Button, DisclosureRow, IconCloseOutlineRegular, IconSlidersTwoOutlineRegular, ImageLightbox, Pill,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { useState } from "react"
import { OverlayKnob, SectionLabel, SpecAtom, Tip, fetchMediaLibrary, isImageUrl } from '@melite/card-base/client'
import { cn } from '@melite/card-base/client'
import s from "./studio.module.css"
import { trackColor,  GUIDE_KINDS, KNOB_ORDER, SECOND_PASS_KNOBS, VIDEO_TIMELINE_TRACKS } from "./docModel.ts"
import type { ReactNode } from "react"
import type { DocCall } from "./docModel.ts"
import type { GuideKind } from "./docModel.ts"
import { readAsDataURL } from '@melite/card-base/client'
import { SourceRow } from '@melite/card-base/client'
import { SeamControls } from "./CallFrameSubcard.tsx"
import { CallCardPrompt } from "./CallCardPrompt.tsx"
import { FOREIGN_URL_REFUSAL, REF_UPLOAD_SPEC, declaredShortName, displaySource, estateMediaChip } from "./refUtils.ts"
import { parseFrameEdit } from "./docGrid.ts"
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

/** THE SEAT-HELD LAW LINES (the dictionary's own bound): computed
 *  hover titles narrating their lane's rule with live numbers are
 *  one-of-a-kind per seat — the wording lives HERE, never in the
 *  dictionary. Each rides a call (opaque to the copy census, as any
 *  locale lookup is) so the static faces stay the census's subject.
 *  No `: string` return annotation on purpose: the census descends
 *  explicit string returns in .tsx, which would re-flag these lines;
 *  the template infers string regardless. Names dodge the census's
 *  copy-suffixes for the same reason (the wording, not the name, is
 *  the law). */
/** The generic bucket's count-tail hover (bus holds / overrides / defaults). */
function refsTailLine(info: { count: number; cap: number; over: boolean; overrides: boolean; declaredCount: number }) {
  if (info.over) return `${info.count} claimed — the bus holds ${info.cap}`
  if (info.overrides) return `${info.count} of ${info.cap} — this call overrides the card defaults`
  if (info.declaredCount > 0) return `${info.count} of ${info.cap} — the card defaults (add a chip to override)`
  return `${info.count} of ${info.cap}`
}
/** The mods lane's count-tail hover (loader slots / card mods). */
function modsTailLine(info: { count: number; cap: number; over: boolean; overrides: boolean; declaredCount: number }) {
  if (info.over) return `${info.count} claimed — the loader holds ${info.cap} slots (the compose refuses the overflow loud)`
  if (info.overrides) return `${info.count} of ${info.cap} — this call overrides the card mods`
  if (info.declaredCount > 0) return `${info.count} of ${info.cap} — the card mods (add a path to override)`
  return `${info.count} of ${info.cap}`
}
/** The mods lane's CLOSED-UPLOAD REFUSAL (the 2026-10-24 engine-side
 *  files law — a seat-held law wording like modsTailLine above: the
 *  lane's own rule, named per gesture; the dictionary would only
 *  rename it). The upload door stays closed — packs are engine files
 *  under models/refmods/, never run artifacts, so a file gesture can
 *  only refuse: pick from the engine's listing or type the path. */
/** The card header's span hover (frames + seam-carried delivery). */
function cardSpanLine(start: number, end: number, delivered: number) {
  return `frames ${start}–${end} (end exclusive) — delivered ${delivered}f after the seam's carry`
}

/** A CARD-LEVEL reference chip (the Layer A/B canon, 2026-10-24):
 *  display-only — the studio never writes the declared surface (the
 *  agent path owns it), so there is no edit door to lie about. It
 *  renders only while this call's lane states no chips (the inherit
 *  arm); a stated lane REPLACES the defaults. The full URL rides
 *  the title; a dead URL shows its broken thumb honestly. */
function DeclaredChip({ url, kind }: { url: string; kind: "image" | "video" | "audio" | "mod" }) {
  const short = declaredShortName(url)
  const [open, setOpen] = useState(false)
  return (
    <span
      className={s.declaredChip}
      data-testid="tl-declared-ref"
      title={studioCopy.declaredChipTitle(url)}
    >
      {/* (D2, operator 2026-11-06: "REF MODs must preview an IMAGE
          via the DSH primitive") — the thumb is the estate's own
          glyph; the PREVIEW is the DSH ImageLightbox (the shipped
          primitive: body portal, Escape/backdrop close, focus
          restore). The judge is isImageUrl (one spelling,
          card-base's own), so a mod lane carrying image currency
          previews identically to a reference lane. */}
      {isImageUrl(url) ? (
        <Button
          type="button"
          variant="ghost"
          className={s.declaredThumbBtn}
          aria-label={studioCopy.imagePreviewAria(short)}
          onClick={() => { setOpen(true) }}
        >
          <img src={url} alt={short} className={s.declaredThumb} />
        </Button>
      ) : null}
      <span className={s.declaredName}>{short}</span>
      <span className={s.declaredTag}>{studioCopy.declaredCardTag}</span>
      {open ? (
        <ImageLightbox
          src={url}
          alt={short}
          labels={{ dialog: studioCopy.imagePreviewDialog, close: studioCopy.imagePreviewClose }}
          onClose={() => { setOpen(false) }}
        />
      ) : null}
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
  label, kind, accept, cap, countOffset = 0, overWord = studioCopy.overCapTail, countTestId, countTitle,
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
   * image bus: the reference lanes, one grammar each). */
  cap: number
  /** Seats the count's total against the cap when a lane carries a
   * slot OUTSIDE the chips (the image bus counts its anchor). */
  countOffset?: number
  /** The over-cap tail's word (the dictionary's overCapTail — the
   *  image bus overrides with overBusTail). */
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
  const disabledTitle = disabledHint ?? studioCopy.pinnedStanddown
  const tailTitle = countTitle !== undefined
    ? countTitle({ total, cap, over, overrides, declaredCount: declared.length })
    : disabled
      ? disabledTitle
      : refsTailLine({ count: bus.length, cap, over, overrides, declaredCount: declared.length })
  // THE PICK TRANSLATION (the slot grammar): a From-flow pick hands
  // the candidate's URL. THE NAME WAS NEVER CURRENCY (J2, the
  // refs-mods journey audit 2026-10-16: three comments claimed "the
  // estate re-resolves names each run" — no seat does). An own-run
  // name (a gallery filename, extension-bearing) passed the wiring
  // wall's staged-artifact carve-out and died at the engine's
  // /prompt; a cross-card name (a stage title, no extension)
  // refused 'bad-value' at the wall naming the whole input-dir
  // enum. THE URL IS THE ONE SPELLING every downstream seat stages
  // loudly — an estate run-media URL commits in its canonical live
  // spelling (same law as the estate-media pick, refUtils.ts); a
  // data: URL or bare name rides verbatim.
  const chipOf = (v: string): string => {
    const media = estateMediaChip(v)
    if (media !== null) return media
    const byUrl = candidates.find((c) => c.url === v)
    if (byUrl !== undefined) return byUrl.id
    // (2026-11-05) an estate-media pick commits in its canonical
    // live spelling — one chip form for the wire, the display, and
    // the run's media heal.
    return v
  }
  // THE DISPLAY MAP (2026-11-04, the stale-✕ cure's bucket arm): the
  // one displaySource spelling every source seat rides — a data:
  // chip renders its OWN thumb (the old `startsWith("data:") ? null`
  // painted PLUS over a full slot with NO ✕: the upload had
  // committed, the square denied it held anything), a named chip
  // resolves through the FULL artifacts list (never `candidates` —
  // candidates EXCLUDE the already-picked chips by design, so a
  // named chip would never resolve and always fall to the held
  // face), a miss degrades to the held face (the raw name, detach
  // armed). DISPLAY ONLY — the wire keeps names (the currency law).
  const chipUrl = new Map(artifacts.map((a) => [a.name, a.url] as const))
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
            key={`chip-${ci}`}
            label={chip.startsWith("data:") ? studioCopy.uploadChipLabel(ci + 1) : chip}
            kind={kind === "image" ? "image" : "file"}
            accept={accept}
            value={displaySource(chip, chipUrl)}
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
          ariaLabel={addLabel ?? `+ ${label.toLowerCase()}`}
          // (operator 2026-11-05, the FOURTH time: the bucket label
          // already names the kind — a second visible "+ image" under
          // "Images" is a double label. The add face is the square's
          // glyph alone; the label stays the accessible name.)
          hideLabel
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
 * @param overWord the over-tail's word (the dictionary's overCapTail).
 * @param pinned the door guard's stand-down dot.
 * @param overrides a stated lane replaces the declared defaults.
 * @param title the hover title (the seat's own law wording).
 * @param testId the count face's testid. */
function BusCount({
  total, cap, over, overWord = studioCopy.overCapTail, pinned = false, overrides = false, title, testId,
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
      {total}/{cap}{over ? ` ${overWord}` : ""}{pinned ? studioCopy.countPinnedTail : ""}{overrides ? studioCopy.countOverridesTail : ""}
    </span>
  )
}

/** The mods seat's not-media face (the square's OWN pre-validation
 *  voice — the compose keeps its loud refusal for the entries the
 *  wire actually carries; this face names a refused DROP at the
 *  gesture, in the seat's words, never the compose's text). */
function modsNotMediaLine(entry: string) {
  return `${entry} is not media — drop an image, video, or audio file (the system bakes the pack); pre-baked .safetensors stems ride the engine listing`
}

/** (DEAD 2026-10-16, the square-grammar cure: the chip that floated
 *  its own thumbnail OVER the square is gone — a committed image
 *  renders INSIDE its SourceRow square like every input lane, and
 *  the square's own face owns the lightbox. ModChipThumb deleted,
 *  never revived.) */

/** THE MODS LANE (2026-10-24, the operator's compound report: "at
 *  layer B, i do not see a refmod spot") — reusable reference-mod
 *  packs. THE ANY-MEDIA LAW (operator, 2026-11-06): the seat takes
 *  ANY media kind — stills, videos, audio — and THE SYSTEM HANDLES
 *  THE CONVERSION (compose wires the Create H3 RefMod node; audio
 *  rides its own extractor). The .safetensors-only square was the
 *  regression (4f2342f46 → ce79f052a), never the law: pre-baked
 *  .safetensors stems under models/refmods/ stay legal REUSE
 *  currency through the engine listing (the loader's combo).
 *  REFMOD IS NOT REFERENCE: its own lane and its own mechanic —
 *  reference tokens through all DiT blocks, no bundle-bus slot.
 *  THE SQUARE: the pick arm commits the engine listing's stems in
 *  the wire form the compose stems (`stem.safetensors`); the file
 *  arm ACCEPTS any media (read → data: chip; the run's staging walk
 *  bakes it into the engine's input tree); From media boards the
 *  estate's live media (canonical /melite-media paths). Same wire
 *  form as the other lanes (the comma string), the canon's override
 *  display (stated lane replaces; absent inherits), same cap tail. */
function ModsBucket({
  label, cap, value, onChange, declared, listing,
}: {
  label: string
  cap: number
  value: string | undefined
  onChange: (next: string) => void
  declared: string[]
  /** THE LISTING DOOR'S ROWS (slice 4's door seam): the engine's own
   *  models/refmods stems — the MiniMaxH3RefModsLoader combo's facts
   *  off the live /object_info doc, served through deps by the
   *  estate's wire door. Empty (the interim, door law (3)): the
   *  picker shows its honest-empty face and the manual path
   *  fallback is the only write — never a hand list, never a
   *  non-engine fetch. */
  listing?: readonly string[]
}) {
  const [fileError, setFileError] = useState<string | null>(null)
  const chips = splitRefList(value)
  // THE CANON IN THE VIEW (the compose's override law, mirrored):
  // a stated call lane rides INSTEAD of the declared mods; absent
  // inherits. The tail names the arm.
  const overrides = chips.length > 0
  const bus = overrides ? chips : declared
  const over = bus.length > cap
  const setChips = (next: string[]): void => onChange(next.length ? next.join(", ") : "")
  // THE DOOR'S CANDIDATE SET (listing → candidates): the PRE-BAKED
  // stems the engine itself enumerates, already-committed stems
  // excluded (the buckets' own no-duplicate-offer law), each row
  // carrying the WIRE FORM the compose consumes — the pick commits
  // `stem.safetensors`, exactly the reuse arm's loader currency.
  const held = new Set(chips.map((chip) => {
    const base = chip.split(/[\\/]/).pop() as string
    return base.endsWith(".safetensors") ? base.slice(0, -".safetensors".length) : base
  }))
  const candidates = (listing ?? [])
    .filter((stem) => !held.has(stem))
    .map((stem) => ({ id: stem, label: stem, url: `${stem}.safetensors` }))
  // THE DISPLAY MAP (the refs canon's spelling): the mods seat holds
  // stems, data: chips, and estate-media spellings — no run-artifact
  // names — so the map rides empty and displaySource degrades
  // honestly (data: → the square's thumb, a stem → the held face,
  // estate media → the estate's servable url via SourceRow's own
  // mirror). DISPLAY ONLY — the wire keeps its currency.
  const chipUrl = new Map<string, string>()
  // THE PICK TRANSLATION (the refs seat's own grammar): a listing
  // pick commits the SUFFIXED stem (the wire form the compose's
  // classifier stems — `pack.safetensors`, never the bare stem);
  // an estate-media pick commits in its canonical live spelling;
  // anything else rides verbatim (the compose's classifier refuses
  // junk LOUD — that law stays compose-side).
  const chipOfListing = (v: string): string => {
    const byUrl = candidates.find((c) => c.url === v)
    if (byUrl !== undefined) return byUrl.url
    const media = estateMediaChip(v)
    return media !== null ? media : v
  }
  // THE FOREIGN-URL REFUSAL (the refs seat's M1 law): a picked URL
  // that is neither a candidate nor estate media refuses HERE, at
  // the gesture — never mid-run.
  const commitListingChip = (v: string): boolean => {
    if (/^https?:\/\//.test(v) && !candidates.some((c) => c.url === v) && estateMediaChip(v) === null) {
      setFileError(FOREIGN_URL_REFUSAL)
      return false
    }
    return true
  }
  // THE UPLOAD LAW, ANY MEDIA (the 2026-11-06 cure): the file arm
  // reads ANY media kind (the family's own cap out of
  // REF_UPLOAD_SPEC — image 20 / video 24 / audio 16 MB) into a
  // data: chip; the run's staging walk uploads it into the engine's
  // input tree and the compose's creator node bakes the pack. A
  // non-media file refuses at the gesture (the seat's own face).
  // (2026-10-16, THE SQUARE GRAMMAR: `at` rides like the refs
  // seat's spine — a drop on an EXISTING square replaces that
  // entry; the + square appends. The floating chip is dead.)
  const commitUpload = async (f: File, at: number | null): Promise<void> => {
    const fam = f.type.startsWith("image/") ? "image" : f.type.startsWith("video/") ? "video" : f.type.startsWith("audio/") ? "audio" : null
    if (fam === null) { setFileError(modsNotMediaLine(f.name)); return }
    const up = REF_UPLOAD_SPEC[fam]
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
    <div className={s.refRow} data-testid="tl-call-mods-bucket">
      <SectionLabel
        tail={
          <BusCount
            total={bus.length}
            cap={cap}
            over={over}
            overrides={overrides}
            title={modsTailLine({ count: bus.length, cap, over, overrides, declaredCount: declared.length })}
            testId="tl-call-mods-count"
          />
        }
      >
        {label}
      </SectionLabel>
      {/* (2026-11-05, "WHAT IS A REFMOD PACK? WHERE IS THE INPUT?")
          — the bucket names its currency; the input IS the square
          row below (the + glyph — same grammar as every bucket). */}
      <span className={s.laneHint} data-testid="tl-call-mods-hint">
        {studioCopy.refModsHint}
      </span>
      <div className={s.chips}>
        {!overrides && declared.map((path) => (
          <DeclaredChip key={`declared-${path}`} url={path} kind="mod" />
        ))}
        {/* THE SQUARE GRAMMAR (operator 2026-10-16: "THE REFMOD IS
            NOT APPEARING LIKE THE OTHER INPUT SQUARES. INSTEAD OF
            GOING INSIDE THE SQUARE IF IT IS AN IMAGE, IT FLOATS ON
            TOP") — every committed entry renders as its own
            value-carrying SourceRow, THE REFS SEAT'S CANON (one
            grammar, every bucket): the image goes INSIDE the square
            (the square's own thumb face), the ✕ strips THAT entry,
            a pick or drop on an existing square REPLACES it, and the
            + square below stays the add verb. The floating
            declaredChip span — a thumbnail hovering over an empty
            square — is dead. Stems keep the square's held face (a
            .safetensors stem has no thumb; the raw name with detach
            armed is the honest face). */}
        {chips.map((chip, ci) => (
          <SourceRow
            key={`modchip-${ci}`}
            label={chip.startsWith("data:") ? studioCopy.uploadChipLabel(ci + 1) : declaredShortName(chip)}
            kind="file"
            accept="image/*,video/*,audio/*"
            value={displaySource(chip, chipUrl)}
            onEdit={(v) => {
              if (v === "") setChips(chips.filter((_, x) => x !== ci))
              else if (commitListingChip(v)) { setFileError(null); setChips(chips.map((x, idx) => (idx === ci ? chipOfListing(v) : x))) }
            }}
            candidates={candidates}
            loadMedia={fetchMediaLibrary}
            onFile={(f) => { void commitUpload(f, ci) }}
          />
        ))}
        {/* (operator 2026-11-05: "WHY IS IT NOT AN UPLOAD SQUARE?")
            — the add face is the SQUARE grammar every input lane
            rides (SourceRow: InputSquare + the picker): the picker
            lists the engine's own refmods stems (the listing door),
            From media boards the estate's live media, and the file
            arm ACCEPTS ANY MEDIA (the any-media law, 2026-11-06 —
            the system handles the conversion). */}
        <SourceRow
          label={`+ ${label.toLowerCase()}`}
          ariaLabel={`+ ${label.toLowerCase()}`}
          kind="file"
          accept="image/*,video/*,audio/*"
          hideLabel
          candidates={candidates}
          loadMedia={fetchMediaLibrary}
          onEdit={(v) => {
            if (v !== "" && commitListingChip(v)) { setFileError(null); setChips([...chips, chipOfListing(v)]) }
          }}
          onFile={(f) => { void commitUpload(f, null) }}
        />
      </div>
      {fileError && (
        <span data-testid="tl-call-mods-error" className={s.fileErr}>
          {fileError}
        </span>
      )}
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
  // THE LISTING DOOR'S SEAT (slice 4, design §B): the mods pick's
  // candidates are the engine's own refmods stems, served through
  // deps by the estate's wire door (the /object_info combo read —
  // the door receipt lives in the slice report). Absent (the
  // interim): the honest-empty picker — the estate-media and OS-file
  // doors still ride (the any-media law); the manual path form is
  // DEAD (one square, one grammar).
  // door law (3), never a hand list, never a non-engine fetch. The
  // optional row lands on CallCardDeps with the panel lane's wiring.
  const modsListing = (deps as { modsListing?: readonly string[] }).modsListing
  // The knob fold's open state (the DisclosureRow law: CONTROLLED —
  // the raw <details> was uncontrolled; slice S2 of the pattern
  // campaign). Must sit above the focused-mode early return
  // (hook law).
  const [knobsOpen, setKnobsOpen] = useState(false)
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
          {studioCopy.modelCallHead(i)}
        </span>
        <span
          className={s.cardSpan}
          title={cardSpanLine(c.start_frame, c.end_frame, deliveredFrames(c, i))}
        >
          {studioCopy.spanReadout(c.start_frame, c.end_frame, ((c.end_frame - c.start_frame) / fps).toFixed(1), (deliveredFrames(c, i) / fps).toFixed(1))}
        </span>
        {activeKnobs > 0 && (
          // THE KNOB TAG, ONE GRAMMAR (audit b's F7): the count badge
          // rides the DSH Pill (the StaleBadge→Pill precedent — the
          // static face; no onClick renders the span spelling).
          <Pill className={s.knobTag}>
            {studioCopy.knobTag(activeKnobs)}
          </Pill>
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
            aria-label={studioCopy.deleteCallAria(i)}
            className={s.delBtn}
          >
            <IconCloseOutlineRegular className={s.sz10} /> {studioCopy.deleteAction}
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
      <span className={s.spanLabel}>{studioCopy.spanWord}</span>
      <SpecAtom
        f={{ name: `call_${i}_start_frame`, label: studioCopy.callStartLabel(i), type: "number", min: 0, step: 1 }}
        value={c.start_frame}
        placeholder=""
        onEdit={(_, v) => {
          const n = parseFrameEdit(v)
          if (n !== undefined) setCallSpan(i, "start", n)
        }}
      />
      <span className={s.spanDash}>–</span>
      <SpecAtom
        f={{ name: `call_${i}_end_frame`, label: studioCopy.callEndLabel(i), type: "number", min: 0, step: 1 }}
        value={c.end_frame}
        placeholder=""
        onEdit={(_, v) => {
          const n = parseFrameEdit(v)
          if (n !== undefined) setCallSpan(i, "end", n)
        }}
      />
      {/* (operator 2026-11-05: the span note "made zero sense" and
          belongs under the (i) icon anyway) — the inline jargon span
          dies; the ONE fact rides the Tip seat, plain words. */}
      <Tip tip={studioCopy.spanNote}>
        <span aria-hidden="true" className={s.spanInfo} data-testid="tl-span-info">ⓘ</span>
      </Tip>
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
      <SectionLabel>{studioCopy.refsHead}</SectionLabel>
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
          // (operator 2026-11-05: "WHY IS THIS STILL HERE WHEN WE
          // CHANGED FROM FIRST FRAME TO KEYFRAME?") — the anchor-slot
          // face is DEAD: anchors are KEYFRAME PINS on the timeline's
          // lane (endpoint pins compose into the bundle's
          // input_1/input_2 seats; a stated seat still wins — the
          // compose's own canon). This lane is the reference bus:
          // the image-identity slots, no anchor grammar, no slot-1
          // language.
          cap={REF_CAPS.images}
          overWord={studioCopy.overBusTail}
          countTestId="tl-call-ref-images"
          countTitle={({ total, over, overrides, declaredCount }) =>
            over
              ? `${total} image slots claimed — the bus holds ${REF_CAPS.images}; the compose slices the overflow`
              : `${total} of ${REF_CAPS.images} image slots on the bus${overrides ? " — this call overrides the card defaults" : declaredCount > 0 ? " — the card defaults (add a chip to override)" : ""}`}
          addLabel={studioCopy.addRefImage}
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
          addLabel={studioCopy.addRefVideo}
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
          addLabel={studioCopy.addRefAudio}
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
          listing={modsListing}
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

    {/* (operator 2026-11-05: "clip guide / audio guide — WHAT IS
     * THAT THERE FOR???") — the guide slots are
     * DEAD FACES: a clip/audio guide never had a compose meaning in
     * the keyframe era. (2026-10-16, audit 3f0b7c1a ui-truth-gap #3:
     * this comment used to CLAIM docCalls dropped them at hydration
     * while hydration actually carried them and the walk admitted
     * them — comment-blessed silence. It is true now: docCalls drops
     * both with a named warn, GUIDE_KINDS carries only the image
     * guide, and CALL_KEYS refuses a newly stated one at the schema's
     * call walk.) The timeline's own lanes own conditioning — image
     * pins on the keyframe lane, audio on the D-M-E lanes. The call
     * editor carries the reference bus + the seam + the knobs;
     * phantom seats that compose nothing die. */}

    {/* Call knobs — the Layer B REPLACE fold: per-call
        overrides of the run's global values. THE OVERRIDE LAYER
        (hour 22): the generic OverlayKnob over the SERVED envelope's
        SpecField walk — an unset knob shows EXACTLY what composes
        (the run's stamp, else the schema's own default the admission
        gate fills; 'inherit' only when no schema truth exists). The
        backend's CALL_KNOB_KEYS vocabulary — audio_mode is
        recipe-level and never appears here. The DisclosureRow is
        the estate's ONE fold grammar (pattern campaign S2): the
        sliders glyph is the knobs semantic — the same glyph the
        card-base studio's lab fold carries; the active count rides
        collapsedContent (kept while open = the old badge seat). */}
    <DisclosureRow
      className={s.knobFold}
      icon={<IconSlidersTwoOutlineRegular size={14} />}
      title={studioCopy.knobsHead}
      open={knobsOpen}
      expandable
      expandOnRowClick
      onToggle={() => { setKnobsOpen((v) => !v) }}
      keepContentWhenOpen
      collapsedContent={activeKnobs > 0 ? (
        // THE KNOB COUNT, ONE GRAMMAR (audit b's F7 — the Pill, like
        // the header tag above).
        <Pill className={s.knobCount}>{activeKnobs}</Pill>
      ) : null}
    >
      <div className={s.knobGrid}>
        {KNOB_ORDER.map((knob) => {
          // THE MASTER-GATED NINE (calls-stanza audit #3, 2026-10-16):
          // sharpen_*/interp_* read ONLY inside the post chain, whose
          // only door is the DOC-level second_pass_enabled master — a
          // switch the call plane cannot state. Offered with the
          // master off, they sold dead knobs: stated, seen by no
          // node, silent. The rows ride only when the master opens
          // the chain (SECOND_PASS_KNOBS, the compose's own law).
          if (SECOND_PASS_KNOBS.has(knob) && (layerA as { second_pass_enabled?: boolean } | undefined)?.second_pass_enabled !== true) return null
          return (
            <OverlayKnob
              key={knob}
              name={knob}
              field={knobFields[knob]}
              value={c.knobs?.[knob]}
              base={(layerA as unknown as Record<string, unknown> | undefined)?.[knob]}
              ariaLabel={studioCopy.callKnobAria(i, knob)}
              onEdit={(v) => setCallKnob(i, knob, v)}
            />
          )
        })}
      </div>
    </DisclosureRow>
  </div>
  )
}
