/** sortable-tile.tsx — the bench tile: the native-reorder wrapper, the
 * chat-input chrome, the audio-bars face (extracted from CardsTab.tsx
 * hour 15). */

import { createElement as h } from 'react'
import { IconLoadingOutlineRegular, IconPlayOutlineRegular, IconStopFillRegular, IconTrashOutlineRegular, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import { titleCaseId } from '@melite/card-base/client'
import css from './card.module.css'
import { CARD_DRAG_MIME, ASSET_DRAG_MIME, parseAssetDrop } from './dnd-payloads.ts'
import { rowRunning, type CardRowLineTabRow } from './bench-row.ts'

/** THE CARD ROW — the chat plane's CardRowLine grammar VERBATIM
 *  (f3026845, the 9-10 card system): [artifact thumb | kind Pill],
 *  bold title, service Pill, live StateDot, clipped prompt. ONE card
 *  system, both planes — the tab renders the SAME row the chat
 *  renders, from the same stylesheet (the .row/.thumb/.rowTitle/
 *  .prompt classes below are the flow block's own). */
/** THE CARD TILE — the operator's CardTile law (flowCardTile.tsx)
 *  ported to the tab, DSH native: the visual card (INNER) is ONE flex
 *  column with exactly two flow children —
 *    1. the PREVIEW CELL — flex-1 min-h-0, aspect-square: it owns
 *       every pixel the caption strip doesn't need. Media fills it
 *       edge to edge (object-cover); no artifact yet → the KIND FACE
 *       (the kind initial, the glyph chain's face without the editor
 *       runtime). A portrait artifact can NOT drive the row height
 *       (SQUARE LAW, 2026-08-23).
 *    2. the CAPTION STRIP — shrink-0, natural height: the declared
 *       summary line (title · engine) + the live status dot.
 *  Image-anchored overlays (the status dot) live INSIDE the preview
 *  cell so their anchors ride the artifact's corner. Click = the

/** The sortable tile wrapper — the old grid's SortableCardWrap
 *  pattern: the li is the drag unit, transform/transition ride the
 *  wrapper, the shared-element layoutId stays INSIDE (the morph
 *  anchor is unbroken). */

export function SortableTile({ row, entered, onOpen, grouping, selected, onToggleSelect, onAssetAttach,
  dragging, dragOver, onReorderStart, onReorderOver, onReorderDrop,
  onRun, onStop, onRemove, activeRunId }: {
  row: CardRowLineTabRow
  entered: boolean
  onOpen: (row: CardRowLineTabRow) => void
  grouping: boolean
  selected: boolean
  onToggleSelect: (id: string) => void
  /** native reorder state (the drag source id / this tile is over). */
  dragging: boolean
  dragOver: boolean
  onReorderStart: (id: string | null) => void
  onReorderOver: (id: string) => void
  onReorderDrop: (active: string, over: string) => void
  /** DROP-ON-CARD ATTACHES TO SLOT (the old SlotSquare law): an asset
   *  tile or OS image file dropped ON this tile patches the stage's
   *  source param — the estate's slot mechanism for direct assets.
   *  source = the asset URL or the raw File; the bench owns upload
   *  and error surfacing. */
  onAssetAttach: (target: string, source: string | File, kind: 'image' | 'audio') => void
  /** THE CHAT-INPUT CHROME (2026-09-13, the operator): the tile's
   *  hover affordances — trash top-right, play bottom-right (→ stop
   *  while running), spinner bottom-left persisting past hover. */
  onRun: (row: CardRowLineTabRow) => void
  onStop: (row: CardRowLineTabRow) => void
  onRemove: (row: CardRowLineTabRow) => void
  /** the stage's live run id (the stop wire's target; null when the
   *  tab never started it — reconcile heals those rows). */
  activeRunId: string | null
}): ReturnType<typeof h> {
  // NATIVE REORDER (the dnd-kit purge): the tile is HTML5-draggable
  // outside grouping mode; the parent owns dragId/overId state and
  // the reorder verb. Selection mode: draggable OFF (reorder pauses),
  // clicks toggle selection — the old sub-view's law, verbatim.
  const dragHandlers = grouping ? {} : {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData(CARD_DRAG_MIME, row.id)
      e.dataTransfer.effectAllowed = 'move'
      onReorderStart(row.id)
    },
    onDragEnd: () => { onReorderStart(null) },
  }
  // THE SLOT IS THE WIRE: this mark shows only an agent-recorded
  // edge (inputs.source on the row); the user-facing wiring IS the
  // input slot's picker — there is no tile wire gesture.
  const wiredFrom = typeof row.stage.inputs === 'object' && row.stage.inputs !== null
    && 'source' in (row.stage.inputs as Record<string, unknown>)
  return h('li', {
    className: css.tile
      + (entered ? ' ' + css.tileEnter : '')
      + (dragging ? ' ' + css.tileDragging : '')
      + (dragOver ? ' ' + css.tileDragOver : ''),
    'data-stage-id': row.id,
    'data-stage-status': row.status,
    'data-grouping': grouping ? 'on' : null,
    'data-selected': grouping && selected ? 'on' : null,
    onDragOver: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes(CARD_DRAG_MIME)) {
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'move'
        onReorderOver(row.id)
        return
      }
      if (e.dataTransfer.types.includes(ASSET_DRAG_MIME) || e.dataTransfer.types.includes('Files')) {
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'copy'
      }
    },
    onDrop: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes(CARD_DRAG_MIME)) {
        e.preventDefault()
        e.stopPropagation()
        const active = e.dataTransfer.getData(CARD_DRAG_MIME)
        if (active !== '' && active !== row.id) onReorderDrop(active, row.id)
        return
      }
      const asset = parseAssetDrop(e.dataTransfer.types.includes(ASSET_DRAG_MIME) ? e.dataTransfer.getData(ASSET_DRAG_MIME) : '')
      if ((asset.url ?? '') !== '') {
        e.preventDefault()
        e.stopPropagation()
        const t = asset.type ?? ''
        if (!t.startsWith('image/') && !t.startsWith('audio/')) return
        onAssetAttach(row.id, asset.url as string, t.startsWith('audio/') ? 'audio' : 'image')
        return
      }
      const file = e.dataTransfer.files[0]
      if (file === undefined) return
      if (file.type !== 'image/png' && file.type !== 'image/jpeg' && file.type !== 'image/webp') return
      e.preventDefault()
      e.stopPropagation()
      onAssetAttach(row.id, file, 'image')
    },
    ...dragHandlers,
  },
    h('div', { className: css.tileShared },
      h('button', {
        className: css.tileInner, type: 'button', 'data-status': row.status,
        onClick: () => {
          if (grouping) { onToggleSelect(row.id); return }
          onOpen(row)
        },
      },
        grouping ? h('span', {
          className: css.checkCircle + (selected ? ' ' + css.checkOn : ''),
          'aria-hidden': 'true',
        }, selected ? '\u2713' : '') : null,
        h('span', { className: css.tilePreview },
          row.face === 'audio'
            ? AudioBarsFace({ stageId: row.id })
            : row.videoUrl !== null
            ? h('video', { className: css.tileVideoImg, src: row.videoUrl, muted: true, playsInline: true, preload: 'metadata', 'data-testid': 'tile-face-video' })
            : row.thumbUrl !== null
            ? h('img', { className: css.tileImg, src: row.thumbUrl, alt: row.title, loading: 'lazy' })
            : h('span', { className: css.kindFace, 'data-kind': row.kind },
                h('span', { className: css.kindInitial }, row.kind.slice(0, 1).toUpperCase()),
                h('span', { className: css.kindName }, titleCaseId(row.kind)),
              ),
          // THE CHAT-INPUT CHROME (replaces the badge + green dot):
          // trash top-right + play/stop bottom-right ride hover; the
          // loading spinner bottom-left PERSISTS while the row runs
          // (the operator's law — loading outlives the hover).
          rowRunning(row)
            ? h('span', { className: css.tileSpin, 'data-testid': 'tile-spin', role: 'status', 'aria-label': 'running' },
                h(IconLoadingOutlineRegular, { size: 14 }),
                // THE PROGRESS FACE (2026-09-13): the tap's percent
                // rides beside the spinner — the operator's "forward
                // the comfyui progress webhooks like before".
                row.progress !== null && row.progress.max > 0
                  ? h('span', {
                      className: css.tilePct, 'data-testid': 'tile-progress',
                      'aria-label': 'progress percent',
                    }, Math.floor((100 * row.progress.value) / row.progress.max) + '%')
                  : null,
              )
            : null,
          grouping ? null : h('button', {
            className: css.tileIconBtn + ' ' + css.tileTrash,
            type: 'button', 'aria-label': 'Remove stage', 'data-testid': 'tile-remove',
            onClick: (e: React.MouseEvent) => { e.stopPropagation(); onRemove(row) },
          }, h(IconTrashOutlineRegular, { size: 14 })),
          grouping ? null : (rowRunning(row)
            ? h('button', {
                className: css.tileIconBtn + ' ' + css.tileRunBtn,
                type: 'button', 'aria-label': 'Stop run', 'data-testid': 'tile-stop',
                disabled: activeRunId === null,
                onClick: (e: React.MouseEvent) => { e.stopPropagation(); onStop(row) },
              }, h(IconStopFillRegular, { size: 14 }))
            : h('button', {
                className: css.tileIconBtn + ' ' + css.tileRunBtn,
                type: 'button', 'aria-label': 'Run stage', 'data-testid': 'tile-run',
                onClick: (e: React.MouseEvent) => { e.stopPropagation(); onRun(row) },
              }, h(IconPlayOutlineRegular, { size: 14 }))),
        ),
        h('span', { className: css.tileCaption },
          h('span', { className: css.tileTitle }, row.title,
            wiredFrom ? h('span', { className: css.wiredMark, title: 'source wired' }, ' ⛓') : null,
            row.sourceAttached ? h('span', { className: css.wiredMark, title: 'source attached' }, ' 📎') : null,
          ),
          h('span', { className: css.tileMeta },
            row.service !== null ? titleCaseId(row.service) : null,
            row.upstream !== null ? h(Tag, { tone: 'quiet' }, '⟵ ' + row.upstream) : null,
            row.prompt !== null ? h('span', { className: css.tilePrompt }, row.prompt) : null,
          ),
          // THE FAILURE FACE: the run's own refusal text under the
          // caption — a failed run never again reads as silence.
          row.error !== null && row.status === 'failed'
            ? h('span', { className: css.runError, 'data-testid': 'tile-run-error', title: row.error },
                row.error.length > 140 ? row.error.slice(0, 140) + '…' : row.error)
            : null,
        ),
      ),
    ),
  )
}

/** THE AUDIO-BARS FACE (2026-09-13): the old system's music tile
 *  preview — a deterministic bar strip (heights hashed from the stage
 *  id, stable across renders; pure CSS, zero media cost). Rides the
 *  audio identity token per the color law. */
function AudioBarsFace({ stageId }: { stageId: string }): ReturnType<typeof h> {
  let h1 = 0
  for (let i = 0; i < stageId.length; i++) h1 = ((h1 * 31) + stageId.charCodeAt(i)) | 0
  const heights: number[] = []
  for (let i = 0; i < 14; i++) {
    heights.push(18 + (Math.abs(h1 >> (i % 15)) % 60))
  }
  return h('span', { className: css.audioBars, 'data-testid': 'tile-face-audio', 'aria-hidden': 'true' },
    heights.map((ht, i) => h('span', { key: i, className: css.audioBar, style: { height: ht + '%' } })),
  )
}
