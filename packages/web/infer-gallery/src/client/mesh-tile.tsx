/**
 * mesh-tile — THE MODEL TILE'S PREVIEW (the operator's 2026-10-18
 * order: a mesh artifact must show SOMETHING in the media sidebar,
 * never a blank tile).
 *
 * ROOT CAUSE IT CURES (see the audit): flatten() sets poster only
 * for video/image, so MediaPanel's tile seat rendered null for every
 * model artifact — a gradient with a cube glyph, no preview. MeshView
 * was wired only in the drilldown and the estate-artifact tab, never
 * in the grid. This component is the grid's wire: a model tile mounts
 * it in its media seat.
 *
 * CLICK-TO-LOAD (never mount-on-visible): a hero mesh is 47MB — an
 * IntersectionObserver auto-mount would fetch GLBs the user only
 * scrolled past, and the panel's first paint must never wait on a
 * fetch. The tile paints its idle chip immediately (no fetch, no
 * WebGL); the stage mounts only on the user's explicit arm. Loading
 * and named-failure states are MeshView's own (shared loader, shared
 * honest-failure copy) — this file adds no loader and no three.js
 * import, so the page keeps its ONE three.js copy (three-client law).
 *
 * COPY LAW: user-visible copy is locale-owned — it lives in the tree's
 * typed galleryCopy dictionary (client/galleryCopy.ts), never inline in
 * the JSX (the former local MESH_TILE_COPY rows joined the tree
 * dictionary, 2026-11-05).
 */
import * as React from 'react'
import { useState } from 'react'
import { MeshView } from './mesh-view.tsx'
import { galleryCopy } from './galleryCopy.ts'
import { bgBase1, labelPrimary3, stateBusinessPrimary, stateBusinessPrimaryBg2 } from './ui.tokens.ts'

/** Keyboard activation (Enter/Space) shared by both affordances. */
function activate(key: string): boolean {
  return key === 'Enter' || key === ' '
}

/** The model tile's media seat: an idle chip until armed, the shared
 *  MeshView after. The seat lives inside the tile button, so every
 *  pointer and keyboard arm stops propagation — arming or orbiting
 *  must never open the drilldown. The drilldown stays reachable
 *  through the tile's caption, wand, and keyboard. */
export function ModelTilePreview({ url, file }: { url: string; file: string }): React.JSX.Element {
  const [armed, setArmed] = useState(false)
  if (!armed) {
    const name = galleryCopy.tileLoadPreviewOf(file)
    return (
      <span
        style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
        }}
      >
        <span
          role="button"
          tabIndex={0}
          data-testid="model-tile-load"
          aria-label={name}
          title={name}
          onClick={(e) => { e.stopPropagation(); setArmed(true) }}
          onKeyDown={(e) => { if (activate(e.key)) { e.stopPropagation(); setArmed(true) } }}
          style={{
            pointerEvents: 'auto', background: stateBusinessPrimaryBg2, color: stateBusinessPrimary,
            borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}
        >{galleryCopy.tileLoadPreview}</span>
      </span>
    )
  }
  return (
    <span
      data-testid="model-tile-preview"
      onClick={(e) => { e.stopPropagation() }}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 34, overflow: 'hidden' }}
    >
      <MeshView url={url} file={file} height={120} />
      <span
        role="button"
        tabIndex={0}
        data-testid="model-tile-close"
        aria-label={galleryCopy.tileClosePreview}
        title={galleryCopy.tileClosePreview}
        onClick={(e) => { e.stopPropagation(); setArmed(false) }}
        onKeyDown={(e) => { if (activate(e.key)) { e.stopPropagation(); setArmed(false) } }}
        style={{
          position: 'absolute', top: 4, right: 4, background: bgBase1, color: labelPrimary3,
          borderRadius: 5, padding: '2px 7px', fontSize: 10, cursor: 'pointer',
        }}
      >{galleryCopy.tileClosePreview}</span>
    </span>
  )
}
