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
 * • Close vectors: the Collapse (X) button, a backdrop click
 *   (target === currentTarget), and Escape — all direct onClose.
 * • The overlay is the scroll container; the inner flex centers a
 *   card shorter than the area and scrolls one that is taller.
 */
import { createElement as h, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconLoadingOutline16, IconPlayOutline16, IconStopFill16 } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './card.module.css'
import { BenchStageRow, CardsBenchValue } from './cards-resource.ts'
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
 *  half of the params column on short viewports (2026-09-12). */
export function zoomWidthFor(surfaceSize: string | null): string {
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
  stage: BenchStageRow
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
  /** params patch verb (the surface slot's onPatch currency). */
  onPatchParams: (patch: Record<string, unknown>) => void
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
  renderPreview?: (owner: { kind: 'video' | 'image' | 'audio' | 'mesh', artifacts: Array<{ name: string, url: string }>, runStatus: string, stageId: string }, fallback: ReturnType<typeof h>) => ReturnType<typeof h>
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
    void Promise.resolve(enhanceVerb()).finally(() => { setEnhancingBar(false) })
  }
  // THE ENVELOPE LIFT: the detail reports the estate's surface.size;
  // the frame grows for 'huge' (the card listens, the view talks).
  const [surfaceSize, setSurfaceSize] = useState<string | null>(null)
  const onSurface = (size: string): void => { setSurfaceSize(size === '' ? null : size) }

  // The settle gate: the skeleton holds until the timer passes.
  useEffect(() => {
    const t = window.setTimeout(() => { setReady(true) }, ZOOM_SKELETON_MS)
    return () => { window.clearTimeout(t) }
  }, [stage.id])

  // Escape closes (direct onClose).
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey) }
  }, [onClose])

  // THE FRAME GESTURE + THE WEBHOOK BAR (hour-26, the operator: the
  // play button rides the top bar; the comfyui progress webhooks
  // surface in a strip under it, like the old system). The frame
  // derives both from the row it already holds — the SAME currency
  // the drill read (the optimistic start flag OR the row's run
  // state; stage.result.progress {value,max} + activity; the failed
  // run's error text) — so every face (generic drill or studio
  // claim) gets ONE gesture seat at the top and ONE live strip,
  // never per-body duplicates.
  const live: boolean = props.running || (
    typeof stage.runStatus === 'string'
    && (stage.runStatus === 'running' || stage.runStatus === 'queued' || stage.runStatus === 'pending')
  )
  const rec = typeof stage.result === 'object' && stage.result !== null ? stage.result as Record<string, unknown> : null
  const prog = rec !== null && typeof rec['progress'] === 'object' && rec['progress'] !== null
    ? rec['progress'] as { value: number, max: number } : null
  const act = rec !== null && typeof rec['activity'] === 'string' ? rec['activity'] : ''
  const pct = prog !== null && prog.max > 0 ? Math.floor((100 * prog.value) / prog.max) : null
  const failedText = typeof stage.runStatus === 'string' && stage.runStatus === 'failed'
    && typeof rec?.['error'] === 'string' ? rec['error'] : null
  // THE START-ERROR OVERRIDE: a client-side start rejection (no row
  // write yet, or the row write itself failed) still owns the bar —
  // the freshest rejection wins
  const startError = typeof props.startError === 'string' && props.startError !== '' ? props.startError : null

  return h('div', {
    className: css.zoomOverlay,
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
            h('span', { className: css.zoomTitle }, 'Stage ' + String(stage.title ?? stage.card ?? stage.id)),
            // THE RUN PILL (the one gesture seat, frame-owned): ghost
            // face, glyph + word, Stop mid-run — the drill/studio
            // bottom seats retired with it.
            // THE ✦ CAPSULE (stroke 23): beside Run, frame-rendered —
            // the detail bound the verb; the promise owns the busy face
            enhanceVerb !== null
              ? h('button', {
                className: css.drillRunBtn, type: 'button',
                'aria-label': 'Agent Enhance', 'data-testid': 'drill-enhance',
                disabled: enhancingBar,
                onClick: fireEnhance,
              }, h('span', null, enhancingBar ? '✦ enhancing…' : '✦ Enhance'))
              : null,
            live
              ? h('button', {
                className: css.drillRunBtn, type: 'button',
                'aria-label': 'Stop run', 'data-testid': 'drill-stop',
                onClick: () => { props.onStop() },
              }, h(IconStopFill16, { size: 16 }), h('span', null, 'Stop'))
              : h('button', {
                className: css.drillRunBtn, type: 'button',
                'aria-label': 'Run stage', 'data-testid': 'drill-run',
                onClick: () => { (boundRef.current ?? props.onRun)() },
              }, h(IconPlayOutline16, { size: 16 }), h('span', null, 'Run')),
            // THE CLOSE PILL (the operator's law: the ✕ rides the
            // SAME ghost-pill grammar as ✦ Enhance and Run — glyph +
            // word, one button row, no orphan icon seat).
            h('button', {
              className: css.drillRunBtn,
              type: 'button',
              'aria-label': 'Collapse card',
              onClick: onClose,
            }, h('span', null, '✕'), h('span', null, 'Close')),
          ),
          // THE WEBHOOK BAR: live → spinner + activity + percent + a
          // thin meter; failed → the reason, whole text (the drill is
          // where it is READ); idle/succeeded → nothing.
          live || failedText !== null || startError !== null
            ? h('div', { className: css.zoomWebhook, role: 'status' },
              live
                ? h('span', { className: css.drillProgress, 'data-testid': 'drill-progress' },
                  h(IconLoadingOutline16, { size: 14 }),
                  h('span', null, [
                    act !== '' ? act : 'running',
                    pct !== null ? ' · ' + String(pct) + '%' : '',
                  ].join('')),
                  pct !== null
                    ? h('span', { className: css.zoomMeter },
                      h('span', { className: css.zoomMeterFill, style: { width: pct + '%' } }))
                    : null,
                )
                : h('span', { className: css.runError, 'data-testid': 'drill-run-error' },
                  startError ?? failedText),
            )
            : null,
          // THE BODY SEAT (the hour-7 height war): the detail sits in
          // a FLEXED, MIN-ZERO body — the studio's own height:100%
          // chain (studioRoot → .shell grid) needs a parent that GIVES
          // height; under a bare auto-height flex child the grid
          // collapsed to the rail's content height and the preview
          // + timeline sank below the fold. Ordinary cards are
          // unaffected: their zoomDetail scrolls inside.
          h('div', { className: css.zoomBody },
            ready
              ? h(props.detail, { stage, bench: rest.bench, running: rest.running, onRun: rest.onRun, onStop: rest.onStop, onClose, onRemoved: rest.onRemoved, onPatchParams: rest.onPatchParams, renderStageView: rest.renderStageView, renderPreview: rest.renderPreview, onSurface, runId: rest.runId, bindRun: (r: () => void) => { boundRef.current = r }, bindEnhance: bindEnhanceStable })
              : h(ZoomSkeleton),
          ),
        ),
      ),
    ),
  )
}

/** CardZoomOverlay — portal to document.body, FIXED inset-0 (the old
 * tree's own DSH rule), keyed per stage. */
export function CardZoomOverlay(props: ZoomDetailProps & { detail: (p: ZoomDetailProps) => ReturnType<typeof h> }): ReturnType<typeof h> {
  const mounted = typeof document !== 'undefined'
  const tree = h(ZoomMount, { key: props.stage.id, ...props })
  return mounted ? createPortal(tree, document.body) : tree
}
