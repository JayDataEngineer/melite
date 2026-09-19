/**
 * preview.tsx — THE SHARED PREVIEW COMPONENTS (the preview seam's
 * built-in claims, hour-9 2026-09-13 — the operator's law: "Where
 * the VIDEO PREVIEW and the IMAGE PREVIEW of other cards go in a
 * SLOT with SHARED DSH PRIMITIVES"). One preview per media kind,
 * DSH-pure: native media elements on card-base chrome, DSW tokens
 * BARE (no fallbacks — the hour-8 name law), zero bespoke islands.
 *
 * These are the DEFAULTS the pattern prescribes (the ui-tool law:
 * "central default views"); a card claims its kind's preview only
 * to specialize — the h3 studio rides the shared VIDEO preview for
 * its hero, exactly as an image-gen card rides the IMAGE one.
 */
import { createElement as h, useState, useSyncExternalStore } from 'react'
import { GlbStagePreview } from './glb-stage.tsx'
import { PoserFigureStage } from './poser-figure.tsx'
import type { PreviewArtifact, PreviewOwnerProps } from '@melite/contracts'
import { cn } from './chrome.ts'
import s from './preview.module.css'

/** THE PICK CELLS (DSH's client state law — web-client.md: the
 *  client keeps "identity-stable, React-free mirrors" and the UI
 *  subscribes through useSyncExternalStore; a presentation
 *  component never owns store-lifetime state). The history pick
 *  lives in an EXTERNAL cell keyed by the view's IDENTITY — the
 *  stage plus the current run's urls. The cell is shared across
 *  mounts: an unkeyed remount (the drill swaps stages in the same
 *  mount position) reads the SAME cell as its identity dictates —
 *  a different stage or a new run is a DIFFERENT cell (fresh,
 *  unpicked), so the pick can never leak across stages or runs;
 *  history growth keeps the same cell, so a keyed pick survives
 *  index shifts. No effects, no mount-lifetime coupling.
 *  THE CAP: 64 cells, insertion-pruned — a long session never
 *  grows the map unbounded. */
type PickCell = { key: string | null, listeners: Set<() => void> }
const pickCells = new Map<string, PickCell>()
const PICK_CELL_CAP = 64
function pickCellOf(id: string): PickCell {
  let cell = pickCells.get(id)
  if (cell === undefined) {
    if (pickCells.size >= PICK_CELL_CAP) {
      // the map is non-empty at cap — take the OLDEST insertion
      for (const oldest of pickCells.keys()) {
        pickCells.delete(oldest)
        break
      }
    }
    cell = { key: null, listeners: new Set() }
    pickCells.set(id, cell)
  } else {
    // refresh insertion order (LRU, not FIFO-of-birth)
    pickCells.delete(id)
    pickCells.set(id, cell)
  }
  return cell
}
function usePickCell(id: string): [string | null, (key: string | null) => void] {
  const cell = pickCellOf(id)
  const key = useSyncExternalStore(
    (onChange: () => void) => { cell.listeners.add(onChange); return () => { cell.listeners.delete(onChange) } },
    () => cell.key,
  )
  const set = (next: string | null): void => {
    cell.key = next
    for (const l of cell.listeners) l()
  }
  return [key, set]
}

/** The test seam: cells are module-shared BY DESIGN (identity-stable
 *  across mounts); walls reset between cases so no pick bleeds. */
export function resetPickCellsForTests(): void {
  pickCells.clear()
}

/** THE HISTORY HERO (stroke 40 + the output-component stroke): one
 * hook, three faces — the hero artifact, the REST of whatever set
 * the hero belongs to (the current run's other outputs, or a picked
 * history entry's other outputs — a multi-output card shows its
 * full set either way, never the current row under an old hero),
 * and THE STALENESS FACT (an explicitly picked entry is NOT the
 * current generation — the badge law; the between-runs fallback
 * hero gets NO badge: with no current run, the newest archive is
 * the closest thing to current, not a stale one). */
