/**
 * zoom.tsx — the zoom overlay, CSS-law port (2026-09-12).
 *
 * THE CONTRACT (the old tree's interaction, framer removed — DSH law:
 * DSH ships no framer; its own surfaces animate in CSS):
 * • the resting tile opens a FIXED inset-0 overlay (portal to body —
 *   the old file's own DSH placement rule; the embed frame is
 *   auto-height, absolute would cover only part of the view).
 * • The card enters compositor-only: a CSS scale+fade keyframe
 *   (zoomIn — transform/opacity, zero reflow, NO modal pop).
 * • While the settle holds the box shows a pure SKELETON; the real
 *   detail swaps in after ZOOM_SKELETON_MS.
 * • Close vectors: the Collapse (X) button and a backdrop click
 *   (target === currentTarget) call onClose directly; Escape belongs
 *   to DSH's useModalLayer, which also owns the focus lifetime and
 *   the layer stack (the dialog contract on the root is what it keys
 *   on).
 * • The overlay is the scroll container; the inner flex centers a
 *   card shorter than the area and scrolls one that is taller.
 */
import { createElement as h, useCallback, useEffect, useRef, useState, type ReactPortal } from 'react'
import { createPortal } from 'react-dom'
import { Button, IconCloseOutlineRegular, IconLoadingOutlineRegular, IconPlayOutlineRegular, IconStopFillRegular, Input, Menu, MenuItemButton, useModalLayer } from '@deepseek-ai/dsh-client-ui-primitives'
import { fetchEnhanceRoutes, getCardLlm, setCardLlm } from '@melite/catalog'
import { isLiveRunStatus, statusOrPendingOf } from '@melite/contracts/stageView'
import { filterLlmRoutes } from './llm-picker.ts'
import css from './card.module.css'
import { chromeCopy } from '../chromeCopy.ts'
import { BenchStageView, CardsBenchValue } from './cards-resource.ts'
import type { StageViewOwnerProps } from './types.ts'

/** How long the skeleton holds the box before the real detail swaps in. */
const ZOOM_SKELETON_MS = 500
/** The zoomed card's bounded size — width caps at 760px, vh-bounded so
 * the ≈square card fits without page scroll (the old tree's number). */
const ZOOM_DETAIL_MAX_PX = 760
/** The envelope's huge class (surface.size='huge'): the studio wants
 *  room — the card grows (the DECLARATION is estate truth). */
const ZOOM_HUGE_MAX_PX = 1160
/** The card's width law, pure (the envelope lift's decision): the
 *  estate's surface.size='huge' grows the card for studio room. The
 *  viewport cap measures WIDTH (94vw, room for the pane's own edge) —
 *  a vh cap on width was a category error that clipped the right
 *  half of the params column on short viewports (2026-09-12).
 *  (No `: string` seat: the inferred return is exactly string, and an
 *  explicit seat would hand this CSS geometry value to the copy
 *  census's string-return arm — geometry is not product copy.) */
export function zoomWidthFor(surfaceSize: string | null) {
  const huge = surfaceSize === 'huge'
  return `min(${huge ? ZOOM_HUGE_MAX_PX : ZOOM_DETAIL_MAX_PX}px, 94vw)`
}

/** THE FULL-PAGE LAW (2026-09-13, the operator's hour-7: "the modal
 *  is not taking up the full page like before"). A studio surface
 *  ('huge') IS the old system's full-page card: width AND height take
 *  the page (94vw/94vh — the pane keeps its edge, the shell breathes).
 *  Ordinary cards keep the bounded ≈square law verbatim. */
export function zoomSizeFor(surfaceSize: string | null): Record<string, string> {
  if (surfaceSize !== 'huge') return { width: zoomWidthFor(surfaceSize), maxWidth: '100%' }
  return { width: 'min(94vw, 1720px)', maxWidth: '100%', height: '94vh', maxHeight: '94vh' }
}

/** The zoomed card's DETAIL content — supplied by the bench tab (the
 * spec-form params + Run row + outputs), rendered only once the
 * settle has passed. */
