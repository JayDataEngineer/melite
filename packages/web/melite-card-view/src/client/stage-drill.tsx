/** stage-drill.tsx — THE SHARED DRILLDOWN: the spec-formatted stage
 * editor, the zoom face, the preview seam consult (extracted from
 * CardsTab.tsx hour 15 — the biggest seam). */
/** THE LIVE DOC BENEATH THE FORM LAYER (2026-11-12, the operator's
 * "when the AI used one of these specialized mods, IT WOULD NOT UPDATE
 * THE TIMELINE VISUALS" law): the user map seeds with EVERY held key
 * at open (seedUser's pass-along law), so a plain `{ ...held, ...user }`
 * pinned the open-time snapshot against every later bench write — an
 * agent's calls rewrite, or a pre-existing mod bag's arm/change/disarm,
 * never reached the studio even though the bench carried it. The LIVE
 * row is the base; only a key with an UNRESOLVED authorial gesture
 * (in flight or refused) keeps the user's face on top — so a foreign
 * write flows the moment the drill's own edit settles (the settle
 * effect below retires the touch once the row confirms the authored
 * value), and an agent's DELETE of a seeded key reads as gone.
 * @param held the LIVE bench row's params (the doc the agent writes)
 * @param user the drill's form layer (seeded at open, gestures since)
 * @param touched the keys THIS drill authored and not yet settled
 * @returns the card surface's effective params. */
export function liveEffectiveParams(
  held: SpecValues,
  user: SpecValues,
  touched: ReadonlySet<string>,
): SpecValues {
  const out: SpecValues = { ...held }
  for (const k of touched) {
    if (k in user) out[k] = user[k]
    else delete out[k]
  }
  return out
}



