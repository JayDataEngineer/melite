// skeleton.tsx — THE LOADING SEAT IS A SKELETON (operator 2026-11-15:
// "Instead of form… — can we get a real skeleton when things are
// loading?"). Every hydrating seat renders the shimmer shapes the
// zoom card already owns (card.module.css skLine/skBlock/skRow + the
// zoomShimmer sweep) — shaped like the face it replaces, never a
// text ellipsis. The screen-reader truth rides aria-busy + the
// visually-hidden copy word (the visible face is shapes, not copy).
import { createElement as h } from 'react'
import css from './card.module.css'
import { chromeCopy } from '../chromeCopy.ts'

/** The shared shell: aria-busy announces the hydration, the hidden
 * word carries the non-visual truth, the children are the shapes. */
function Skel(props: { seat: string, children: () => Array<ReturnType<typeof h>> }): ReturnType<typeof h> {
  return h('div', {
    className: css.skeleton,
    'data-testid': props.seat + '-skeleton',
    'aria-busy': 'true',
    role: 'status',
  },
  h('span', { className: css.srOnly }, chromeCopy.skeletonLoading),
  ...props.children())
}

/** The drill's params rail while the form-spec hydrates: label +
 * control pairs, the shape CardForm renders once the spec lands. */
export function FormSkeleton(): ReturnType<typeof h> {
  return h(Skel, { seat: 'stage-form', children: () => [
    h('div', { key: 'f0', className: css.skRow },
      h('div', { className: css.skLine + ' ' + css.skLabel }),
      h('div', { className: css.skLine + ' ' + css.skShort })),
    h('div', { key: 'f1', className: css.skRow },
      h('div', { className: css.skLine + ' ' + css.skLabel }),
      h('div', { className: css.skLine + ' ' + css.skShort })),
    h('div', { key: 'f2', className: css.skLine + ' ' + css.skWide }),
    h('div', { key: 'f3', className: css.skLine + ' ' + css.skShort }),
  ] })
}

/** The add-card picker while the model catalog hydrates: a genre
 * title line, then card-row lines. */
export function CardsSkeleton(): ReturnType<typeof h> {
  return h(Skel, { seat: 'add-cards', children: () => [
    h('div', { key: 't', className: css.skLine + ' ' + css.skLabel }),
    h('div', { key: 'c0', className: css.skLine }),
    h('div', { key: 'c1', className: css.skLine }),
    h('div', { key: 'c2', className: css.skLine + ' ' + css.skWide }),
  ] })
}

/** The tab body while the bench doc hydrates: a pair of tile-height
 * rows over a block — the grid it becomes. */
export function BenchSkeleton(): ReturnType<typeof h> {
  return h(Skel, { seat: 'bench', children: () => [
    h('div', { key: 'r', className: css.skRow },
      h('div', { className: css.skLine + ' ' + css.skTile }),
      h('div', { className: css.skLine + ' ' + css.skTile })),
    h('div', { key: 'b', className: css.skBlock }),
  ] })
}