export interface ZoomDetailProps {
  stage: BenchStageView
  bench: CardsBenchValue
  /** THE START-ERROR SEAM (stroke 25): a run-start rejection (wire
   *  down, refused compose, stale bench) renders in the webhook bar
   *  — the press seat must never die silently behind the overlay. */
  startError?: string | null
  running: boolean
  onRun: () => void
  /** THE STOP DOOR (2026-09-13): the run gesture flips to stop
   *  mid-run (the tile's affordance, carried into the drill). */
  onStop: () => void
  onClose: () => void
  onRemoved: () => void
  /** THE RESYNC SEAT (2026-09-15, the stuck cure): a detail write
   *  that refused after its rebase asks the view to re-read the
   *  bench so the next gesture composes against fresh truth. */
  onResync?: () => void
  /** params patch verb (the surface slot's onPatch currency).
   *  THE SETTLEMENT RIDE (2026-10-15, the ghost cure): carries the
   *  write's settlement boolean to the studio's optimistic overlay. */
  onPatchParams: (patch: Record<string, unknown>) => void | Promise<boolean | void>
  /** the envelope lift channel: the DETAIL reports surface.size; the
    * mount owns the growth (self-owned verb — nothing threads from
    * above). Kept in the props type so the detail's face is stable. */
  onSurface?: (size: string) => void
  /** the draft's last started run (the studio polls it for artifacts). */
  runId?: string | null
  /** THE ✦ GESTURE REGISTRATION (stroke 23, the operator's law:
   *  "agent enhance goes inside the top bar seam next to run"): the
   *  detail binds its enhance verb; the bar renders the capsule
   *  beside Run. The verb's promise owns the busy face; absence of
   *  a binding renders no capsule (non-prompt cards). */
  bindEnhance?: (verb: () => Promise<void> | void) => void
  /** THE GESTURE REGISTRATION (hour-26, the 1:1 law): the frame's
   * top-bar Run pill owns the BUTTON, the detail owns the LAW (the
   * drill flushes the user layer to the estate BEFORE the start;
   * studios patch their domain first). The detail registers its run
   * verb through this channel; the pill falls back to onRun when no
   * detail-bound verb exists (never a silent param drop). */
  bindRun?: (run: () => void) => void
  /** the cards.stage.view consult (unclaimed → the generic card). */
  renderStageView: (owner: StageViewOwnerProps, fallback: ReturnType<typeof h>) => ReturnType<typeof h>
  /** the cards.stage.preview consult (hour-9 seam; the primary-output
   *  dispatch's seat). The zoom's detail renders the preview column —
   *  the seam was declared but never threaded through the overlay
   *  (the zoom drill showed only the hint text); forwarded since
   *  2026-09-13 with the primary-output law. */
  renderPreview?: (owner: { kind: 'video' | 'image' | 'audio' | 'mesh' | 'text', artifacts: Array<{ name: string, url: string }>, runStatus: string, stageId: string }, fallback: ReturnType<typeof h>) => ReturnType<typeof h>
  /** THE PROFESSIONAL NAME (operator 2026-11-06): the catalog's
   *  label for the open stage's card — the detail's title and the
   *  overlay's own aria-label face it; null keeps today's id face. */
  cardLabel?: string | null
}

/** The settle skeleton — an all-skeleton layout with no real content
 *  (the shimmer sweep is the old tree's loading face). */
function ZoomSkeleton(): ReturnType<typeof h> {
  return h('div', { className: css.zoomSkeleton },
    h('div', { className: css.skLine + ' ' + css.skWide }),
    h('div', { className: css.skLine }),
    h('div', { className: css.skLine }),
    h('div', { className: css.skBlock }),
    h('div', { className: css.skLine }),
    h('div', { className: css.skRow },
      h('div', { className: css.skLine + ' ' + css.skShort }),
      h('div', { className: css.skLine + ' ' + css.skShort }),
    ),
  )
}

/** One overlay mount (keyed per stage by the caller). */

