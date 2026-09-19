/**
 * square.tsx — InputSquare, THE ONE square for any slot-shaped value
 * — the base's default input component. Ported from the old system's
 * SlotSquare law (packages/web-kit/ui/SlotSquare.tsx, 2026-08-08:
 * "the look for it will be reused for the sub-card system") onto the
 * DSH substrate: ui-primitives glyphs, module CSS under the
 * web-styling chrome laws, no lucide/cn/tip.
 *
 * THE PLUS LAW (2026-09-13, the operator): the empty square
 * carries the PLUS — "add a source" — and the click opens the
 * three-entry source menu (From flow / From media / From file) in
 * the provider; a bare square without a picker still files.
 * THE OLD LAW, KEPT — a square thumbnail with label + badge
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
 *
 * THE CONSTRUCTION LAW (2026-09-12, the card-base founding): a card
 * package EMITS an image input → the base constructs THIS square
 * automatically. One input component; no card hand-rolls its own
 * file field ever again.
 */
import { createElement as h, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { IconPlusOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './card.module.css'

/** The media-bar drag contract (the tab's drop surface serves the
 * same MIME — ONE spelling, imported from the base's law). */
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
  /** a) THE PICKER — the slot IS the wire: opens the menu of the
   *  other stages' latest outputs (+ upload + clear); receives the
   *  square's element so the menu anchors on it. */
  onPick?: (anchor?: unknown) => void
  /** b) from file upload — the hidden picker AND OS drops. */
  onFile?: (file: File) => void
  /** c) from media bar — the asset-tray drop (URL payload). */
  onAsset?: (url: string) => void
  /** The X (detach) — fired when a value is set. */
  onClear?: () => void
}

export interface InputSquareProps extends InputSquareVerbs {
  /** Short field key shown under the square (e.g. "input_image").
   *  Empty string = NO caption (the owning section already names it
   *  — the 2026-09-15 duplicate-label fix). */
  label: string
  /** The ACCESSIBLE name when the visible caption is not the seat's
   *  name (the input stacks, #37: the head names the list, cells
   *  show their INDEX — aria carries "Reference images 1"). Falls
   *  back to `label`. */
  ariaLabel?: string
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
  const { label, value, metric, disabled } = props
  // THE SEAT NAME (aria) may differ from the visible caption — the
  // head-above law (#37): one name for the list, indices under the
  // cells, the full seat name for assistive tech and the verbs.
  const seat = props.ariaLabel ?? label
  const fileRef = useRef<HTMLInputElement | null>(null)
  const boxRef = useRef<HTMLDivElement | null>(null)
  const [over, setOver] = useState(false)
  const thumb = typeof value === 'string' && isImageUrl(value) ? value : null
  const empty = thumb === null
  const pick = (): void => {
    if (disabled) return
    // THE SLOT IS THE WIRE: with a picker attached, the click ALWAYS
    // opens it (the menu carries upload + clear too); a bare square
    // falls to the file dialog
    if (props.onPick !== undefined) props.onPick(boxRef.current)
    else if (empty && props.onFile !== undefined) fileRef.current?.click()
  }
  return h('div', { className: css.squareWrap + (disabled ? ' ' + css.squareOff : '') },
    h('div', {
      ref: boxRef,
      className: css.squareBox + (over ? ' ' + css.squareOver : ''),
      role: 'button',
      tabIndex: 0,
      'aria-label': (seat || 'source') + (seat !== '' ? ' source' : ''),
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
        : h(IconPlusOutline16, { className: css.squareGlyph }),
      !empty && props.onClear !== undefined
        ? h('button', {
            className: css.squareX,
            type: 'button',
            title: 'Detach',
            'aria-label': 'Detach ' + (seat || 'source'),
            onClick: (e: MouseEvent) => { e.stopPropagation(); props.onClear!() },
          }, '✕')
        : null,
    ),
    label !== '' ? h('span', { className: css.squareLabel }, label) : null,
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
            // (total: the ref clears only in the unmount commit, which
            //  detaches this closure first — non-null whenever we run.)
            fileRef.current!.value = ''
          },
        })
      : null,
  )
}
