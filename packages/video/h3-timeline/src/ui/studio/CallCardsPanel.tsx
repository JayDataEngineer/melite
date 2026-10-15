/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { Button, IconChevronLeftOutlineRegular, Input, Pill } from '@deepseek-ai/dsh-client-ui-primitives'
import { SectionLabel, SpecAtom, Tip, type SpecField } from '@melite/card-base/client'
import { cn, readAsDataURL, SourceRow, fetchMediaLibrary } from '@melite/card-base/client'
import s from "./studio.module.css"
import { parseSpecNumber } from "./docGrid.ts"
import type { CallRefs, DocCall, DocKeyframe, LayerA } from "./docModel.ts"
import { CallCard } from "./CallCard.tsx"
import { deliveredFrames } from '@melite/models-h3/timelineContract'
import { displaySource, FOREIGN_URL_REFUSAL, REF_READ_ERROR, refUploadError } from "./refUtils.ts"
import type { LinkArtifact } from "./refUtils.ts"
import type { TimelineSelection } from "./useViewSelection.ts"
import { useState } from "react"
import { studioCopy } from "./studioCopy.ts"

/** THE SEAT-HELD LAW LINE (the dictionary's own bound): the compact
 *  row's hover narrates the seam-carry rule with live numbers — one
 *  of a kind, so the wording lives here, never in the dictionary.
 *  Rides a call (opaque to the copy census, as any locale lookup is).
 *  No `: string` return annotation on purpose: the census descends
 *  explicit string returns in .tsx; the template infers string. */
function callRowLine(start: number, end: number, fps: number) {
  return `span ${((end - start) / fps).toFixed(1)}s — delivered after the seam's carry`
}

/** Handlers + bags the call-card tree needs (all owned by the tenant). */
export interface CallCardDeps {
  selected: TimelineSelection | null
  fps: number
  /** The run's Layer A — feeds the knob fold's inherited ghosts
   *  (the 2026-09-15 "inherit" wall: an unset knob shows the value
   *  it inherits from the run, never the bare word "inherit"). */
  layerA?: LayerA
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
  setCallGuide: (i: number, kind: "image" | "clip" | "audio", source: string) => void
  setCallTransition: (i: number, t: "extend" | "cut") => void
  setCallRefs: (i: number, key: keyof CallRefs, value: string) => void
  setCallKnob: (i: number, key: string, value: number | string | boolean | undefined) => void
  /** THE PIN MAP (door-guard UX arm): call indexes whose windows
   * carry a dialogue/sfx clip — their Ref audios bucket grays out
   * (the pinned window owns its audio conditioning). */
  voicePinnedCalls?: Set<number>
  /** THE BLOCKER (2026-09-22): any D-M-E clip present → the Ref
   * audios bucket grays out on EVERY call (the timeline owns the
   * model's audio inputs while it carries clips). */
  audioClipsPresent?: boolean
}

/** Layer B rail: compact call rows ⇄ focused call editor + legacy
 *  keyframes (monolith lines 3320–3416 + 3847–3924; per-call bodies
 *  render through CallCard). */
