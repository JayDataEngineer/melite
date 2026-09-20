/**
 * drilldown.tsx — THE MEDIA DRILLDOWN, one component for every surface
 * (the operator's hour-24 order: "clicking the preview component should
 * mirror the media drilldown view 1:1"). Extracted VERBATIM from the
 * gallery's MediaPanel Overlay — the gallery's media tiles and the
 * cards' stage previews ride the SAME face: DSH's Modal (headless —
 * body portal, mask, Escape, aria-modal and focus handling are the
 * primitive's, never ours), the kind-switched full-size artifact, the
 * caption, the esc hint.
 *
 * The gallery's MediaItem EXTENDS MediaDrilldownItem; the cards map
 * their stage artifact onto it (mesh kind → 'model' — the media vocab
 * alignment, one spelling).
 */
import * as React from 'react'
import { Modal } from '@deepseek-ai/dsh-client-ui-primitives'

import css from './client/overlay.module.css'
import { bgBase1, labelPrimary2, stateBusinessPrimary, textTertiary3 } from './client/ui.tokens'

/** The drilldown's own currency — everything the face reads, nothing
 *  it doesn't (the gallery's richer item satisfies it structurally). */
export interface MediaDrilldownItem {
  kind: 'image' | 'video' | 'audio' | 'model'
  url: string
  file: string
  head: string
  time: string
}

/** 3D artifact view — hands the artifact to the sidebar as a RESOURCE
 *  (estate-artifact address, claimed by a viewer tab type; the mesh
 *  renders in the right panel, orbitable beside the run list).
 *  The download link stays: when the viewer plugin is absent no tab
 *  type claims the address and openResource is a no-op — the artifact
 *  must still be reachable. openArtifact is OPTIONAL: a surface with
 *  no sidebar door (the card zoom) simply hides the link. */
function ModelView({ item, openArtifact }: { item: MediaDrilldownItem; openArtifact?: (item: MediaDrilldownItem) => void }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
      {openArtifact !== undefined
        ? (
            <a
              role="button"
              tabIndex={0}
              style={{ color: stateBusinessPrimary, fontSize: 14, cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); openArtifact(item) }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); openArtifact(item) } }}
            >open 3D view in sidebar</a>
          )
        : null}
      <a
        href={item.url}
        download={item.file}
        style={{ color: textTertiary3, fontSize: 13, cursor: 'pointer' }}
        onClick={(e) => { e.stopPropagation() }}
      >download {item.file}</a>
    </div>
  )
}

/** THE MEDIA DRILLDOWN (the gallery Overlay, verbatim — one face).
 * THE WALK ARROWS (2026-09-20, the operator's catch: "where are my
 * side arrows when I open an image so scroll through to others"):
 * an OPTIONAL sibling walk — the caller passes the visible list;
 * arrows render only when there is more than one to walk. The
 * arrows paint their OWN chip (explicit bg + label tokens — the
 * white-✕ lesson: never inherit the page's text color on a
 * self-painted surface), walk WRAP-AROUND, and the keyboard
 * ArrowLeft/ArrowRight ride the same verbs. No siblings = exactly
 * the old face (both call sites unchanged until wired). */
