/**
 * CropPreview — the input-prep studio's preview pane (operator
 * 2026-11, defect 3: "where the 'preview' section is a place where
 * you have the image, you can drag a box around to crop"). A pure
 * React leaf: the image plus a draggable/resizable crop box. ALL
 * box math is in IMAGE pixels (what the card's crop_x/crop_y/
 * crop_width/crop_height params name); the DOM overlay maps through
 * its own getBoundingClientRect ratio, so the same box rides any
 * rendered size. The gesture grammar is the ANNY-law crop:
 *
 *   press on empty veil → draw a fresh box (drag out the corners)
 *   press inside the box → move it
 *   press an edge/corner handle → resize that edge
 *   click empty veil (no drag) → clear the crop
 *
 * Commits are ATOMIC: the live drag rides local state only; onChange
 * fires ONCE at pointerup (the studio's patch law — never a patch
 * storm per pointermove). A release with either side under MIN_DIM
 * (8px, the blank-image law's own floor — a crop side below 8px
 * upscales to a blank) drops the box rather than committing a box
 * the engine cannot honor.
 */
import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { MIN_DIM } from '@melite/models-input'
import css from './prep.module.css'

/** A crop box in image pixels — the card's four crop params as one
 * value (the studio's own currency; the params map is derived). */
export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

/** The image's natural pixel size once decoded (null until the
 * <img> reports it — no crop math exists before then). */
export interface NaturalSize { width: number, height: number }

type Handle = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w'

interface DragState {
  kind: 'draw' | 'move' | 'resize'
  handle: Handle | null
  /** pointer position at press, in image px */
  startX: number
  startY: number
  /** the committed rect at press (move/resize base) */
  base: CropRect
}

interface Point { x: number, y: number }

/** Clamp a point into the image bounds. */
const clampPoint = (n: NaturalSize, x: number, y: number): Point => ({
  x: Math.max(0, Math.min(n.width, x)),
  y: Math.max(0, Math.min(n.height, y)),
})

/** The rect between two image-px points (normalized: width/height
 * are always >= 0 — a rightward-up drag and its mirror produce the
 * same box). */
const rectBetween = (n: NaturalSize, ax: number, ay: number, bx: number, by: number): CropRect => {
  const a = clampPoint(n, ax, ay)
  const b = clampPoint(n, bx, by)
  return {
    x: Math.round(Math.min(a.x, b.x)),
    y: Math.round(Math.min(a.y, b.y)),
    width: Math.round(Math.abs(b.x - a.x)),
    height: Math.round(Math.abs(b.y - a.y)),
  }
}

/** Apply a handle drag to a base rect (the moving edge follows the
 * pointer; the opposite edge stays pinned). */
const resizeRect = (n: NaturalSize, base: CropRect, handle: Handle, x: number, y: number): CropRect => {
  const p = clampPoint(n, x, y)
  let { x: bx, y: by, width: bw, height: bh } = base
  if (handle.includes('w')) { const right = bx + bw; bx = Math.min(p.x, right); bw = right - bx }
  if (handle.includes('e')) { const left = bx; const ne = Math.max(p.x, left); bw = ne - bx }
  if (handle.includes('n')) { const bottom = by + bh; by = Math.min(p.y, bottom); bh = bottom - by }
  if (handle.includes('s')) { const top = by; const se = Math.max(p.y, top); bh = se - by }
  return { x: Math.round(bx), y: Math.round(by), width: Math.round(bw), height: Math.round(bh) }
}

/** Whether a committed rect is honorable (every side at least the
 * engine's own floor — the blank-image law's threshold). */
export const cropIsHonorable = (r: CropRect): boolean =>
  r.width >= MIN_DIM && r.height >= MIN_DIM

const HANDLES: readonly Handle[] = ['nw', 'ne', 'se', 'sw', 'n', 'e', 's', 'w']