function useHistoryHero(props: PreviewOwnerProps): { hero: PreviewArtifact | undefined, rest: PreviewArtifact[], viewingHistory: boolean, note: string | undefined, picked: number, promote: (i: number) => void, returnToCurrent: () => void } {
  const flat: PreviewArtifact[] = props.artifacts.length > 0
    ? props.artifacts
    : (props.history ?? []).flat()
  const history = props.history ?? []
  // THE PICK IS A KEY, NEVER AN INDEX (the operator's catch,
  // 2026-09-21: "the state constantly corrupts"): history is
  // NEWEST-FIRST and grows at the HEAD — an index-based pick points
  // at a DIFFERENT entry the moment a run archives (viewing the
  // wrong generation, silently). The pick stores the entry's url-set
  // key (its stable identity); the index is DERIVED per render.
  const keyOf = (entry: PreviewArtifact[]): string => entry.map((a) => a.url).join('|')
  // THE CELL ID IS THE VIEW IDENTITY (stage + current run): a new
  // run or a stage switch IS a different cell — the reset falls out
  // of identity, no effect timers, no mount-lifetime coupling. The
  // DSH client-state law: the store lives outside the component.
  const cellId = `${props.stageId}\u0000${props.artifacts.map((a) => a.url).join('|')}`
  const [pickedKey, setPickedKey] = usePickCell(cellId)
  const picked = pickedKey === null ? -1 : history.findIndex((e) => keyOf(e) === pickedKey)
  // THE TOGGLE LAW (the operator's bug report, 2026-09-16: "not
  // respecting whether I click on historical preview or the image
  // preview"): a history pick is a VIEW, not a one-way door —
  // clicking the picked tile again returns to current, and the
  // badge's return control rides the same seam.
  const promote = (i: number): void => {
    // the strip only renders tiles for entries that exist (the
    // owner builder filters empty rows) — a bad index would throw
    // LOUD at keyOf, never silently collapse
    const k = keyOf(history[i] as PreviewArtifact[])
    setPickedKey(k !== pickedKey ? k : null)
  }
  const returnToCurrent = (): void => { setPickedKey(null) }
  const entry = picked >= 0 && history[picked] !== undefined && history[picked].length > 0
    ? history[picked]
    : null
  const source = entry ?? flat
  return {
    hero: source[0],
    rest: source.slice(1, 12),
    viewingHistory: entry !== null,
    // ('' and undefined both mean no note — the owner builder sends
    // empty slots to keep historyNotes index-aligned with history)
    note: entry === null ? undefined : ((props.historyNotes ?? [])[picked] || undefined),
    picked: entry !== null ? picked : -1,
    promote,
    returnToCurrent,
  }
}

/** THE NOT-CURRENT BADGE (the output-component stroke — the
 * operator's law: "a tag or indicator to show they are not
 * current"). Rendered while an explicit history pick owns the hero;
 * when the entry's params snapshot differs from the live params the
 * chip names the keys (shared by every presenter). */
/** THE NOT-CURRENT BADGE (the output-component stroke — the
 * operator's law: "a tag or indicator to show they are not
 * current") — AND THE RETURN CONTROL (the toggle law, 2026-09-16):
 * the badge is the visible way back to the current generation;
 * clicking it restores the current hero. */
function StaleBadge(props: { note?: string, onReturn: () => void }): ReturnType<typeof h> {
  return h('button', {
    type: 'button',
    className: s.staleBadge,
    'data-testid': 'history-stale-badge',
    onClick: props.onReturn,
    title: 'Return to the current generation',
  },
    'Not current — earlier generation',
    props.note === undefined ? null : ` · differs: ${props.note}`,
    ' · Return to current',
  )
}

/** ONE HISTORY THUMB with an HONEST DEAD FACE (the operator's
 *  catch, 2026-09-21: "There's no sideways error"): an archived
 *  artifact whose file left the disk rendered the browser's silent
 *  broken-image glyph — no error, no name, nothing. The strip is
 *  the sideways row; a dead entry shows its NAME and a missing
 *  marker, never a silent void. */
function HistoryThumb(props: { a: PreviewArtifact }): ReturnType<typeof h> {
  const [dead, setDead] = useState(false)
  if (dead) {
    return h('span', {
      className: cn(s.thumb, s.thumbDead),
      'data-testid': 'history-thumb-missing',
      title: `${props.a.name} — the artifact file is gone`,
    }, 'gone')
  }
  return h('img', {
    key: props.a.url, className: s.thumb, src: props.a.url, alt: props.a.name, loading: 'lazy',
    onError: () => { setDead(true) },
  })
}

