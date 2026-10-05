/** sortable-tile.tsx — the bench tile: the native-reorder wrapper, the
 * chat-input chrome, the audio-bars face (extracted from CardsTab.tsx
 * hour 15). */
import { createElement as h } from 'react';
import { type CardRowLineTabRow } from './bench-row.js';
/** THE CARD TILE — its own face, not the chat row's grammar: a
 *  square preview cell (artifact thumb, video, audio bars, or the
 *  kind-initial fallback) over a caption column (title, service,
 *  upstream tag, clipped prompt). It reads the same folded
 *  CardRowLineTabRow the chat plane distills — one vocabulary, two
 *  faces; the running state is the spinner + progress pill, never a
 *  StateDot. */
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
export declare function SortableTile({ row, entered, onOpen, grouping, selected, onToggleSelect, onAssetAttach, dragging, dragOver, onReorderStart, onReorderOver, onReorderDrop, onRun, onStop, onRemove, activeRunId }: {
    row: CardRowLineTabRow;
    entered: boolean;
    onOpen: (row: CardRowLineTabRow) => void;
    grouping: boolean;
    selected: boolean;
    onToggleSelect: (id: string) => void;
    /** native reorder state (the drag source id / this tile is over). */
    dragging: boolean;
    dragOver: boolean;
    onReorderStart: (id: string | null) => void;
    onReorderOver: (id: string) => void;
    onReorderDrop: (active: string, over: string) => void;
    /** DROP-ON-CARD ATTACHES TO SLOT (the old SlotSquare law): an asset
     *  tile or OS image file dropped ON this tile patches the stage's
     *  source param — the estate's slot mechanism for direct assets.
     *  source = the asset URL or the raw File; the bench owns upload
     *  and error surfacing. */
    onAssetAttach: (target: string, source: string | File, kind: 'image' | 'audio') => void;
    /** THE CHAT-INPUT CHROME (2026-09-13, the operator): the tile's
     *  hover affordances — trash top-right, play bottom-right (→ stop
     *  while running), spinner bottom-left persisting past hover. */
    onRun: (row: CardRowLineTabRow) => void;
    onStop: (row: CardRowLineTabRow) => void;
    onRemove: (row: CardRowLineTabRow) => void;
    /** the stage's live run id (the stop wire's target; null when the
     *  tab never started it — reconcile heals those rows). */
    activeRunId: string | null;
}): ReturnType<typeof h>;
//# sourceMappingURL=sortable-tile.d.ts.map