export function CallCardsPanel({
  calls, selected, setSelected, fps, sourceOptions, keyframes,
  handleKeyframeMove, handleKeyframeDelete, setKeyframeImage,
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
  deps: CallCardDeps
}) {
  // THE EVERY-SEAT LAW at the kf source: an upload/pick refusal is
  // VISIBLE beside the row (keyed by row), never a silent drop.
  const [kfUploadErrors, setKfUploadErrors] = useState<Record<number, string | null>>({})
  const setKfUploadError = (i: number, err: string | null): void => {
    setKfUploadErrors((prev) => ({ ...prev, [i]: err }))
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
    {selected == null ? (
      <div className={s.rowsHead}>
        {/* THE SECTION-HEAD GRAMMAR (F5, 2026-11-05): the panel's heads
            ride the kit's SectionLabel — the same face CallCard's
            buckets ride; no hand-rolled head spans. */}
        <SectionLabel tail={studioCopy.callsHint}>
          {studioCopy.modelCallsTitle}
        </SectionLabel>
      </div>
    ) : (
      <div className={s.focusHead}>
        <Tip tip="Back to the run's global parameters — or click any empty spot in the timeline">
          <Button variant="ghost"
            onClick={() => setSelected(null)}
            aria-label={studioCopy.backToGlobal}
            data-testid="tl-back-to-global"
            className={s.backBtn}
          >
            <IconChevronLeftOutlineRegular className={s.sz12} /> {studioCopy.globalAction}
          </Button>
        </Tip>
        {/* THE CUT-POSITION TAIL (F11): previewCutMeta's "cut i / n"
            shape is a position readout — the focused call IS the cut
            boundary, so the tail reads it here (the pane meta seat
            carries no current-cut index). */}
        <SectionLabel tail={studioCopy.previewCutMeta(selected.callIdx, calls.length)}>
          {studioCopy.modelCallHead(selected.callIdx)}
        </SectionLabel>
      </div>
    )}
    {selected == null && (
      <div className={s.compactList}>
        {calls.map((c, i) => {
          const activeKnobs = c.knobs ? Object.keys(c.knobs).length : 0
          const excerpt = c.text ?? ""
          return (
            <Button variant="ghost"
              key={i}
              type="button"
              data-call-row={i}
              onClick={() => setSelected({ callIdx: i })}
              className={s.callRow}
            >
              <span className={s.callIdx}>
                #{i}
              </span>
              <span
                className={cn(s.excerpt, excerpt.trim() ? s.excerptFull : s.excerptEmpty)}
              >
                {excerpt.trim() || studioCopy.emptyCallExcerpt}
              </span>
              {activeKnobs > 0 && (
                // THE COUNT CAPSULE (F7, 2026-11-05): the knob count
                // rides the DSH Pill — the StaleBadge precedent
                // (card-base preview.tsx:155); one badge grammar across
                // the card.
                <Pill>{activeKnobs}</Pill>
              )}
              <span className={s.callDur} title={callRowLine(c.start_frame, c.end_frame, fps)}>
                {studioCopy.secondsLabel((deliveredFrames(c, i) / fps).toFixed(1))}
              </span>
            </Button>
          )
        })}
      </div>
    )}
    {selected != null && (
    <div className={s.focusList}>
            {calls.map((c, i) => (
              <CallCard key={i} c={c} i={i} deps={deps} />
            ))}
    </div>
    )}

    {/* ── Legacy frame-exact keyframes — the escape hatch, only when
        the document carries them (agent-authored or hand-JSON). The
        calls are the guide surface now; these render + edit + delete
        but the call panel is where guides are authored. EVERY MODE
        (the rail-law audit, 2026-10-31): the doc readout says "wire
        them below" — the door must exist below in focused mode too,
        or the warning points at a panel that is not on screen. */}
    {keyframes.length > 0 && (
      <div className={s.kfPanel} data-testid="tl-keyframe-panel">
        <div className={s.kfHead}>
          <SectionLabel tail={studioCopy.keyframesHint}>
            {studioCopy.keyframesTitle}
          </SectionLabel>
        </div>
        <div className={s.compactList}>
          {keyframes.map((k, i) => {
            return (
              <div
                key={i}
                data-kf-row={i}
                data-wired={k.image.trim() ? "true" : "false"}
                className={s.kfRow}
              >
                <SpecAtom
                  f={{ name: `kf_${i}_frame`, label: studioCopy.keyframeFrameLabel(i), type: "number" }}
                  value={k.frame}
                  placeholder=""
                  onEdit={(_, v) => {
                    if (typeof v !== "string") return
                    const n = parseSpecNumber(v)
                    if (n !== undefined) handleKeyframeMove(`kf-${i}`, Math.round(n))
                  }}
                />
                {/* THE KF IMAGE SEAT (the rail-law audit's square gap
                    c, 2026-10-31): the seat rides the SourceRow grammar
                    like every source in the system. From-flow rows =
                    the upstream artifacts (sourceOptions × the artifact
                    index's url); the write is the one verb; the URL→NAME
                    honesty is the system's law (the name is what
                    _resolveSource resolves at run time). */}
                <SourceRow
                  label={studioCopy.kfSourceLabel(i)}
                  ariaLabel={studioCopy.keyframeAria(i)}
                  kind="file"
                  hideLabel
                  value={k.image.trim() === "" ? null
                    : displaySource(k.image, deps.artifactIndex.byName)}
                  candidates={sourceOptions.map((o) => ({
                    id: o.name,
                    label: `${o.title} · ${o.name}`,
                    url: deps.artifactIndex.byName.get(o.name) ?? "",
                  }))}
                  loadMedia={fetchMediaLibrary}
                  onFile={(f) => {
                    const err = refUploadError(f, "image")
                    if (err !== null) { setKfUploadError(i, err); return }
                    void (async () => {
                      try {
                        setKeyframeImage(i, await readAsDataURL(f))
                        setKfUploadError(i, null)
                      } catch {
                        setKfUploadError(i, REF_READ_ERROR)
                      }
                    })()
                  }}
                  onEdit={(src) => {
                    if (src === "") { setKeyframeImage(i, ""); return }
                    if (src.startsWith("data:")) { setKeyframeImage(i, src); return }
                    const name = deps.artifactIndex.byUrl.get(src)
                    if (name !== undefined) { setKeyframeImage(i, name); setKfUploadError(i, null); return }
                    setKfUploadError(i, FOREIGN_URL_REFUSAL)
                  }}
                />
                {kfUploadErrors[i] != null && (
                  <span data-testid={`tl-kf-source-error-${i}`} className={s.fileErr}>
                    {kfUploadErrors[i]}
                  </span>
                )}
                <span className={s.kfTime}>
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
      </div>
    )}
  </div>
    </>
  )
}
