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
import { MeshView } from './client/mesh-view.tsx'
import { bgBase1, labelPrimary2, stateBusinessPrimary, stateWarnPrimary1, textTertiary3 } from './client/ui.tokens'

/** The drilldown's own currency — everything the face reads, nothing
 *  it doesn't (the gallery's richer item satisfies it structurally). */
export interface MediaDrilldownItem {
  kind: 'image' | 'video' | 'audio' | 'model'
  url: string
  file: string
  head: string
  time: string
}

/** 3D artifact view — THE MESH RENDERS HERE, IN THE MODAL (the
 *  operator's 2026-09-26 order: the 3D lane is hooked into the media
 *  plane with a real visual door). `MeshView` mounts the estate's shared
 *  stage core + the shared GLB loader, so a `.glb` is orbitable in the
 *  drilldown exactly as an image is visible in the drilldown — no
 *  sidebar round-trip required to see the artifact.
 *
 *  The two links under the canvas stay, and both are load-bearing:
 *  the sidebar hand-off (an estate-artifact RESOURCE address claimed by
 *  a viewer tab type — a bigger, docked orbit beside the run list) and
 *  the download (when WebGL or the decode refuses, or the viewer plugin
 *  is absent, the artifact must still be reachable). openArtifact is
 *  OPTIONAL: a surface with no sidebar door (the card zoom) hides that
 *  link and keeps the canvas + the download. */
