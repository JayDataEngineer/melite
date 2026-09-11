/**
 * InputSquare — the ONE square for any slot-shaped value, ported from
 * the old system's SlotSquare law (packages/web-kit/ui/SlotSquare.tsx,
 * 2026-08-08: "the look for it will be reused for the sub-card
 * system") onto the DSH substrate: ui-primitives glyphs, our module
 * CSS under the web-styling chrome laws (0.5px hairlines, paired
 * line-heights, token transitions), no lucide/cn/tip.
 *
 * THE OLD LAW, KEPT VERBATIM — a square thumbnail with label + badge
 * + the THREE source verbs (operator, 2026-09-12: "we rendered a
 * square and gave the option to do 1 of 3 things"):
 *   a) from previous card  → onClick (the host opens the wire picker;
 *                            badge = the upstream card's title)
 *   b) from file upload    → onPickFile/onDropFile (hidden input +
 *                            OS drop — the ONE read path readAsDataURL)
 *   c) from media bar      → onDropAsset (the ASSET_DRAG_MIME contract
 *                            the drop surface already serves)
 * plus the X (detach). The consumer owns the doors — this shell only
 * voices them (ui-attachment's own law: presentation registers, the
 * service seams stay with their owners).
 */
import { createElement as h, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { IconPaperclipOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './card.module.css'

/** The media-bar drag contract (CardsTab serves the same MIME on its
 *  drop surface — ONE spelling, imported from the tab's law). */
export const ASSET_DRAG_MIME = 'application/tech-noir-asset'

/** THE "is this a thumbnail" rule (SlotSquare's, kept verbatim):
 *  data: images, blob: fresh-upload mirrors, and http(s)/root-relative
 *  artifact URLs. Every slot-shaped value renders the same way. */
export function isImageUrl(value: string): boolean {
  return (
    /^data:image\//i.test(value) ||
    /^blob:/i.test(value) ||
    /^(?:https?:)?\/[^"'<>]*\.(?:png|jpe?g|webp|gif|bmp|avif)(?:[?#]|$)/i.test(value)
  )
}

/** Read a File/Blob and resolve its data: URL — the ONE read path for
 *  every slot-shaped attach (the old law, single definition). */
export function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => { resolve(String(r.result)) }
    r.onerror = () => { reject(r.error ?? new Error('read failed')) }
    r.readAsDataURL(file)
  })
}

export interface InputSquareVerbs {
  /** a) from previous card — open the wire picker; receives the
   *  square's element so the picker anchors on it. */
  onWire?: (anchor?: unknown) => void
  /** The upstream card's title (the wired-state badge). */
  upstreamTitle?: string | null
  /** b) from file upload — the hidden picker AND OS drops. */
  onFile?: (file: File) => void
  /** c) from media bar — the asset-tray drop (URL payload). */
  onAsset?: (url: string) => void
  /** The X (detach) — fired when a value/badge is set. */
  onClear?: () => void
}

export interface InputSquareProps extends InputSquareVerbs {
  /** Short field key shown under the square (e.g. "input_image"). */
  label: string
  /** Attached value → thumbnail when it passes isImageUrl. */
  value?: string | null
  /** Secondary mono line. */
  metric?: string
  disabled?: boolean
}

/** Parse the asset MIME off a drop event. null = absent or malformed. */
function assetPayload(e: DragEvent): string | null {
  const raw = e.dataTransfer.getData(ASSET_DRAG_MIME)
  if (raw === '') return null
  try {
    const p = JSON.parse(raw) as { url?: unknown }
    return typeof p['url'] === 'string' ? p['url'] : null
  } catch { return null }
}

export function InputSquare(props: InputSquareProps): ReturnType<typeof h> {
  const { label, value, metric, upstreamTitle, disabled } = props
  const fileRef = useRef<HTMLInputElement | null>(null)
  const boxRef = useRef<HTMLDivElement | null>(null)
  const [over, setOver] = useState(false)
  const thumb = typeof value === 'string' && isImageUrl(value) ? value : null
  const wired = upstreamTitle !== null && upstreamTitle !== undefined && upstreamTitle !== ''
  const empty = thumb === null && !wired
  const pick = (): void => {
    if (disabled) return
    if (empty && props.onFile !== undefined) fileRef.current?.click()
    else if (props.onWire !== undefined) props.onWire(boxRef.current)
  }
  return h('div', { className: css.squareWrap + (disabled ? ' ' + css.squareOff : '') },
    h('div', {
      ref: boxRef,
      className: css.squareBox + (over ? ' ' + css.squareOver : ''),
      role: 'button',
      tabIndex: 0,
      'aria-label': label + (wired ? ' (from ' + String(upstreamTitle) + ')' : ' source'),
      onClick: pick,
      onKeyDown: (e: unknown) => { if ((e as KeyboardEvent).key === 'Enter') pick() },
      onDragOver: (e: DragEvent) => {
        if (disabled) return
        e.preventDefault()
        setOver(true)
      },
      onDragLeave: () => { setOver(false) },
      onDrop: (e: DragEvent) => {
        if (disabled) return
        e.preventDefault()
        setOver(false)
        const asset = assetPayload(e)
        if (asset !== null && props.onAsset !== undefined) { props.onAsset(asset); return }
        const f = e.dataTransfer.files[0]
        if (f !== undefined && props.onFile !== undefined) props.onFile(f)
      },
    },
      thumb !== null
        ? h('img', { className: css.squareThumb, src: thumb, alt: label })
        : h(IconPaperclipOutline16, { className: css.squareGlyph }),
      wired ? h('span', { className: css.squareBadge }, String(upstreamTitle)) : null,
      !empty && props.onClear !== undefined
        ? h('button', {
            className: css.squareX,
            type: 'button',
            title: 'Detach',
            'aria-label': 'Detach ' + label,
            onClick: (e: MouseEvent) => { e.stopPropagation(); props.onClear?.() },
          }, '✕')
        : null,
    ),
    h('span', { className: css.squareLabel }, label),
    metric !== undefined ? h('span', { className: css.squareMetric }, metric) : null,
    props.onFile !== undefined && !disabled
      ? h('input', {
          ref: fileRef,
          type: 'file',
          accept: 'image/png,image/jpeg,image/webp',
          className: css.squareFileInput,
          'aria-hidden': true,
          tabIndex: -1,
          onChange: (e: unknown) => {
            const f = (e as { target: { files: FileList | null } }).target.files?.[0]
            if (f !== undefined && f !== null) props.onFile?.(f)
            if (fileRef.current !== null) fileRef.current.value = ''
          },
        })
      : null,
  )
}