import { createElement as h, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Button, IconCloseOutlineRegular, Input, Modal, Pill, StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import { CardDrill } from './card-drill.tsx'
import { MediaDrilldown, type MediaDrilldownItem } from '@melite-plugin/dsh-gallery/drilldown'
import type { StageViewOwnerProps } from './types.ts'
import { coerceFieldEdit, fetchFormSpec, fieldsOf, resolveValue, seedUser, reseatEnvelopeKeys, CardForm, type FormSpecDoc, type SpecValues } from '@melite/card-base/client'
import { axisUnset, axisGroups, axisKey, composeCandidateDoc, composeValidate, dropStaleReopenCarry, mergeSwitchFrame, modelSwitchPatch } from '@melite/card-base/client'
import type { ComposeViolation } from '@melite/card-base/client'
import { forgetStageWrites, reconcileStageWriteFailures, refuseForUnlandedWrite, scheduleStageParam } from './draft.ts'
import { canonicalOutputUrl, trailDedupe } from '@melite/estate-drafts/trail'
import { postManageAction } from '@melite/card-base/client'
import { createFilmSeam, FilmSeamBar, FilmSeamPlayer } from './filmSeam.tsx'
import { PaintLeafCanvas } from '@melite/image-mask-studio/paint-canvas'
import { BboxLeafCanvas } from '@melite/image-mask-studio/bbox-canvas'
import { cardLlmArg, setCardLlm } from '@melite/catalog'
import { paramFields, patchStageOutcome, patchStageParams, mediaUrl, stageWriteState, unlandedWriteVoice } from './draft.ts'
import css from './card.module.css'
import { StudioShell } from '@melite/card-base/client'
import { fetchMediaLibrary } from './cards-resource.ts'
import { uploadInputFile } from '@melite/card-base/client'
import { paramsDiffKeys, previewArtifactsFor, previewReportsFor, primaryKindFor } from './preview-kinds.ts'
import { removeStageWire, ungroupStageWire } from './add-stage.ts'
import type { CardsBenchValue, BenchStageView } from './cards-resource.ts'
import { freshStageRow } from './cards-resource.ts'
import { AudioStagePreview, ImageStagePreview, MeshStagePreview, ReportView, TextStagePreview, VideoStagePreview, attachedImageOf, attachedMeshOf, figureCoeffsOf, figureLocalChangesOf, figureCameraOf } from '@melite/card-base/client'
import { CardZoomOverlay } from './zoom.tsx'
import { loadFormsEdgeMeta } from './forms-edge-meta.ts'
import { rejectionVoice } from './rejection-voice.ts'
import { strikeDeadLaneStamps } from './lane-strike.ts'
import { chromeCopy } from '../chromeCopy.ts'

/** THE SHARED DRILLDOWN — spec-formatted (the old system's law): the
 *  stage's card carries a DECLARED form (/v1/form-spec — typed atoms,
 *  groups, defaults); the drill renders THAT, never a raw key/value
 *  dump. Params left, Run right; the patch carries only CHANGED keys
 *  (coerced once, at patch time — the editPatch law); then the run
 *  gesture (patch lands in the domain BEFORE the run reads it). */

/**
 * THE SCROLL LOCK (2026-09-21, the operator's law: 'whenever
 * progress updates, it jerks the view up' — every per-tick layout
 * change moved the scroller WITHOUT the user: img swaps, textarea
 * autogrow, seat churn, collapse-clamps). The scroller's position
 * is USER-OWNED: wheel/touch/keys record it; a layout effect after
 * EVERY update restores it when anything else moved it. The law
 * kills the whole mechanism class at the container, not per child.
 */

/** THE WALK DEDUP LAW (the landing-archive era), run-aware (the
 *  trail-defect hunt §5): identity is the artifact's run_id first —
 *  the server trail carries it, and one run can ride two url
 *  spellings (the media route and the gallery proxy) — with the url
 *  seat as the fallback. One seat per RUN, first-wins; order kept.
 *  THE URL SEAT IS CANONICAL (the 2026-11-02 audit's F6): two
 *  spellings of one artifact with NO run_id must collapse on the
 *  walk too — the seat compares canonicalOutputUrl (trail.ts's own
 *  resolver, the same identity the rail dedups on), never the raw
 *  url string (a second local spelling is how the walk lied). */
export function dedupWalkSet<T extends { url: string, runId?: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  const seenRuns = new Set<string>()
  return items.filter((a) => {
    if (a.runId !== undefined && seenRuns.has(a.runId)) return false
    const seat = canonicalOutputUrl(a.url)
    if (seen.has(seat)) return false
    if (a.runId !== undefined) seenRuns.add(a.runId)
    seen.add(seat)
    return true
  })
}

export function ScrollLockedDetail(props: { children?: ReactNode, testid?: string }): ReturnType<typeof h> {
  const elRef = useRef<HTMLDivElement | null>(null)
  const userTop = useRef<number | null>(null)
  const userOwned = useRef(false)
  const bind = useCallback((el: HTMLDivElement | null): void => {
    elRef.current = el
    if (el === null) { userTop.current = null; return }
    // the user's gestures OWN the position — flag before the scroll lands
    const own = (): void => { userOwned.current = true }
    el.addEventListener('wheel', own, { passive: true, capture: true })
    el.addEventListener('touchmove', own, { passive: true, capture: true })
    el.addEventListener('keydown', own)
    // EVERY scroll that was not user-owned is a THIEF — restore in
    // the next frame (render-independent: no re-render needed)
    el.addEventListener('scroll', () => {
      if (userOwned.current) { userOwned.current = false; userTop.current = el.scrollTop; return }
      if (userTop.current !== null && el.scrollTop !== userTop.current) {
        const held = userTop.current
        requestAnimationFrame(() => { el.scrollTop = held })
      }
    }, { passive: true })
  }, [])
  return h('div', { className: css.zoomDetail, ...(props.testid !== undefined ? { 'data-testid': props.testid } : {}), ref: bind }, props.children)
}

/** THE COMPOSE GATE'S VOICE (2026-09-29, the operator's law: a card
 *  IS its contract — an invalid doc is refused at COMPOSITION, never
 *  shipped to the door to be refused after the wire). The message is
 *  the door's OWN law text; the prefix names the plane that caught
 *  it. The studio still shows the edit (the same hopeful-overlay
 *  semantics the door-refusal always had), but NO frame leaves and
 *  the bench never receives a doc it would refuse. */
/** THE MOD-BAG KEYS THE SERVED KINDS NAME (the re-point rescope's
 *  mod-currency clause, 2026-11-06): the DECL's mod bags ride
 *  features.modifiers' param_key — the card schema never declares
 *  them (image-gen serves one array node, reference_images), so the
 *  bag law's schema walk (bagKeysOf, card-base) cannot see them. A
 *  cross-model switch nulls these too: mods are per model, "if I
 *  switch model, keeping the lora on makes zero sense" (operator,
 *  2026-10-16). */
function modBagKeys(doc: FormSpecDoc): string[] {
  return (doc.features?.modifiers ?? []).map((k) => k.param_key)
}

/** The one refusal template — composeGateRefusal derives from it (the
 *  string contract the other seats keep) and the press seat rides the
 *  violation's structured field beside the same words. */
function gateRefusalVoice(v: ComposeViolation): string {
  return 'THE COMPOSE GATE REFUSED — ' + v.message
    + ' — the write never left the studio. Fix the stated value, or pick a different route.'
}

/** THE PENDING VOICE (the frictionless-authoring cure, 2026-11-10,
 *  the operator: "ALL THE REDS WE SAW WITH QWEN SHOULD BE IMPOSSIBLE
 *  ... AT THE GENERIC CARD LEVEL"): an AUTHORING write (typing, a
 *  slot pick, an axis unset, the enhance sweep) never drops on a
 *  compose violation — the blank law's own tolerance reads a state
 *  still being authored as authoring-in-progress, not a refusal
 *  (the voice_name brick: half-pair writes unlanded and the pair
 *  could never complete). The write lands; this face states what
 *  the Run press refuses until the state heals. The Run press keeps
 *  the full-set gate (the singularity cure); the atomic pick keeps
 *  its own before-the-wire marriage judgment (a lane switch, never
 *  authoring). */
function gatePendingVoice(v: ComposeViolation): string {
  return 'THE COMPOSE GATE WILL REFUSE AT RUN — ' + v.message
    + ' — the write landed; complete the pair or unstamp before Run.'
}

/** THE ONE-VOICE LAW (E2-12): extract a gate refusal's bare message
 *  from a voiced face (the strip's, the write face's refusal
 *  template, or its pending template), or null when the face voices
 *  no gate refusal — non-gate voices never mute anything (different
 *  truths keep their own seats). */
function gateRefusalMessage(voice: string | null): string | null {
  if (voice === null) return null
  const templates: readonly [string, string][] = [
    ['THE COMPOSE GATE REFUSED — ', ' — the write never left the studio. Fix the stated value, or pick a different route.'],
    ['THE COMPOSE GATE WILL REFUSE AT RUN — ', ' — the write landed; complete the pair or unstamp before Run.'],
  ]
  for (const [head, tail] of templates) {
    if (voice.startsWith(head) && voice.endsWith(tail)) return voice.slice(head.length, -tail.length)
  }
  return null
}

function composeGateRefusal(
  spec: FormSpecDoc | null,
  held: Record<string, unknown> | undefined,
  user: SpecValues,
  frame: Record<string, unknown>,
): string | null {
  const v = composeGateViolations(spec, held, user, frame)[0] ?? null
  return v === null ? null : gateRefusalVoice(v)
}

/** The authoring writes' pending face — the first violation the
 *  candidate carries, voiced as what Run will refuse (the write
 *  itself proceeds). */
function composePendingVoice(
  spec: FormSpecDoc | null,
  held: Record<string, unknown> | undefined,
  user: SpecValues,
  frame: Record<string, unknown>,
): string | null {
  const v = composeGateViolations(spec, held, user, frame)[0] ?? null
  return v === null ? null : gatePendingVoice(v)
}

/** THE GATE'S FULL SET (the singularity cure, 2026-11-10): EVERY
 *  violation the candidate carries — the press strip voices one row
 *  per refusal (the old seat kept [0] and the banner re-voiced the
 *  rest: the twice face). The mirror and family clauses name keys NO
 *  rendered control owns, so each row's words must act (the field's
 *  unstamp), not just name. */
function composeGateViolations(
  spec: FormSpecDoc | null,
  held: Record<string, unknown> | undefined,
  user: SpecValues,
  frame: Record<string, unknown>,
): ComposeViolation[] {
  if (spec === null) return []
  return composeValidate(spec, composeCandidateDoc(held ?? {}, user, frame))
}

export function StageDrill({ stage, bench, running, onRun, onStop, onClose, onRemoved, onResync, onPatchParams, renderStageView, renderPreview, onSurface, runId, canRemove, bindRun, bindEnhance }: {
  stage: BenchStageView
  bench: CardsBenchValue
  running: boolean
  onRun: () => void
  /** THE ✦ GESTURE (stroke 23): the drill binds its enhance verb —
   *  the zoom bar renders the capsule beside Run (the rail's own
   *  button is retired; the note stays as inline feedback). */
  bindEnhance?: (verb: () => Promise<void> | void) => void
  /** THE STOP DOOR (2026-09-13): the run button flips to a stop
   *  glyph while running (the tile's own affordance, carried into
   *  the drill — one gesture language, both faces). */
  onStop: () => void
  onClose: () => void
  onRemoved: () => void
  /** THE RESYNC SEAT (2026-09-15, the stuck cure): a write that
   *  refused after its rebase leaves this drill composing against a
   *  bench it can no longer see whole — the view re-reads and this
   *  drill re-seeds from the fresh truth, so the NEXT gesture works.
   *  A named error without a resync is how a tab bricks. */
  onResync?: () => void
  /** THE SETTLEMENT RIDE (2026-10-15, the ghost cure): the
   *  studio's optimistic overlay retracts a write the door refused —
   *  this prop IS the owner's onPatch (line ~1276), so the boolean
   *  rides unbroken from the tab seat to the studio. */
  onPatchParams: (patch: Record<string, unknown>) => void | Promise<boolean | void>
  renderStageView: (owner: StageViewOwnerProps, fallback: ReturnType<typeof h>) => ReturnType<typeof h>
  /** the preview seam consult (hour-9): the shared video/image preview
   *  rides the drill's RIGHT column — supplied by the host (it owns
   *  the slot site); the shared card-base previews are the defaults. */
  renderPreview?: (owner: { kind: 'video' | 'image' | 'audio' | 'mesh' | 'text', artifacts: Array<{ name: string, url: string }>, runStatus: string, stageId: string, history?: Array<Array<{ name: string, url: string }>> }, fallback: ReturnType<typeof h>) => ReturnType<typeof h>
  onSurface?: (size: string) => void
  runId?: string | null
  /** Retired seat (2026-09-13, the operator's "it doesn't need
   *  remove stage button"): the drill no longer renders the remove
   *  row — removal rides the tile's trash. The prop stays for the
   *  call-site seam (nothing reads it; the row is gone). */
  canRemove?: boolean
  /** THE GESTURE REGISTRATION (hour-26): the frame's top-bar pill
   *  calls the drill's OWN run (flush-then-start), never a bare
   *  start that would drop un-flushed form edits (the 1:1 law). */
  bindRun?: (run: () => void) => void
}): ReturnType<typeof h> {
  const title = String(stage.title ?? stage.card ?? stage.id)
  const held: SpecValues = typeof stage.params === 'object' && stage.params !== null ? stage.params : {}
  const [spec, setSpec] = useState<FormSpecDoc | null>(null)
  // THE USER LAYER (the settings law, 2026-09-14): the stage's
  //  explicit params, presence IS the override mark. The resolved
  //  value derives per render (resolveValue — the engine's compose
  //  cascade mirrored); edits are set/unset ops over THIS map.
  const [user, setUser] = useState<SpecValues>({})
  // THE MEDIA DRILLDOWN SEAT (hour 24: clicking the preview mirrors
  // the media drilldown 1:1 — the SAME shared component the gallery
  // rides; the click maps the stage's primary artifact onto it).
  const [drillItem, setDrillItem] = useState<MediaDrilldownItem | null>(null)
  // THE WALK SET (2026-09-20, the operator's arrows): FROZEN at
  // open time — the opened image walks the gallery exactly as it
  // stood (current run's set + every archived generation, newest
  // first); a mid-walk archive shift never reindexes under the
  // user's feet. Cleared with the drilldown.
  const [drillWalk, setDrillWalk] = useState<MediaDrilldownItem[]>([])
  // THE TIMELINE SEAM (the form-seams stroke 2026-09-17): the
  // optional bottom-slot bridge — created once, wired only when the
  // served spec claims preview.timeline AND a video face renders.
  // THE LAZY SEAT (the 1.6 row, 2026-10-12): `useRef(createFilmSeam())`
  // ran the factory on EVERY render and kept only the first value — the
  // comment below claimed "created once" while the tree allocated a
  // throwaway seam (and its listener Set) per render. useState's lazy
  // initializer creates it exactly once per mount, which is what the
  // comment always meant and what a module-lifetime store would have
  // made expensive.
  const [filmSeam] = useState(() => createFilmSeam())
  // THE ✦ AGENT ENHANCE SEAT (hour 24 stroke 10): one press — the
  // sweep door enhances every declared field; the write-back rides
  // the SAME values seam the form's own edits ride (the next Run
  // patches the domain with what the user SEES).
  const [enhancing, setEnhancing] = useState(false)
  const [enhanceNote, setEnhanceNote] = useState<{ err: boolean, text: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  // THE STRIP'S GATE SET (the singularity cure, 2026-11-10 — the
  // operator: "ERRORS APPEAR TWICE ON THE TTS CARD, ONE ABOVE AND
  // BELOW, AND I CAN ONLY CLOSE THE BOTTOM ERROR MESSAGE"): EVERY
  // gate refusal the press seat judged — one refusal is one row on
  // ONE closable strip, each row's words acting through its own
  // field-named unstamp. The old seat kept violations[0] and let the
  // banner re-voice the rest (the twice face); the set owns them all.
  const [gateSet, setGateSet] = useState<ComposeViolation[]>([])
  // THE LEDGER FACE (the write-seat audit's silent-dead-write finding,
  // 2026-10-10): the ordinary authoring branch used to swallow its
  // write failures (`.catch(() => {})`) — a typed edit whose write
  // died surfaced ONLY as a run refusal, minutes later, with no face
  // at the field. The scheduled write's promise now settles when the
  // door ANSWERED (superseded waits included), so the drill can put
  // the failure ON the form the moment it happens — the slot arm's
  // own law, generalized to every authoring write.
  const [writeFace, setWriteFace] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const reportSurface = onSurface ?? (() => {})
  // (THE LIVE GESTURE STATE moved to the frame (hour-26): the top
  //  bar's Run/Stop pill + the webhook strip derive the row's run
  //  state there — the drill body no longer needs its own copy.)
  const [removing, setRemoving] = useState(false)
  // THE SLOT IS THE WIRE (the two-month law, restored 2026-09-12):
  //  no wiring mechanic exists. The square picker lists the OTHER
  //  stages' LATEST OUTPUTS; picking one writes this stage's param
  //  to that artifact's url (the run stages it engine-side).
  //  THE EDGE LAW: the per-field narrowing keeps only rows whose
  //  card DECLARES an output of the picked field's input-edge kind
  //  (spec.inputs) — the edges are defined by the emission, never
  //  guessed from url shapes.
  const others = bench.stages.filter((s) => s.id !== stage.id)
  const candidates = others.flatMap((s) => {
    const res = typeof s.result === 'object' && s.result !== null ? s.result as Record<string, unknown> : null
    const url = res !== null && typeof res['url'] === 'string' && (res['url'] as string) !== ''
      ? res['url'] as string : ''
    return url === '' ? [] : [{ id: s.id, label: String(s.title ?? s.card ?? s.id), url }]
  })
  // THE SPEC KEY FOLLOWS THE EFFECTIVE MODEL (stroke 20, the live
  // filter fix): the pick lives in the USER layer (onSet) — the
  // bench row (stage.params) does not move until Run — so the key
  // must read the USER's held model first (the pick), else the
  // bench row's, else the card. Reading only stage.params left the
  // spec frozen on the old family: the pick cleared the axes and
  // nothing ever re-filtered (the operator's burn).
  const heldModelRaw = (typeof stage.params === 'object' && stage.params !== null
    ? (stage.params as Record<string, unknown>)['model'] : undefined)
  const benchModel = typeof heldModelRaw === 'string' && heldModelRaw !== '' ? heldModelRaw : ''
  const userModelRaw = user['model']
  const userModel = typeof userModelRaw === 'string' && userModelRaw !== '' ? userModelRaw : ''
  const modelKey = userModel !== '' ? userModel : benchModel
  // the pick-preserving seed source: a FRESH OPEN (stage.id moved)
  // seeds from the bench row; a MODEL-PICK re-key (same stage) seeds
  // from the CURRENT user state — the pick + its cleared axes ride,
  // and the new family's own rows seed (never reseed the pick away)
  const lastStageRef = useRef<string>('')
  // THE DRILL'S OWN KEYS (the h3-timeline void, 2026-10-11: the Run
  // flush nulled EVERY held key outside the drill's user map — the
  // user map is seeded at open, so anything the STUDIO or the wire
  // menu saved after open read as "held-only" and was deleted at
  // Run press (bench-session-aaf6b92b rev 138: calls; rev 151:
  // input_images). The flush's null-domain is now ONLY what THIS
  // drill authored (touched) plus what its own seed deliberately
  // dropped (the dead recipe layer) — foreign-since-open keys ride
  // through untouched.
  const touchedRef = useRef<Set<string>>(new Set())
  const droppedRef = useRef<Set<string>>(new Set())
  // a moved stage is a new authorship (a MODEL-PICK re-key is not —
  // the operator's form edits survive the re-spec).
  useEffect(() => {
    touchedRef.current = new Set()
    droppedRef.current = new Set()
  }, [stage.id])
  // THE SETTLE RETIRE (the live-doc law's other half): a touch is
  // "an unresolved authorial gesture" — in flight or refused. The
  // moment the LIVE row confirms the authored value (or, for an
  // unset, no longer carries the key) and the write ledger holds no
  // failure for it, the gesture is settled: retire the touch so the
  // key returns to live-follow and the NEXT foreign write flows. A
  // refused write keeps its face (Run gates it); a racing foreign
  // write that lands first simply differs — no retire, the user's
  // pending face holds until their own write settles or fails.
  useEffect(() => {
    const failed = new Set(stageWriteState(bench.draftId, stage.id).failedKeys)
    for (const k of touchedRef.current) {
      if (failed.has(k)) continue
      if (k in user) {
        if (JSON.stringify(held[k]) === JSON.stringify(user[k])) touchedRef.current.delete(k)
      } else if (!(k in held)) {
        touchedRef.current.delete(k)
      }
    }
  }, [bench.draftId, bench.rev, stage.id, held, user])
  // THE ENHANCE FLIGHT (audit V-E4): the ✦ verb's controller — the
  // drill's unmount aborts a hung LLM wait, and an aborted settle
  // writes nothing on a closed drill.
  const enhanceAbort = useRef<AbortController | null>(null)
  useEffect(() => () => { enhanceAbort.current?.abort() }, [])
  const userRef = useRef<SpecValues>(user)
  userRef.current = user
  // THE DEPARTING SPEC (the re-key arm's law-holder, 2026-11-06):
  // modelSwitchPatch needs the family the switch LEAVES — at the
  // moment a re-key lands this is still the previous doc (setSpec
  // runs only inside the fetch settle). A ref, never the bare
  // closure value: the effect's dep pair is [stage.id, modelKey],
  // and the law must read the LAST landed doc, not re-fire the
  // fetch on every spec write.
  const specRef = useRef<FormSpecDoc | null>(null)
  specRef.current = spec
  // THE PENDING SPEC (P4 remainder — the arrival window, 2026-11-08):
  // the re-point gesture fires the arrival fetch, but the press does
  // not know a newer spec is coming — a run pressed inside the
  // gesture→settle round trip judged the flush against the STALE
  // spec and fired the start under it (2511's departed pair rode the
  // run). The seat tracks the in-flight fetch: the press fences
  // while an answer is owed, and the fence lifts with the settle —
  // never a latch (every settle path clears its own seq; a wedged
  // fetch is the error face's story, not a hung press).
  const specFetchSeqRef = useRef(0)
  const pendingSpecRef = useRef<{ family: string; seq: number } | null>(null)
  useEffect(() => {
    let alive = true
    const freshOpen = lastStageRef.current !== stage.id
    lastStageRef.current = stage.id
    // ENGINE STAGES (stroke 66, the card-seam generalization): a
    // card-less stage resolves its form from the ENGINE id — the
    // door serves engine docs from the same declared contract the
    // executor validates. The model PARAM is a plain field there,
    // never a family re-key (a brain route is not a family pick).
    const cardId = String(stage.card ?? '')
    const family = cardId !== ''
      ? (modelKey !== '' ? modelKey : cardId)
      : String(stage.engine ?? '')
    if (family === '') { setLoaded(true); return }
    const fetchSeq = (specFetchSeqRef.current += 1)
    pendingSpecRef.current = { family, seq: fetchSeq }
    fetchFormSpec(family)
      .then((doc) => {
        if (!alive) return
        if (pendingSpecRef.current?.seq === fetchSeq) pendingSpecRef.current = null
        // ERROR-IS-NOT-A-LATCH, drill half (the law audit's F-5): a
        // successful (re)fetch retires the 'form-spec unavailable'
        // claim — the spec door healed through any hand, and the
        // face must follow the state, not the last local verb
        setError(null)
        setSpec(doc)
        // THE USER-LAYER SEED (the pass-along law under the settings
        // model): every HELD key rides verbatim (presence survived
        // the reopen — never re-derived, never value-compared); the
        // absent axis keys seed per the axis law (first-declared
        // composing row, one direction); a held recipe key is
        // dropped outright — the card-recipe layer is dead (stroke
        // 34; seedUser's one validation clause; the run flush's
        // null-domain half deletes the bench key). A model-pick
        // re-key seeds from the USER state (the pick survives; the
        // new matrix's rows seed under it).
        // THE RE-KEY ARM ROUTES THROUGH THE SWITCH LAW (ONE switch
        // semantics, 2026-11-06 — audits journey/axis-unification
        // cure 4 + journey/anima-turbo-quant-burn cure 3): a re-key
        // is a CROSS-SPEC arrival no matter which face re-pointed the
        // key, so the seed re-scopes the holding through
        // modelSwitchPatch's law against the DEPARTING spec (axes
        // clear, the departing envelope vocabulary nulls, THE MOD
        // BAG DIES WITH ITS MODEL) before seedUser re-derives the
        // arrival's rows. Without it this arm was the second switch
        // semantics: it reseated envelope numerics while a departed
        // family's bag rode the seed (the krea-2 lora tile on the
        // anima card). THE ENVELOPE RE-SEAT STAYS — REDUCED to its
        // born job: the law's null set reads the DEPARTING spec's
        // envelope keys, so an envelope-LESS departure (anima) nulls
        // nothing and its stated numerics still re-seat at the
        // arrival seed.
        const seedSource = freshOpen ? held : userRef.current
        const departing = specRef.current
        const arrival = typeof doc.model === 'string' ? doc.model : ''
        // THE GUARD IS THE DOCS (one switch semantics — the B8 drop
        // below proves the spelling): the fired question is whether a
        // DIFFERENT family's spec just landed over the holding this
        // drill seeded. Never the model-key bookkeeping: the fetch
        // followed the user's re-pointed key, so that key already
        // equals the arrival (comparing them is provably dead — the old
        // gate never fired, and the departed pair rode). departing is
        // the spec the holding was seeded under (specRef trails the
        // setSpec below by exactly one arrival, so a same-spec refetch
        // compares equal and skips — the pass-along law holds; a rapid
        // A→B→A where the middle setSpec has not committed also
        // compares equal and correctly skips). arrival !== '' because
        // the patch CARRIES model:arrival (the drop below carries no
        // model key, so its guard needs no such floor) — an unnamed
        // arrival must never clobber the user's model with ''.
        let rescope: Record<string, unknown> = {}
        if (!freshOpen && departing !== null && arrival !== '' && departing.model !== arrival) {
          // THE ARRIVAL RIDES (DRILL a, the purge's P4 — finding 3's
          // face): `doc` IS the arrival spec (just fetched), so the
          // departed-surface null-set engages here — a key the
          // departing family declares that the arrival does not
          // nulls in the patch even when both schemas project it
          // (per-card schema faces are equal; the `params` surfaces
          // are the truth that differs). The seed consumes the null,
          // the drop ledger nulls the bench key at the flush — the
          // run door never meets the pair field-named. Without the
          // arrival the verb refuses to guess (its humility law) and
          // the seat behaves exactly as before.
          rescope = modelSwitchPatch(departing, arrival, seedSource, doc)
          // THE MOD-CURRENCY CLAUSE (the verb's second half, same law):
          // the departing kinds' bags die with their model even though
          // the served schema never names them (modBagKeys above).
          for (const k of modBagKeys(departing)) if (!(k in rescope)) rescope[k] = null
        }
        const seeded = seedUser(doc, { ...seedSource, ...rescope })
        // THE DEPARTED SCALAR DIES WITH ITS MODEL (B8's cure — the
        // ui-engine-fidelity purge's P4, 2026-11-08): a departed
        // schema field the ARRIVAL's schema does not declare is the
        // departed family's own knob (2511's double_reference/
        // use_stock_nodes riding a 21 arrival) — it is DELETED from
        // the seed exactly like the dead recipe layer, so the
        // seed-drop ledger nulls the bench key at the run flush (the
        // drop's domain half) and the arrival holding never carries a
        // field its form cannot render. This seat is the only one
        // that knows BOTH schemas (the seed verb sees one spec).
        // THE GUARD IS THE DOCS, never the model-key bookkeeping: a
        // composed key serves its BASE doc (the walk law), so the
        // user's re-pointed key never equals doc.model — the fired
        // question is whether a DIFFERENT family's spec just landed
        // over a holding this drill seeded (never on a fresh open:
        // the birth doc IS the family). Shared words (prompt, steps)
        // never drop — the pass-along law; axis keys never drop here
        // (the switch law and seedUser's ghost drop own them, with
        // their own voices); keys the patch's rescope explicitly
        // carries are its verdicts, never dropped.
        if (!freshOpen && departing !== null && departing.model !== arrival) {
          const arrivalFields = new Set(fieldsOf(doc).map((f) => f.name))
          const axisKeys = new Set(axisGroups(departing).map((g) => axisKey(g)))
          for (const f of fieldsOf(departing)) {
            if (f.name === 'model' || axisKeys.has(f.name) || arrivalFields.has(f.name)) continue
            if (f.name in rescope) continue
            delete seeded[f.name]
          }
        }
        // THE RE-KEY RESEAT (order d, 2026-11-06): only the model-pick
        // re-key arm reconciles — an envelope-less departure nulls no
        // vocabulary in modelSwitchPatch, so stated envelope-bound
        // numerics (cfg 3.5 under a [1,2] turbo lane) must re-seat at
        // the arrival seed or every door refuses the card. A fresh
        // open rides VERBATIM (seedUser's pass-along law) — never
        // reseat it.
        setUser(freshOpen ? seeded : reseatEnvelopeKeys(doc, seeded))
        // THE SEED-DROP LEDGER (same incident): keys the drill's own
        // seed deliberately drops (the dead recipe layer) stay
        // drill-owned garbage — the flush still nulls them. Anything
        // else absent from the seeded map was never the drill's and
        // is never nulled.
        for (const k of Object.keys(seedSource)) if (!(k in seeded)) droppedRef.current.add(k)
        if (freshOpen) {
          // THE FACE FOLLOWS THE SEAT (the 2026-11-02 audit's F5): the
          // reopened form starts CLEAN — a banner from the PREVIOUS
          // stage (or this stage's last visit) never carries onto the
          // seat being opened; the reconcile below is the only thing
          // that may re-voice, and only from the ledger row. The reset
          // lands WITH the reopened form (this .then), before any
          // assertion the walls make.
          setWriteFace(null)
          setError(null)
          // THE GHOST RECONCILE (the write-seat audit's dead-end
          // finding): a failed key the reopened form no longer holds
          // would refuse every run forever while the studio shows
          // the field empty — the ledger drops what nobody carries.
          // NOBODY includes the DECLARED fields (the second audit's
          // live-drop finding, 2026-10-11): seedUser seeds only held
          // keys + axis rows, but the form RENDERS every declared
          // field — a declared key's refusal is live and curable
          // (retype it), never a ghost.
          reconcileStageWriteFailures(
            bench.draftId, stage.id, held, seeded,
            new Set(fieldsOf(doc).map((f) => f.name)),
          )
          // THE REOPEN CARRY DROP (the stale-carry reopen cure,
          // 2026-10-21): the pick-time drop (dropStaleAxisCarry)
          // never sees a SAVED doc — one that arrives already
          // resolved to a lane its stated keys do not serve (an
          // older door's write, an agent patch, an older save) rides
          // ghosts the Run press refuses forever, and this lane
          // renders no widget to unstamp them with. The open derive
          // judges the doc's STATED keys against the RESOLVED
          // surface: off-surface keys are dead carry BY CONSTRUCTION
          // (no widget authors them, the estate door refuses
          // off-lane writes), so ONE atomic null write heals the doc
          // — silent (no face, no error: the heal is not user
          // authorship), and the dropped keys join the seed-drop
          // ledger so a Run pressed before the door answers still
          // nulls them at its own flush.
          const reopenDrop = dropStaleReopenCarry(doc, held)
          for (const k of Object.keys(reopenDrop)) droppedRef.current.add(k)
          if (Object.keys(reopenDrop).length > 0) {
            void patchStageParams(bench.draftId, stage.id, reopenDrop, bench.rev).then(
              undefined,
              (e: unknown) => {
                // a refused heal is never a silent swallow: the doc
                // stays as-saved, Run's own refusal still names the
                // fields, and the console row carries the reason.
                if (alive) console.warn('[stage-drill] reopen carry drop refused:', e)
              },
            )
          }
        }
        setLoaded(true)
        reportSurface(doc.size === 'huge' ? 'huge' : '')
      })
      .catch((e: unknown) => {
        if (!alive) return
        // the failure retires the pending — the error face voices
        // the outage, and the press must never latch on a fetch that
        // already answered (never an arrival-window fence over a
        // settled failure).
        if (pendingSpecRef.current?.seq === fetchSeq) pendingSpecRef.current = null
        setGateSet([]); setError(rejectionVoice(e))
        setLoaded(true)
      })
    return () => { alive = false }
    // stage.id re-opens; the EFFECTIVE model re-SPECS (a pick
    // refetches the family's own matrix — the axes re-filter LIVE)
  }, [stage.id, modelKey])
  // the forms-table cache (card meta with the DECLARED edges) — one
  // fetch per session; the picker's kind matching reads it
  const [edgeMeta, setEdgeMeta] = useState<Record<string, { inputs?: Record<string, string>; outputs?: Record<string, string> }> | null>(null)
  useEffect(() => {
    let alive = true
    loadFormsEdgeMeta()
      .then((m) => { if (alive) setEdgeMeta(m) })
      .catch((e: unknown) => {
        // the edge affordances degrade, but the door's failure is a
        // named console row, never a bare swallow (the catalog api's
        // only-silent-media-catch law)
        console.warn('[stage-drill] forms-edge meta unavailable:', e)
      })
    return () => { alive = false }
  }, [])
  const candidatesFor = useCallback((f: { name: string }): Array<{ id: string; label: string; url: string }> => {
    if (spec === null || edgeMeta === null) return candidates
    const edge = (spec.inputs ?? []).find((e) => e.name === f.name)
    if (edge === undefined) return candidates
    const kind = edge.kind
    // THE LIST-SEAT LAW (the operator's rework, 2026-09-26:
    // "reference images and input images are the same thing"): an
    // image_list edge (reference_images on image-edit) is an INPUT
    // seat that ACCUMULATES image producers — picking appends the
    // artifact to the list. Without this arm the exact-kind match
    // below emptied the picker the day the port was declared (no
    // stage outputs kind image_list); with raw-candidates fallback
    // it would list VIDEO stages as image references. THE
    // GENERALIZED FORM (2026-10-09, the naming-law census): EVERY
    // `_list` seat accepts its singular kind — video_list accepts
    // video producers (h3's ref_videos), audio_list audio
    // producers (h3's ref_audios). Nothing else.
    const accepts = (out: string | undefined): boolean =>
      out !== undefined && (out === kind || out + '_list' === kind)
    return candidates.filter((c) => {
      const row = others.find((s) => s.id === c.id)
      const cardId = String(row?.card ?? '')
      const outs = edgeMeta[cardId]?.outputs
      return outs !== undefined && Object.values(outs).some(accepts)
    })
  }, [spec, edgeMeta, candidates, others])
  // THE RE-POINT RESCOPE VERB (2026-11-06, the anima burn — audits
  // journey/anima-turbo-quant-burn-2026-11-06 cure 3 +
  // journey/axis-unification-2026-11-06 cure 4, ONE SWITCH SEMANTICS
  // AT THE WRITE SEAM): a params frame that CHANGES the model key is
  // a cross-family switch no matter which face authored it — the
  // Model rail (axes.tsx derives its frame through modelSwitchPatch),
  // a schema-level model knob (the semantic-model face), a future
  // tool/agent patch routed through this drill. Such a frame
  // re-derives through modelSwitchPatch's law against the CURRENT
  // (departing) spec — axes clear to the arrival's rows, the
  // departing envelope vocabulary nulls, THE MOD BAG DIES WITH ITS
  // MODEL — judged against the FULL holding (the bench row under the
  // user map, the doc the run composes), so a bag that lives only in
  // stage.params dies with the switch too. THE MOD-CURRENCY CLAUSE
  // rides here because the DECL's mod bags are named by the SERVED
  // KINDS (features.modifiers' param_key — loras never rides the
  // card schema; the one array node image-gen serves is
  // reference_images), so modelSwitchPatch's schema-node bag walk
  // (bagKeysOf) cannot see them: the clause nulls every served
  // kind's bag the law's own walk misses. The caller's own keys win
  // the merge: an already-rescoped rail frame re-derives to the same
  // shape (idempotent). Engine stages never rescope — a brain route
  // is a plain field there, never a family re-key (stroke 66).
  const rePointFrame = (frame: Record<string, unknown>): Record<string, unknown> => {
    const m = frame['model']
    if (spec === null || String(stage.card ?? '') === '') return frame
    if (typeof m !== 'string' || m === '' || m === (spec.model ?? '')) return frame
    // THE MERGE IS ONE HOME (the drill null-set cure, 2026-11-08):
    // mergeSwitchFrame — the caller's frame wins EXCEPT under the
    // patch's null verdicts (a departed-surface key a frame re-plants
    // dies; every other frame key keeps caller-wins).
    const merged = mergeSwitchFrame(
      modelSwitchPatch(spec, m, composeCandidateDoc(held, user, {})),
      frame,
    )
    // the served-features modifiers are the drill's own completion
    // seat (modBagKeys above): the schema walk cannot see them, so
    // the verb's bag block never carries them — completed here, only
    // where neither the patch nor the frame already owns the key.
    for (const k of modBagKeys(spec)) if (!(k in merged)) merged[k] = null
    return merged
  }
  const onSet = useCallback((name: string, v: unknown): void => {
    // THE MODEL RE-POINT IS AN ATOMIC, RESCOPED WRITE (the re-point
    // rescope verb above, at the per-key seam): a schema-level model
    // knob (the semantic-model face) that changes the family lands
    // the WHOLE switch law in ONE CAS — axes, departing vocabulary,
    // the mod bag — never a bare model key riding per-key writes
    // while the krea-2 bag and its int8 stay put (the operator's
    // burn). Same model, engine stages, or a spec-less drill: the
    // ordinary paths below.
    if (name === 'model' && spec !== null && String(stage.card ?? '') !== ''
      && typeof v === 'string' && v !== '' && v !== (spec.model ?? '')) {
      const rescoped = rePointFrame({ [name]: v })
      const landedM: Record<string, unknown> = {}
      const nullsM: Record<string, unknown> = {}
      for (const [k, kv] of Object.entries(rescoped)) {
        if (axisUnset(k, kv, spec) || kv === null) nullsM[k] = null
        else landedM[k] = kv
      }
      for (const k of Object.keys(landedM)) touchedRef.current.add(k)
      for (const k of Object.keys(nullsM)) touchedRef.current.add(k)
      setUser((m) => {
        const next: SpecValues = { ...m }
        for (const k of Object.keys(nullsM)) delete next[k]
        return { ...next, ...landedM }
      })
      const frameM = { ...landedM, ...nullsM }
      const refusedM = composeGateRefusal(spec, stage.params, user, frameM)
      /* istanbul ignore if -- defense arm, provably unfireable
         (coverage disposition 2026-11-06): composeGateRefusal
         refuses a model re-point only when the departing spec's
         model is absent/empty, and the form-spec door emits
         `model ?? null` — never ''. Kept so the re-point stays
         refusal-gated if the door's emission drifts. THE
         FRICTIONLESS-AUTHORING BOUNDARY: this block is the ATOMIC
         PICK's own marriage-before-the-wire judgment (a lane
         switch, its own registry row and arms) — every AUTHORING
         write (typing, slot, unset, sweep) lands with the pending
         face instead; only this discrete re-target still refuses
         in place. */
      if (refusedM !== null) { setWriteFace(refusedM); return }
      const settleDraftId = bench.draftId
      const settleStageId = stage.id
      void patchStageParams(settleDraftId, settleStageId, frameM, bench.rev).then(
        () => {
          if (lastStageRef.current !== settleStageId) return
          setWriteFace(stageWriteState(settleDraftId, settleStageId).failedKeys.length > 0
            ? unlandedWriteVoice(settleDraftId, settleStageId)
            : null)
        },
        () => {
          // the ledger row keeps the memory (draft.ts stamped the
          // failure before rethrowing) — the row's own voice, the
          // same one-voice law every write arm speaks
          if (lastStageRef.current !== settleStageId) return
          setWriteFace(unlandedWriteVoice(settleDraftId, settleStageId))
        },
      )
      return
    }
    // THE EMPTY-SELECTION LAW at the authoring boundary (2026-10-10,
    // the operator's live bench: a stage carrying quant:"" — born by
    // the model switch clearing an axis to '' — which the RUN door
    // refused: 'unknown quant "" for model "z-image" variant "turbo"
    // (known: int8)'). An axis key set to '' is UNSTATED, never a
    // stated-empty selection: the key leaves the user map (the same
    // gesture as the unset path below, whose name is the law) so
    // compose defaults the cell. The form's own rendering is
    // unchanged — a missing axis key reads as '' on screen.
    if (axisUnset(name, v, spec)) {
      // The seed law (seedUser at open) guarantees every axis key is
      // present in the user map before any onSet can fire: an axis
      // field renders only when the spec declares its group, and the
      // seed stamped that group's key. No absent-key arm here.
      touchedRef.current.add(name)
      setUser((m) => {
        const next: SpecValues = {}
        for (const [k, val] of Object.entries(m)) if (k !== name) next[k] = val
        return next
      })
      // THE AUTHORING CONTRACT rides the unset too: the row's key
      // leaves on the same ledger (a null param DELETEs it — the
      // door's own law), so "inherited" is the row's state and not
      // only this modal's. THE FRICTIONLESS-AUTHORING CURE: a
      // violation voices the pending face (what Run will refuse) —
      // the unset itself LANDS (an authoring state is never dropped).
      const pendingUnset = composePendingVoice(spec, stage.params, user, { [name]: null })
      if (pendingUnset !== null) setWriteFace(pendingUnset)
      // THE ALIVE GUARD (client-plane RISK-3, 2026-10-20): the
      // settle once re-addressed the RENDER-CAPURED bench/stage —
      // a re-targeted drill (the operator switched stages before
      // the door answered) stamped the OLD stage's ledger state
      // onto the NEW stage's face. The keys are captured HERE (the
      // ledger lookup stays honest for the write that was made);
      // only the face write is guarded: lastStageRef holds the
      // stage the drill shows NOW.
      const settleDraftId = bench.draftId
      const settleStageId = stage.id
      void scheduleStageParam(settleDraftId, settleStageId, name, null, bench.rev).then(() => {
        // the door ANSWERED: the ledger is the truth (the promise
        // resolves either way — the failure memory is the ledger's,
        // per-key and latest-wins). THE ONE VOICE: the face derives
        // from the row (draft.ts's unlandedWriteVoice) — this call
        // site never builds the string. The pending face STANDS
        // while its violation stands (the settle never clears what
        // Run still refuses; the next write re-derives).
        if (lastStageRef.current !== settleStageId) return
        setWriteFace(stageWriteState(settleDraftId, settleStageId).failedKeys.length > 0
          ? unlandedWriteVoice(settleDraftId, settleStageId)
          : pendingUnset)
      })
      return
    }
    // the drill authored this key — the flush owns its domain half
    touchedRef.current.add(name)
    setUser((m) => ({ ...m, [name]: v }))
    // THE AUTHORING CONTRACT (2026-10-10, the operator's live face:
    // 'Generate Image: lane krea-2/turbo refuses the state: this lane
    // requires prompt — prompt is not stated'). A typed field used to
    // live in this state alone: CardForm forwards onPatch to the MODS
    // section only, so the run's fresh-read composed a row that never
    // heard the prompt and the lane refused the image. Every
    // non-slot edit now REGISTERS in the write ledger (the trailing
    // coalescing write, forced by the run gate) — what the studio
    // shows is what the engine gets. Slots keep their immediate flush
    // below (the discrete-gesture law); the slot arm never reaches
    // here.
    /* v8 ignore next 1 -- single-render law: CardForm renders only when spec is non-null (probe 2026-09-19) */
    const shape2: string | undefined = spec !== null
      ? fieldsOf(spec).find((f) => f.name === name)?.type : undefined
    /* v8 ignore next 4 -- the tri-state atoms unset only from slot shapes; these atoms are never slots (probe 2026-09-19). image_list rides the slot flush below (THE STACK GESTURE LAW, 2026-10-13: an upload onto a stack is as discrete as a slot pick — the trailing write's delay let a close-before-flush drop it) */
    if (shape2 !== 'image' && shape2 !== 'file' && shape2 !== 'mesh' && shape2 !== 'image_list') {
      // THE FRICTIONLESS-AUTHORING CURE (the voice_name brick's
      // class, killed generically): a typed write NEVER drops on a
      // compose violation — half a required pair is a state being
      // authored, exactly what the blank law tolerates; the pending
      // face states what Run refuses until the pair completes. The
      // write registers in the ledger like every edit.
      const pendingTyped = composePendingVoice(spec, stage.params, user, { [name]: v })
      if (pendingTyped !== null) setWriteFace(pendingTyped)
      // THE ALIVE GUARD (the 2026-11-02 audit's H-6): typing is the
      // slowest write (trailing coalescing) — the door can answer
      // long after a re-target; the settle never paints a face on a
      // stage the drill no longer shows. Keys captured here, the
      // face guarded below (the unset arm's own law).
      const settleDraftId = bench.draftId
      const settleStageId = stage.id
      void scheduleStageParam(settleDraftId, settleStageId, name, v, bench.rev).then(() => {
        // the door ANSWERED: the ledger is the truth; THE ONE VOICE
        // derives from the row, never built here. The pending face
        // STANDS while its violation stands (the next write
        // re-derives; the Run press voices the full set).
        if (lastStageRef.current !== settleStageId) return
        setWriteFace(stageWriteState(settleDraftId, settleStageId).failedKeys.length > 0
          ? unlandedWriteVoice(settleDraftId, settleStageId)
          : pendingTyped)
      })
    }
    // THE SLOT FLUSH LAW (2026-09-15 — the operator's burn: "when I
    // wire an image from the previous flow, it doesn't stay after I
    // close the card"): a slot-shaped pick (image/file/mesh) is a
    // DISCRETE GESTURE, not typing — it writes the bench row NOW,
    // not at Run. Before this, the pick lived only in this modal's
    // React state; close without Run and it evaporated — the reopen
    // reseeded from a bench row that never heard it.
    // THE STACK GESTURE LAW (2026-10-13, the operator's live burn:
    // "when I close the card and reopen it, the image reference goes
    // away" — an image-edit upload): image_list rides the SAME
    // discrete law. A stack pick (upload, wire-in, clear) is one
    // gesture, not typing; the trailing coalescing write's delay
    // let a close-before-flush drop the whole upload off the bench
    // row — the reopen reseeded from a row that never heard it.
    // The slot frame below speaks the array value verbatim (a
    // non-empty array lands; the empty array rides the null-unset
    // arm, deleting the key — the door's own law).
    /* v8 ignore next 1 -- single-render law: CardForm renders only when spec is non-null (probe 2026-09-19) */
    const shape: string | undefined = spec !== null
      ? fieldsOf(spec).find((f) => f.name === name)?.type : undefined
    /* v8 ignore next 4 -- the tri-state atoms unset only from slot shapes; these atoms are never slots (probe 2026-09-19) */
    if (shape === 'image' || shape === 'file' || shape === 'mesh' || shape === 'image_list') {
      // patchStageParams wraps the door's doc (STAGE_PATCH_KEYS'
      // `params` key); the clear rides the null-unset arm (a null
      // param DELETEs its key, bench.ts's own law). THE STACK GESTURE
      // LAW rides the same empty arm: a stack cleared to [] is
      // UNSTATED (the null DELETE), never a stated-empty list.
      const slotEmpty = v === '' || (Array.isArray(v) && v.length === 0)
      const slotFrame = slotEmpty ? { [name]: null } : { [name]: v }
      // THE FRICTIONLESS-AUTHORING CURE: a slot pick is authoring —
      // it LANDS; a violation voices the pending face (Run gates).
      // The catch below still speaks the louder unlanded truth when
      // the door itself refuses (a write failure, never a compose
      // judgment).
      const pendingSlot = composePendingVoice(spec, stage.params, user, slotFrame)
      if (pendingSlot !== null) setWriteFace(pendingSlot)
      const settleDraftId = bench.draftId
      const settleStageId = stage.id
      void patchStageParams(settleDraftId, settleStageId,
        slotEmpty ? { [name]: null } : { [name]: v }, bench.rev)
        .catch((e: unknown) => {
          // THE ONE VOICE, ALIGNED (the second audit's W9 + the
          // 2026-11-02 one-home law): the slot arm speaks the SAME
          // face the other arms speak, derived from the ledger row
          // the rejection just stamped (draft.ts records e as the
          // row's lastError before it rethrows — the row owns the
          // words, the face only reads them), never a per-path
          // dialect, never the error strip's seat. The alive guard:
          // the pick is a discrete gesture, but the door can still
          // answer after a re-target or unmount.
          if (lastStageRef.current !== settleStageId) return
          setWriteFace(unlandedWriteVoice(settleDraftId, settleStageId))
        })
    }
  }, [spec, user, bench.draftId, bench.rev, stage.id])
  // THE ATOMIC PICK (2026-10-12, the operator's live break: switch
  // krea-2 turbo→raw refused 'stated cfg 3.5 is OUTSIDE the route
  // envelope for variant "turbo" — the declared envelope is [1, 2]').
  // A pick is a MARRIAGE: the variant key, its defaults, and the
  // below-axis re-seeds are ONE contract. The per-key onSet loop sent
  // cfg 3.5 (raw's default) to a bench still holding variant turbo —
  // the door judged the half-state against the OLD envelope and
  // refused, leaving unlanded keys and a lying studio. ONE write now:
  // every key of the pick's patch, one CAS, one judgment against the
  // NEW variant's envelope — the door's marriage law, honored at the
  // authoring boundary.
  const onPick = useCallback((patch: Record<string, unknown>): void => {
    // THE RE-POINT RESCOPE rides the atomic pick (the verb above):
    // a frame that changes the model key re-derives through the
    // switch law BEFORE the split, so the rescope's nulls land in
    // the same write and the same user-map merge.
    const rescoped = rePointFrame(patch)
    // THE EMPTY-SELECTION LAW rides the atomic pick too (a model
    // switch CLEARS cross-spec axes to ''): an axis key set to '' is
    // UNSTATED — it leaves the user map and its wire key rides null
    // (a DELETE, the door's own law), exactly like onSet's unset arm.
    const landed: Record<string, unknown> = {}
    const nulls: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(rescoped)) {
      // THE CARRY NULL IS A NULLS KEY (the resurrect cure's client
      // half, 2026-11-10): the pick patch's null verdicts (the
      // carried key the resolved lane does not declare —
      // dropStaleAxisCarry) ride the frame as JSON-Merge-Patch nulls
      // and LEAVE the user map; a null landed into the user map would
      // ride composeCandidateDoc verbatim (only frame nulls consume)
      // and the mirror would refuse the mark itself.
      if (axisUnset(k, v, spec) || v === null) nulls[k] = null
      else landed[k] = v
    }
    setUser((m) => {
      const next: SpecValues = { ...m }
      for (const k of Object.keys(nulls)) delete next[k]
      return { ...next, ...landed }
    })
    // the atomic pick is drill authorship (landed keys and explicit
    // slot-clears alike — the flush owns both halves)
    for (const k of Object.keys(landed)) touchedRef.current.add(k)
    for (const k of Object.keys(nulls)) touchedRef.current.add(k)
    const frame = { ...landed, ...nulls }
    // patchStageParams — NOT scheduleStageParam: the scheduler
    // coalesces PER KEY (each key its own timer and its own door
    // write), which is the half-switch again. The atomic door takes
    // the WHOLE patch in one CAS write and registers every key in
    // the ledger (in flight, per-key failure memory, confirmed rev).
    const refused = composeGateRefusal(spec, stage.params, user, frame)
    if (refused !== null) { setWriteFace(refused); return }
    // THE ALIVE GUARD (the 2026-11-02 audit's H-5): the atomic pick
    // is one CAS, but the door can still answer after a re-target —
    // neither half paints a face on a stage the drill no longer
    // shows. Keys captured here; the ledger lookup stays honest.
    const settleDraftId = bench.draftId
    const settleStageId = stage.id
    void patchStageParams(settleDraftId, settleStageId, frame, bench.rev).then(
      () => {
        // the door ANSWERED: the ledger is the truth; THE ONE VOICE
        // derives from the row (draft.ts), never built here.
        if (lastStageRef.current !== settleStageId) return
        setWriteFace(stageWriteState(settleDraftId, settleStageId).failedKeys.length > 0
          ? unlandedWriteVoice(settleDraftId, settleStageId)
          : null)
      },
      () => {
        // the promise REJECTS on refusal (the ledger keeps the
        // memory — draft.ts stamps the row before rethrowing); the
        // same ONE voice, same guard, same seat.
        if (lastStageRef.current !== settleStageId) return
        setWriteFace(unlandedWriteVoice(settleDraftId, settleStageId))
      },
    )
  }, [spec, user, bench.draftId, bench.rev, stage.id])
  // THE UNSET PATH (the settings law): removing an override is a
  // first-class edit — the key leaves the user map and the row
  // re-derives to its base (defaults <- model defaults <- base).
  // The domain write rides the Run press with the rest (a null
  // value under JSON Merge Patch semantics deletes the key) — EXCEPT
  // slots (the flush law above): an unwired slot leaves the bench
  // NOW, same gesture, same door.
  const onUnset = useCallback((name: string): void => {
    // an explicit clear is drill authorship — the flush's null rides
    touchedRef.current.add(name)
    setUser((m) => {
      if (!Object.prototype.hasOwnProperty.call(m, name)) return m
      const next: SpecValues = {}
      for (const [k, v] of Object.entries(m)) if (k !== name) next[k] = v
      return next
    })
    /* v8 ignore next 1 -- single-render law: CardForm renders only when spec is non-null (probe 2026-09-19) */
    const shape: string | undefined = spec !== null
      ? fieldsOf(spec).find((f) => f.name === name)?.type : undefined
    /* v8 ignore next 4 -- the tri-state atoms unset only from slot shapes; these atoms are never slots (probe 2026-09-19) */
    if (shape === 'image' || shape === 'file' || shape === 'mesh') {
      const refused = composeGateRefusal(spec, stage.params, user, { [name]: null })
      if (refused !== null) { setWriteFace(refused); return }
      const settleDraftId = bench.draftId
      const settleStageId = stage.id
      void patchStageParams(settleDraftId, settleStageId, { [name]: null }, bench.rev)
        .catch((e: unknown) => {
          // THE ONE VOICE (the 2026-11-02 audit's H-2): the unset's
          // door failure speaks the ledger row's face (draft.ts
          // stamped e as lastError before rethrowing) — never a raw
          // error-strip dialect. Alive guard: the unset is discrete,
          // the door can still answer after a re-target.
          if (lastStageRef.current !== settleStageId) return
          setWriteFace(unlandedWriteVoice(settleDraftId, settleStageId))
        })
    }
  }, [spec, user, bench.draftId, bench.rev, stage.id])
  // THE BANNER'S WORDS ACT (SD-7, the refusal-without-cure cure): the
  // gate refusal names a field the form does not render (the departed
  // family's own knob, an inject key the derived lane refuses) — the
  // banner's unstamp delivers the switch verb's own verdict from the
  // banner: one click writes the named key's null through the bench
  // door (JSON Merge Patch deletes the bench key) and retires the face.
  const onUnstamp = useCallback((name: string): void => {
    touchedRef.current.add(name)
    setUser((m) => {
      if (!Object.prototype.hasOwnProperty.call(m, name)) return m
      const next: SpecValues = {}
      for (const [k, v] of Object.entries(m)) if (k !== name) next[k] = v
      return next
    })
    setGateSet([])
    setError(null)
    // the WRITE FACE too: the trailing write's gate voiced the same
    // field-named refusal on its own face — its subject just left the
    // bench, so the words retire with it (a later refusal re-voices).
    setWriteFace((cur) => (cur !== null && cur.includes("'" + name + "'") ? null : cur))
    const settleDraftId = bench.draftId
    const settleStageId = stage.id
    void patchStageParams(settleDraftId, settleStageId, { [name]: null }, bench.rev)
      .catch(() => {
        // the same one-voice law as onUnset's slot half: the unstamp's
        // door failure speaks the ledger row's face (alive-guarded —
        // a re-target orphans the answer).
        if (lastStageRef.current !== settleStageId) return
        setWriteFace(unlandedWriteVoice(settleDraftId, settleStageId))
      })
  }, [bench.draftId, bench.rev, stage.id])
  // THE RESOLVED VALUE — derived per render (never state): exactly
  // what a Run composes, what the prompt tile and the enhance sweep
  // read, what the form shows. THE SERVED BASE (hour-26 stroke 15,
  // the 1:1 run law): the row's `resolved` map — prepareCardParams'
  // own stamps, served by the drafts doors — layers under the user
  // and over the client's guesses (one resolver, served to the
  // visual; absent = the registry-less lane derive).
  // THE BASE STRIKE (audits 018 C4 + 016 C5, the client half): the
  // base is the LAST RUN's stamp plane — after a pick re-keys the
  // lane, its stamps for the departed lane resurrect through the
  // cascade's null-skip and the studio re-offers a coordinate the
  // next run refuses. The strike retires the dead stamps before the
  // cascade and NAMES them (the note below); the mirror's own judges
  // decide, never a second spelling.
  const servedBaseRaw: SpecValues | undefined =
    typeof stage.resolved === 'object' && stage.resolved !== null && !Array.isArray(stage.resolved)
      ? stage.resolved as SpecValues : undefined
  const laneStrike = strikeDeadLaneStamps(spec, user, servedBaseRaw)
  const servedBase: SpecValues | undefined = servedBaseRaw === undefined ? undefined : laneStrike.base
  const value: SpecValues = resolveValue(spec ?? { form: '' }, user, servedBase)
  // THE STRIKE NOTE'S DISMISSAL (the enhance-note grammar): the ×
  // retires the note; a NEW strike set re-voices (the dismissal keys
  // on the set, never a blind latch).
  const [strikeDismissed, setStrikeDismissed] = useState(false)
  const strikeKey = laneStrike.strikes.join('\u0000')
  useEffect(() => { setStrikeDismissed(false) }, [strikeKey])
  // THE MISS FACE'S DISMISSAL (audit 017 C4 — every failure face
  // carries the ×): the × retires the stage-view load refusal; a NEW
  // stage or a changed declaration re-voices (the dismissal keys on
  // the pair). Hooked HERE with the drill's other state — the
  // group-stage branch returns early below, and a hook after it
  // would change the render's hook count by stage kind.
  const [missDismissed, setMissDismissed] = useState(false)
  const declaredStudioEarly = typeof spec?.stage_view === 'string' && spec.stage_view !== '' ? spec.stage_view : null
  useEffect(() => { setMissDismissed(false) }, [stage.id, declaredStudioEarly])
  // ✦ AGENT ENHANCE (hour 24 stroke 10 — the operator's one-shot
  // order): one press gathers the card's prompt text, the sweep door
  // (/melite-tools/enhance {model, prompt}) enhances EVERY declared
  // field over the model's own SKILL.md recipe, and the results land
  // through the SAME values seam a hand edit rides. The no-clobber
  // law is the old tree's verbatim: the negative carries back ONLY
  // for the prompt field, ONLY when the card declares it, ONLY when
  // the backend produced one — never wipe an existing negative with
  // an empty string (distilled variants return "" because they
  // ignore negatives).
  const enhance = async (): Promise<void> => {
    // THE NO-SILENT-REJECT LAW (the operator's word: "I should never
    // get auto rejected without an error message"): EVERY rejection
    // renders its face — no guard in this verb returns quietly.
    /* v8 ignore next 4 -- zoom.tsx serializes enhance to one flight (probe 2026-09-19): re-entry never observes enhancing=true */
    if (enhancing) {
      setEnhanceNote({ err: true, text: chromeCopy.enhanceAlreadyRunning })
      return
    }
    const current = String(value['prompt'] ?? '').trim()
    if (current === '') {
      setEnhanceNote({ err: true, text: chromeCopy.enhanceEmptyPrompt })
      return
    }
    const model = String(spec?.model ?? held['model'] ?? '')
    if (model === '') {
      setEnhanceNote({ err: true, text: chromeCopy.enhanceNoModel })
      return
    }
    setEnhancing(true)
    setEnhanceNote(null)
    enhanceAbort.current?.abort()
    const flight = new AbortController()
    enhanceAbort.current = flight
    // THE STALE PICK (audit V-S6): the door validates a picked route
    // against the LIVE list and answers 400 "enhance: unknown llm
    // route … \"<name>\"" — on that voice the stored preference is
    // cleared and the verb retries ONCE on Auto (the recovery the
    // cardLlm contract promises), never a silent substitution.
    type EnhanceDoc = {
      results?: Record<string, { positive?: unknown, negative?: unknown, via?: unknown }>
      error?: unknown
    }
    const callEnhance = async (llm: string | undefined): Promise<{ res: Response; raw: string; doc: EnhanceDoc }> => {
      const res = await fetch('/melite-tools/enhance', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model, prompt: current, ...(llm !== undefined ? { llm } : {}) }),
        signal: flight.signal,
      })
      if (flight.signal.aborted) throw new DOMException('The enhance was aborted', 'AbortError')
      // read TEXT first — a non-JSON error body must surface its own
      // words, never a JSON parse stack trace
      const raw = await res.text()
      let doc: EnhanceDoc = {}
      try { doc = JSON.parse(raw) as EnhanceDoc } catch { /* handled below */ }
      if (!res.ok || typeof doc.error === 'string') {
        // NO res.ok-true MIDDLE ARM (the entry condition's ok path
        // requires error-is-string, which voices doc.error above — a
        // middle 'unexpected payload' would be untestable dead code).
        throw new Error(typeof doc.error === 'string' ? doc.error
          : 'enhance failed (' + res.status + (raw.length > 0 && raw.length < 200 ? ': ' + raw : '') + ')')
      }
      return { res, raw, doc }
    }
    try {
      const llm = cardLlmArg()
      let answered: { res: Response; raw: string; doc: EnhanceDoc }
      try {
        answered = await callEnhance(llm)
      } catch (e: unknown) {
        const stale = e instanceof Error
          && e.message.startsWith('enhance: unknown llm route')
          && llm !== undefined && e.message.includes('"' + llm + '"')
        if (!stale) throw e
        setCardLlm(null)
        answered = await callEnhance(undefined)
      }
      const { doc } = answered
      const results = doc.results ?? {}
      const declared = new Set(spec !== null ? fieldsOf(spec).map((f) => f.name) : [])
      // THE SWEPT PATCH (the write-seat audit's finding 3): the sweep
      // used to setUser ALONE — an enhanced prompt lived in this
      // modal's state and EVAPORATED on close-without-Run, the exact
      // death the authoring contract killed for typing. The swept
      // values now register in the write ledger like every other
      // edit: what the studio shows is what the engine gets.
      const sweptPatch: Record<string, unknown> = {}
      // THE EDIT BOUNDARY OWNS COERCION (the second audit's W10):
      // the enhancer speaks raw strings; a declared NUMBER/BOOLEAN
      // field must receive what a HAND edit would produce (the
      // coerced value), or the write lands a param shape the run's
      // schema parse refuses — a shape no hand edit can even make.
      const fieldByName = new Map(spec !== null ? fieldsOf(spec).map((f) => [f.name, f] as const) : [])
      for (const [field, r] of Object.entries(results)) {
        if (typeof r?.positive !== 'string' || r.positive === '') continue
        if (field === 'prompt' || declared.has(field)) {
          sweptPatch[field] = coerceFieldEdit(fieldByName.get(field), r.positive)
        }
        if (field === 'prompt' && declared.has('negative_prompt')
          && typeof r.negative === 'string' && r.negative !== '') {
          sweptPatch['negative_prompt'] = coerceFieldEdit(fieldByName.get('negative_prompt'), r.negative)
        }
      }
      // the sweep is drill authorship: its keys take the gesture face
      // while the atomic write flies (the live-doc law below reads the
      // touch, so the enhanced value shows the moment it is authored)
      for (const k of Object.keys(sweptPatch)) touchedRef.current.add(k)
      setUser((m) => ({ ...m, ...sweptPatch }))
      if (Object.keys(sweptPatch).length > 0) {
        // ONE atomic write (2026-10-12 construction law): the sweep is
        // a discrete gesture, not typing — it lands as ONE frame so
        // the door judges the swept fields together, never the
        // half-swept state the per-key scheduler would produce.
        // THE FRICTIONLESS-AUTHORING CURE: a violation on the swept
        // doc voices the pending face (Run gates) — the sweep LANDS
        // (an enhanced prompt is authoring, never a dropped write).
        const pendingSwept = composePendingVoice(spec, stage.params, user, sweptPatch)
        if (pendingSwept !== null) setWriteFace(pendingSwept)
        // THE ALIVE GUARD (client-plane RISK-3, 2026-10-20): same law
        // as the per-key settle above — the keys are captured here so
        // the ledger lookup stays honest, and both settle faces stand
        // down when the drill has re-targeted before the door
        // answered (lastStageRef holds the stage shown NOW).
        const settleDraftId = bench.draftId
        const settleStageId = stage.id
        void patchStageParams(settleDraftId, settleStageId, sweptPatch, bench.rev).then(() => {
          // THE ONE VOICE (the 2026-11-02 audit's H-4): the sweep is
          // a write like every other write — its failure face is the
          // row's voice (draft.ts's unlandedWriteVoice), never a
          // second "ENHANCE" dialect. The success half keeps a
          // standing pending face (the violation did not heal by
          // landing; the next write re-derives).
          if (lastStageRef.current !== settleStageId) return
          setWriteFace(stageWriteState(settleDraftId, settleStageId).failedKeys.length > 0
            ? unlandedWriteVoice(settleDraftId, settleStageId)
            : pendingSwept)
        }).catch((e: unknown) => {
          // the sweep write is fire-and-forget; the verb's outer
          // catch cannot see it — the NO-SILENT-REJECT law holds
          // here too: the rejection renders its face, the ROW's
          // voice (draft.ts stamped e before rethrowing — keys and
          // reason both), same as every write path.
          if (lastStageRef.current !== settleStageId) return
          setWriteFace(unlandedWriteVoice(settleDraftId, settleStageId))
        })
      }
      // the note counts what the PATCH carries (the second audit's
      // W10: sweptPatch may carry negative_prompt beyond the positive
      // declared fields — the note used to count a different set
      // than the write)
      const swept = Object.keys(sweptPatch).length
      if (swept === 0) {
        // the call "succeeded" but nothing landed — that is a
        // rejection with the server's shape as its reason, not a
        // silent no-op and never a lying 'enhanced'
        setEnhanceNote({ err: true, text: chromeCopy.enhanceNoFields({ fields: Object.keys(results).join(', ') }) })
      } else {
        const via = Object.values(results)[0]?.via
        setEnhanceNote({ err: false, text: typeof via === 'string' && via !== '' ? chromeCopy.enhancedVia({ via, count: swept }) : chromeCopy.enhancedCount({ count: swept }) })
      }
    } catch (e: unknown) {
      setEnhanceNote({ err: true, text: rejectionVoice(e) })
    } finally {
      setEnhancing(false)
    }
  }
  // THE PICKER WIRE (data only — the CONSTRUCTOR owns the square now,
  //  the operator's law: an emitted image input constructs the input
  //  component automatically, no surface wires it). candidatesFor
  //  narrows the picker per the DECLARED input-edge kind (THE EDGE LAW).
  // loadMedia rides the mounted media namespace (the one-lane law —
  // the form's picker receives its rows INJECTED, never a fetch of
  // its own).
  const wire = { candidates, candidatesFor, loadMedia: fetchMediaLibrary }
  const run = async (): Promise<void> => {
    setError(null)
    try {
      // THE ARRIVAL-WINDOW FENCE (P4 remainder — the gesture→settle
      // one-round-trip gap, 2026-11-08): a press while the arrival
      // spec is still settling judges NOTHING and fires NOTHING —
      // the flush against the stale spec is the burn (the departed
      // pair rides the run). The fence voices the pending family and
      // stands down at the settle; the operator presses Run again
      // once the form lands. First, before any flush work: a
      // half-landed patch under the old spec is exactly what the
      // window must never write.
      const pending = pendingSpecRef.current
      if (pending !== null) {
        setGateSet([]); setError(`the ${pending.family} spec is still settling — press Run again once the form lands`)
        return
      }
      // THE USER LAYER RIDES VERBATIM (the parameter audit): the
      // explicit map's TOUCHED domain — params, axis keys, macro
      // stamps — presence IS the truth the engine composes. THE
      // WRITE DOMAIN (2026-10-16, the loras revert — journey audit
      // e17d1ee8): the flush used to write the WHOLE user map, but
      // the map is seeded ONCE at open while `held` is live — every
      // key the STUDIO (or the wire menu, or the agent) moved after
      // open read as stale seed and was REVERTED at Run press (the
      // operator's burn verbatim: 'I add it, and drop it. The result
      // is the same.' — the mod bag was the visible case because the
      // birth recipe guarantees the key exists in the seed). The
      // write half now rides the SAME domain law the 2026-10-11 void
      // cure gave the null half: only what THIS drill authored
      // (touched) is written; only what it authored or deliberately
      // dropped (the dead recipe layer) is nulled. Foreign-since-open
      // keys ride through untouched, both directions.
      // Keys the drill held that left the user map ride as nulls
      // (JSON Merge Patch: null deletes — the unset's domain half).
      // An already-matching patch skips the write (a noise guard,
      // never a semantic — marking is by presence, this only avoids
      // re-writing the same bench).
      const patch: SpecValues = {}
      const userKeys = new Set(Object.keys(user))
      const heldKeys = new Set(Object.keys(held))
      for (const k of userKeys) {
        if (touchedRef.current.has(k)) patch[k] = user[k]
      }
      for (const k of heldKeys) {
        if (!userKeys.has(k) && (touchedRef.current.has(k) || droppedRef.current.has(k))) patch[k] = null
      }
      const sameAsHeld = Object.keys(patch).length > 0
        && Object.entries(patch).every(([k, v]) => heldKeys.has(k) && Object.is(held[k], v))
      if (Object.keys(patch).length > 0 && !sameAsHeld) {
        // THE GATE JUDGES THE DOC THE PRESS LANDS (the post-sync
        // base — the purge's P4 root, 2026-11-08): the flush's own
        // nulls apply to the base BEFORE the gate judges. Judging
        // the PRE-sync base refused states this very press deletes —
        // the live B8 banner (a departed key the seed dropped, the
        // flush about to null it, the gate refusing the ghost
        // anyway). JSON Merge Patch semantics on the base: null
        // deletes, values write; the touched writes are already the
        // user overlay's verdicts, applied here too so the judged
        // candidate is exactly the doc that reaches the bench.
        const baseAfterSync: Record<string, unknown> = { ...held }
        for (const [k, v] of Object.entries(patch)) {
          if (v === null) delete baseAfterSync[k]
          else baseAfterSync[k] = v
        }
        // THE COMPOSE GATE AT THE RUN SEAT: the full-doc sync is a
        // write like any other — an invalid candidate refuses HERE,
        // in the studio, before anything reaches the engine. THE
        // SINGULARITY CURE: the WHOLE judged set lands on the ONE
        // strip — one row per refusal, each row's words acting
        // through its own field-named unstamp; the banner stands
        // down for every voiced row (mutedViolations).
        const gateViolations = composeGateViolations(spec, baseAfterSync, user, {})
        if (gateViolations.length > 0) {
          setError(gateViolations.map((v) => gateRefusalVoice(v)).join('\n'))
          setGateSet(gateViolations)
          return
        }
        try {
          await patchStageParams(bench.draftId, stage.id, patch, bench.rev)
        } catch {
          // A refused sync is a WRITE failure — the write stamped the
          // ledger row (failedKeys + lastError) before it threw, so
          // this seat speaks the ROW'S voice (the same voice the run
          // fence refuses on), never a bare rejection string the row
          // never heard of. The resync pulls the fresh rev so the
          // next press re-tries against the doc that actually landed.
          setGateSet([]); setError(unlandedWriteVoice(bench.draftId, stage.id))
          onResync?.()
          return
        }
      }
      // THE RUN FENCE (Cure 4, 2026-10-27 — the one-press/one-engine
      // law's drill seat): the drill's own patch is landed above,
      // but the STAGE's other channels — the studio's trailing
      // writes, a wire-menu send still in flight, a failed key —
      // are not. The press settles the whole ledger BEFORE the
      // start: a refusal voices HERE (the drill's own face) and the
      // start never fires. The bench door (runCardStage) keeps its
      // own gate — defense in depth, never delegation: this drill's
      // onRun prop may be any host's verb, and a bare start must be
      // unexpressible from this seat.
      const fence = await refuseForUnlandedWrite(bench.draftId, stage.id)
      if (fence !== null) { setGateSet([]); setError(fence); return }
      onRun()
    } catch (e: unknown) {
      // The write's own throw never reaches here (the sync's inner
      // catch speaks the ledger row's voice); this arm guards the
      // non-write failures of the press — the fence's ledger read
      // and the host's onRun verb — where the bare reason is the
      // whole story and no row exists to voice it.
      setGateSet([]); setError(rejectionVoice(e))
      onResync?.()
    }
  }
  // THE GESTURE BINDING (hour-26, the 1:1 law): the frame's top-bar
  // Run pill calls THIS verb — the flush-then-start law the drill
  // owns. A REF DISPATCHER: the bound fn is STABLE (bound once —
  // never a re-render loop) yet always runs the CURRENT closure
  // (the ref re-points every render; the verb reads it at call
  // time, so the flush sees the latest user/held maps).
  const runRef = useRef(run)
  runRef.current = run
  useEffect(() => {
    bindRun?.(() => { void runRef.current() })
  }, [bindRun])
  // THE ✦ BINDING (stroke 23): a STABLE wrapper over the ref — the
  // bar's capsule calls the CURRENT closure, bound once per mount
  const enhanceRef = useRef(enhance)
  enhanceRef.current = enhance
  useEffect(() => {
    bindEnhance?.(() => enhanceRef.current())
  }, [bindEnhance])
  const remove = async (): Promise<void> => {
    setError(null)
    setRemoving(true)
    try {
      await removeStageWire({ stage: stage.id, expect_rev: bench.rev }, bench.sessionKey)
      // THE LEDGER'S INVALIDATION (audit V-S5): the removed stage's
      // write rows go with it
      forgetStageWrites(bench.draftId, [stage.id])
      onRemoved()
    } catch (e: unknown) {
      setGateSet([]); setError(rejectionVoice(e))
      setRemoving(false)
      // THE RESYNC LAW: a final refusal (even post-rebase) means this
      // drill's bench view is stale truth — re-read so the next
      // gesture composes against the world as it stands.
      onResync?.()
    }
  }
  // THE GROUP FACE: a compound's drill is its member list + Ungroup
  // (no params, no Run — compounds organize; chain-running rides the
  // multi-stage estate debt, surfaced not hidden).
  if (stage.card === 'group') {
    const members: BenchStageView[] = Array.isArray(stage.children)
      ? stage.children.filter((c): c is BenchStageView =>
          typeof c === 'object' && c !== null && typeof Reflect.get(c, 'id') === 'string') : []
    const ungroup = async (): Promise<void> => {
      setError(null)
      setRemoving(true)
      try {
        await ungroupStageWire({ stage: stage.id, expect_rev: bench.rev }, bench.sessionKey)
        onRemoved()
      } catch (e: unknown) {
        setGateSet([]); setError(rejectionVoice(e))
        setRemoving(false)
        onResync?.()
      }
    }
    return h(ScrollLockedDetail, null,
      h('p', { className: css.groupNote },
        'A compound of ' + String(members.length) + ' stages. Ungroup restores them at this position.'),
      h('ol', { className: css.memberList },
        members.map((m, i) => h('li', { key: m.id, className: css.memberRow },
          h('span', { className: css.memberIdx }, String(i + 1) + '.'),
          h('span', { className: css.memberName }, String(m.title ?? m.card ?? m.id)),
        ))),
      h('div', { className: css.runRow },
        // THE ERROR DISMISS (operator 2026-11-05: stuck FOREVER) —
        // the red × retires the group face; the next verb re-arms.
        error !== null ? h('span', { className: css.runError }, error,
          h(Button, {
            size: 'sm', variant: 'ghost', className: css.errorDismiss,
            'aria-label': chromeCopy.dismissError,
            onClick: () => { setError(null) },
          }, h(IconCloseOutlineRegular, { size: 12 })),
        ) : null,
        h(Button, {
          size: 'sm',
          variant: 'outline',
          disabled: removing,
          onClick: () => { void ungroup() },
        }, removing ? chromeCopy.ungroupingWord : chromeCopy.ungroupWord),
      ),
    )
  }
  // THE ZOOM DETAIL (2026-09-11): no Modal — this renders INSIDE the
  // shared-element zoom card (the tile's morph target). The params/
  // Run split is the old drill content, container is the zoom card.
  // THE SURFACE SLOT (the ui-tool law): a registered card view takes
  // over the whole detail; unclaimed key renders this generic body.
  // THE PREVIEW SEAM CONSULT (hour-9 law — the operator: "notice how
  // image gen rides the defaults… that shared seem should go to teh
  // RIGHT of the input parameters"): the stage's rendered outputs
  // preview through the cards.stage.preview slot, keyed by media
  // kind, with the card-base SHARED previews as the defaults. The
  // consult sits in the drill's RIGHT column — params LEFT, preview
  // RIGHT, the same law as the studio's rail/center.
  // THE DRILLDOWN ITEM MAPPER (one spelling — the open site builds
  // THE STICKY ARTIFACTS LAW (one spelling, both seats): the
  // row's live harvest — or, when the row's urls are cleared
  // (a run in flight, a stopped run that never landed), the
  // HISTORY HEAD. No client memory (ledger #44: the
  // stickyArtifactsRef is deleted): the estate's archive law
  // pushes the superseded landed result into history in the SAME
  // write that clears the row, so the head IS the last landed
  // generation — a pure projection of server state. The hero
  // never jumps to an old archive mid-run, and never blanks.
  // THE EMPTY-FACE FALLBACK (2026-09-21, the operator's catch:
  // "when the last gen is stopped, there is no way to recover the
  // ACTUAL LATEST GEN until I make a new one"): a row whose current
  // result carries NO outputs (a stopped/failed run never landed)
  // must not render an EMPTY hero while the stage's history head
  // IS the latest landed gen — the face falls to it. The strip
  // stays the trail; the pick/badge law is unchanged.
  const stageArtifacts = (): Array<{ name: string, url: string }> => {
    const rowArtifacts = previewArtifactsFor(stage as unknown as Record<string, unknown>)
    if (rowArtifacts.length > 0) return rowArtifacts
    const hist = Array.isArray((stage as unknown as { history?: unknown }).history)
      ? ((stage as unknown as { history: unknown[] }).history)
      : []
    const head = hist[0] as Record<string, unknown> | undefined
    return head !== undefined ? previewArtifactsFor({ result: head }) : []
  }
  const drillItemOf = (a: { name: string, url: string }, kind: string): MediaDrilldownItem => ({
    kind: (kind === 'mesh' ? 'model' : kind) as MediaDrilldownItem['kind'],
    url: a.url,
    /* v8 ignore next 1 -- split('/').pop() is never undefined on a non-empty url (probe 2026-09-19) */
    file: a.name !== '' && a.name !== 'output' ? a.name : a.url.split('/').pop() ?? a.url,
    head: String(stage.title ?? stage.card ?? stage.id),
    time: '',
  })
  const stagePreview = (): ReturnType<typeof h> | null => {
    if (renderPreview === undefined) return null
    const artifacts = stageArtifacts()
    const heroUrl = artifacts[0]?.url ?? ''
    // the card's DECLARED primary output drives the kind (the spec is
    // already in hand for the form); the url sniff only stands in when
    // the declaration is absent or non-previewable
    const kind = primaryKindFor(spec, heroUrl)
    if (kind === null) return null
    // THE OUTPUT HISTORY (stroke 40): the estate archives the stage's
    // previous results (each a result-shaped row) — newest first,
    // capped, unique by url set. Each entry walks the SAME artifact
    // harvest as the hero's own result (one spelling — the history
    // and the hero can never disagree about what a run produced).
    const historyRaw = Array.isArray((stage as Record<string, unknown>)['history'])
      ? ((stage as Record<string, unknown>)['history'] as unknown[])
      : []
    // THE ONE-ROW-PER-RUN RAIL (D16, 2026-10-22): the write path's
    // archive dedup (the estate's trail laws) only guards NEW
    // archives — a doc whose history was written before the run-id
    // law still holds two rows for one run (media route vs gallery
    // proxy spelling), and the rail rendered them both. The face
    // walks every read through the same law, so a polluted doc shows
    // one tile per run and a clean doc is unchanged (first-wins).
    const historyRows = trailDedupe(historyRaw)
    // THE PARAMS CHIP: each archived generation may carry its params
    // snapshot (taken at ITS landing) — the note names the keys that
    // differ from the live params. One pass harvests artifacts AND
    // note together, so the arrays stay index-aligned by construction
    // (an entry without a snapshot keeps an EMPTY slot — alignment
    // over density; the owner omits the field when no entry differs).
    const liveParams = stage.params
    const pairs = historyRows
      .map((e) => ({
        arts: previewArtifactsFor({ result: e }),
        note: paramsDiffKeys((e as Record<string, unknown>)['params'], liveParams) ?? '',
      }))
      .filter((p) => p.arts.length > 0)
    const history = pairs.map((p) => p.arts)
    const noteList = pairs.map((p) => p.note)
    const historyNotes = noteList.some((n) => n !== '') ? noteList : undefined
    const owner = {
      kind, artifacts,
      runStatus: typeof stage.runStatus === 'string' ? stage.runStatus : '',
      stageId: stage.id,
      // THE RUN IDENTITY (2026-09-20, the pick-cell key): the
      // result row's run_id — STABLE across the run cycle (start
      // patch {run_id}-only → terminal), so a picked history tile
      // survives the mid-run url churn (the "random when I click"
      // catch); a new run is a fresh cell by construction.
      runId: String(((stage as Record<string, unknown>)['result'] as { run_id?: unknown } | undefined)?.run_id ?? ''),
      ...(history.length > 0 ? { history } : {}),
      ...(historyNotes !== undefined ? { historyNotes } : {}),
      // THE STRIP OPT-OUT (gap 4, stroke 67): the SERVED doc's
      // preview.historyStrip — door-served off the card's own
      // declaration, never a client-side guess per card id.
      ...((spec as { preview?: { historyStrip?: boolean } } | null)?.preview?.historyStrip === false
        ? { historyStrip: false }
        : {}),
      // THE LIVE FIGURE (stroke 90 + the live follow-up): the SERVED
      // doc's preview.figure claim (identityModel) + the LIVE shape
      // arms derived from the card's RESOLVED params — the identity
      // group's fields (order-sorted) become the coeff vector; the
      // morph group's non-zero values become local_changes. The
      // figure RESHAPES as the user drags (the studio's live
      // sculpt, on the shared fetchBindMesh surface).
      ...(spec?.preview?.figure !== undefined
        ? {
            figure: {
              identityModel: spec.preview.figure.identityModel,
              ...(figureCoeffsOf(spec, value) !== null ? { identityCoeffs: figureCoeffsOf(spec, value) } : {}),
              ...(figureLocalChangesOf(spec, value) !== null ? { localChanges: figureLocalChangesOf(spec, value) } : {}),
              ...figureCameraOf(spec, value),
            },
          }
        : {}),
      // THE ATTACHED MESH (the (j) law, 2026-11-08 — ERRORS.md:89
      // "BODY GLB does not do what it is supposed to do on the anny
      // card, that is become the anny model preview"): the served
      // schema's mesh-kind fields × the resolved values → stage
      // assets (whitespace IS emptiness — anny's own compose law).
      // The preview shows the body THE RUN WOULD BAKE: an attached
      // GLB renders as-is through the input asset door, and the
      // parametric figure retires inside MeshStagePreview (compose
      // mirrors this exactly — a non-empty body_glb renders the GLB
      // as-is, only the empty path bakes AnnyParamsToGlb).
      ...(attachedMeshOf(spec, value) !== null ? { attachedMesh: attachedMeshOf(spec, value)! } : {}),
      // THE ATTACHED IMAGE (the input-pin law, operator 2026-10-20,
      // E2-1 — supersedes the (l) pre-run-face law, burn verbatim:
      // "IT JUST PASTES THE IMAGE OVER THE ANNY PREVIEW"): the
      // FIRST non-empty image-kind input is the estimator's INPUT,
      // never the preview's seat — it hands MeshStagePreview its
      // ReferenceImageBadge pin (the photo beside the stage), while
      // the 3D seat keeps the card's own body (attached GLB > native
      // figure) and the converted body arrives only via run
      // artifacts. Whitespace IS emptiness (the fall returns to the
      // mesh arm). ONE derivation, mirrored — never a drifting copy.
      ...(attachedImageOf(spec, value) !== null ? { attachedImage: attachedImageOf(spec, value)! } : {}),
    }
    // THE SEAM'S PREVIEW FACE: a claimed timeline + a landed video
    // rides the shared FilmPlayer (handle-wired) instead of the
    // plain video face — the bottom bar scrubs it.
    const fallback = kind === 'video' && seamFilmUrl !== null
      ? h(FilmSeamPlayer, { seam: filmSeam, src: seamFilmUrl })
      : kind === 'video'
      ? h(VideoStagePreview, owner)
      : kind === 'audio'
        ? h(AudioStagePreview, owner)
        : kind === 'mesh'
          ? h(MeshStagePreview, owner)
          : kind === 'text'
            // THE TAGGER SEAT (2026-10-24, the operator's catch: "the
            // output text isn't available in the card preview"): a
            // declared text output previews its WORDS — fetched,
            // readable, copyable — never a dead tile.
            ? h(TextStagePreview, owner)
            : h(ImageStagePreview, owner)
    // THE PRE-RUN FIGURE FACE: a card that declares preview.figure
    // shows the native figure BEFORE ANY RUN — whatever its output
    // kind (the kind switch routes by the DECLARED OUTPUT, which
    // can differ from the figure's). The figure is the authoring
    // viewport: it owns the stage while NO artifacts exist; the
    // run's own kind takes over the moment one does (run outputs
    // take the stage once they exist — every kind, not only mesh).
    // THE ATTACHED MESH rides the same pre-run seat (the (j) law):
    // a held mesh-kind input owns the stage through MeshStagePreview
    // — its attached arm renders the GLB as-is and retires the
    // figure inside — with the identical takeover law. THE ATTACHED
    // IMAGE (the (l) law) rides it too: a held image-kind input
    // owns the seat over both (compose's image > glb > parametric)
    // — ON THE MESH LANE ALONE (the estimator's own home, the anny
    // burn the law was cut for). The openjutsu burn (2026-10-28,
    // operator: "the preview has the image I input… it should be
    // blank until the video is there" + "it says rendering… mesh
    // lands here"): a VIDEO card whose ref_image is image-kind rode
    // the ungated arm into the mesh tombstone pre-run. Every other
    // kind keeps its OWN face's honest empty state — a video card
    // is blank until the film lands.
    if ((owner.figure !== undefined || owner.attachedMesh !== undefined || (owner.attachedImage !== undefined && kind === 'mesh')) && artifacts.length === 0) {
      return renderPreview(owner, h(MeshStagePreview, owner))
    }
    return renderPreview(owner, fallback)
  }
  // THE WEBHOOK FEED (stroke 46b, the operator's order: "see the
  // received webhooks in the drilled-out view"): the engine's /ws
  // progress tap folds activity + progress onto the stage rows — the
  // drill renders them LIVE (the tile keeps its percent pill).
  const activity = typeof (stage as { activity?: unknown }).activity === 'string'
    ? (stage as { activity?: unknown }).activity as string : ''
  const progress = (stage as { progress?: { value: number, max: number } | null }).progress ?? null
  // THE FINISHING LAW (cure B, 2026-10-28): same per-node lie as the
  // tile — a ceiling value on a still-running row says finishing,
  // never a run-wide 100%. The zero-max face is the old law: no
  // percent at all, never a divide.
  const bounded = progress !== null && progress.max > 0
  const webhookFeed = h('div', { className: css.runRow, 'data-testid': 'drill-webhooks' },
    activity !== '' ? h('span', { className: css.tilePct, 'aria-label': chromeCopy.engineActivity }, activity) : null,
    bounded ? h('span', { className: css.tilePct, 'data-testid': 'drill-progress', 'aria-label': chromeCopy.progressPercent },
      progress.value >= progress.max
        ? 'finishing (' + String(progress.value) + '/' + String(progress.max) + ')'
        : Math.floor((100 * progress.value) / progress.max) + '% (' + String(progress.value) + '/' + String(progress.max) + ')') : null,
  )
  // THE SEAM'S LANDED FILM (shared by both slots): the spec claims
  // preview.timeline AND a video artifact exists — else no seam.
  const seamFilmUrl = (spec as { preview?: { timeline?: boolean } } | null)?.preview?.timeline === true
    ? (previewArtifactsFor(stage as unknown as Record<string, unknown>)
        .find((a) => primaryKindFor(spec, a.url) === 'video')?.url ?? null)
    : null
  const genericDetail = (): ReturnType<typeof h> => h(ScrollLockedDetail, null,
    webhookFeed,
    // THE UNIFORM SHELL (hour 24 stroke 15 — the operator's sharing
    // call): the zoom rides the SAME StudioShell every studio card
    // rides — one params-scroll law, one three-slot shape. The zoom's
    // outputs column claims the preview slot.
    h(StudioShell, {
    bottom: seamFilmUrl !== null
      ? h(ScrollLockedDetail, { testid: 'timeline-seam-bottom' },
          h(FilmSeamBar, { seam: filmSeam }))
      : undefined,
    params: h('div', { className: css.paramsCol },
        // the ✦ row is a HEADER ACTION, never scroll content (hour 24
        // stroke 12: flush at the params column's scroll top, the
        // button's capsule top clipped under the boundary — the row
        // now rides ABOVE the scrolling list and never moves)
        // THE ✦ BUTTON RETIRED FROM THE RAIL (stroke 23, the operator's
        // law: it rides the top bar beside Run now — the frame's
        // capsule, this rail keeps only the note as inline feedback)
        enhanceNote !== null
          ? h('div', { className: css.enhanceRow, 'data-testid': 'enhance-note' },
              // THE ERROR DISMISS (operator 2026-11-05: stuck FOREVER):
              // the red × retires the note — success or refusal, the
              // next enhance press re-arms it.
              h('span', { className: enhanceNote.err ? css.runError : css.enhanceNote }, enhanceNote.text,
                h(Button, {
                  size: 'sm', variant: 'ghost', className: css.errorDismiss,
                  'aria-label': chromeCopy.dismissError,
                  onClick: () => { setEnhanceNote(null) },
                }, h(IconCloseOutlineRegular, { size: 12 }))))
          : null,
        // THE BASE-STRIKE NOTE (audits 018 C4 + 016 C5): the strike is
        // never silent — the retired stamps are named, the × retires
        // the note, and a NEW strike set re-voices.
        servedBaseRaw !== undefined && laneStrike.strikes.length > 0 && !strikeDismissed
          ? h('div', { className: css.enhanceRow, 'data-testid': 'lane-strike-note' },
              h('span', { className: css.enhanceNote }, chromeCopy.laneStrikeNote({ keys: laneStrike.strikes }),
                h(Button, {
                  size: 'sm', variant: 'ghost', className: css.errorDismiss,
                  'aria-label': chromeCopy.dismissError,
                  onClick: () => { setStrikeDismissed(true) },
                }, h(IconCloseOutlineRegular, { size: 12 }))))
          : null,
        h('div', { className: css.params },
        !loaded ? h('div', { className: css.load }, 'form…')
        : spec !== null
          ? h(CardForm, {
            spec, user, base: servedBase, onSet, onPick, onUnset, wire,
            // THE ONE-VOICE LAW (E2-12, "I SEE IT 3 TIMES"; the
            // singularity cure rides it): the gate messages the
            // strip's judged SET voices — one entry per refusal, not
            // just [0] — plus the write face's own, when distinct.
            // The banner stands down for those (its header too, when
            // fully muted); every other violation still banners.
            mutedViolations: [
              ...gateSet.map((v) => v.message),
              gateRefusalMessage(error),
              gateRefusalMessage(writeFace === error ? null : writeFace),
            ].filter((m): m is string => m !== null),
            onPatch: onPatchParams,
            // THE TWO PROMPTS' ARMS (stroke 18, the operator's law:
            // offered-but-absent PROMPTS, never blocks): a boarded
            // model not on the machine → provision_model; a declared
            // extension pack the engine cannot see → install_extension.
            // Both ride the manage door's wire (the user gesture is
            // the click; the reply's truth renders inline).
            onDownloadModel: (id: string) => postManageAction('provision_model', { model: id })
              .then((r) => r.ok),
            onInstallPack: (id: string) => postManageAction('install_extension', { nodes: [id] })
              .then((r) => r.ok),
            // THE PAINT FACE (embedded, stroke 95): the brush canvas
            // at the top of the mod leaf + the reference field
            // (mask's input_image — the kind declaration gates
            // the canvas; other cards never see it).
            paintFace: PaintLeafCanvas,
            // THE BBOX FACE (stroke 78, embedded stroke 95): the
            // selection canvas for bbox-canvas kinds (sam2/sam3) —
            // same reference law.
            bboxFace: BboxLeafCanvas,
            paintReference: 'input_image',
          })
        : h('pre', { className: css.mono }, JSON.stringify(held, null, 2)),
        ),
        // THE RUN SEAT RETIRED (hour-26, the operator: the play
        // button rides the top bar and the comfyui progress webhooks
        // surface in the strip under it — the frame's zoomBar owns
        // the gesture and the live fold now, for every face). The
        // params rail keeps only what it owns: the ✦ row and the
        // form; a client-side error (not the run's) still lands at
        // the rail's bottom.
        // THE ERROR DISMISS (operator 2026-11-05: stuck FOREVER):
        // each red × retires its own face — the next verb re-arms.
        // The write face hides only: the ledger row keeps its memory,
        // so the next settle re-voices a still-unlanded key.
        error !== null ? h('div', { className: css.drillRunRow },
          h('span', { className: css.runError, 'data-testid': 'stage-error-strip' }, error,
            // THE SINGULARITY CURE (2026-11-10, the operator: "ERRORS
            // APPEAR TWICE … I CAN ONLY CLOSE THE BOTTOM"): one strip,
            // one field-named unstamp PER refused row — every
            // refusal's words act; the strip's one × retires the
            // whole set at once.
            gateSet.map((v) => h(Button, {
              key: (v.field ?? '') + ':' + v.message,
              size: 'sm', variant: 'ghost',
              'aria-label': chromeCopy.unstampWord + " '" + (v.field ?? '') + "'",
              onClick: () => { if (v.field != null) onUnstamp(v.field) },
            }, chromeCopy.unstampWord + " '" + (v.field ?? '') + "'")),
            h(Button, {
              size: 'sm', variant: 'ghost', className: css.errorDismiss,
              'aria-label': chromeCopy.dismissError,
              onClick: () => { setGateSet([]); setError(null) },
            }, h(IconCloseOutlineRegular, { size: 12 }))),
        ) : null,
        // THE ONE-VOICE LAW (E2-12 + the singularity cure): a write
        // face whose words the strip already voices is the SAME
        // refusal at an earlier seat — it stands down (the strip owns
        // it: unstamp + ×). The strip's voice is the gate SET (one
        // bare message per refusal) beside the legacy single-voice
        // error. GATE REFUSALS ONLY: the gate template is one string
        // per violation, so equality is identity; the unlanded-write
        // template is shared by DIFFERENT events (a refused typed
        // write beside a refused run flush) — those keep both rows,
        // each with its own ×.
        writeFace !== null && !(writeFace === error && gateRefusalMessage(error) !== null)
          && !(gateRefusalMessage(writeFace) !== null && gateSet.some((v) => v.message === gateRefusalMessage(writeFace)))
          ? h('div', { className: css.drillRunRow },
            h('span', { className: css.runError, 'data-testid': 'stage-write-face' }, writeFace,
              h(Button, {
                size: 'sm', variant: 'ghost', className: css.errorDismiss,
                'aria-label': chromeCopy.dismissError,
                onClick: () => { setWriteFace(null) },
              }, h(IconCloseOutlineRegular, { size: 12 }))),
          ) : null,
      ),
      preview: h('div', { className: css.outputs },
        h('div', {
          className: css.outputsPreview + ' ' + css.previewClickable,
          'data-testid': 'stage-preview-seat',
          role: 'button',
          tabIndex: 0,
          'aria-label': chromeCopy.openMediaDrilldown,
          onClick: () => {
            const artifacts = stageArtifacts()
            const hero = artifacts[0]
            if (hero === undefined) return
            const kind = primaryKindFor(spec, hero.url)
            if (kind === null) return
            // THE WALK SET BUILDS AT OPEN: the current run's set +
            // every archived generation, newest first (the same
            // flat law the preview's fallback hero reads) — frozen
            // for the walk.
            const hist = Array.isArray((stage as Record<string, unknown>)['history'])
              ? ((stage as Record<string, unknown>)['history'] as unknown[])
              : []
            // THE WALK DEDUP LAW (the landing-archive era), now
            // run-aware (trail-defect-hunt §5): identity is the
            // entry's run_id first — the server trail carries it, and
            // one run can ride two url spellings (the media route and
            // the gallery proxy) — with the url seat as the fallback.
            // One seat per RUN, first-wins.
            const past = hist.flatMap((e) => {
              const row = e as Record<string, unknown>
              const runId = typeof row?.['run_id'] === 'string' ? row['run_id'] as string : undefined
              return previewArtifactsFor({ result: e }).map((a) => ({ ...a, runId }))
            })
            const walk = dedupWalkSet([...artifacts, ...past]).map((a) => drillItemOf(a, kind))
            setDrillWalk(walk)
            setDrillItem(drillItemOf(hero, kind))
          },
          onKeyDown: (e: unknown) => {
            const ke = e as KeyboardEvent
            if (ke.key === 'Enter' || ke.key === ' ') {
              ke.stopPropagation()
              ;(e as { target: HTMLElement }).target.click()
            }
          },
        },
          stagePreview() ?? h('div', { className: css.outputsHint },
            running ? 'rendering… the preview lands here' : 'run lands the preview here')),
        drillItem !== null
          ? h(MediaDrilldown, {
            item: drillItem,
            onClose: () => { setDrillItem(null); setDrillWalk([]) },
            // THE WALK ARROWS (2026-09-20, the operator's catch:
            // "where are my side arrows when I open an image so
            // scroll through to others"): the frozen-at-open walk
            // set + the navigate verb — the drilldown paints ‹ ›
            // chips and walks the LINE — left toward current, right
            // deeper; the ends hold (drilldown.spec pins the law).
            siblings: drillWalk,
            onNavigate: (next) => { setDrillItem(next) },
          })
          : null,
        // THE REPORT SECTION (ROADMAP 11e, the result row's claim):
        // the run's machine-readable verdicts render under the
        // preview they belong to — ONE default atom per named
        // report (card-base's ReportView), claimed by kind. The
        // agent loop gates on the same object this paints.
        (() => {
          const reports = previewReportsFor(stage as unknown as Record<string, unknown>)
          return reports.length > 0
            ? h('div', { className: css.reportList, 'data-testid': 'stage-reports' },
                reports.map(({ name, report }) => h(ReportView, { key: name, name, report })))
            : null
        })(),
        // (THE FAILURE FACE MOVED TO THE FRAME (hour-26): the run's
        //  error text rides the webhook strip under the top bar —
        //  the outputs column keeps only the preview. The remove row
        //  stays retired.)
        ),
      }),
    )
  // THE UNSETTLED-WRITE PROBE (drill2, 2026-11-02): the owner-carried
  // LIVE ledger read — a studio seat consults it before it lets a
  // stale re-hydrate overwrite fresh typing. Per-call, never a frozen
  // boolean; the drill's own Run fence keeps its direct read
  // (refuseForUnlandedWrite) — one ledger, two doors.
  // the consult (ToolCallTree's call verbatim): entryKey = card name
  const currentStageIndex = bench.stages.findIndex((candidate) => candidate.id === stage.id)
  const priorStageIds = currentStageIndex < 0
    ? []
    : bench.stages.slice(0, currentStageIndex).map((candidate) => candidate.id)
  // THE STAGE-VIEW MOUNT LAW (2026-11-09, the fallback extermination,
  // operator: "THERE IS NO SUCH THING AS A FALLBACK, ONLY SUPPRESSED
  // ERRORS"): the second argument here is what the dispatch renders
  // on a slot miss. A card whose served spec declares a studio
  // (stage_view) gets the LOUD load refusal as that miss face — the
  // same detection the `?? fallback` used to silently eat, now
  // spoken, with the generic form gone. No declaration → the generic
  // form IS the designed seat (most cards have no studio). The
  // dismissal state + its reset effect hook beside the drill's other
  // state (declaredStudioEarly above) — the group branch's early
  // return below must never change the hook count. THE DISMISSAL
  // RETIRES THE REFUSAL TO EMPTY, never to the generic form: the
  // fallback is suppressed on purpose, and a dismissed × must not
  // re-open the hole its cure closed (the miss face has no designed
  // seat to fall back to).
  const declaredStudio = declaredStudioEarly
  const missFace = declaredStudio === null
    ? genericDetail()
    : missDismissed ? null
    : h('div', { className: css.drillRunRow, 'data-testid': 'stage-view-load-refusal' },
    h('div', { className: css.runError },
      chromeCopy.stageViewRefusal({ card: String(stage.card ?? ''), plugin: declaredStudio }),
      h('div', null, chromeCopy.stageViewRefusalFix),
      h(Button, {
        size: 'sm', variant: 'ghost', className: css.errorDismiss,
        'aria-label': chromeCopy.dismissError,
        onClick: () => { setMissDismissed(true) },
      }, h(IconCloseOutlineRegular, { size: 12 }))))
  const effectiveParams = liveEffectiveParams(held, user, touchedRef.current)

  return renderStageView({
    stageId: stage.id,
    hasUnsettledWrites: (): boolean => {
      const writeState = stageWriteState(bench.draftId, stage.id)
      return writeState.pending > 0 || writeState.failedKeys.length > 0
    },
    cardName: String(stage.card ?? ''),
    row: stage as unknown as Record<string, unknown>,
    runStatus: typeof stage.runStatus === 'string' ? stage.runStatus : '',
    onPatch: onPatchParams,
    onWireSlot: (slotKey, upstreamId) => {
      const candidate = upstreamId === null
        ? undefined
        : candidates.find((entry) => entry.id === upstreamId)
      if (upstreamId !== null && candidate === undefined) {
        setError(`wire source is no longer on the bench: ${upstreamId}`)
        return
      }
      // THE ONE VOICE (the 2026-11-02 audit's H-1): the wire-in is a
      // write like every other — its failure face is the ledger
      // row's voice, never the raw error strip. Alive guard: the
      // wire can answer after a re-target (lastStageRef holds the
      // stage shown NOW).
      const settleDraftId = bench.draftId
      const settleStageId = stage.id
      void patchStageParams(
        settleDraftId,
        settleStageId,
        { [slotKey]: candidate !== undefined ? candidate.url : null },
        bench.rev,
      ).catch((wireError: unknown) => {
        // draft.ts stamped wireError as the row's lastError before
        // rethrowing — the row owns the words, the face reads them.
        if (lastStageRef.current !== settleStageId) return
        setWriteFace(unlandedWriteVoice(settleDraftId, settleStageId))
      })
    },
    onRun,
    onStop,
    // THE GESTURE CHANNEL (hour-26): a studio with a domain-first
    // law binds its verb THROUGH the drill's claim — the frame's
    // pill then runs the studio's law, not a bare start.
    bindRun: (r: () => void) => { bindRun?.(r) },
    onRemove: () => { void remove() },
    onSurface: reportSurface,
    upstream: candidates.map((c) => ({ id: c.id, title: c.label, url: c.url })),
    runId: runId ?? null,
    effective: {
      model: modelKey !== '' ? modelKey : String(stage.card ?? stage.engine ?? ''),
      params: effectiveParams,
      inputSlots: (spec?.inputs ?? []).map((input) => input.name),
    },
    priorStageIds,
  }, missFace ?? h('div', null))
}
