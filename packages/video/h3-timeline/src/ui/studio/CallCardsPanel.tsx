/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 *
 * DEFECT B (operator 2026-11-06): the keyframe editor is its OWN
 * STANDALONE SUBVIEW — the CALL modal submenu's grammar, mirrored.
 * When kfView is open the rail renders the keyframe panel ALONE:
 * Layer A (the run fold) and Layer B (the call cards) are banned
 * from rendering alongside it. Inside the subview: the add door is
 * an UPLOAD ICON beside the title (the audio-lane grammar — never a
 * timeline-bar lane icon), and the rows work like the audio upload
 * inputs — a pick icon per row, NO input image square.
 */
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import { EmptyState } from '@melite/card-base/client'
import { RailBackButton } from './RailBackButton'
import { SectionLabel, Tip, type SpecField } from '@melite/card-base/client'
import { readAsDataURL, Upload, useSquareProvider } from '@melite/card-base/client'
import s from "./studio.module.css"
import type { CallRefs, DocCall, DocKeyframe, LayerA, GuideKind } from "./docModel.ts"
import { CallCard } from "./CallCard.tsx"
import { FOREIGN_URL_REFUSAL, REF_READ_ERROR, refUploadError, classifyImageSrc, fitImageToAspect, loadImageMedia } from "./refUtils.ts"
import type { LinkArtifact } from "./refUtils.ts"
import type { TimelineSelection } from "./useViewSelection.ts"
import { useRef, useState } from "react"
import type * as React from "react"
import { studioCopy } from "./studioCopy.ts"

/** (2026-11-06, the one-spelling law) the image loader + row RE ride
 *  refUtils now — the strip pane's lane door and this subview door
 *  judge identically (the twins this panel used to carry are dead).
 *  The module-scope identity law holds: refUtils' export IS the one
 *  identity (THE DEP LAW — never an inline arrow at the provider). */

/** Handlers + bags the call-card tree needs (all owned by the tenant). */
export interface CallCardDeps {
  selected: TimelineSelection | null
  fps: number
  /** The run's Layer A — feeds the knob fold's inherited ghosts
   *  (the 2026-09-15 "inherit" wall: an unset knob shows the value
   *  it inherits from the run, never the bare word "inherit"). */
  layerA?: LayerA
  /** THE REFMODS LISTING (the estate-side door's feed, 2026-11-05):
   *  the H3 refmods loader's own mod_N combo stems, served by the
   *  manage door `refmods_list` and loaded once by the tenant. Absent
   *  or empty (manage remote not mounted, door refused, engine down,
   *  pack absent): the honest-empty picker + the manual path fallback
   *  — the mods square's own law, never a synthetic list. */
  modsListing?: readonly string[]
  /** THE OVERRIDE LAYER'S SCHEMA TRUTH (hour 22): the served
   *  envelope's SpecField walk keyed by wire name — the knob fold
   *  rides the generic OverlayKnob on it. No per-card projection
   *  (the old knob-spec.gen silently dropped `default` and the face
   *  said "inherit" while the admission gate composed 12). Owned by
   *  the tenant, fetched once. */
  knobFields: Record<string, SpecField>
  callCardRefs: { current: (HTMLDivElement | null)[] }
  artifactIndex: { byName: Map<string, string>; byUrl: Map<string, string> }
  linkGroups: LinkArtifact[]
  /** The clip/audio guides' From-flow rows, by genre (GuideSlot). */
  guideLinks: { clip: LinkArtifact[]; audio: LinkArtifact[] }
  refArtifacts: Array<{ name: string; url: string }>
  handlePromptDelete: (id: string) => void
  handlePromptUpdate: (id: string, text: string) => void
  enhanceOne: (key: string, text: string, apply: (t: string) => void) => void
  undoEnhance: (key: string, apply: (t: string) => void) => void
  enhancing: Record<string, boolean>
  enhanceErr: Record<string, string | null>
  enhanceUndo: Record<string, string>
  setCallSpan: (i: number, which: "start" | "end", frame: number) => void
  setCallGuide: (i: number, kind: GuideKind, source: string) => void
  setCallTransition: (i: number, t: "extend" | "cut") => void
  setCallRefs: (i: number, key: keyof CallRefs, value: string) => void
  setCallKnob: (i: number, key: string, value: number | string | boolean | undefined) => void
  /** THE PIN MAP (door-guard UX arm): call indexes whose windows
   *  carry a dialogue/sfx clip — their Ref audios bucket grays out
   *  (the pinned window owns its audio conditioning). */
  voicePinnedCalls?: Set<number>
  /** THE BLOCKER (2026-09-22): any D-M-E clip present → the Ref
   *  audios bucket grays out on EVERY call (the timeline owns the
   *  model's audio inputs while it carries clips). */
  audioClipsPresent?: boolean
}