export function CropPreview({ src, crop, onChange, onNatural }: {
  src: string
  crop: CropRect | null
  onChange(next: CropRect | null): void
  /** Reports the decoded natural size once (the studio's presets and
   * readback derive from it; optional — the leaf works without). */
  onNatural?(n: NaturalSize): void
}) {
  const [natural, setNatural] = useState<NaturalSize | null>(null)
  const [live, setLive] = useState<CropRect | null>(crop)
  // THE HONEST FAILURE FACE (audit input-prep F8, 2026-10-20): a
  // source that passes isPreviewable but fails to decode (a dead
  // rooted path, a dead artifact host) used to render a PERMANENT
  // broken frame with no note — the pane's own law says the studio
  // tells the operator instead. A failed decode latches the error
  // face naming the source; no crop overlay mounts over a frame
  // that never loaded.
  const [failed, setFailed] = useState(false)
  const dragRef = useRef<DragState | null>(null)
  // THE GESTURE STATE IS REF-READ, NEVER CLOSURE-READ (the
  // tap-before-commit race, caught by the wall's act-batched drag):
  // if a pointermove's render has not committed by pointerup —
  // batched updates, a fast tap — the up-handler's closure would
  // read the STALE box and commit the pre-drag rect. The refs are
  // always current; the state mirrors them for render.
  const naturalRef = useRef<NaturalSize | null>(null)
  const liveRef = useRef<CropRect | null>(crop)
  const seatLive = (next: CropRect | null): void => {
    liveRef.current = next
    setLive(next)
  }
  // the rendered box follows the committed prop EXCEPT mid-gesture
  // (the live drag owns the box until release)
  useEffect(() => {
    if (dragRef.current === null) {
      liveRef.current = crop
      setLive(crop)
    }
  }, [crop])

  const overlayRef = useRef<HTMLDivElement | null>(null)

  /** Image-px point for a pointer event, via the overlay's own box. */
  const toImage = (e: ReactPointerEvent): Point => {
    const el = overlayRef.current
    const n = naturalRef.current
    if (el === null || n === null) return { x: 0, y: 0 }
    const r = el.getBoundingClientRect()
    const sx = r.width > 0 ? n.width / r.width : 0
    const sy = r.height > 0 ? n.height / r.height : 0
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy }
  }

  /** % geometry: image px → the overlay's percent (render-size
   * independent — the box tracks the image under any layout). */
  const pct = (r: CropRect): Record<string, string> => ({
    left: `${(r.x / (natural?.width ?? 1)) * 100}%`,
    top: `${(r.y / (natural?.height ?? 1)) * 100}%`,
    width: `${(r.width / (natural?.width ?? 1)) * 100}%`,
    height: `${(r.height / (natural?.height ?? 1)) * 100}%`,
  })

  const onOverlayDown = (e: ReactPointerEvent): void => {
    if (natural === null) return
    const p = toImage(e)
    const box = live
    if (box !== null && cropIsHonorable(box)
      && p.x >= box.x && p.x <= box.x + box.width
      && p.y >= box.y && p.y <= box.y + box.height) {
      dragRef.current = { kind: 'move', handle: null, startX: p.x, startY: p.y, base: box }
      e.currentTarget.setPointerCapture?.(e.pointerId)
      e.preventDefault()
      return
    }
    // empty veil → draw fresh (a bare click clears, at release)
    dragRef.current = { kind: 'draw', handle: null, startX: p.x, startY: p.y, base: { x: p.x, y: p.y, width: 0, height: 0 } }
    seatLive({ x: Math.round(p.x), y: Math.round(p.y), width: 0, height: 0 })
    e.currentTarget.setPointerCapture?.(e.pointerId)
    e.preventDefault()
  }

  const onOverlayMove = (e: ReactPointerEvent): void => {
    const d = dragRef.current
    if (d === null || natural === null) return
    const p = toImage(e)
    if (d.kind === 'draw') {
      seatLive(rectBetween(naturalRef.current!, d.startX, d.startY, p.x, p.y))
    } else if (d.kind === 'move') {
      const a = clampPoint(natural, d.startX, d.startY)
      const b = clampPoint(natural, p.x, p.y)
      seatLive({
        x: Math.round(Math.max(0, Math.min(natural.width - d.base.width, d.base.x + b.x - a.x))),
        y: Math.round(Math.max(0, Math.min(natural.height - d.base.height, d.base.y + b.y - a.y))),
        width: d.base.width,
        height: d.base.height,
      })
    } else if (d.handle !== null) {
      seatLive(resizeRect(natural, d.base, d.handle, p.x, p.y))
    }
  }

  const onOverlayUp = (): void => {
    const d = dragRef.current
    dragRef.current = null
    if (d === null) return
    const box = liveRef.current
    if (box === null || !cropIsHonorable(box)) onChange(null)
    else onChange(box)
  }

  const onHandleDown = (e: ReactPointerEvent, handle: Handle): void => {
    if (live === null) return
    const p = toImage(e)
    dragRef.current = { kind: 'resize', handle, startX: p.x, startY: p.y, base: live }
    e.currentTarget.setPointerCapture?.(e.pointerId)
    e.preventDefault()
    e.stopPropagation()
  }

  const box = live !== null && cropIsHonorable(live) ? live : null

  return (
    <div className={css.previewWrap} data-testid="prep-crop-preview">
      <img
        src={src}
        alt="crop source"
        className={css.previewImg}
        onLoad={(e) => {
          const im = e.currentTarget
          if (im.naturalWidth > 0 && im.naturalHeight > 0) {
            const n = { width: im.naturalWidth, height: im.naturalHeight }
            naturalRef.current = n
            setNatural(n)
            onNatural?.(n)
          }
        }}
        onError={() => { setFailed(true) }}
        draggable={false}
      />
      {failed && (
        <div className={css.paneNote} data-testid="prep-load-error">
          the source "{src}" would not load — the file is gone or its host is unreachable; the preview and crop need a live image
        </div>
      )}
      {natural !== null && !failed && (
        <div
          ref={overlayRef}
          className={css.previewOverlay}
          onPointerDown={onOverlayDown}
          onPointerMove={onOverlayMove}
          onPointerUp={onOverlayUp}
          data-testid="prep-crop-overlay"
        >
          {box !== null && (
            <div className={css.cropBox} style={pct(box)} data-testid="prep-crop-box">
              {HANDLES.map((hd) => (
                <span
                  key={hd}
                  className={css[`handle_${hd}`] ?? css.handle}
                  data-handle={hd}
                  data-testid={`prep-crop-handle-${hd}`}
                  onPointerDown={(e) => { onHandleDown(e, hd) }}
                  onPointerMove={onOverlayMove}
                  onPointerUp={onOverlayUp}
                />
              ))}
              <span className={css.cropBadge}>
                {box.width}×{box.height}
              </span>
            </div>
          )}
          {box === null && (
            <span className={css.previewHint}>drag a box to crop — click to clear</span>
          )}
        </div>
      )}
    </div>
  )
}