function ModelView({ item, openArtifact }: { item: MediaDrilldownItem; openArtifact?: (item: MediaDrilldownItem) => void }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', width: '100%' }}>
      <MeshView url={item.url} file={item.file} />
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
export function MediaDrilldown({ item, onClose, openArtifact, siblings, onNavigate, onDelete, onRename }: {
  item: MediaDrilldownItem
  onClose: () => void
  openArtifact?: (item: MediaDrilldownItem) => void
  siblings?: MediaDrilldownItem[]
  onNavigate?: (next: MediaDrilldownItem) => void
  /** THE MODAL MUTATIONS (the mediasidebar's popup modal on media
   *  stuff): OPTIONAL delete + rename verbs — a surface with no
   *  mutating door (the card zoom) simply hides both buttons (the
   *  3D-door pattern: optional prop, absent face). The verbs are
   *  async (the host doors); the drilldown owns the confirm +
   *  inline-rename faces, the busy/error states, and NOTHING else —
   *  the parent owns what happens after (close / re-point / reload). */
  onDelete?: (item: MediaDrilldownItem) => Promise<void>
  onRename?: (item: MediaDrilldownItem, name: string) => Promise<void>
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
  /* THE MODAL MUTATIONS — delete + rename faces (the mediasidebar's
   * popup modal on media stuff): the drilldown owns the confirm +
   * inline-rename faces and the busy/error states; the async verbs
   * ride the optional props (absent = no buttons, the card zoom).
   * A walk step re-points the item — the faces reset with it, so a
   * confirm can never fire against the walked-away file. */
  const [mode, setMode] = React.useState<'idle' | 'confirmDelete' | 'renaming'>('idle')
  const [draftName, setDraftName] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [opError, setOpError] = React.useState('')
  /* THE IN-FLIGHT REF (the double-click guard): state flushes on
   * re-render, so two confirms in the same tick would both read
   * busy=false — the ref holds synchronously (reset with the faces
   * on every walk step). */
  const inflight = React.useRef(false)
  React.useEffect(() => {
    setMode('idle')
    setDraftName('')
    setBusy(false)
    setOpError('')
    inflight.current = false
  }, [item.url])
  const canDelete = onDelete !== undefined
  const canRename = onRename !== undefined
  const showActions = canDelete || canRename
  const startDelete = (): void => {
    setOpError('')
    setMode('confirmDelete')
  }
  const confirmDelete = (): void => {
    if (onDelete === undefined || inflight.current) return
    inflight.current = true
    setBusy(true)
    setOpError('')
    void onDelete(item)
      .catch((e: unknown) => { setOpError(e instanceof Error ? e.message : String(e)) })
      .finally(() => { inflight.current = false; setBusy(false); setMode('idle') })
  }
  const startRename = (): void => {
    setOpError('')
    setDraftName(item.file)
    setMode('renaming')
  }
  const confirmRename = (): void => {
    if (onRename === undefined || inflight.current) return
    const name = draftName.trim()
    if (name === '' || name === item.file) return
    inflight.current = true
    setBusy(true)
    setOpError('')
    void onRename(item, name)
      .catch((e: unknown) => { setOpError(e instanceof Error ? e.message : String(e)) })
      .finally(() => { inflight.current = false; setBusy(false); setMode('idle') })
  }
  const actionBtn = (label: string, verb: () => void, opts: { danger?: boolean; testid: string; aria: string }): React.JSX.Element => (
    <button
      type="button"
      aria-label={opts.aria}
      data-testid={opts.testid}
      disabled={busy}
      onClick={(e) => { e.stopPropagation(); verb() }}
      style={{
        background: 'none',
        border: `1px solid ${labelPrimary2}33`,
        borderRadius: 8,
        padding: '5px 12px',
        fontSize: 12,
        fontWeight: 600,
        cursor: busy ? 'default' : 'pointer',
        color: opts?.danger === true ? stateWarnPrimary1 : stateBusinessPrimary,
        opacity: busy ? 0.5 : 1,
      }}
    >{label}</button>
  )
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
              // FIT THE BOX, NOT THE VIEWPORT (the operator's catch,
              // 2026-09-23, asked 5+ times: "the video is too big
              // for the box"): the lightbox dialog is
              // min(1200px, 96vw) WIDE — a 94vw/78vh video is
              // viewport-clamped, so on any screen wider than
              // ~1280px the element renders WIDER than the dialog
              // and spills out of it. The element takes the seat's
              // content width (the box minus its padding) and
              // letterboxes inside itself (contain) under a vh
              // ceiling — it can never exceed the box.
              <video
                src={item.url}
                controls
                autoPlay
                playsInline
                style={{ width: '100%', maxHeight: '72vh', objectFit: 'contain', borderRadius: 8, background: bgBase1 }}
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
                  style={{ width: '100%', maxHeight: '72vh', objectFit: 'contain', borderRadius: 8 }}
                />
              )
            : null}
        <div style={{ color: labelPrimary2, fontSize: 13, maxWidth: '80vw', textAlign: 'center', lineHeight: 1.5 }}>
          <div style={{ fontWeight: 600 }}>{item.head}</div>
          <div style={{ opacity: 0.7 }}>{[item.time, item.file].filter(Boolean).join(' · ')}</div>
        </div>
        {showActions
          ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }} onClick={(e) => { e.stopPropagation() }}>
                {mode === 'idle'
                  ? (
                      <>
                        {canRename ? actionBtn('Rename', startRename, { testid: 'drill-rename', aria: 'Rename media file' }) : null}
                        {canDelete ? actionBtn('Delete', startDelete, { danger: true, testid: 'drill-delete', aria: 'Delete media file' }) : null}
                      </>
                    )
                  : mode === 'confirmDelete'
                    ? (
                        <>
                          <span style={{ color: labelPrimary2, fontSize: 12 }}>Delete {item.file}?</span>
                          {actionBtn(busy ? 'Deleting…' : 'Confirm delete', confirmDelete, { danger: true, testid: 'drill-delete-confirm', aria: 'Confirm delete media file' })}
                          {actionBtn('Cancel', () => { setMode('idle'); setOpError('') }, { testid: 'drill-delete-cancel', aria: 'Cancel delete' })}
                        </>
                      )
                    : (
                        <>
                          <input
                            aria-label="New file name"
                            data-testid="drill-rename-input"
                            value={draftName}
                            disabled={busy}
                            onChange={(e) => { setDraftName(e.target.value) }}
                            onKeyDown={(e) => {
                              e.stopPropagation()
                              if (e.key === 'Enter') confirmRename()
                              if (e.key === 'Escape') { setMode('idle'); setOpError('') }
                            }}
                            style={{
                              background: bgBase1, color: labelPrimary2,
                              border: `1px solid ${labelPrimary2}33`, borderRadius: 8,
                              padding: '5px 10px', fontSize: 12, width: 'min(280px, 60vw)',
                            }}
                          />
                          {actionBtn(busy ? 'Renaming…' : 'Save', confirmRename, { testid: 'drill-rename-save', aria: 'Save new file name' })}
                          {actionBtn('Cancel', () => { setMode('idle'); setOpError('') }, { testid: 'drill-rename-cancel', aria: 'Cancel rename' })}
                        </>
                      )}
              </div>
            )
          : null}
        {opError !== '' ? <div data-testid="drill-op-error" style={{ color: stateWarnPrimary1, fontSize: 12 }}>{opError}</div> : null}
        <div style={{ color: textTertiary3, fontSize: 12 }}>Esc or click the mask to close</div>
      </div>
    </Modal>
  )
}