function HistoryStrip(props: PreviewOwnerProps, promote: (i: number) => void, testid: string, picked: number): ReturnType<typeof h> | null {
  // THE OPT-OUT (gap 4): a card that claims its own bottom bar
  // serves historyStrip: false — the strip is OFF, the history data
  // still rides the owner (the promote seam stays armed for a
  // future face; nothing is deleted, the bar is claimed).
  if (props.historyStrip === false) return null
  const history = props.history ?? []
  if (history.length === 0) return null
  const notes = props.historyNotes ?? []
  return h('div', { className: s.historyBlock, 'data-testid': testid },
    h('span', { className: s.historyTitle }, 'History'),
    h('div', { className: s.thumbRow },
      history.map((entry, i) => h('button', {
        key: entry[0]?.url ?? String(i),
        type: 'button',
        // THE PICKED MARK (the toggle law): the tile that owns the
        // hero says so — a picked tile with no mark reads as an
        // ignored click (the operator's report).
        className: cn(s.historyTile, i === picked ? s.historyTileActive : undefined),
        'aria-pressed': i === picked,
        title: entry.map((a) => a.name).join(', ') + (notes[i] ? ` (differs: ${notes[i]})` : '') + (i === picked ? ' (viewing — click to return to current)' : ''),
        onClick: () => { promote(i) },
      },
        entry.slice(0, 1).map((a) => h(HistoryThumb, { key: a.url, a }))))),
  )
}

/** THE VIDEO PREVIEW — one hero film, one native player (the kit's
 *  FilmPlayer law: native <video controls>; no library, no kit). The
 *  stitch/hero is the active set's first; the set's named windows
 *  follow in the strip row (the CURRENT run's, or the picked
 *  history entry's — never mixed). Honest empty state while no
 *  artifact has landed. */
export function VideoStagePreview(props: PreviewOwnerProps): ReturnType<typeof h> {
  const { hero, rest, viewingHistory, note, picked, promote, returnToCurrent } = useHistoryHero(props)
  return h('div', { className: s.stagePreview, 'data-testid': 'stage-preview-video' },
    viewingHistory ? h(StaleBadge, { note, onReturn: returnToCurrent }) : null,
    hero === undefined
      ? h('div', { className: s.empty },
          props.runStatus === 'running' ? 'rendering… the film lands here' : 'No render yet — run lands the film here')
      : h('video', {
          className: s.hero, controls: true, playsInline: true, key: hero.url,
          src: hero.url, 'data-testid': 'stage-preview-video-hero',
        }),
    rest.length > 0
      ? h('div', { className: s.strip },
          rest.map((a) => h('a', {
            key: a.url + a.name, className: s.stripLink, href: a.url, target: '_blank', rel: 'noreferrer',
            title: a.name,
          }, a.name)))
      : null,
    HistoryStrip(props, promote, 'stage-output-history', picked),
  )
}

/** THE IMAGE PREVIEW — the latest render hero (native <img>), the
 *  active set's thumbs beneath (the CURRENT run's gallery, or the
 *  picked history entry's full set — a multi-output card never shows
 *  the current row under an old hero), then THE OUTPUT HISTORY
 *  (stroke 40): the stage's previous unique outputs, newest first —
 *  click one to view it in the hero. Same chrome, same law. */
export function ImageStagePreview(props: PreviewOwnerProps): ReturnType<typeof h> {
  const { hero, rest, viewingHistory, note, picked, promote, returnToCurrent } = useHistoryHero(props)
  return h('div', { className: cn(s.stagePreview), 'data-testid': 'stage-preview-image' },
    viewingHistory ? h(StaleBadge, { note, onReturn: returnToCurrent }) : null,
    hero === undefined
      ? h('div', { className: s.empty },
          props.runStatus === 'running' ? 'rendering… the image lands here' : 'No render yet — run lands the image here')
      : h('img', { className: s.heroImg, key: hero.url, src: hero.url, alt: hero.name, 'data-testid': 'stage-preview-image-hero' }),
    rest.length > 0
      ? h('div', { className: s.thumbRow },
          rest.map((a) => h('img', {
            key: a.url, className: s.thumb, src: a.url, alt: a.name, loading: 'lazy',
          })))
      : null,
    HistoryStrip(props, promote, 'stage-output-history', picked),
  )
}

