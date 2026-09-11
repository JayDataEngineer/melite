/**
 * zoom.tsx — the shared-element zoom overlay, native port (2026-09-11).
 *
 * THE CONTRACT (read from the old tree at d13560be^, flowCardZoom.tsx —
 * the operator's signature interaction):
 * • the resting tile and the zoomed card SHARE a framer-motion layoutId
 *   (`stage-card-${id}`) — the card GROWS out of the tile's real screen
 *   rect ("a sponge filling with water") and SHRINKS back into it.
 *   ZOOM_SPRING both directions: stiffness 300, damping 30.
 * • NO MODAL POP. The morph is compositor-only (transform), zero reflow.
 * • While the morph plays (grow AND shrink) the box holds a pure
 *   SKELETON; the real detail swaps in when the morph settles
 *   (onLayoutAnimationComplete; 500ms fallback for engines with no
 *   layout).
 * • Close vectors: the Collapse (X) button, a backdrop click
 *   (target === currentTarget), and Escape — all direct onClose; the
 *   exit is the SAME layoutId morph reversed. AnimatePresence +
 *   usePresence hold the overlay while the shrink plays;
 *   onLayoutAnimationComplete → safeToRemove (500ms jsdom fallback).
 * • THE DSH PLACEMENT (the old file's own rule): no
 *   [data-workspace-content] root exists in the DSH tab → the portal
 *   lands on document.body and the overlay is FIXED inset-0 (the embed
 *   frame is auto-height; absolute would cover only part of the view).
 * • The overlay is the scroll container; the inner flex centers a card
 *   shorter than the area and scrolls one that is taller.
 */
import { createElement as h, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, usePresence } from 'framer-motion'
import type { Transition } from 'framer-motion'
import css from './card.module.css'
import { BenchStageRow, CardsBenchValue } from './cards-resource.ts'
import type { StageViewOwnerProps } from './types.ts'

/** The morph spring — "a sponge filling with water": fast start, soft
 * settle. Same spring both directions (open grows, exit shrinks). */
export const ZOOM_SPRING: Transition = { type: 'spring', stiffness: 300, damping: 30 }

/** Shared-element key: the SAME string on the resting tile AND the
 * zoomed card makes framer morph one into the other. */
export const cardLayoutId = (id: string): string => `stage-card-${id}`

/** How long the skeleton holds the box before the real detail swaps in
 * (the layout-complete callback is primary; this is the no-layout-
 * engine fallback). */
const ZOOM_SKELETON_MS = 500
/** The close-unmount fallback for engines without layout (in a real
 * browser the exit morph's onLayoutAnimationComplete → safeToRemove). */
const ZOOM_CLOSE_UNMOUNT_MS = 500
/** The zoomed card's bounded size — width caps at 760px, vh-bounded so
 * the ≈square card fits without page scroll (the old tree's number). */
const ZOOM_DETAIL_MAX_PX = 760

/** The zoomed card's DETAIL content — supplied by the bench tab (the
 * spec-form params + Run row + outputs), rendered only once the morph
 * has settled. */
export interface ZoomDetailProps {
  stage: BenchStageRow
  bench: CardsBenchValue
  running: boolean
  onRun: () => void
  onClose: () => void
  onRemoved: () => void
  onRewired: () => void
  /** params patch verb (the surface slot's onPatch currency). */
  onPatchParams: (patch: Record<string, unknown>) => void
  /** the cards.stage.view consult (unclaimed → the generic card). */
  renderStageView: (owner: StageViewOwnerProps, fallback: ReturnType<typeof h>) => ReturnType<typeof h>
}

/** The morph skeleton — an all-skeleton layout with no real content
 * (the shimmer sweep is the old tree's loading face). */
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

/** One overlay mount (keyed per stage — framer fixes shared-element
 * stack membership at mount, so every focus joins the CURRENT card's
 * stack and the exit re-legates into THAT card's tile). */
function ZoomMount(props: ZoomDetailProps & { detail: (p: ZoomDetailProps) => ReturnType<typeof h> }): ReturnType<typeof h> {
  const { stage, detail, onClose, ...rest } = props
  const [isPresent, safeToRemove] = usePresence()
  const [ready, setReady] = useState(false)
  const removed = useRef(false)

  // The morph-settled gate: layout-complete in a real browser, the
  // timer fallback everywhere else.
  useEffect(() => {
    const t = window.setTimeout(() => { setReady(true) }, ZOOM_SKELETON_MS)
    return () => { window.clearTimeout(t) }
  }, [stage.id])

  // The close unmount: when the shrink completes (or the fallback
  // fires), release the overlay from the AnimatePresence.
  const onSettled = useCallback((): void => {
    setReady(true)
    if (!isPresent && !removed.current) {
      removed.current = true
      safeToRemove()
    }
  }, [isPresent, safeToRemove])
  useEffect(() => {
    if (!isPresent) {
      const t = window.setTimeout(() => { if (!removed.current) { removed.current = true; safeToRemove() } }, ZOOM_CLOSE_UNMOUNT_MS)
      return () => { window.clearTimeout(t) }
    }
  }, [isPresent, safeToRemove])

  // Escape closes (direct onClose — the exit is the morph reversed).
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
        h(motion.div, {
          layoutId: cardLayoutId(stage.id),
          transition: ZOOM_SPRING,
          onLayoutAnimationComplete: onSettled,
          className: css.zoomCard,
          style: { width: `min(${ZOOM_DETAIL_MAX_PX}px, 88vh)`, maxWidth: '100%' },
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
          ready && isPresent
            ? h(props.detail, { stage, bench: rest.bench, running: rest.running, onRun: rest.onRun, onClose, onRemoved: rest.onRemoved, onRewired: rest.onRewired, onPatchParams: rest.onPatchParams, renderStageView: rest.renderStageView })
            : h(ZoomSkeleton),
        ),
      ),
    ),
  )
}

/** CardZoomOverlay — portal to document.body, FIXED inset-0 (the old
 * tree's own DSH rule), AnimatePresence around the per-stage mount. */
export function CardZoomOverlay(props: ZoomDetailProps & { detail: (p: ZoomDetailProps) => ReturnType<typeof h> }): ReturnType<typeof h> {
  const mounted = typeof document !== 'undefined'
  const tree = h(AnimatePresence, null, h(ZoomMount, { key: props.stage.id, ...props }))
  return mounted ? createPortal(tree, document.body) : tree
}
