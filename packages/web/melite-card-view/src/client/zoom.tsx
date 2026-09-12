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
import { createElement as h, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
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

/** The zoomed card's DETAIL content — supplied by the bench tab (the
 * spec-form params + Run row + outputs), rendered only once the
 * settle has passed. */
export interface ZoomDetailProps {
  stage: BenchStageRow
  bench: CardsBenchValue
  running: boolean
  onRun: () => void
  onClose: () => void
  onRemoved: () => void
  /** params patch verb (the surface slot's onPatch currency). */
  onPatchParams: (patch: Record<string, unknown>) => void
  /** the envelope lift channel: the DETAIL reports surface.size; the
    * mount owns the growth (self-owned verb — nothing threads from
    * above). Kept in the props type so the detail's face is stable. */
  onSurface?: (size: string) => void
  /** the draft's last started run (the studio polls it for artifacts). */
  runId?: string | null
  /** the cards.stage.view consult (unclaimed → the generic card). */
  renderStageView: (owner: StageViewOwnerProps, fallback: ReturnType<typeof h>) => ReturnType<typeof h>
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
          style: { width: zoomWidthFor(surfaceSize), maxWidth: '100%' },
        },
          h('div', { className: css.zoomBar },
            h('span', { className: css.zoomTitle }, 'Stage ' + String(stage.title ?? stage.card ?? stage.id)),
            h('button', {
              className: css.closeX,
              type: 'button',
              'aria-label': 'Collapse card',
              onClick: onClose,
            }, '✕'),
          ),
          ready
            ? h(props.detail, { stage, bench: rest.bench, running: rest.running, onRun: rest.onRun, onClose, onRemoved: rest.onRemoved, onPatchParams: rest.onPatchParams, renderStageView: rest.renderStageView, onSurface, runId: rest.runId })
            : h(ZoomSkeleton),
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