/** THE AUDIO PREVIEW — one hero track, one native player (the same
 *  law as the video preview: native <audio controls>; no library).
 *  The active set's named clips follow in the strip row. */
export function AudioStagePreview(props: PreviewOwnerProps): ReturnType<typeof h> {
  const { hero, rest, viewingHistory, note, picked, promote, returnToCurrent } = useHistoryHero(props)
  return h('div', { className: s.stagePreview, 'data-testid': 'stage-preview-audio' },
    viewingHistory ? h(StaleBadge, { note, onReturn: returnToCurrent }) : null,
    hero === undefined
      ? h('div', { className: s.empty },
          props.runStatus === 'running' ? 'rendering… the track lands here' : 'No render yet — run lands the track here')
      : h('audio', {
          className: s.heroAudio, controls: true, key: hero.url,
          src: hero.url, 'data-testid': 'stage-preview-audio-hero',
        }),
    rest.length > 0
      ? h('div', { className: s.strip },
          rest.map((a) => h('a', {
            key: a.url + a.name, className: s.stripLink, href: a.url, target: '_blank', rel: 'noreferrer',
            title: a.name,
          }, a.name)))
      : null,
    HistoryStrip(props, promote, 'stage-output-history', picked),
  )
}

/** THE MESH PREVIEW — the seam's adapter onto the raw-three
 *  multi-asset stage (GlbStagePreview, the substrate law: NO
 *  @react-three in any client bundle). The ACTIVE set becomes
 *  stage assets (the current run's, or a picked history entry's —
 *  mesh gains the full history law every other kind already had);
 *  the empty hint honors the live-run flag. THE LIVE FIGURE
 *  (stroke 90): a card-declared preview.figure replaces the empty
 *  tombstone with the native figure (the /poser bind mesh) — the
 *  studio-viewport capability on the form card; run outputs still
 *  take the stage the moment they exist. */
export function MeshStagePreview(props: PreviewOwnerProps): ReturnType<typeof h> {
  const { hero, rest, viewingHistory, note, picked, promote, returnToCurrent } = useHistoryHero(props)
  const active = hero === undefined ? [] : [hero, ...rest]
  return h('div', { className: s.stagePreview, 'data-testid': 'stage-preview-mesh' },
    viewingHistory ? h(StaleBadge, { note, onReturn: returnToCurrent }) : null,
    active.length > 0
      ? h(GlbStagePreview, {
          assets: active.map((a, i) => ({ id: `${props.stageId}:${a.name || i}`, url: a.url, name: a.name })),
          emptyHint: props.runStatus === 'running' ? 'rendering… the mesh lands here' : 'No render yet — run lands the mesh here',
        })
      : props.figure !== undefined
        ? h(PoserFigureStage, {
            identityModel: props.figure.identityModel,
            identityCoeffs: props.figure.identityCoeffs,
            localChanges: props.figure.localChanges,
            framing: props.figure.framing,
            focalLength: props.figure.focalLength,
            label: `poser-figure:${props.stageId}`,
          })
        : h(GlbStagePreview, {
            assets: [],
            emptyHint: props.runStatus === 'running' ? 'rendering… the mesh lands here' : 'No render yet — run lands the mesh here',
          }),
    HistoryStrip(props, promote, 'stage-output-history', picked),
  )
}

/** THE MESH PREVIEW — the raw-three multi-asset stage (the substrate
 *  law: NO @react-three in any client bundle). Re-exported here so
 *  the preview seam stays ONE subpath: import { GlbStagePreview }
 *  from '@melite/card-base/preview'. */
export { GlbStagePreview, autoFitToHeight, type StageAsset } from './glb-stage.tsx'
export { PoserFigureStage, figureGeometry, figureCoeffsOf, figureLocalChangesOf, figureCameraOf, figureShapeSig, type PoserMeshDoc } from './poser-figure.tsx'
export { ViewportFrame, ViewportAnchor, ReferenceImageBadge } from './viewportChrome.tsx'
export type { ViewportFrameProps, ViewportAnchorProps, ReferenceImageBadgeProps, ViewportAnchorDock } from './viewportChrome.tsx'