export function MediaDrilldown({ item, onClose, openArtifact, siblings, onNavigate }: {
  item: MediaDrilldownItem
  onClose: () => void
  openArtifact?: (item: MediaDrilldownItem) => void
  siblings?: MediaDrilldownItem[]
  onNavigate?: (next: MediaDrilldownItem) => void
}): React.JSX.Element {
  const walkable = siblings ?? []
  const at = walkable.findIndex((s) => s.url === item.url)
  // THE FOCUS LAW: the lightbox takes focus on mount (keys work
  // the instant it opens — ArrowLeft/ArrowRight walk, no click
  // needed first); tabIndex -1 keeps it out of the tab order.
  const seat = React.useRef<HTMLDivElement | null>(null)
  React.useEffect(() => { seat.current?.focus() }, [])
  // THE WALK SEAT: arrows render only when the whole walk exists —
  // a sibling list of 2+, a position in it, and the navigate verb.
  // step then needs NO interior guards (every arm reachable).
  const canWalk = onNavigate !== undefined && walkable.length > 1 && at >= 0
  // THE LINE, NOT THE RING — LEFT TOWARD CURRENT (operator
  // 2026-09-20/21: "reverse the arrow direction"; "it closes out
  // when I scroll too far to the left"): the walk set is a TIMELINE
  // — position 0 is the CURRENT generation, deeper positions are
  // OLDER history.
  //   ‹ LEFT  = toward current; ON current it HOLDS — a walk step
  //             NEVER closes the viewer (exit rides ✕/Escape only).
  //   › RIGHT = deeper into history; at the oldest it holds too.
  // Both end chips dim (visibly the end of the line), never dead:
  // the old ring teleported current → OLDEST on one Left.
  const atHead = at === 0
  const atTail = at === walkable.length - 1
  const step = (delta: 1 | -1): void => {
    const next = at + delta
    if (next < 0 || next >= walkable.length) return // the ends hold — no close-on-walk
    onNavigate!(walkable[next]!)
  }
  // THE KEYBOARD at the WINDOW (the DSH Modal may portal the seat
  // and contest focus): while the lightbox is up, ArrowLeft/
  // ArrowRight walk the siblings — re-bound each render so the
  // closure always sees the CURRENT position and list. The div's
  // own onKeyDown rides the same verb (focused-seat path); the
  // synthetic stopPropagation keeps the two from double-firing.
  const onKey = (e: { key: string, stopPropagation(): void }): void => {
    if (!canWalk) return
    if (e.key === 'ArrowLeft') { e.stopPropagation(); step(-1) }
    if (e.key === 'ArrowRight') { e.stopPropagation(); step(1) }
  }
  React.useEffect(() => {
    const nat = (e: KeyboardEvent): void => { onKey(e) }
    window.addEventListener('keydown', nat)
    return () => { window.removeEventListener('keydown', nat) }
  })
  return (
    <Modal
      open
      onClose={onClose}
      title={item.file || 'media preview'}
      headless
      className={css.lightbox}
    >
      <div
        ref={seat}
        tabIndex={-1}
        style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, outline: 'none' }}
        onKeyDown={onKey}
      >
        <button aria-label="Close preview" onClick={onClose}
          style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '4px 6px', borderRadius: 6 }}>✕</button>
        {canWalk
          ? (
            <button
              aria-label="Previous media"
              data-testid="drill-prev"
              onClick={() => { step(-1) }}
              style={{
                position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', zIndex: 10,
                width: 40, height: 40, borderRadius: 999, cursor: 'pointer',
                background: bgBase1, border: `1px solid ${labelPrimary2}33`, color: labelPrimary2,
                fontSize: 22, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                ...(atHead ? { opacity: 0.3, cursor: "default" } : {}),
              }}
            >‹</button>
          )
          : null}
        {canWalk
          ? (
            <button
              aria-label="Next media"
              data-testid="drill-next"
              disabled={atTail}
              onClick={() => { step(1) }}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', zIndex: 10,
                width: 40, height: 40, borderRadius: 999, cursor: 'pointer',
                background: bgBase1, border: `1px solid ${labelPrimary2}33`, color: labelPrimary2,
                fontSize: 22, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                ...(atTail ? { opacity: 0.3, cursor: 'default' } : {}),
              }}
            >›</button>
          )
          : null}
        {item.kind === 'video'
          ? (
              <video
                src={item.url}
                controls
                autoPlay
                playsInline
                style={{ maxWidth: '94vw', maxHeight: '78vh', borderRadius: 8, background: bgBase1 }}
              />
            )
          : item.kind === 'audio'
            ? (
                <audio
                  src={item.url}
                  controls
                  autoPlay
                  style={{ width: 'min(560px, 90vw)' }}
                />
              )
            : item.kind === 'model'
            ? (
                <ModelView item={item} openArtifact={openArtifact} />
              )
            : item.kind === 'image'
            ? (
                <img
                  src={item.url}
                  alt={item.file}
                  style={{ maxWidth: '94vw', maxHeight: '78vh', borderRadius: 8, objectFit: 'contain' }}
                />
              )
            : null}
        <div style={{ color: labelPrimary2, fontSize: 13, maxWidth: '80vw', textAlign: 'center', lineHeight: 1.5 }}>
          <div style={{ fontWeight: 600 }}>{item.head}</div>
          <div style={{ opacity: 0.7 }}>{[item.time, item.file].filter(Boolean).join(' · ')}</div>
        </div>
        <div style={{ color: textTertiary3, fontSize: 12 }}>Esc or click the mask to close</div>
      </div>
    </Modal>
  )
}