/** Layer B rail: compact call rows ⇄ focused call editor + the
 *  standalone keyframes subview (defect B, 2026-11-06). */
export function CallCardsPanel({
  calls, selected, setSelected, fps, sourceOptions, keyframes,
  handleKeyframeMove, handleKeyframeDelete, setKeyframeImage,
  kfView, exitKfView, addKeyframeWithImage, playheadDocFrame,
  deps,
}: {
  calls: DocCall[]
  selected: TimelineSelection | null
  setSelected: (s: TimelineSelection | null) => void
  fps: number
  sourceOptions: Array<{ title: string; name: string }>
  keyframes: DocKeyframe[]
  handleKeyframeMove: (id: string, frame: number) => void
  handleKeyframeDelete: (id: string) => void
  setKeyframeImage: (i: number, image: string) => void
  /** THE KEYFRAMES SUBVIEW GATE (defect B): true = the rail renders
   *  the keyframe panel ALONE — Layer A (the run fold) and Layer B
   *  (the call cards) are banned from rendering alongside it. */
  kfView: boolean
  /** Leaves the keyframes subview (the back button's verb). */
  exitKfView: () => void
  /** THE ADD DOOR'S COMMIT: pin + image in ONE write at the
   *  playhead (the strip's lane-icon law, moved to the title — the
   *  bar lane icon is dead, operator 2026-11-06). */
  addKeyframeWithImage: (image: string, frame: number) => string
  /** The playhead as a DOC frame (docFromFilm(frameIdx)) — the add
   *  door's pin target, owned by the tenant. */
  playheadDocFrame: number
  deps: CallCardDeps
}) {
  // THE EVERY-SEAT LAW at the kf source: an upload/pick refusal is
  // VISIBLE beside the row (keyed by row), never a silent drop.
  const [kfUploadErrors, setKfUploadErrors] = useState<Record<number, string | null>>({})
  const setKfUploadError = (i: number, err: string | null): void => {
    setKfUploadErrors((prev) => ({ ...prev, [i]: err }))
  }
  // THE ADD DOOR'S OWN refusal seat (keyed -1 — beside the title,
  // never on a row that did not gesture).
  const [kfAddError, setKfAddError] = useState<string | null>(null)
  // THE ROW TARGET (the audio lanes' own law, verbatim): one picker
  // provider, the gesturing row's index rides a ref — never a
  // provider per row inside the map.
  const pickRow = useRef(0)
  const kfField = (): SpecField => ({ name: "keyframe:frame", label: studioCopy.imageGuideLane, type: "file" })
  // From-flow rows: this run's image artifacts (the pick grammar's
  // flow arm — the URL→NAME translation is the system's law, the
  // NAME is what _resolveSource resolves at run time).
  const flowRows = sourceOptions.map((o) => ({
    id: o.name,
    label: `${o.title} · ${o.name}`,
    url: deps.artifactIndex.byName.get(o.name) ?? "",
  }))
  /** The shared commit spine: estate media canonical, the run's own
   *  artifact URLs, data: chips ride verbatim — foreign URLs refuse.
   *  @returns the image value to commit, or null when refused (the
   *  refusal's words ride the caller's error seat). */
  // ── THE ADD DOOR (beside the subview's title — the audio-lane
  // grammar: an upload icon that opens the three-entry picker; the
  // pin lands at the PLAYHEAD with its image in one write). ────────
  const { square: kfAddSquare, wireMenu: kfAddMenu } = useSquareProvider(
    (_name, v) => {
      if (typeof v !== "string" || v === "") return
      const got = classifyImageSrc(v, deps.artifactIndex.byUrl)
      if ("refusal" in got) { setKfAddError(got.refusal); return }
      setKfAddError(null)
      // (D1) shrink-to-fit into the movie's aspect before the pin
      // lands — the engine would cover-crop an off-aspect insert
      void fitImageToAspect(got.image, deps.layerA?.width ?? 1344, deps.layerA?.height ?? 768)
        .then((fitted) => { addKeyframeWithImage(fitted, playheadDocFrame) })
    },
    {
      candidates: flowRows,
      loadMedia: loadImageMedia,
      accept: "image/*",
      onFile: (file: File) => {
        const err = refUploadError(file, "image")
        if (err !== null) { setKfAddError(err); return }
        void (async () => {
          try {
            const raw = await readAsDataURL(file)
            addKeyframeWithImage(
              await fitImageToAspect(raw, deps.layerA?.width ?? 1344, deps.layerA?.height ?? 768),
              playheadDocFrame,
            )
            setKfAddError(null)
          } catch {
            setKfAddError(REF_READ_ERROR)
          }
        })()
      },
    },
  )
  // ── THE ROW PICKER (one provider; the gesturing row rides the
  // ref — the audio lanes' own spelling). NO input image square:
  // the row's source verb is an icon that opens the same picker. ──
  const { square: kfRowSquare, wireMenu: kfRowMenu } = useSquareProvider(
    (_name, v) => {
      if (typeof v !== "string" || v === "") return
      const i = pickRow.current
      const got = classifyImageSrc(v, deps.artifactIndex.byUrl)
      if ("refusal" in got) { setKfUploadError(i, got.refusal); return }
      // (D1) a row swap is an insert into the movie — same fit law
      void fitImageToAspect(got.image, deps.layerA?.width ?? 1344, deps.layerA?.height ?? 768)
        .then((fitted) => { setKeyframeImage(i, fitted); setKfUploadError(i, null) })
    },
    {
      candidates: flowRows,
      loadMedia: loadImageMedia,
      accept: "image/*",
      onFile: (file: File) => {
        const i = pickRow.current
        const err = refUploadError(file, "image")
        if (err !== null) { setKfUploadError(i, err); return }
        void (async () => {
          try {
            const raw = await readAsDataURL(file)
            setKeyframeImage(i, await fitImageToAspect(raw, deps.layerA?.width ?? 1344, deps.layerA?.height ?? 768))
            setKfUploadError(i, null)
          } catch {
            setKfUploadError(i, REF_READ_ERROR)
          }
        })()
      },
    },
  )
  // ── THE STANDALONE KEYFRAMES SUBVIEW (defect B): its own back
  // button, its own head, Layer A/B banned alongside — the CALL
  // modal submenu's grammar, mirrored. ────────────────────────────
  if (kfView) {
    return (
      <div className={s.panel} data-testid="tl-keyframe-panel">
        {kfAddMenu}
        {kfRowMenu}
        <div className={s.focusHead}>
          <RailBackButton onClick={exitKfView} />
          <SectionLabel tail={studioCopy.keyframesHint}>
            {studioCopy.keyframesTitle}
          </SectionLabel>
          {/* THE ADD DOOR BESIDE THE TITLE (operator 2026-11-06: a
              little upload icon by which a pin is added — the audio
              input grammar; the timeline-bar lane icon is dead). */}
          <Tip tip={studioCopy.kfAddTip}>
            <Button variant="ghost" size="sm"
              data-testid="tl-kf-add"
              aria-label={studioCopy.kfAddAria}
              className={s.uploadBtn}
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                kfAddSquare(kfField())?.verbs.onPick?.(e.currentTarget)
              }}
            >
              <Upload aria-hidden />
            </Button>
          </Tip>
        </div>
        {kfAddError != null && (
          <span data-testid="tl-kf-add-error" className={s.fileErr}>{kfAddError}</span>
        )}
        {keyframes.length === 0 ? (
          // (Sahar R3, 2026-11-06) the shared EmptyState owns the
          // nothing-here face — the hand-rolled kfEmpty div is dead.
          <EmptyState variant="bare" className={s.kfEmpty} title={studioCopy.kfEmptyNote} />
        ) : (
          <div className={s.compactList}>
            {keyframes.map((k, i) => {
              return (
                <div
                  key={i}
                  data-kf-row={i}
                  data-wired={k.image.trim() ? "true" : "false"}
                  className={s.kfRow}
                >
                  {/* THE ROW'S SOURCE VERB (defect B): the audio
                      upload input grammar — an icon that opens the
                      picker (From flow / From media / From file);
                      NO input image square renders anywhere. */}
                  <Tip tip={studioCopy.kfAddTip}>
                    <Button variant="ghost" size="sm"
                      data-testid={`tl-kf-source-${i}`}
                      aria-label={studioCopy.kfRowPickAria(i)}
                      className={s.uploadBtn}
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        pickRow.current = i
                        kfRowSquare(kfField())?.verbs.onPick?.(e.currentTarget)
                      }}
                    >
                      <Upload aria-hidden />
                    </Button>
                  </Tip>
                  {kfUploadErrors[i] != null && (
                    <span data-testid={`tl-kf-source-error-${i}`} className={s.fileErr}>
                      {kfUploadErrors[i]}
                    </span>
                  )}
                  <span className={s.kfTime} title={studioCopy.keyframeFrameLabel(i)}>
                    {studioCopy.secondsLabel((k.frame / fps).toFixed(2))}
                  </span>
                  <Tip tip={studioCopy.deleteKeyframeTip}>
                    <Button variant="ghost"
                      onClick={() => handleKeyframeDelete(`kf-${i}`)}
                      aria-label={studioCopy.deleteKeyframeAria(i)}
                      className={s.kfDel}
                    >
                      ×
                    </Button>
                  </Tip>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }
  return (
    <>
  {/* ── LAYER B — THE CALL CARDS — IN THE RAIL (2026-08-16, the
      user's directive: "the LEFT SIDEBAR populates the inputs and
      options" — clicking a CALL or BEAT clip in the bar selects
      it; the rail scrolls the card / segment row into view with
      its ring). One structured card per MODEL CALL — prompt (text
      XOR beat segments), editable span, the three guides, and the
      per-call knob fold. The compiler cuts windows at CALL
      boundaries — a new call = a new model invocation at that
      cut; beats (Layer C) are prompt segments WITHIN a call that
      join into its single prompt and never cut. */}
  <div className={s.panel} data-testid="tl-call-panel">
    {/* (operator 2026-11-05: "people will know to click the timeline
        bar itself — we don't need that annoying menu") — the global
        Model-calls list is GONE. Selection flows through the bar
        (call-N) and the back button; the keyframes subview is the
        strip door's own face (defect B, 2026-11-06). */}
    {selected != null && (
      <div className={s.focusHead}>
        <RailBackButton onClick={() => { setSelected(null) }} />
        {/* THE CUT-POSITION TAIL (F11): previewCutMeta's "cut i / n"
            shape is a position readout — the focused call IS the cut
            boundary, so the tail reads it here (the pane meta seat
            carries no current-cut index). */}
        <SectionLabel tail={studioCopy.previewCutMeta(selected.callIdx, calls.length)}>
          {studioCopy.modelCallHead(selected.callIdx)}
        </SectionLabel>
      </div>
    )}
    {selected != null && (
    <div className={s.focusList}>
            {calls.map((c, i) => (
              <CallCard key={i} c={c} i={i} deps={deps} />
            ))}
    </div>
    )}
    {/* (defect B, 2026-11-06) NO keyframe panel renders here: the
        editor lives in its own subview (kfView above) — Layer A/B
        are banned from rendering alongside it, and the global rail
        is the run's parameters alone. */}
  </div>
    </>
  )
}
