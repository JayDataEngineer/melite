/** stage-drill.tsx — THE SHARED DRILLDOWN: the spec-formatted stage
 * editor, the zoom face, the preview seam consult (extracted from
 * CardsTab.tsx hour 15 — the biggest seam). */

import { createElement as h, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Button, Input, Modal, Pill, StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import { CardDrill } from './card-drill.tsx'
import { MediaDrilldown, type MediaDrilldownItem } from '@melite-plugin/dsh-gallery/drilldown'
import type { StageViewOwnerProps } from './types.ts'
import { coerceFieldEdit, fetchFormSpec, fieldsOf, resolveValue, seedUser, CardForm, type FormSpecDoc, type SpecValues } from '@melite/card-base/client'
import { axisUnset, composeCandidateDoc, composeValidate } from '@melite/card-base/client'
import { forgetStageWrites, reconcileStageWriteFailures, scheduleStageParam } from './draft.ts'
import { trailDedupe } from '@melite/estate-drafts/trail'
import { postManageAction } from '@melite/card-base/client'
import { createFilmSeam, FilmSeamBar, FilmSeamPlayer } from './filmSeam.tsx'
import { PaintLeafCanvas } from '@melite/image-mask-studio/paint-canvas'
import { BboxLeafCanvas } from '@melite/image-mask-studio/bbox-canvas'
import { cardLlmArg, setCardLlm } from '@melite/catalog'
import { paramFields, patchStageOutcome, patchStageParams, mediaUrl, stageWriteState } from './draft.ts'
import css from './card.module.css'
import { StudioShell } from '@melite/card-base/client'
import { fetchMediaLibrary } from './cards-resource.ts'
import { uploadInputFile } from '@melite/card-base/client'
import { paramsDiffKeys, previewArtifactsFor, previewReportsFor, primaryKindFor } from './preview-kinds.ts'
import { removeStageWire, ungroupStageWire } from './add-stage.ts'
import type { CardsBenchValue, BenchStageView } from './cards-resource.ts'
import { freshStageRow } from './cards-resource.ts'
import { AudioStagePreview, ImageStagePreview, MeshStagePreview, ReportView, TextStagePreview, VideoStagePreview, figureCoeffsOf, figureLocalChangesOf, figureCameraOf } from '@melite/card-base/client'
import { CardZoomOverlay } from './zoom.tsx'
import { loadFormsEdgeMeta } from './forms-edge-meta.ts'
import { rejectionVoice } from './rejection-voice.ts'

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
 *  seat as the fallback. One seat per RUN, first-wins; order kept. */
export function dedupWalkSet<T extends { url: string, runId?: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  const seenRuns = new Set<string>()
  return items.filter((a) => {
    if (a.runId !== undefined && seenRuns.has(a.runId)) return false
    if (seen.has(a.url)) return false
    if (a.runId !== undefined) seenRuns.add(a.runId)
    seen.add(a.url)
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
function composeGateRefusal(
  spec: FormSpecDoc | null,
  held: Record<string, unknown> | undefined,
  user: SpecValues,
  frame: Record<string, unknown>,
): string | null {
  if (spec === null) return null
  const violations = composeValidate(spec, composeCandidateDoc(held ?? {}, user, frame))
  const first = violations[0]
  if (first === undefined) return null
  return 'THE COMPOSE GATE REFUSED — ' + first.message
    + ' — the write never left the studio. Fix the stated value, or pick a different route.'
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
  onPatchParams: (patch: Record<string, unknown>) => void
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
  // THE ENHANCE FLIGHT (audit V-E4): the ✦ verb's controller — the
  // drill's unmount aborts a hung LLM wait, and an aborted settle
  // writes nothing on a closed drill.
  const enhanceAbort = useRef<AbortController | null>(null)
  useEffect(() => () => { enhanceAbort.current?.abort() }, [])
  const userRef = useRef<SpecValues>(user)
  userRef.current = user
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
    fetchFormSpec(family)
      .then((doc) => {
        if (!alive) return
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
        const seeded = seedUser(doc, freshOpen ? held : userRef.current)
        setUser(seeded)
        // THE SEED-DROP LEDGER (same incident): keys the drill's own
        // seed deliberately drops (the dead recipe layer) stay
        // drill-owned garbage — the flush still nulls them. Anything
        // else absent from the seeded map was never the drill's and
        // is never nulled.
        const seedSource = freshOpen ? held : userRef.current
        for (const k of Object.keys(seedSource)) if (!(k in seeded)) droppedRef.current.add(k)
        if (freshOpen) {
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
        }
        setLoaded(true)
        reportSurface(doc.size === 'huge' ? 'huge' : '')
      })
      .catch((e: unknown) => {
        if (!alive) return
        setError(rejectionVoice(e))
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
  const onSet = useCallback((name: string, v: unknown): void => {
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
      // only this modal's.
      const refused = composeGateRefusal(spec, stage.params, user, { [name]: null })
      if (refused !== null) { setWriteFace(refused); return }
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
        // per-key and latest-wins)
        const st = stageWriteState(settleDraftId, settleStageId)
        if (lastStageRef.current !== settleStageId) return
        // lastError is a string whenever failedKeys is non-empty: the
        // ledger adds a key and stamps lastError in the same step
        // (draft.ts:554-555) and clears it only as the set empties
        // (draft.ts:551-552, draft.ts:470-475).
        setWriteFace(st.failedKeys.length > 0
          ? 'THE WRITE DID NOT LAND — ' + st.lastError
            + ' (unlanded keys: ' + st.failedKeys.join(', ') + '). '
            + 'The studio shows your edit; the bench does not. Pressing Run will refuse until it lands.'
          : null)
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
    /* v8 ignore next 4 -- the tri-state atoms unset only from slot shapes; these atoms are never slots (probe 2026-09-19) */
    if (shape2 !== 'image' && shape2 !== 'file' && shape2 !== 'mesh') {
      const refused = composeGateRefusal(spec, stage.params, user, { [name]: v })
      if (refused !== null) { setWriteFace(refused); return }
      void scheduleStageParam(bench.draftId, stage.id, name, v, bench.rev).then(() => {
        // the door ANSWERED: the ledger is the truth (the promise
        // resolves either way — the failure memory is the ledger's,
        // per-key and latest-wins)
        const st = stageWriteState(bench.draftId, stage.id)
        // non-null while failedKeys is non-empty — the ledger's own
        // invariant (draft.ts:554-555, draft.ts:551-552)
        setWriteFace(st.failedKeys.length > 0
          ? 'THE WRITE DID NOT LAND — ' + st.lastError
            + ' (unlanded keys: ' + st.failedKeys.join(', ') + '). '
            + 'The studio shows your edit; the bench does not. Pressing Run will refuse until it lands.'
          : null)
      })
    }
    // THE SLOT FLUSH LAW (2026-09-15 — the operator's burn: "when I
    // wire an image from the previous flow, it doesn't stay after I
    // close the card"): a slot-shaped pick (image/file/mesh) is a
    // DISCRETE GESTURE, not typing — it writes the bench row NOW,
    // not at Run. Before this, the pick lived only in this modal's
    // React state; close without Run and it evaporated — the reopen
    // reseeded from a bench row that never heard it.
    /* v8 ignore next 1 -- single-render law: CardForm renders only when spec is non-null (probe 2026-09-19) */
    const shape: string | undefined = spec !== null
      ? fieldsOf(spec).find((f) => f.name === name)?.type : undefined
    /* v8 ignore next 4 -- the tri-state atoms unset only from slot shapes; these atoms are never slots (probe 2026-09-19) */
    if (shape === 'image' || shape === 'file' || shape === 'mesh') {
      // patchStageParams wraps the door's doc (STAGE_PATCH_KEYS'
      // `params` key); the clear rides the null-unset arm (a null
      // param DELETEs its key, bench.ts's own law).
      const slotFrame = v === '' ? { [name]: null } : { [name]: v }
      const refused = composeGateRefusal(spec, stage.params, user, slotFrame)
      if (refused !== null) { setWriteFace(refused); return }
      void patchStageParams(bench.draftId, stage.id,
        v === '' ? { [name]: null } : { [name]: v }, bench.rev)
        .catch((e: unknown) => {
          // THE THIRD FACE, ALIGNED (the second audit's W9): the
          // slot arm used to speak the raw door message while the
          // other two arms spoke the write-face voice — same stage,
          // same failure class, two faces. ONE voice.
          setError('THE WRITE DID NOT LAND — '
            + rejectionVoice(e)
            + ' (unlanded keys: ' + name + ').')
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
    // THE EMPTY-SELECTION LAW rides the atomic pick too (a model
    // switch CLEARS cross-spec axes to ''): an axis key set to '' is
    // UNSTATED — it leaves the user map and its wire key rides null
    // (a DELETE, the door's own law), exactly like onSet's unset arm.
    const landed: Record<string, unknown> = {}
    const nulls: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(patch)) {
      if (axisUnset(k, v, spec)) nulls[k] = null
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
    void patchStageParams(bench.draftId, stage.id, frame, bench.rev).then(
      () => {
        const st = stageWriteState(bench.draftId, stage.id)
        // non-null while failedKeys is non-empty (draft.ts:554-555)
        setWriteFace(st.failedKeys.length > 0
          ? 'THE WRITE DID NOT LAND — ' + st.lastError
            + ' (unlanded keys: ' + st.failedKeys.join(', ') + '). '
            + 'The studio shows your edit; the bench does not. Pressing Run will refuse until it lands.'
          : null)
      },
      () => {
        // the promise REJECTS on refusal (the ledger keeps the
        // memory); the write face speaks the same voice as onSet
        const st = stageWriteState(bench.draftId, stage.id)
        // non-null while failedKeys is non-empty (draft.ts:554-555)
        setWriteFace(st.failedKeys.length > 0
          ? 'THE WRITE DID NOT LAND — ' + st.lastError
            + ' (unlanded keys: ' + st.failedKeys.join(', ') + '). '
            + 'The studio shows your edit; the bench does not. Pressing Run will refuse until it lands.'
          : null)
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
      void patchStageParams(bench.draftId, stage.id, { [name]: null }, bench.rev)
        .catch((e: unknown) => {
          setError(rejectionVoice(e))
        })
    }
  }, [spec, user, bench.draftId, bench.rev, stage.id])
  // THE RESOLVED VALUE — derived per render (never state): exactly
  // what a Run composes, what the prompt tile and the enhance sweep
  // read, what the form shows. THE SERVED BASE (hour-26 stroke 15,
  // the 1:1 run law): the row's `resolved` map — prepareCardParams'
  // own stamps, served by the drafts doors — layers under the user
  // and over the client's guesses (one resolver, served to the
  // visual; absent = the registry-less lane derive).
  const servedBase: SpecValues | undefined =
    typeof stage.resolved === 'object' && stage.resolved !== null && !Array.isArray(stage.resolved)
      ? stage.resolved as SpecValues : undefined
  const value: SpecValues = resolveValue(spec ?? { form: '' }, user, servedBase)
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
      setEnhanceNote({ err: true, text: 'enhance already running' })
      return
    }
    const current = String(value['prompt'] ?? '').trim()
    if (current === '') {
      setEnhanceNote({ err: true, text: 'nothing to enhance — the prompt is empty' })
      return
    }
    const model = String(spec?.model ?? held['model'] ?? '')
    if (model === '') {
      setEnhanceNote({ err: true, text: 'no model to enhance with — pick a Model first' })
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
      setUser((m) => ({ ...m, ...sweptPatch }))
      if (Object.keys(sweptPatch).length > 0) {
        // ONE atomic write (2026-10-12 construction law): the sweep is
        // a discrete gesture, not typing — it lands as ONE frame so
        // the door judges the swept fields together, never the
        // half-swept state the per-key scheduler would produce.
        const refused = composeGateRefusal(spec, stage.params, user, sweptPatch)
        if (refused !== null) { setWriteFace(refused); return }
        // THE ALIVE GUARD (client-plane RISK-3, 2026-10-20): same law
        // as the per-key settle above — the keys are captured here so
        // the ledger lookup stays honest, and both settle faces stand
        // down when the drill has re-targeted before the door
        // answered (lastStageRef holds the stage shown NOW).
        const settleDraftId = bench.draftId
        const settleStageId = stage.id
        void patchStageParams(settleDraftId, settleStageId, sweptPatch, bench.rev).then(() => {
          const st = stageWriteState(settleDraftId, settleStageId)
          if (lastStageRef.current !== settleStageId) return
          // non-null while failedKeys is non-empty (draft.ts:554-555)
          setWriteFace(st.failedKeys.length > 0
            ? 'THE ENHANCE DID NOT LAND — ' + st.lastError
              + ' (unlanded keys: ' + st.failedKeys.join(', ') + '). '
              + 'The studio shows the enhanced fields; the bench does not. Pressing Run will refuse until they land.'
            : null)
        }).catch((e: unknown) => {
          // the sweep write is fire-and-forget; the verb's outer
          // catch cannot see it — the NO-SILENT-REJECT law holds
          // here too: the rejection renders its face.
          if (lastStageRef.current !== settleStageId) return
          setWriteFace('THE ENHANCE DID NOT LAND — ' + rejectionVoice(e))
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
        setEnhanceNote({ err: true, text: 'the enhancer returned no declared fields (' + Object.keys(results).join(', ') + ')' })
      } else {
        const via = Object.values(results)[0]?.via
        setEnhanceNote({ err: false, text: typeof via === 'string' && via !== '' ? 'enhanced via ' + via + ' (' + String(swept) + ' field' + (swept === 1 ? '' : 's') + ')' : 'enhanced (' + String(swept) + ' field' + (swept === 1 ? '' : 's') + ')' })
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
      // THE USER LAYER RIDES VERBATIM (the parameter audit): the
      // whole explicit map — params, axis keys, macro stamps —
      // presence IS the truth the engine composes. Keys the stage HELD that
      // left the user map ride as nulls (JSON Merge Patch: null
      // deletes — the unset's domain half) ONLY when this drill owns
      // their domain half: authored here (touched) or deliberately
      // dropped by its own seed (the dead recipe layer). Held keys
      // written after open by OTHER hands — the studio, the wire menu,
      // the agent — are never nulled (the h3-timeline void,
      // 2026-10-11: the flush deleted the operator's calls at Run
      // press). An identical map skips the write (a noise guard,
      // never a semantic — marking is by presence, this only avoids
      // re-writing the same bench).
      const patch: SpecValues = {}
      const userKeys = new Set(Object.keys(user))
      const heldKeys = new Set(Object.keys(held))
      for (const k of userKeys) patch[k] = user[k]
      for (const k of heldKeys) {
        if (!userKeys.has(k) && (touchedRef.current.has(k) || droppedRef.current.has(k))) patch[k] = null
      }
      const sameAsHeld = userKeys.size === heldKeys.size
        && [...userKeys].every((k) => Object.is(user[k], held[k]))
      if (Object.keys(patch).length > 0 && !sameAsHeld) {
        // THE COMPOSE GATE AT THE RUN SEAT: the full-doc sync is a
        // write like any other — an invalid candidate refuses HERE,
        // in the studio, before anything reaches the engine.
        const refused = composeGateRefusal(spec, held, user, {})
        if (refused !== null) { setError(refused); return }
        await patchStageParams(bench.draftId, stage.id, patch, bench.rev)
      }
      onRun()
    } catch (e: unknown) {
      setError(rejectionVoice(e))
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
      setError(rejectionVoice(e))
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
        setError(rejectionVoice(e))
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
        error !== null ? h('span', { className: css.runError }, error) : null,
        h('button', {
          className: css.back, type: 'button',
          disabled: removing,
          onClick: () => { void ungroup() },
        }, removing ? 'ungrouping…' : 'Ungroup'),
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
    return renderPreview(owner, fallback)
  }
  // THE WEBHOOK FEED (stroke 46b, the operator's order: "see the
  // received webhooks in the drilled-out view"): the engine's /ws
  // progress tap folds activity + progress onto the stage rows — the
  // drill renders them LIVE (the tile keeps its percent pill).
  const activity = typeof (stage as { activity?: unknown }).activity === 'string'
    ? (stage as { activity?: unknown }).activity as string : ''
  const progress = (stage as { progress?: { value: number, max: number } | null }).progress ?? null
  const pct = progress !== null && progress.max > 0 ? Math.floor((100 * progress.value) / progress.max) : null
  const webhookFeed = h('div', { className: css.runRow, 'data-testid': 'drill-webhooks' },
    activity !== '' ? h('span', { className: css.tilePct, 'aria-label': 'engine activity' }, activity) : null,
    progress !== null && pct !== null ? h('span', { className: css.tilePct, 'data-testid': 'drill-progress', 'aria-label': 'progress percent' }, pct + '% (' + String(progress.value) + '/' + String(progress.max) + ')') : null,
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
              h('span', { className: enhanceNote.err ? css.runError : css.enhanceNote }, enhanceNote.text))
          : null,
        h('div', { className: css.params },
        !loaded ? h('div', { className: css.load }, 'form…')
        : spec !== null
          ? h(CardForm, {
            spec, user, base: servedBase, onSet, onPick, onUnset, wire,
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
        error !== null ? h('div', { className: css.drillRunRow },
          h('span', { className: css.runError }, error),
        ) : null,
        writeFace !== null ? h('div', { className: css.drillRunRow },
          h('span', { className: css.runError, 'data-testid': 'stage-write-face' }, writeFace),
        ) : null,
      ),
      preview: h('div', { className: css.outputs },
        h('div', {
          className: css.outputsPreview + ' ' + css.previewClickable,
          'data-testid': 'stage-preview-seat',
          role: 'button',
          tabIndex: 0,
          'aria-label': 'Open media drilldown',
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
  // THE UNSETTLED-WRITE PROBE (the h3-timeline void, 2026-10-11): a
  // live read of this tab's write ledger for the open stage — the
  // studio's re-hydrate guard tells a STALE refresh (our own send
  // still unsettled — hold the local) from a FOREIGN write (nothing
  // outstanding — adopt). Read at guard time, never captured: the
  // ledger is the truth, not a render's frozen copy.
  const hasUnsettledWrites = useCallback((): boolean => {
    const st = stageWriteState(bench.draftId, stage.id)
    return st.pending > 0 || st.failedKeys.length > 0
  }, [bench.draftId, stage.id])
  // the consult (ToolCallTree's call verbatim): entryKey = card name
  const currentStageIndex = bench.stages.findIndex((candidate) => candidate.id === stage.id)
  const priorStageIds = currentStageIndex < 0
    ? []
    : bench.stages.slice(0, currentStageIndex).map((candidate) => candidate.id)
  return renderStageView({
    stageId: stage.id,
    cardName: String(stage.card ?? ''),
    row: stage as unknown as Record<string, unknown>,
    runStatus: typeof stage.runStatus === 'string' ? stage.runStatus : '',
    onPatch: onPatchParams,
    hasUnsettledWrites,
    onWireSlot: (slotKey, upstreamId) => {
      const candidate = upstreamId === null
        ? undefined
        : candidates.find((entry) => entry.id === upstreamId)
      if (upstreamId !== null && candidate === undefined) {
        setError(`wire source is no longer on the bench: ${upstreamId}`)
        return
      }
      void patchStageParams(
        bench.draftId,
        stage.id,
        { [slotKey]: candidate !== undefined ? candidate.url : null },
        bench.rev,
      ).catch((wireError: unknown) => {
        setError(rejectionVoice(wireError))
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
      params: { ...held, ...user },
      inputSlots: (spec?.inputs ?? []).map((input) => input.name),
    },
    priorStageIds,
  }, genericDetail())
}
