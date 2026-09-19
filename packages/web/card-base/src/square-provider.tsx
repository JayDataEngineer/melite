/** square-provider.tsx — extracted from form.tsx (hour 15, the godfile split; the
 * operator's DRY audit law: one seam, one small file, one wall). */
import { createElement as h, Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { Menu, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import { type InputSquareVerbs, isImageUrl, readAsDataUrl } from './square.tsx'
import { uploadInputFile } from './wire.ts'
import { type SpecField } from './spec.ts'
import css from './card.module.css'

/** The media-kind the picker fetches for a field: image fields name
 *  image; file fields take the whole library (their accept narrows
 *  client-side per row). */
function mediaKindForField(f: SpecField): string {
  return f.type === 'image' ? 'image' : 'all'
}

/** THE ONE square provider (the old SlotGrid law, DSH substrate):
 *  every slot-shaped field of a stage gets the same verbs — file
 *  upload (the /v1/uploads door + the data-URL mirror), media drop
 *  (the asset MIME → the param), and THE PICKER (a DSH Menu anchored
 *  on the square listing the other stages' latest outputs; picking
 *  one writes the PARAM — the slot is the wire, no separate wiring
 *  mechanic exists). ONE definition; the constructor and every
 *  claimed atom ride it. */
export function useSquareProvider(onEdit: (name: string, v: unknown) => void, wire: SquareWire): {
  square: (f: SpecField) => SquareHost | undefined
  wireMenu: ReturnType<typeof h> | null
} {
  const [mirror, setMirror] = useState<Record<string, string>>({})
  const [pickAt, setPickAt] = useState<{ rect: DOMRect; field: SpecField } | null>(null)
  // THE PICKER MODAL seat (2026-09-13): From flow / From media open
  // ONE selector modal — mode decides the rows; From file goes to the
  // OS dialog. The flat click-through picker is dead (the operator:
  // "Flat pick didn't even make any sense").
  const [modalAt, setModalAt] = useState<{ mode: 'flow' | 'media'; field: SpecField } | null>(null)
  // the From file capture: the menu closes (pickAt → null) BEFORE the
  // OS dialog answers — the field rides a ref from the menu click.
  const fieldRef = useRef<SpecField | null>(null)
  const [mediaRows, setMediaRows] = useState<Array<{ id: string; label: string; url: string }> | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const onFile = useCallback(async (f: SpecField, file: File): Promise<void> => {
    if (wire.onFile !== undefined) { wire.onFile(file); return }
    try {
      const dataUrl = await readAsDataUrl(file)
      setMirror((m) => ({ ...m, [f.name]: dataUrl }))
      const { name } = await uploadInputFile(file)
      onEdit(f.name, name)
    } catch (e: unknown) {
      onEdit(f.name, e instanceof Error ? e.message : 'upload failed')
    }
  }, [onEdit, wire.onFile])
  const square = (f: SpecField): SquareHost | undefined => {
    if (f.type !== 'image' && f.type !== 'file') return undefined
    return {
      display: mirror[f.name] ?? null,
      verbs: {
        onPick: (anchor?: unknown) => {
          const el = anchor instanceof HTMLElement ? anchor : null
          setPickAt(el !== null
            ? { rect: el.getBoundingClientRect(), field: f }
            : { rect: new DOMRect(8, 8, 1, 1), field: f })
        },
        onFile: (file: File) => { void onFile(f, file) },
        onAsset: (url: string) => { onEdit(f.name, url) },
        onClear: () => {
          setMirror((m) => { const n = { ...m }; delete n[f.name]; return n })
          onEdit(f.name, '')
        },
      },
    }
  }
  const sourceMenu = pickAt === null ? null : h(Menu, {
    open: true,
    anchor: null,
    getAnchorRect: () => pickAt.rect,
    items: [
      { id: '__flow__', label: 'From flow' },
      { id: '__media__', label: 'From media' },
      { id: '__file__', label: 'From file' },
      { type: 'separator' as const, id: 'sep' },
      { id: '__none__', label: '— clear —', danger: true },
    ],
    onSelect: (id: string) => {
      const f = pickAt.field
      setPickAt(null)
      if (id === '__flow__') { setModalAt({ mode: 'flow', field: f }); return }
      if (id === '__media__') { setModalAt({ mode: 'media', field: f }); return }
      if (id === '__file__') { fieldRef.current = f; fileRef.current?.click(); return }
      // NO __none__ GUARD (the exhaustive-menu proof): this closure's
      // items are the four literal ids above and the three arms above
      // return — reaching here MEANS __none__ (the danger row). A
      // fourth guard would be untestable dead code (v8 cannot count a
      // block-end implicit else) guarding an impossible state.
      setMirror((m) => { const n = { ...m }; delete n[f.name]; return n })
      onEdit(f.name, '')
      return
    },
    onClose: () => { setPickAt(null) },
    portal: true,
  })

  // THE PICKER MODAL (default face; the seam may claim it): ONE
  // component, two row sources — flow candidates (edge-law narrowed)
  // and the media library (kind-filtered through the wire's door).
  // THE DEP LAW: the effect keys on the loader FUNCTION, never the
  // wire object — callers build the wire inline per render (a fresh
  // identity every pass), so keying on `wire` re-fires the load on
  // every setMediaRows render: an infinite load loop that OOMs the
  // tab (input-square's From-media wall caught it: 4GB, zero tests
  // run). The loader is a stable module reference at every call
  // site (CardsTab injects fetchMediaLibrary), so the load fires
  // once per modal opening.
  const loadMedia = wire?.loadMedia
  useEffect(() => {
    if (modalAt?.mode !== 'media') return
    if (loadMedia === undefined) { setMediaRows([]); return }
    const ctrl = new AbortController()
    setMediaRows(null)
    loadMedia(mediaKindForField(modalAt.field), ctrl.signal)
      .then((items) => { setMediaRows(items.map((it) => ({ id: it.url, label: it.name, url: it.url }))) })
      .catch(() => { setMediaRows([]) })
    return () => { ctrl.abort() }
  }, [modalAt, loadMedia])
  const pickerModal = modalAt === null ? null : (() => {
    const f = modalAt.field
    const candidates = modalAt.mode === 'flow'
      ? (wire.candidatesFor !== undefined ? wire.candidatesFor(f) : wire.candidates)
      : (mediaRows ?? [])
    const req = { mode: modalAt.mode, kind: mediaKindForField(f), field: f, candidates }
    const pick = (url: string): void => {
      setModalAt(null)
      if (url !== '') onEdit(f.name, url)
    }
    const fallback = h(Modal, {
      open: true,
      onClose: () => { setModalAt(null) },
      title: modalAt.mode === 'flow' ? 'From flow' : 'From media',
      description: modalAt.mode === 'flow'
        ? 'The other stages\u2019 latest outputs' + (req.kind !== 'all' ? ' (' + req.kind + ')' : '')
        : 'The runs library' + (req.kind !== 'all' ? ' (' + req.kind + ')' : ''),
      closeLabel: 'Close picker',
    },
      candidates.length === 0
        ? h('p', { className: css.pickEmpty },
            modalAt.mode === 'media' && mediaRows === null ? 'loading\u2026' : 'nothing to pick yet')
        : h('ul', { className: css.pickList },
            candidates.map((c) => h('li', { key: c.id, className: css.pickRow },
              h('button', {
                type: 'button',
                className: css.pickBtn,
                'data-testid': 'source-pick-row',
                onClick: () => { pick(c.url) },
              },
                isImageUrl(c.url)
                  ? h('img', { className: css.pickThumb, src: c.url, alt: c.label, loading: 'lazy' })
                  : h('span', { className: css.pickGlyph }, c.label.slice(0, 1).toUpperCase()),
                h('span', { className: css.pickLabel }, c.label),
              ),
            ))),
    )
    return wire.renderSourcePick !== undefined ? wire.renderSourcePick(req, fallback) : fallback
  })()

  // THE FILE INPUT lives OUTSIDE the Menu (the Menu's close path
  // tears its children down before the From file branch can click);
  // it rides the provider fragment and closes over pickAt per render.
  const fileInput = h('input', {
    ref: fileRef,
    type: 'file',
    accept: wire.accept ?? 'image/png,image/jpeg,image/webp',
    'aria-hidden': true,
    tabIndex: -1,
    style: { display: 'none' },
    onChange: (e: unknown) => {
      const inp = e as { target: { files: FileList | null } }
      const file = inp.target.files?.[0]
      const f = fieldRef.current
      if (f !== null && file !== undefined && file !== null) {
        fieldRef.current = null
        void onFile(f, file)
      }
      // NO NULL GUARD (the always-mounted proof): this handler fires
      // only while the provider fragment is mounted and the ref rides
      // its always-rendered hidden input (same shape as square.tsx's
      // retired guard) — unmounts deliver no change events.
      fileRef.current!.value = ''
    },
  })

  const wireMenu = h(Fragment, null, sourceMenu, pickerModal, fileInput)
  return { square, wireMenu }
}

/** The field-atom claim the constructor accepts — the seam's runtime
 *  consult result (the composition passes what the slot machinery
 *  holds; undefined = the base's built-in atom renders). */
export type FieldAtomClaim = (props: {
  f: SpecField
  value: unknown
  onEdit(name: string, v: unknown): void
  square?: SquareHost
}) => ReturnType<typeof h>

/** THE GENERIC SOURCE ROW (2026-09-13, the operator's law: ONE
 *  generic input component — "EVEN FOR THE ADVANCED STUDIO CARDS…
 *  sources from ONE SYSTEM with NO EXCEPTIONS"). SpecForm fields get
 *  the row through the constructor; every NON-field surface (studio
 *  cards, bespoke rails) rides THIS wrapper: the same plus square,
 *  the same three-entry menu (From flow / From media / From file),
 *  the same picker modal — with the surface's OWN flow candidates
 *  and an optional seam claim. One grammar, zero bespoke slots. */
export interface SourceRowProps {
  /** Short key shown under the square. */
  label: string
  /** The ACCESSIBLE seat name when the visible caption is not it
   *  (the input stacks, #37: visible = the cell's index, aria = the
   *  full "List name N"). Falls back to `label`. */
  ariaLabel?: string
  /** Hide the caption under the square — the owning section already
   *  names it (2026-09-15: the studio's First/Last frame subcards
   *  rendered the label TWICE). Default shows it. */
  hideLabel?: boolean
  /** 'image' narrows the media modal to image; anything else lists
   *  the whole library (the file face). */
  kind?: 'image' | 'file'
  /** Attached value (thumbnail when it passes isImageUrl). */
  value?: string | null
  /** The ONE write verb — every source funnels here. */
  onEdit: (v: string) => void
  /** The surface's own upstream outputs (the From flow rows). */
  candidates?: Array<{ id: string; label: string; url: string }>
  /** The surface's media source (the mounted media namespace's
   *  fetchMediaLibrary, or a test fake) — absent = the picker shows
   *  no media rows (honest, never a hidden fetch). */
  loadMedia?: SquareWire['loadMedia']
  /** The surface's own file law (From file + OS drops route here). */
  onFile?: (file: File) => void
  /** THE ROW'S PICKER FILTER — the OS dialog's accept. Audio/video
   *  lanes pass their MIME family ('audio/*', 'video/*'); absent =
   *  the image triad (the historic default, image rows). */
  accept?: SquareWire['accept']
  /** The seam claim (same grammar as the field wire). */
  renderSourcePick?: SquareWire['renderSourcePick']
}

/** What a host hands the constructor for slot-shaped fields: the
 *  square's verbs + an optional display mirror (the fresh-upload
 *  preview while the PARAM carries the estate path — the old
 *  upload-rail law). */
export interface SquareHost {
  verbs: InputSquareVerbs
  display?: string | null
}

/** The picker half of the square provider: candidates are the OTHER
 *  stages' LATEST OUTPUTS (title + the media-route url the run wrote
 *  onto their bench rows). Picking one WRITES THE PARAM — the input
 *  slot is the wire, there is no separate wiring mechanic.
 *
 * THE EDGE LAW (2026-09-12): `candidatesFor` narrows the list PER
 *  FIELD — only rows whose card DECLARES an output of the field's
 *  input-edge kind. The static `candidates` list is the fallback for
 *  fields with no declared edge (the picker never blocks on a meta
 *  miss — it just stops guessing kinds it cannot verify). */
export interface SquareWire {
  candidates: Array<{ id: string; label: string; url: string }>
  /** THE MEDIA SOURCE (stroke 81's one-lane law): the picker's
   *  media rows arrive INJECTED — the host surface owns the estate
   *  lane (the mounted media namespace); the base form carries no
   *  transport of its own. Absent → the picker degrades to an empty
   *  list (honest, never a hidden fetch). */
  loadMedia?: (kind: string, signal: AbortSignal) => Promise<Array<{ url: string; name: string }>>
  candidatesFor?: (f: SpecField) => Array<{ id: string; label: string; url: string }>
  /** The surface's OWN file law (optional): when present, From file
   *  and OS drops route here instead of the default upload door —
   *  bespoke vocabularies (the studio's inline data:-URL cap) keep
   *  their semantics under the same three-entry grammar. */
  onFile?: (file: File) => void
  /** THE ROW'S PICKER FILTER (2026-09-18, the two-audio conviction:
   *  "you literally can't even add two audios" — the hidden file
   *  input hard-coded the image triad, so the OS dialog GRAYED OUT
   *  every audio and video on file rows). Rows whose lane is not
   *  images pass their MIME family here ('audio/*', 'video/*');
   *  absent → the image triad stands (image rows, unchanged). */
  accept?: string
  /** THE SOURCE-PICK SEAM (2026-09-13, the operator's law: one
   *  system, no exceptions): the host may claim the picker modal's
   *  face — same grammar as the stage-view consult. The fallback is
   *  the base's own modal (the plain filtered list). */
  renderSourcePick?: (
    req: {
      mode: 'flow' | 'media'
      kind: string
      field: SpecField
      candidates: Array<{ id: string; label: string; url: string }>
    },
    fallback: ReturnType<typeof h>,
  ) => ReturnType<typeof h>
}