function ZoomMount(props: ZoomDetailProps & { detail: (p: ZoomDetailProps) => ReturnType<typeof h> }): ReturnType<typeof h> {
  const { stage, detail, onClose, ...rest } = props
  const [ready, setReady] = useState(false)
  // THE REGISTERED GESTURE (the 1:1 law): whatever the detail body
  // bound wins; onRun is the fallback, never the bypass. A REF, NOT
  // STATE — React's lazy-state law CALLS any function handed to a
  // state setter (the verb would fire as an "updater" at bind time
  // and store undefined); the ref stores the verb untouched and the
  // pill reads it at click time.
  const boundRef = useRef<(() => void) | null>(null)
  // THE ✦ SEAT (stroke 23): the detail's enhance verb lands beside
  // Run — state (not a ref) because the capsule's PRESENCE and busy
  // face render. The binder is STABLE (useCallback, []) so the
  // detail's bind effect fires once per mount, never a loop.
  const [enhanceVerb, setEnhanceVerb] = useState<(() => Promise<void> | void) | null>(null)
  const [enhancingBar, setEnhancingBar] = useState(false)
  const bindEnhanceStable = useCallback((v: () => Promise<void> | void): void => { setEnhanceVerb(() => v) }, [])
  const fireEnhance = (): void => {
    if (enhanceVerb === null || enhancingBar) return
    setEnhancingBar(true)
    void Promise.resolve(enhanceVerb())
      .catch(() => {
        // the bound verb voices its own failures (the drill's note
        // face); this arm only keeps the pill's fire from raising an
        // unhandled rejection — zoom owns no voice of its own here
      })
      .finally(() => { setEnhancingBar(false) })
  }
  // THE CARD LLM DROPDOWN (operator order: "the cards need a model
  // dropdown to select the models we want"): the ✦ verb's model
  // selector — the LIVE route list off the catalog door, the choice
  // persisted per browser (the ✦ rail reads it at call time; Auto =
  // the estate's preference chain server-side). Renders only when
  // routes answer (standalone mounts keep the verb, lose the pick).
  // BURN E (operator 2026-10-26: the dropdown "IS MISSING MANY MODELS
  // AND HAS NO SEARCH"): the door's list is EVERY advertised route now
  // (the retired walk's 12-route slice died with it), and the panel
  // leads with a search field — a hundreds-long scroll-only list is
  // not a picker. The field rides Menu's children (the panel's own
  // rows); letter keys pass through to the input, the Menu's arrow
  // walk covers the filtered rows below it.
  const [llmRoutes, setLlmRoutes] = useState<string[] | null>(null)
  const [cardLlm, setCardLlmSel] = useState('')
  // the select-control's own open bit (Menu is owner-controlled; the
  // anchor Button is the trigger, the list is the catalog's)
  const [llmOpen, setLlmOpen] = useState(false)
  // the search field's live query — reset on every open so the panel
  // always starts at the full list, never at a stale filter
  const [llmQuery, setLlmQuery] = useState('')
  const llmSearchRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    let alive = true
    setCardLlmSel(getCardLlm() ?? '')
    void fetchEnhanceRoutes().then((routes): void => {
      if (alive) setLlmRoutes(routes)
    })
    return () => { alive = false }
  }, [])
  // focus the search field the moment the panel opens (Menu's own
  // autoFocus law covers data rows only — the field is a child row)
  useEffect(() => {
    if (llmOpen) llmSearchRef.current?.focus()
  }, [llmOpen])
  const pickLlm = (route: string): void => {
    setCardLlm(route)
    setCardLlmSel(route)
  }
  // the panel's live rows: Auto + the query's matches (the pure
  // filter is llm-picker.ts — the wall judges it there)
  const llmShown: string[] = llmRoutes === null ? [] : filterLlmRoutes(llmRoutes, llmQuery)
  const openLlmMenu = (): void => {
    setLlmQuery('')
    setLlmOpen(true)
  }
  // THE ENVELOPE LIFT: the detail reports the estate's surface.size;
  // the frame grows for 'huge' (the card listens, the view talks).
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const [surfaceSize, setSurfaceSize] = useState<string | null>(null)
  const onSurface = (size: string): void => { setSurfaceSize(size === '' ? null : size) }

  // The settle gate: the skeleton holds until the timer passes.
  useEffect(() => {
    const t = window.setTimeout(() => { setReady(true) }, ZOOM_SKELETON_MS)
    return () => { window.clearTimeout(t) }
  }, [stage.id])

  // THE MODAL OWNERSHIP (DSH useModalLayer): the overlay's Escape,
  // its focus lifetime and its place in the document's layer stack
  // are the primitive's — no local window keydown listener. ZoomMount
  // exists only while the overlay is shown (CardZoomOverlay renders it
  // through the body portal), so the layer is open for its whole life.
  useModalLayer(dialogRef, true, onClose)

  // THE FRAME GESTURE + THE WEBHOOK BAR (hour-26, the operator: the
  // play button rides the top bar; the comfyui progress webhooks
  // surface in a strip under it, like the old system). The frame
  // derives both from the row it already holds — the SAME currency
  // the drill read (the optimistic start flag OR the row's run
  // state; stage.result.progress {value,max} + activity; the failed
  // run's error text) — so every face (generic drill or studio
  // claim) gets ONE gesture seat at the top and ONE live strip,
  // never per-body duplicates.
  // the owner's live judgement (was a private set that never knew the
  // wire's 'live' nor the estate's 'stopping')
  const live: boolean = props.running
    || isLiveRunStatus(typeof stage.runStatus === 'string' ? stage.runStatus : '')
  const rec = typeof stage.result === 'object' && stage.result !== null ? stage.result as Record<string, unknown> : null
  const prog = rec !== null && typeof rec['progress'] === 'object' && rec['progress'] !== null
    ? rec['progress'] as { value: number, max: number } : null
  const act = rec !== null && typeof rec['activity'] === 'string' ? rec['activity'] : ''
  const pct = prog !== null && prog.max > 0 ? Math.floor((100 * prog.value) / prog.max) : null
  // the owner's failed judgement (was a raw 'failed' compare — an
  // 'error'-worded run showed no refusal text here while the tile did).
  // The view-side read: the persisted row can carry a word no door
  // validated ('unreachable') — not failed, and no throw at the pane.
  const failedText = statusOrPendingOf(typeof stage.runStatus === 'string' ? stage.runStatus : '') === 'error'
    && typeof rec?.['error'] === 'string' ? rec['error'] : null
  // THE START-ERROR OVERRIDE: a client-side start rejection (no row
  // write yet, or the row write itself failed) still owns the bar —
  // the freshest rejection wins
  const startError = typeof props.startError === 'string' && props.startError !== '' ? props.startError : null
  // THE ERROR DISMISS (operator 2026-11-05: the bar's refusal stuck
  // FOREVER with no way out): the red × retires the bar's face for
  // THIS text — a new refusal (different text, or any refusal after
  // a clean bar) re-voices. The mount is keyed per stage, so a
  // re-target starts undis-missed; the null arm below re-arms after
  // a clean bar too.
  const [dismissedBarError, setDismissedBarError] = useState<string | null>(null)
  const barError = startError ?? failedText
  useEffect(() => { if (barError === null) setDismissedBarError(null) }, [barError])
  const shownBarError = barError !== null && barError !== dismissedBarError ? barError : null

  return h('div', {
    ref: dialogRef,
    className: css.zoomOverlay,
    // THE DIALOG CONTRACT (the hand-roll row 2.7): the full-bleed
    // surface stays ours (the audit's own call — a 94vw CSS
    // scale-in card is not DSH's Modal), but the overlay now carries
    // the dialog semantics useModalLayer keys on, so Escape, the
    // focus lifetime and the layer stack belong to the primitive
    // instead of a local window keydown listener.
    role: 'dialog',
    'aria-modal': true,
    'aria-label': chromeCopy.stageAria({ name: String(stage.title ?? props.cardLabel ?? stage.card ?? stage.id) }),
    // backdrop click closes (target === currentTarget so card clicks
    // don't bubble-close)
    onClick: (e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose() },
  },
    h('div', { className: css.zoomScroll },
      h('div', { className: css.zoomInner },
        h('div', {
          className: css.zoomCard,
          style: zoomSizeFor(surfaceSize),
        },
          h('div', { className: css.zoomBar },
            h('span', { className: css.zoomTitle }, chromeCopy.stageAria({ name: String(stage.title ?? props.cardLabel ?? stage.card ?? stage.id) })),
            // THE BUILD CLAIM IS GONE (2026-11-06, the operator read
            // the stale hand literal as evidence the estate served a
            // month-old bundle): a hand-dated span the build never
            // refreshes is a staleness claim with no truth behind
            // it. Freshness is the STAMP PLANE's to judge
            // (estate-singleton-law), never the chrome's to date.
            // THE RUN PILL (the one gesture seat, frame-owned): ghost
            // face, glyph + word, Stop mid-run — the drill/studio
            // bottom seats retired with it.
            // THE ✦ CAPSULE (stroke 23): beside Run, frame-rendered —
            // the detail bound the verb; the promise owns the busy face.
            // THE MODEL DROPDOWN rides its left edge (the ✦ verb's own
            // selector — one seat, the choice threads every enhance
            // press through the shared card-LLM preference).
            // THE KEYED BAR (the 2026-09-21 pull, mutation-proven:
            // enhanceVerb's promise resolves MID-RUN, this capsule
            // flips null→array-of-2, every POSITIONAL sibling after
            // it shifted and REMOUNTED — the seat, then the whole
            // preview body — and the scroll clamped 355→46 in the
            // dead frame. Children match by KEY, never by position;
            // the capsule occupies its two slots ALWAYS (null when
            // absent) so the list's shape never changes.
            enhanceVerb !== null
              ? [
                // THE MODEL DROPDOWN (burn e, 2026-10-26: the panel is a
                // SEARCHED list — the search field rides as the FIRST child
                // row, the routes below it as MenuItemButton rows sharing
                // the Menu's keyboard walk; data items are empty because
                // children render AFTER items and the field must lead).
                // Letter keystrokes pass through to the input; the Menu's
                // own arrow walk covers the filtered rows; Enter on the
                // field settles the first match.
                llmRoutes !== null
                  ? h(Menu, {
                    key: 'llm',
                    open: llmOpen,
                    anchor: h(Button, {
                      size: 'sm', variant: 'outline',
                      'aria-label': chromeCopy.enhanceModelAria, ...{ 'data-testid': 'drill-llm' },
                      // THE BAR CLAMP (operator 2026-11-09: "the model
                      // name is too long so it stretches button too
                      // far right"): the full route name rides the
                      // title; the label rides the clamp span below
                      // (the defect-2 class — DSH's Button base is
                      // inline-flex, and a flex container ignores
                      // text-overflow, so a raw text node stretches
                      // the anchor without bound and shoves Run and
                      // Stop off the bar).
                      title: cardLlm === '' ? chromeCopy.autoOption : cardLlm,
                      onClick: openLlmMenu,
                    }, h('span', { className: css.zoomClamp }, cardLlm === '' ? chromeCopy.autoOption : cardLlm)),
                    onClose: () => { setLlmOpen(false) },
                    compact: true,
                    portal: true,
                  },
                    // the search field: the panel's first row (blank
                    // query = the full list; Enter settles the first
                    // match — one-keystroke pick for the common case)
                    h('div', { key: 'llm-search', className: css.llmSearchRow },
                      h(Input, {
                        ref: llmSearchRef,
                        type: 'search',
                        value: llmQuery,
                        placeholder: chromeCopy.llmSearchPlaceholder,
                        'aria-label': chromeCopy.llmSearchPlaceholder, ...{ 'data-testid': 'drill-llm-search' },
                        onChange: (e: React.ChangeEvent<HTMLInputElement>) => { setLlmQuery(e.currentTarget.value) },
                        onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
                          if (e.key === 'Enter' && llmShown.length > 0) {
                            pickLlm(llmShown[0]!)
                            setLlmOpen(false)
                          }
                        },
                      })),
                    // Auto: the estate's preference chain (server-side).
                    // (children rides IN the props — MenuItemButtonProps
                    // declares it required; createElement's third argument
                    // cannot satisfy a required prop.)
                    h(MenuItemButton, {
                      key: 'auto',
                      onSelect: () => { pickLlm(''); setLlmOpen(false) },
                      separatorBefore: true,
                      children: chromeCopy.autoOption,
                    }),
                    // the live routes, filtered by the field above
                    ...llmShown.map((r) => h(MenuItemButton, {
                      key: r,
                      onSelect: () => { pickLlm(r); setLlmOpen(false) },
                      children: r,
                    })),
                    // a filter that matches nothing states it — never an
                    // empty panel
                    llmShown.length === 0
                      ? h(MenuItemButton, {
                        key: 'llm-none',
                        disabled: true,
                        onSelect: () => {},
                        children: chromeCopy.llmNoMatch,
                      })
                      : null,
                  )
                  : null,
                h(Button, {
                  key: 'enhance',
                  size: 'sm', variant: 'outline',
                  'aria-label': chromeCopy.agentEnhanceAria, ...{ 'data-testid': 'drill-enhance' },
                  disabled: enhancingBar,
                  onClick: fireEnhance,
                }, enhancingBar ? chromeCopy.enhanceBusyWord : chromeCopy.enhanceWord),
              ]
              : [null, null],
            live
              ? h(Button, {
                key: 'run',
                size: 'sm', variant: 'outline',
                'aria-label': chromeCopy.stopRun, ...{ 'data-testid': 'drill-stop' },
                onClick: () => { props.onStop() },
              }, h(IconStopFillRegular, { size: 16 }), chromeCopy.stopWord)
              : h(Button, {
                key: 'run',
                size: 'sm', variant: 'outline',
                'aria-label': chromeCopy.runStage, ...{ 'data-testid': 'drill-run' },
                onClick: () => { (boundRef.current ?? props.onRun)() },
              }, h(IconPlayOutlineRegular, { size: 16 }), chromeCopy.runWord),
            // THE CLOSE PILL (the operator's law: the close glyph rides
            // the SAME grammar as ✦ Enhance and Run — catalog icon +
            // word, one button row, no orphan icon seat).
            h(Button, {
              key: 'close',
              size: 'sm', variant: 'outline',
              'aria-label': chromeCopy.collapseCard,
              onClick: onClose,
            }, h(IconCloseOutlineRegular, { size: 16 }), chromeCopy.closeWord),
          ),
          // THE GEOMETRY-INVARIANT STATUS SEAT (the 2026-09-21
          // seizure law, operator: "everytime this component
          // updates … it gets jerked up"): the row rides the drill
          // from open to close — live shows spinner + activity +
          // percent + meter, failed shows the reason (whole text —
          // the drill is where it is READ), idle/succeeded hold
          // the seat EMPTY. The old mount/unmount at every run
          // boundary removed 23px ABOVE the scroll area and dragged
          // the view up a hit at a time (measured: bodyY 123→100
          // with scrollTop 346→74 at terminal). Content churns
          // inside the reserved box; the box never moves.
          (live || shownBarError !== null)
          ? h('div', { key: 'status', className: css.zoomWebhook, role: 'status', 'data-testid': 'zoom-status' },
            live
              ? h('span', { className: css.drillProgress, 'data-testid': 'drill-progress' },
                h(IconLoadingOutlineRegular, { size: 14 }),
                h('span', null, [
                  act !== '' ? act : 'running',
                  pct !== null ? ' · ' + String(pct) + '%' : '',
                ].join('')),
                pct !== null
                  ? h('span', { className: css.zoomMeter },
                    h('span', { className: css.zoomMeterFill, style: { width: pct + '%' } }))
                  : null,
              )
              : shownBarError !== null
                ? h('span', { className: css.runError, 'data-testid': 'drill-run-error' },
                  shownBarError,
                  h(Button, {
                    size: 'sm', variant: 'ghost', className: css.errorDismiss,
                    'aria-label': chromeCopy.dismissError,
                    onClick: () => { setDismissedBarError(shownBarError) },
                  }, h(IconCloseOutlineRegular, { size: 12 })))
                : null,
          )
          : null,
          // THE BODY SEAT (the hour-7 height war): the detail sits in
          // a FLEXED, MIN-ZERO body — the studio's own height:100%
          // chain (studioRoot → .shell grid) needs a parent that GIVES
          // height; under a bare auto-height flex child the grid
          // collapsed to the rail's content height and the preview
          // + timeline sank below the fold. Ordinary cards are
          // unaffected: their zoomDetail scrolls inside.
          h('div', { key: 'body', className: css.zoomBody },
            ready
              ? h(props.detail, { stage, bench: rest.bench, running: rest.running, onRun: rest.onRun, onStop: rest.onStop, onClose, onRemoved: rest.onRemoved, onPatchParams: rest.onPatchParams, renderStageView: rest.renderStageView, renderPreview: rest.renderPreview, onSurface, runId: rest.runId, bindRun: (r: () => void) => { boundRef.current = r }, bindEnhance: bindEnhanceStable, cardLabel: props.cardLabel ?? null })
              : h(ZoomSkeleton),
          ),
        ),
      ),
    ),
  )
}

/** CardZoomOverlay — portal to document.body, FIXED inset-0 (the old
 * tree's own DSH rule), keyed per stage. */
export function CardZoomOverlay(props: ZoomDetailProps & { detail: (p: ZoomDetailProps) => ReturnType<typeof h> }): ReactPortal | ReturnType<typeof h> {
  const mounted = typeof document !== 'undefined'
  const tree = h(ZoomMount, { key: props.stage.id, ...props })
  return mounted ? createPortal(tree, document.body, 'zoom-portal') : tree
}
