/**
 * ideogram4-studio — the compositional-deconstruction layout editor
 * ported onto cards.stage.view (2026-09-12, the all-cards port order).
 *
 * THE 1:1 SOURCE: packages/image/ideogram4/src/ui/studio/ (the old
 * editor's tenant — component.tsx/IdeogramCanvas.tsx/IdeoPanels.tsx/
 * ideoHelpers.ts/slot.tsx). The helpers are ported VERBATIM (pure TS:
 * the 0–1000 grid law, snap 25, MIN_BOX 30, the caption bridge, the
 * PNG tEXt/zTXt re-inflation). The canvas is the same DOM-overlay law:
 * no canvas library, aspect-ratio box + % offsets, pointer events
 * converted back to grid units via getBoundingClientRect.
 *
 * THE HOST TRANSLATION (the slot.tsx bridge): the draft's `prompt`
 * param IS the assembled caption JSON string; width/height are their
 * own params. Edits are local until Run — then patch-the-domain-first
 * (the drill's law). No toast infra in the host: feedback rides inline
 * status text. No lucide icons: text labels.
 */
import { createElement as h, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './card.module.css'
import type { StageViewOwnerProps } from './types.ts'
import type { SpecValues } from './spec-form.tsx'
import { fetchFormSpec, specDefaults, specPatch, SpecForm, type FormSpecDoc } from './spec-form.tsx'

// ── The types (ideoHelpers.ts verbatim) ─────────────────────────────────────

type ElementType = 'obj' | 'text' | 'logo'
type StyleType = 'none' | 'photo' | 'art_style'

interface IdeoElement {
  /** Local-only id (not serialized). Stable across renders for React keys. */
  id: string
  type: ElementType
  desc: string
  text?: string
  font?: string
  /** [ymin, xmin, ymax, xmax] on the 0–1000 ideogram grid. */
  bbox: [number, number, number, number]
  color_palette: string[]
}

interface IdeogramCaption {
  high_level_description?: string
  style_description?: {
    aesthetics?: string
    lighting?: string
    medium?: string
    photo?: string
    art_style?: string
    color_palette?: string[]
  }
  compositional_deconstruction: {
    background: string
    elements: Array<Record<string, unknown>>
  }
}

// ── Constants (verbatim) ─────────────────────────────────────────────────────

const GRID_SIZE = 1000
const MIN_BOX = 30 // 3% of grid — smallest box allowed
const SNAP_UNITS = 25 // snap granularity (2.5% steps)
const CANVAS_MAX_HEIGHT = 400

/** Aspect presets — width/height multiples of 16 (the Ideogram requirement). */
const ASPECT_PRESETS: Array<{ id: string, label: string, w: number, h: number }> = [
  { id: '1:1', label: 'Square', w: 1024, h: 1024 },
  { id: '3:2', label: 'Photo LS', w: 1216, h: 832 },
  { id: '2:3', label: 'Photo PT', w: 832, h: 1216 },
  { id: '16:9', label: 'Wide', w: 1280, h: 768 },
  { id: '9:16', label: 'Story', w: 768, h: 1280 },
  { id: '4:3', label: 'Landscape', w: 1024, h: 768 },
  { id: '3:4', label: 'Portrait', w: 768, h: 1024 },
]

const PALETTE_PRESETS: Array<{ name: string, colors: string[] }> = [
  { name: 'Sunset', colors: ['#FF6B35', '#F7B801', '#7B2D26'] },
  { name: 'Ocean', colors: ['#023E8A', '#0077B6', '#48CAE4'] },
  { name: 'Forest', colors: ['#1B4332', '#40916C', '#95D5B2'] },
  { name: 'Mono', colors: ['#0A0A0A', '#525252', '#FAFAFA'] },
  { name: 'Candy', colors: ['#FF6B9D', '#FEC8D8', '#C8B6FF'] },
  { name: 'Cyber', colors: ['#FF00E5', '#00F0FF', '#FFE600'] },
  { name: 'Earth', colors: ['#5C3D2E', '#8B5E3C', '#D4A373'] },
  { name: 'Cherry', colors: ['#9B1B30', '#C73E1D', '#F4A261'] },
]

const STYLE_PRESETS: Array<{
  name: string, style_type: 'photo' | 'art_style', aesthetics: string,
  lighting: string, medium: string, style_value: string, palette: string[],
}> = [
  {
    name: 'Cinematic photo', style_type: 'photo',
    aesthetics: 'cinematic, dramatic, shallow depth of field',
    lighting: 'golden hour rim light, soft fill',
    medium: '35mm film, anamorphic',
    style_value: 'shot on Kodak Portra 400, grainy, natural color',
    palette: ['#2B1810', '#C9A063', '#F2E8DC'],
  },
  {
    name: 'Studio product', style_type: 'photo',
    aesthetics: 'clean, commercial, high-key',
    lighting: 'softbox studio lighting, even illumination',
    medium: 'digital photograph, 50mm',
    style_value: 'professional product photography, crisp focus',
    palette: ['#FFFFFF', '#E5E5E5', '#1A1A1A'],
  },
  {
    name: 'Oil painting', style_type: 'art_style',
    aesthetics: 'classical, painterly, rich textures',
    lighting: 'chiaroscuro, warm directional light',
    medium: 'oil on canvas',
    style_value: 'Baroque oil painting, Rembrandt-inspired',
    palette: ['#3B2A1A', '#8B6B3D', '#D4B483'],
  },
  {
    name: 'Anime cel', style_type: 'art_style',
    aesthetics: 'vibrant, clean linework, expressive',
    lighting: 'flat shading with rim highlights',
    medium: 'digital illustration',
    style_value: 'modern anime cel shading, Studio Trigger style',
    palette: ['#FF4FA3', '#4FC3FF', '#FFD54F'],
  },
  {
    name: 'Watercolor', style_type: 'art_style',
    aesthetics: 'soft, flowing, organic',
    lighting: 'diffused natural light',
    medium: 'watercolor on cold-press paper',
    style_value: 'loose watercolor washes, pigment bleeds',
    palette: ['#A8DADC', '#F1FAEE', '#E63946'],
  },
]

const FONT_PRESETS: string[] = [
  'bold geometric sans-serif, all caps',
  'elegant high-contrast serif, uppercase',
  'heavy condensed sans-serif, italic',
  'thin minimalist sans-serif, lowercase',
  'brush script, hand-painted feel',
  'art deco serif, wide stance',
  'mono-spaced typewriter, regular weight',
  'stencil sans-serif, military style',
  'retro rounded sans-serif, 1960s feel',
  'graffiti bubble letters, outlined',
]

// ── Helpers (verbatim) ───────────────────────────────────────────────────────

let _idSeq = 0
function genId(prefix = 'el'): string {
  _idSeq += 1
  return `${prefix}_${Date.now().toString(36)}_${_idSeq}`
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function clampBbox(bbox: [number, number, number, number]): [number, number, number, number] {
  let [ymin, xmin, ymax, xmax] = bbox
  if (xmin > xmax) { const t = xmin; xmin = xmax; xmax = t }
  if (ymin > ymax) { const t = ymin; ymin = ymax; ymax = t }
  return [
    clamp(Math.round(ymin), 0, GRID_SIZE),
    clamp(Math.round(xmin), 0, GRID_SIZE),
    clamp(Math.round(ymax), 0, GRID_SIZE),
    clamp(Math.round(xmax), 0, GRID_SIZE),
  ]
}

function bboxToRect(bbox: [number, number, number, number]): { x: number, y: number, w: number, h: number } {
  const [ymin, xmin, ymax, xmax] = bbox
  return { x: xmin, y: ymin, w: Math.max(0, xmax - xmin), h: Math.max(0, ymax - ymin) }
}

function snap(v: number, enabled: boolean): number {
  if (!enabled) return v
  return Math.round(v / SNAP_UNITS) * SNAP_UNITS + 0
}

function normalizeHex(input: string): string | null {
  let s = input.trim()
  if (!s) return null
  if (!s.startsWith('#')) s = '#' + s
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    s = '#' + s.slice(1).split('').map((c) => c + c).join('')
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(s)) return null
  return s.toUpperCase()
}

function sanitizeHexList(input: string): string[] {
  return input
    .split(/[,\s]+/)
    .map((s) => normalizeHex(s))
    .filter((s): s is string => !!s)
}

type RawElement = Record<string, unknown> & {
  type?: unknown, desc?: unknown, description?: unknown, text?: unknown,
  font?: unknown, bbox?: unknown, color_palette?: unknown, palette?: unknown,
}

function isValidElementsArray(parsed: unknown): parsed is RawElement[] {
  if (!Array.isArray(parsed)) return false
  return parsed.every((el) => {
    if (!el || typeof el !== 'object') return false
    const e = el as Record<string, unknown>
    if (e['type'] !== 'obj' && e['type'] !== 'text' && e['type'] !== 'logo') return false
    if (typeof e['desc'] !== 'string' && typeof e['description'] !== 'string') return false
    if (e['bbox'] !== undefined && !Array.isArray(e['bbox'])) return false
    return true
  })
}

/** Parse a JSON string into the internal shape, filling defaults; null if invalid. */
function parseElementsJSON(raw: string): IdeoElement[] | null {
  if (!raw || !raw.trim()) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isValidElementsArray(parsed)) return null
  return parsed.map((el, idx) => {
    const type: ElementType = el['type'] === 'text' ? 'text' : el['type'] === 'logo' ? 'logo' : 'obj'
    const rawBbox = el['bbox']
    let bbox: [number, number, number, number] = [200, 200, 500, 500]
    if (Array.isArray(rawBbox) && rawBbox.length === 4 && rawBbox.every((v) => typeof v === 'number')) {
      bbox = clampBbox(rawBbox as [number, number, number, number])
    }
    const paletteSrc = (el['color_palette'] ?? el['palette'] ?? []) as unknown
    const color_palette = Array.isArray(paletteSrc)
      ? paletteSrc.map((c) => normalizeHex(String(c))).filter((c): c is string => !!c).slice(0, 5)
      : []
    const rawDesc = (el['desc'] ?? el['description'] ?? '') as unknown
    const rawText = (el['text'] ?? '') as unknown
    const rawFont = (el['font'] ?? '') as unknown
    const hasText = type === 'text' || type === 'logo'
    return {
      id: genId(`imp${idx}`),
      type,
      desc: typeof rawDesc === 'string' ? rawDesc : String(rawDesc ?? ''),
      text: hasText ? (typeof rawText === 'string' ? rawText : String(rawText ?? '')) : undefined,
      font: hasText && typeof rawFont === 'string' && rawFont ? rawFont : undefined,
      bbox,
      color_palette,
    }
  })
}

/** Serialize internal elements back to the wire JSON string. */
function serializeElements(elements: IdeoElement[]): string {
  const out = elements.map((el) => {
    const obj: Record<string, unknown> = { type: el.type, bbox: el.bbox, desc: el.desc }
    if (el.type === 'text' || el.type === 'logo') obj['text'] = el.text ?? ''
    if ((el.type === 'text' || el.type === 'logo') && el.font) obj['font'] = el.font
    if (el.color_palette.length > 0) obj['color_palette'] = el.color_palette
    return obj
  })
  return JSON.stringify(out)
}

/** Extract the Ideogram caption from a PNG's tEXt/zTXt chunks (verbatim). */
async function extractIdeogramCaptionFromPNG(file: File): Promise<IdeoElement[] | null> {
  const buf = new Uint8Array(await file.arrayBuffer())
  if (buf.length < 8) return null
  const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (!SIG.every((b, i) => buf[i] === b)) return null
  const textChunks: Record<string, string> = {}
  let off = 8
  const decoder = new TextDecoder('utf-8')
  while (off + 8 <= buf.length) {
    const len = (buf[off]! << 24) | (buf[off + 1]! << 16) | (buf[off + 2]! << 8) | buf[off + 3]!
    const type = decoder.decode(buf.slice(off + 4, off + 8))
    const dataStart = off + 8
    const dataEnd = dataStart + len
    if (dataEnd > buf.length) break
    if (type === 'tEXt') {
      const payload = decoder.decode(buf.slice(dataStart, dataEnd))
      const nul = payload.indexOf('\0')
      if (nul > 0) textChunks[payload.slice(0, nul)] = payload.slice(nul + 1)
    } else if (type === 'zTXt') {
      try {
        const payload = decoder.decode(buf.slice(dataStart, dataEnd))
        const nul = payload.indexOf('\0', 1)
        if (nul > 0) {
          const compData = buf.slice(dataStart + nul + 2, dataEnd)
          if (typeof DecompressionStream !== 'undefined') {
            const ds = new DecompressionStream('deflate')
            const stream = new Blob([compData]).stream().pipeThrough(ds)
            textChunks[payload.slice(0, nul)] = await new Response(stream).text()
          }
        }
      } catch {
        // Best-effort: DecompressionStream can fail on a corrupted zTXt chunk.
      }
    } else if (type === 'IEND') {
      break
    }
    off = dataEnd + 4
  }
  const candidates = [
    textChunks['prompt'], textChunks['parameters'], textChunks['Caption'],
    textChunks['caption'], textChunks['IdeogramCaption'], textChunks['Description'],
  ].filter((v): v is string => !!v)
  for (const c of candidates) {
    const trimmed = c.trim()
    if (trimmed.startsWith('{')) {
      try {
        const obj = JSON.parse(trimmed) as Record<string, unknown>
        const cd = obj?.['compositional_deconstruction'] as Record<string, unknown> | undefined
        if (Array.isArray(cd?.['elements'])) {
          const parsed = parseElementsJSON(JSON.stringify(cd['elements']))
          if (parsed) return parsed
        }
      } catch { /* not JSON; try as a1111-style block */ }
    }
    const jsonMatch = trimmed.match(/\{[\s\S]*"compositional_deconstruction"[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const obj = JSON.parse(jsonMatch[0]!) as Record<string, unknown>
        const cd = obj?.['compositional_deconstruction'] as Record<string, unknown> | undefined
        if (Array.isArray(cd?.['elements'])) {
          const parsed = parseElementsJSON(JSON.stringify(cd['elements']))
          if (parsed) return parsed
        }
      } catch { /* give up */ }
    }
  }
  return null
}

/** Parse the field value (object or JSON string) into a partial caption. */
function parseCaptionValue(raw: unknown): Partial<IdeogramCaption> {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as Partial<IdeogramCaption> } catch { return {} }
  }
  if (typeof raw === 'object') return raw as Partial<IdeogramCaption>
  return {}
}

/** Flatten caption object → the editor's flat values record (verbatim). */
function flattenCaption(rawCaption: unknown, width: number, height: number): Record<string, unknown> {
  const c = parseCaptionValue(rawCaption)
  const sd = c.style_description ?? {}
  let styleType: StyleType = 'none'
  let styleValue = ''
  if (typeof sd.photo === 'string') {
    styleType = 'photo'
    styleValue = sd.photo
  } else if (typeof sd.art_style === 'string') {
    styleType = 'art_style'
    styleValue = sd.art_style
  }
  const cd = c.compositional_deconstruction ?? { background: '', elements: [] }
  return {
    high_level_description: c.high_level_description ?? '',
    style_type: styleType,
    aesthetics: sd.aesthetics ?? '',
    lighting: sd.lighting ?? '',
    medium: sd.medium ?? '',
    style_value: styleValue,
    style_palette: Array.isArray(sd.color_palette) ? sd.color_palette.join(', ') : '',
    background: cd.background ?? '',
    elements: JSON.stringify(cd.elements ?? []),
    width,
    height,
  }
}

/** Assemble the editor's flat values → caption object for the wire (verbatim). */
function assembleCaption(v: Record<string, unknown>): IdeogramCaption {
  const styleType = String(v['style_type'] ?? 'none') as StyleType
  const out = {} as IdeogramCaption
  const hld = String(v['high_level_description'] ?? '').trim()
  if (hld) out.high_level_description = hld
  if (styleType !== 'none') {
    const sd: NonNullable<IdeogramCaption['style_description']> = {}
    const a = String(v['aesthetics'] ?? '').trim()
    const l = String(v['lighting'] ?? '').trim()
    const m = String(v['medium'] ?? '').trim()
    const sv = String(v['style_value'] ?? '').trim()
    if (a) sd.aesthetics = a
    if (l) sd.lighting = l
    if (m) sd.medium = m
    if (styleType === 'photo' && sv) sd.photo = sv
    if (styleType === 'art_style' && sv) sd.art_style = sv
    const palette = sanitizeHexList(String(v['style_palette'] ?? ''))
    if (palette.length) sd.color_palette = palette
    if (Object.keys(sd).length) out.style_description = sd
  }
  const bg = String(v['background'] ?? '').trim()
  let elements: Array<Record<string, unknown>> = []
  try {
    const parsed: unknown = JSON.parse(String(v['elements'] ?? '[]'))
    if (Array.isArray(parsed)) elements = parsed as Array<Record<string, unknown>>
  } catch { /* empty elements on parse error */ }
  out.compositional_deconstruction = {
    background: bg || '(describe the scene background)',
    elements,
  }
  return out
}

// ── The studio ───────────────────────────────────────────────────────────────

type Tab = 'elements' | 'style' | 'json'
type PointerMode =
  | { kind: 'idle' }
  | { kind: 'move', startX: number, startY: number, subjects: Array<{ id: string, origBbox: [number, number, number, number] }> }
  | { kind: 'resize', id: string, handle: string, startX: number, startY: number, origBbox: [number, number, number, number] }
  | { kind: 'draw', startX: number, startY: number, curX: number, curY: number }

const HANDLE_DEFS: Array<{ id: string, pos: Record<string, string> }> = [
  { id: 'nw', pos: { left: '0%', top: '0%' } },
  { id: 'n', pos: { left: '50%', top: '0%' } },
  { id: 'ne', pos: { left: '100%', top: '0%' } },
  { id: 'e', pos: { left: '100%', top: '50%' } },
  { id: 'se', pos: { left: '100%', top: '100%' } },
  { id: 's', pos: { left: '50%', top: '100%' } },
  { id: 'sw', pos: { left: '0%', top: '100%' } },
  { id: 'w', pos: { left: '0%', top: '50%' } },
]

/** The keys the studio OWNS (never generic fields): prompt is the
 *  assembled caption, width/height the aspect dropdown's. */
const SPEC_EXCLUDED = new Set(['prompt', 'width', 'height'])

/** The ideogram studio — registered under key 'ideogram4'. */
export function Ideogram4Studio(props: StageViewOwnerProps): ReturnType<typeof h> {
  const { row, runStatus, onPatch, onRun, onStop, onRemove, onSurface } = props
  const params = typeof row['params'] === 'object' && row['params'] !== null ? row['params'] as SpecValues : {}

  // THE SLOT BRIDGE: the draft's prompt param IS the caption JSON string.
  const [values, setValues] = useState<Record<string, unknown>>(() => flattenCaption(
    params['prompt'], Number(params['width'] ?? 1024) || 1024, Number(params['height'] ?? 1024) || 1024))

  // ── The remaining spec fields (seed/steps/cfg/… — the generic drill
  //    serves them inside the rail; the studio owns prompt/width/height).
  const [spec, setSpec] = useState<FormSpecDoc | null>(null)
  useEffect(() => {
    let alive = true
    const card = typeof props['cardName'] === 'string' ? props['cardName'] : ''
    if (card === '') return
    fetchFormSpec(card)
      .then((doc) => {
        if (!alive) return
        const rest = doc.fields.filter((f) => !SPEC_EXCLUDED.has(f.name))
        setSpec({ ...doc, fields: rest })
        setValues((prev) => ({ ...specDefaults(rest), ...params, ...prev }))
      })
      .catch(() => {})
    return () => { alive = false }
  }, [props['cardName']])

  // ── The elements document (the echo-guard law, verbatim) ──
  const [elements, setElementsInternal] = useState<IdeoElement[]>(() => parseElementsJSON(String(values['elements'] ?? '[]')) ?? [])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null
  const setSelectedId = useCallback((id: string | null): void => {
    setSelectedIds(id ? [id] : [])
  }, [])
  const toggleSelected = useCallback((id: string): void => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])
  const [tab, setTab] = useState<Tab>('elements')
  const [showGrid, setShowGrid] = useState(true)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => { onSurface('huge') }, [onSurface])

  const elementsRef = useRef<IdeoElement[]>(elements)
  useEffect(() => { elementsRef.current = elements }, [elements])

  const lastWrittenRef = useRef<string>(String(values['elements'] ?? '[]'))
  const lastIngestedRef = useRef<string>(String(values['elements'] ?? '[]'))

  // Ingest EXTERNAL changes to values.elements (echo-guard law verbatim)
  useEffect(() => {
    const incoming = String(values['elements'] ?? '[]')
    if (incoming === lastWrittenRef.current) return
    if (incoming === lastIngestedRef.current) return
    lastIngestedRef.current = incoming
    const parsed = parseElementsJSON(incoming)
    if (parsed !== null) setElementsInternal(parsed)
  }, [values['elements']])

  const writeBack = useCallback((next: IdeoElement[]): void => {
    const json = serializeElements(next)
    lastWrittenRef.current = json
    lastIngestedRef.current = json
    setValues((prev) => ({ ...prev, elements: json }))
  }, [])

  const commitElements = useCallback((updater: (prev: IdeoElement[]) => IdeoElement[]): void => {
    const next = updater(elementsRef.current)
    elementsRef.current = next
    setElementsInternal(next)
    writeBack(next)
  }, [writeBack])

  const updateElement = useCallback((id: string, patch: Partial<IdeoElement>): void => {
    commitElements((prev) => prev.map((el) => (el.id === id ? { ...el, ...patch } : el)))
  }, [commitElements])

  const addElement = useCallback((type: ElementType): void => {
    const hasText = type === 'text' || type === 'logo'
    const w = hasText ? 500 : 350
    const h = type === 'text' ? 120 : type === 'logo' ? 200 : 300
    const xmin = Math.round((GRID_SIZE - w) / 2)
    const ymin = Math.round((GRID_SIZE - h) / 2)
    const newEl: IdeoElement = {
      id: genId(type), type, desc: '',
      text: hasText ? '' : undefined,
      bbox: clampBbox([ymin, xmin, ymin + h, xmin + w]),
      color_palette: [],
    }
    commitElements((prev) => [...prev, newEl])
    setSelectedId(newEl.id)
    setTab('elements')
  }, [commitElements])

  const deleteElement = useCallback((id: string): void => {
    commitElements((prev) => prev.filter((el) => el.id !== id))
    setSelectedIds((prev) => prev.filter((x) => x !== id))
  }, [commitElements])

  const duplicateElement = useCallback((id: string): void => {
    commitElements((prev) => {
      const src = prev.find((e) => e.id === id)
      if (!src) return prev
      const copy: IdeoElement = {
        ...src,
        id: genId(src.type),
        bbox: clampBbox([
          Math.min(src.bbox[0] + 40, GRID_SIZE - 50),
          Math.min(src.bbox[1] + 40, GRID_SIZE - 50),
          0,
          0,
        ]),
        color_palette: [...src.color_palette],
      }
      copy.bbox[2] = Math.min(GRID_SIZE, copy.bbox[0] + (src.bbox[2] - src.bbox[0]))
      copy.bbox[3] = Math.min(GRID_SIZE, copy.bbox[1] + (src.bbox[3] - src.bbox[1]))
      copy.bbox = clampBbox(copy.bbox)
      setSelectedId(copy.id)
      return [...prev, copy]
    })
  }, [commitElements])

  const reorder = useCallback((id: string, dir: 'front' | 'back'): void => {
    commitElements((prev) => {
      const idx = prev.findIndex((e) => e.id === id)
      if (idx === -1) return prev
      const next = prev.filter((_, i) => i !== idx)
      if (dir === 'front') return [...next, prev[idx]!]
      return [prev[idx]!, ...next]
    })
  }, [commitElements])

  const handleImportElements = useCallback((next: IdeoElement[], source: string): void => {
    commitElements(() => next)
    setSelectedId(null)
    setStatus(`Loaded ${next.length} element${next.length === 1 ? '' : 's'} from ${source}`)
  }, [commitElements])

  const pngInputRef = useRef<HTMLInputElement | null>(null)
  const handlePngPick = useCallback(async (e: Event): Promise<void> => {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    if (!file.type.includes('png')) {
      setStatus('Only PNG files can be re-inflated')
      return
    }
    try {
      const parsed = await extractIdeogramCaptionFromPNG(file)
      if (!parsed) {
        setStatus('No Ideogram caption found in PNG metadata')
        return
      }
      handleImportElements(parsed, `PNG metadata (${file.name})`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to read PNG')
    }
  }, [handleImportElements])

  const selected = useMemo(
    () => elements.find((e) => e.id === selectedId) ?? null,
    [elements, selectedId],
  )

  const width = Number(values['width'] ?? 1024) || 1024
  const height = Number(values['height'] ?? 1024) || 1024

  // ── Keyboard shortcuts (multi-select aware, verbatim) ──
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const t = e.target as HTMLElement | null
      const isTyping = t !== null && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      if (isTyping && e.key !== 'Escape') return
      if (selectedIds.length === 0) {
        if (e.key === 'Escape') setSelectedIds([])
        return
      }
      const step = e.shiftKey ? 50 : 10
      if (e.key === 'Escape') {
        setSelectedIds([])
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        commitElements((prev) => prev.filter((el) => !selectedIds.includes(el.id)))
        setSelectedIds([])
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        const ids = [...selectedIds]
        commitElements((prev) => {
          const copies: IdeoElement[] = []
          for (const src of prev) {
            if (!ids.includes(src.id)) continue
            const copy: IdeoElement = {
              ...src,
              id: genId(src.type),
              bbox: clampBbox([
                Math.min(src.bbox[0] + 40, GRID_SIZE - 50),
                Math.min(src.bbox[1] + 40, GRID_SIZE - 50),
                0,
                0,
              ]),
              color_palette: [...src.color_palette],
            }
            copy.bbox[2] = Math.min(GRID_SIZE, copy.bbox[0] + (src.bbox[2] - src.bbox[0]))
            copy.bbox[3] = Math.min(GRID_SIZE, copy.bbox[1] + (src.bbox[3] - src.bbox[1]))
            copy.bbox = clampBbox(copy.bbox)
            copies.push(copy)
          }
          return [...prev, ...copies]
        })
        return
      }
      let dy = 0
      let dx = 0
      switch (e.key) {
        case 'ArrowUp': dy = -step; break
        case 'ArrowDown': dy = step; break
        case 'ArrowLeft': dx = -step; break
        case 'ArrowRight': dx = step; break
        default: return
      }
      e.preventDefault()
      const ids = [...selectedIds]
      commitElements((prev) =>
        prev.map((el) => {
          if (!ids.includes(el.id)) return el
          const [ymin, xmin, ymax, xmax] = el.bbox
          const ow = xmax - xmin
          const oh = ymax - ymin
          const nxmin = clamp(xmin + dx, 0, GRID_SIZE - ow)
          const nymin = clamp(ymin + dy, 0, GRID_SIZE - oh)
          return { ...el, bbox: [nymin, nxmin, nymin + oh, nxmin + ow] as [number, number, number, number] }
        }),
      )
    }
    window.addEventListener('keydown', handler)
    return () => { window.removeEventListener('keydown', handler) }
  }, [selectedIds, commitElements])

  useEffect(() => { if (selectedId !== null) setTab('elements') }, [selectedId])

  // ── The canvas (the DOM-overlay law, verbatim) ──
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [mode, setMode] = useState<PointerMode>({ kind: 'idle' })
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [inlineText, setInlineText] = useState('')
  const commitInlineText = useCallback((): void => {
    const id = editingTextId
    if (id === null) return
    const val = inlineText
    onCommitMap((prev) => prev.map((el) => (el.id === id ? { ...el, text: val } : el)))
    setEditingTextId(null)
  }, [editingTextId, inlineText])
  // the canvas's commit is commitElements (declared after for hoisting law)
  function onCommitMap(updater: (prev: IdeoElement[]) => IdeoElement[]): void {
    commitElements(updater)
  }

  const toLocal = useCallback((clientX: number, clientY: number): { x: number, y: number } => {
    const el = containerRef.current
    if (el === null) return { x: 0, y: 0 }
    const r = el.getBoundingClientRect()
    return {
      x: clamp(((clientX - r.left) / r.width) * GRID_SIZE, 0, GRID_SIZE),
      y: clamp(((clientY - r.top) / r.height) * GRID_SIZE, 0, GRID_SIZE),
    }
  }, [])

  const patchBbox = useCallback((id: string, next: [number, number, number, number]): void => {
    commitElements((prev) => prev.map((el) => (el.id === id ? { ...el, bbox: clampBbox(next) } : el)))
  }, [commitElements])

  const handleCanvasPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>): void => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    const onBackground = target === containerRef.current || target.dataset['canvasBg'] === '1' || target.dataset['grid'] === '1'
    if (!onBackground) return
    const { x, y } = toLocal(e.clientX, e.clientY)
    setSelectedId(null)
    try { containerRef.current?.setPointerCapture(e.pointerId) } catch { /* silent: pointer law */ }
    setMode({ kind: 'draw', startX: x, startY: y, curX: x, curY: y })
  }, [toLocal, setSelectedId])

  const handleBoxPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, el: IdeoElement): void => {
    if (e.button !== 0) return
    e.stopPropagation()
    if ((e.ctrlKey || e.metaKey)) {
      toggleSelected(el.id)
      return
    }
    const groupDrag = selectedIds.includes(el.id) && selectedIds.length > 1
    if (!groupDrag) setSelectedId(el.id)
    const dragIds = groupDrag ? selectedIds : [el.id]
    const subjects = dragIds
      .map((id) => {
        const found = elements.find((x) => x.id === id)
        return found !== undefined ? { id, origBbox: found.bbox } : null
      })
      .filter((s): s is { id: string, origBbox: [number, number, number, number] } => s !== null)
    const { x, y } = toLocal(e.clientX, e.clientY)
    try { containerRef.current?.setPointerCapture(e.pointerId) } catch { /* silent: pointer law */ }
    setMode({ kind: 'move', startX: x, startY: y, subjects })
  }, [toLocal, setSelectedId, toggleSelected, selectedIds, elements])

  const handleHandlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, el: IdeoElement, handle: string): void => {
    if (e.button !== 0) return
    e.stopPropagation()
    const { x, y } = toLocal(e.clientX, e.clientY)
    try { containerRef.current?.setPointerCapture(e.pointerId) } catch { /* silent: pointer law */ }
    setMode({ kind: 'resize', id: el.id, handle, startX: x, startY: y, origBbox: el.bbox })
  }, [toLocal])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>): void => {
    if (mode.kind === 'idle') return
    const { x, y } = toLocal(e.clientX, e.clientY)
    if (mode.kind === 'draw') {
      setMode({ ...mode, curX: x, curY: y })
      return
    }
    if (mode.kind === 'move') {
      let dx = x - mode.startX
      let dy = y - mode.startY
      if (snapEnabled) {
        dx = snap(dx, true)
        dy = snap(dy, true)
      }
      const finalDx = dx
      const finalDy = dy
      commitElements((prev) =>
        prev.map((el) => {
          const subj = mode.subjects.find((s) => s.id === el.id)
          if (subj === undefined) return el
          const [oymin, oxmin, oymax, oxmax] = subj.origBbox
          const ow = oxmax - oxmin
          const oh = oymax - oymin
          const nxmin = clamp(oxmin + finalDx, 0, GRID_SIZE - ow)
          const nymin = clamp(oymin + finalDy, 0, GRID_SIZE - oh)
          return { ...el, bbox: [nymin, nxmin, nymin + oh, nxmin + ow] as [number, number, number, number] }
        }),
      )
      return
    }
    if (mode.kind === 'resize') {
      const [oymin, oxmin, oymax, oxmax] = mode.origBbox
      let nxmin = oxmin
      let nymin = oymin
      let nxmax = oxmax
      let nymax = oymax
      let nx = x
      let ny = y
      if (snapEnabled) {
        nx = snap(nx, true)
        ny = snap(ny, true)
      }
      const hd = mode.handle
      if (hd.includes('w')) nxmin = clamp(nx, 0, nxmax - MIN_BOX)
      if (hd.includes('e')) nxmax = clamp(nx, nxmin + MIN_BOX, GRID_SIZE)
      if (hd.includes('n')) nymin = clamp(ny, 0, nymax - MIN_BOX)
      if (hd.includes('s')) nymax = clamp(ny, nymin + MIN_BOX, GRID_SIZE)
      patchBbox(mode.id, [nymin, nxmin, nymax, nxmax])
    }
  }, [mode, toLocal, snapEnabled, patchBbox, commitElements])

  const finishInteraction = useCallback((e: React.PointerEvent<HTMLDivElement>): void => {
    try { containerRef.current?.releasePointerCapture(e.pointerId) } catch { /* silent: pointer law */ }
    if (mode.kind === 'draw') {
      const { startX, startY, curX, curY } = mode
      const xmin = Math.min(startX, curX)
      const xmax = Math.max(startX, curX)
      const ymin = Math.min(startY, curY)
      const ymax = Math.max(startY, curY)
      if (xmax - xmin >= MIN_BOX && ymax - ymin >= MIN_BOX) {
        const newEl: IdeoElement = {
          id: genId('el'), type: 'obj', desc: '',
          bbox: clampBbox([ymin, xmin, ymax, xmax]),
          color_palette: [],
        }
        commitElements((prev) => [...prev, newEl])
        setSelectedId(newEl.id)
      }
    }
    setMode({ kind: 'idle' })
  }, [mode, commitElements, setSelectedId])

  // ── The verbs ──
  const run = (): void => {
    // THE SLOT BRIDGE (Run law): caption reassembles into prompt; width/
    // height ride their own params; the generic fields ride coerced
    // (specPatch — ONCE, at patch time); every other frozen param passes.
    const patch: Record<string, unknown> = {
      ...params,
      ...(spec !== null ? specPatch(spec.fields, values, params) : {}),
      prompt: JSON.stringify(assembleCaption(values)),
      width,
      height,
    }
    delete patch['elements']
    onPatch(patch)
    onRun()
  }

  const ratio = width / height
  const cssMaxWidth = Math.round(CANVAS_MAX_HEIGHT * ratio)
  const drawMode = mode.kind === 'idle' ? false : mode.kind === 'draw'
  const primaryId = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null

  // the shared edit verb (the generic fields ride the same values map)
  const onEdit = useCallback((name: string, v: unknown): void => {
    setValues((prev) => ({ ...prev, [name]: v }))
  }, [])

  const styleInput = (key: string, label: string): ReturnType<typeof h> =>
    h('label', { className: css.ideoField },
      h('span', { className: css.ideoFieldKey }, label),
      h('input', {
        value: String(values[key] ?? ''),
        onChange: (e: Event) => { setValues((prev) => ({ ...prev, [key]: (e.target as HTMLInputElement).value })) },
      }))

  const jsonPreview = useMemo(() => JSON.stringify(assembleCaption(values), null, 2), [values])
  const [jsonDraft, setJsonDraft] = useState('')
  const jsonParseError = useMemo(() => {
    if (jsonDraft.trim() === '') return null
    return parseElementsJSON(jsonDraft) === null ? 'invalid elements JSON' : null
  }, [jsonDraft])


  // ── the tab bodies (named locals — no mega-ternary) ────────────────
  const elementsTab = selected !== null
    // the inspector (single selection)
    ? h('div', { className: css.ideoInspector },
        h('div', { className: css.ideoInspectorHead },
          h('span', { className: css.ideoTypeBadge, 'data-ideo-type': selected.type }, selected.type),
          h('span', { className: css.ideoInspectorActions },
            h(Button, { variant: 'ghost', size: 'sm', onClick: () => { reorder(selected.id, 'front') } }, '↑'),
            h(Button, { variant: 'ghost', size: 'sm', onClick: () => { reorder(selected.id, 'back') } }, '↓'),
            h(Button, { variant: 'ghost', size: 'sm', onClick: () => { duplicateElement(selected.id) } }, 'Dup'),
            h(Button, { variant: 'ghost', size: 'sm', onClick: () => { deleteElement(selected.id) } }, '✕'))),
        selected.type !== 'obj' ? h('label', { className: css.ideoField },
          h('span', { className: css.ideoFieldKey }, 'Text content'),
          h('input', {
            value: selected.text ?? '',
            onChange: (e: Event) => { updateElement(selected.id, { text: (e.target as HTMLInputElement).value }) },
          })) : null,
        selected.type !== 'obj' ? h('label', { className: css.ideoField },
          h('span', { className: css.ideoFieldKey }, 'Font'),
          h('input', {
            value: selected.font ?? '', placeholder: 'typography descriptor',
            onChange: (e: Event) => { updateElement(selected.id, { font: (e.target as HTMLInputElement).value }) },
          }),
          h('div', { className: css.ideoFontChips },
            FONT_PRESETS.map((f) => h('button', {
              key: f, className: css.ideoChip,
              onClick: () => { updateElement(selected.id, { font: f }) },
              title: f,
            }, f.split(',')[0])))) : null,
        h('label', { className: css.ideoField },
          h('span', { className: css.ideoFieldKey }, 'Description'),
          h('textarea', {
            rows: 2, value: selected.desc, placeholder: 'what this element depicts',
            onChange: (e: Event) => { updateElement(selected.id, { desc: (e.target as HTMLTextAreaElement).value }) },
          })),
        h('div', { className: css.ideoBboxRow },
          ['ymin', 'xmin', 'ymax', 'xmax'].map((k, i) => h('label', { key: k, className: css.ideoField },
            h('span', { className: css.ideoFieldKey }, k),
            h('input', {
              type: 'number', value: selected.bbox[i],
              onChange: (e: Event) => {
                const next = [...selected.bbox] as [number, number, number, number]
                next[i] = Number((e.target as HTMLInputElement).value) || 0
                updateElement(selected.id, { bbox: clampBbox(next) })
              },
            })))),
        h('label', { className: css.ideoField },
          h('span', { className: css.ideoFieldKey }, 'Palette'),
          h('div', { className: css.ideoSwatches },
            selected.color_palette.map((c, i) => h('span', {
              key: i, className: css.ideoSwatch, style: { background: c },
              title: `${c} — click to remove`,
              onClick: () => { updateElement(selected.id, { color_palette: selected.color_palette.filter((_, j) => j !== i) }) },
            })),
            selected.color_palette.length < 5 ? h('input', {
              className: css.ideoSwatchAdd, placeholder: '#RRGGBB',
              onKeyDown: (e: Event) => {
                if ((e as KeyboardEvent).key !== 'Enter') return
                const hex = normalizeHex((e.target as HTMLInputElement).value)
                if (hex !== null) {
                  updateElement(selected.id, { color_palette: [...selected.color_palette, hex] })
                  ;(e.target as HTMLInputElement).value = ''
                }
              },
            }) : null),
          h('div', { className: css.ideoFontChips },
            PALETTE_PRESETS.map((p) => h('button', {
              key: p.name, className: css.ideoChip, title: p.colors.join(' '),
              onClick: () => { updateElement(selected.id, { color_palette: p.colors }) },
            }, p.name)))))
    // no selection: the element list (top = front, reversed array)
    : elements.length === 0
      ? h('div', { className: css.ideoEmpty },
          h('p', null, 'Drag on the canvas to create a box, or add:'),
          h('div', null,
            h(Button, { variant: 'outline', size: 'sm', onClick: () => { addElement('obj') } }, '+ Object'),
            ' ',
            h(Button, { variant: 'outline', size: 'sm', onClick: () => { addElement('text') } }, '+ Text'),
            ' ',
            h(Button, { variant: 'outline', size: 'sm', onClick: () => { addElement('logo') } }, '+ Logo')))
      : h('div', { className: css.ideoList },
          [...elements].reverse().map((el) => {
            const r = bboxToRect(el.bbox)
            return h('div', {
              key: el.id,
              className: selectedIds.includes(el.id) ? `${css.ideoRow} ${css.ideoRowOn}` : css.ideoRow,
              onClick: (e: Event) => {
                if ((e as MouseEvent).ctrlKey || (e as MouseEvent).metaKey) toggleSelected(el.id)
                else setSelectedId(el.id)
              },
            },
              h('span', { className: css.ideoRowBadge, 'data-ideo-type': el.type }, el.type),
              h('span', { className: css.ideoRowText },
                el.type === 'obj' ? (el.desc || '—') : `“${el.text || el.type}”`),
              h('span', { className: css.ideoRowBbox }, `${r.w}×${r.h}`),
              h('span', { className: css.ideoRowPalette },
                el.color_palette.map((c, i) => h('span', { key: i, style: { background: c }, className: css.ideoMiniSwatch }))),
              h('span', { className: css.ideoRowActions },
                h('button', { title: 'bring to front', onClick: (e: Event) => { e.stopPropagation(); reorder(el.id, 'front') } }, '↑'),
                h('button', { title: 'send to back', onClick: (e: Event) => { e.stopPropagation(); reorder(el.id, 'back') } }, '↓'),
                h('button', { title: 'duplicate', onClick: (e: Event) => { e.stopPropagation(); duplicateElement(el.id) } }, '⧉'),
                h('button', { title: 'delete', onClick: (e: Event) => { e.stopPropagation(); deleteElement(el.id) } }, '✕')))
          }))

  const styleTab = h('div', { className: css.ideoStylePanel },
    h('div', { className: css.ideoFontChips },
      STYLE_PRESETS.map((p) => h('button', {
        key: p.name, className: css.ideoChip, title: `${p.style_value} · ${p.palette.join(' ')}`,
        onClick: () => {
          setValues((prev) => ({
            ...prev,
            style_type: p.style_type, aesthetics: p.aesthetics, lighting: p.lighting,
            medium: p.medium, style_value: p.style_value, style_palette: p.palette.join(', '),
          }))
        },
      }, p.name))),
    h('label', { className: css.ideoField },
      h('span', { className: css.ideoFieldKey }, 'High-level description'),
      h('input', {
        value: String(values['high_level_description'] ?? ''),
        onChange: (e: Event) => { setValues((prev) => ({ ...prev, high_level_description: (e.target as HTMLInputElement).value })) },
      })),
    h('div', { className: css.ideoBboxRow },
      ['none', 'photo', 'art_style'].map((st) => h('button', {
        key: st,
        className: values['style_type'] === st ? `${css.ideoChip} ${css.ideoChipOn}` : css.ideoChip,
        onClick: () => { setValues((prev) => ({ ...prev, style_type: st })) },
      }, st))),
    styleInput('aesthetics', 'Aesthetics'),
    styleInput('lighting', 'Lighting'),
    styleInput('medium', 'Medium'),
    String(values['style_type']) !== 'none' ? styleInput('style_value', String(values['style_type']) === 'photo' ? 'Photo detail' : 'Art style') : null,
    h('label', { className: css.ideoField },
      h('span', { className: css.ideoFieldKey }, 'Style palette'),
      h('input', {
        value: String(values['style_palette'] ?? ''), placeholder: '#FF6B35, #F7B801',
        onChange: (e: Event) => { setValues((prev) => ({ ...prev, style_palette: (e.target as HTMLInputElement).value })) },
      }),
      h('div', { className: css.ideoSwatches },
        sanitizeHexList(String(values['style_palette'] ?? '')).slice(0, 8).map((c, i) =>
          h('span', { key: i, className: css.ideoSwatch, style: { background: c } })))))

  const jsonTab = h('div', { className: css.ideoJsonPanel },
    h('div', { className: css.ideoField },
      h('span', { className: css.ideoFieldKey }, 'Caption (read-only — what Run sends)'),
      h('pre', { className: css.ideoPre }, jsonPreview)),
    h('label', { className: css.ideoField },
      h('span', { className: css.ideoFieldKey }, 'Elements JSON — paste + Apply'),
      h('textarea', {
        rows: 6, value: jsonDraft, placeholder: '[{"type":"obj","desc":"…","bbox":[200,200,500,500]}]',
        onChange: (e: Event) => { setJsonDraft((e.target as HTMLTextAreaElement).value) },
      })),
    jsonParseError !== null ? h('div', { className: css.ideoWarn }, jsonParseError) : null,
    h('div', { className: css.ideoToolbar },
      h(Button, {
        variant: 'outline', size: 'sm', disabled: jsonParseError !== null || jsonDraft.trim() === '',
        onClick: () => {
          const parsed = parseElementsJSON(jsonDraft)
          if (parsed !== null) {
            handleImportElements(parsed, 'JSON paste')
            setJsonDraft('')
          }
        },
      }, 'Apply elements'),
      h(Button, {
        variant: 'ghost', size: 'sm',
        onClick: () => { void navigator.clipboard?.writeText(jsonPreview).then(() => { setStatus('caption copied') }) },
      }, 'Copy caption')))

  return h('div', { className: css.ideoStudio },
    // ── THE RAIL ──
    h('div', { className: css.ideoRail },
      h('label', { className: css.ideoField },
        h('span', { className: css.ideoFieldKey }, 'Background — the scene everything exists in'),
        h('textarea', {
          rows: 2, value: String(values['background'] ?? ''),
          placeholder: 'A natural wood desk against a white wall.',
          onChange: (e: Event) => { setValues((prev) => ({ ...prev, background: (e.target as HTMLTextAreaElement).value })) },
        })),
      // the toolbar
      h('div', { className: css.ideoToolbar },
        h(Button, { variant: 'outline', size: 'sm', onClick: () => { addElement('obj') } }, '+ Object'),
        h(Button, { variant: 'outline', size: 'sm', onClick: () => { addElement('text') } }, '+ Text'),
        h('select', {
          className: css.ideoAspect, value: `${width}x${height}`,
          onChange: (e: Event) => {
            const p = ASPECT_PRESETS.find((x) => `${x.w}x${x.h}` === (e.target as HTMLSelectElement).value)
            if (p !== undefined) setValues((prev) => ({ ...prev, width: p.w, height: p.h }))
          },
        }, ASPECT_PRESETS.map((p) => h('option', { key: p.id, value: `${p.w}x${p.h}` }, `${p.id} ${p.label} ${p.w}×${p.h}`))),
        h(Button, { variant: 'ghost', size: 'sm', onClick: () => { setShowGrid((g) => !g) } }, showGrid ? 'Grid ✓' : 'Grid'),
        h(Button, { variant: 'ghost', size: 'sm', onClick: () => { setSnapEnabled((s) => !s) } }, snapEnabled ? 'Snap ✓' : 'Snap'),
        h(Button, { variant: 'ghost', size: 'sm', onClick: () => { pngInputRef.current?.click() } }, 'Load PNG'),
        elements.length > 0 ? h(Button, {
          variant: 'ghost', size: 'sm',
          onClick: () => { commitElements(() => []); setSelectedId(null) },
        }, 'Clear') : null,
        h('input', { ref: pngInputRef, type: 'file', accept: 'image/png', style: { display: 'none' }, onChange: (e: Event) => { void handlePngPick(e) } })),
      status !== null ? h('div', { className: css.ideoStatus }, status) : null,
      // the tab bar
      h('div', { className: css.ideoTabs },
        h('button', { className: tab === 'elements' ? `${css.ideoTab} ${css.ideoTabOn}` : css.ideoTab, onClick: () => { setTab('elements') } },
          `Elements${elements.length > 0 ? ` (${elements.length})` : ''}`),
        h('button', { className: tab === 'style' ? `${css.ideoTab} ${css.ideoTabOn}` : css.ideoTab, onClick: () => { setTab('style') } }, 'Style'),
        h('button', { className: tab === 'json' ? `${css.ideoTab} ${css.ideoTabOn}` : css.ideoTab, onClick: () => { setTab('json') } }, 'JSON')),
      tab === 'elements' ? elementsTab : null,
      tab === 'style' ? styleTab : null,
      tab === 'json' ? jsonTab : null,
      // the generic drill's fields (seed/steps/cfg/… — the studio owns
      // prompt/width/height; the rest serve as plain spec fields)
      spec !== null && spec.fields.length > 0
        ? h(SpecForm, { spec, fields: spec.fields, values, onEdit })
        : null),
    // ── THE CANVAS (the viewport belongs to the layout) ──
    h('div', { className: css.ideoCanvasWrap },
      h('div', {
        ref: containerRef,
        className: `${css.ideoCanvas}${drawMode ? ` ${css.ideoCanvasDraw}` : ''}`,
        style: { aspectRatio: `${width} / ${height}`, maxWidth: `min(100%, ${cssMaxWidth}px)` },
        onPointerDown: handleCanvasPointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: finishInteraction,
        onPointerCancel: finishInteraction,
      },
        h('div', { 'data-canvas-bg': '1', className: css.ideoCanvasBg }),
        String(values['background'] ?? '') !== '' ? h('div', { className: css.ideoBgText }, String(values['background'])) : null,
        showGrid ? h('div', { 'data-grid': '1', className: css.ideoGridMinor }) : null,
        showGrid ? h('div', { 'data-grid': '1', className: css.ideoGridMajor }) : null,
        elements.map((el) => {
          const r = bboxToRect(el.bbox)
          const isSel = selectedIds.includes(el.id)
          const isPrimary = el.id === primaryId
          return h('div', {
            key: el.id,
            className: `${css.ideoBox} ${css[`ideoBox_${el.type}`] ?? ''}`,
            style: { left: `${r.x / 10}%`, top: `${r.y / 10}%`, width: `${r.w / 10}%`, height: `${r.h / 10}%` },
          },
            isSel ? h('div', { className: `${css.ideoHalo} ${css[`ideoHalo_${el.type}`] ?? ''}` }) : null,
            h('div', {
              className: css.ideoBoxMain,
              onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => { handleBoxPointerDown(e, el) },
              onDoubleClick: el.type !== 'obj'
                ? () => { setEditingTextId(el.id); setInlineText(el.text ?? '') }
                : undefined,
            },
              h('span', { className: `${css.ideoTag} ${css[`ideoTag_${el.type}`] ?? ''}` }, el.type === 'obj' ? 'obj' : el.type),
              el.type === 'obj' && r.w > 60 && r.h > 80 ? h('span', { className: css.ideoDesc }, el.desc) : null,
              el.color_palette.length > 0 ? h('span', { className: css.ideoRowPalette },
                el.color_palette.map((c, i) => h('span', { key: i, style: { background: c }, className: css.ideoMiniSwatch }))) : null,
              editingTextId === el.id ? h('textarea', {
                className: css.ideoInlineText, value: inlineText, autoFocus: true,
                onChange: (e: Event) => { setInlineText((e.target as HTMLTextAreaElement).value) },
                onBlur: () => { commitInlineText() },
                onKeyDown: (e: Event) => {
                  const ke = e as KeyboardEvent
                  if (ke.key === 'Enter' && !ke.shiftKey) { ke.preventDefault(); commitInlineText() }
                  if (ke.key === 'Escape') setEditingTextId(null)
                },
              }) : null),
            isPrimary ? HANDLE_DEFS.map((hd) => h('div', {
              key: hd.id,
              className: `${css.ideoHandle} ${css[`ideoHandle_${hd.id}`] ?? ''}`,
              style: hd.pos,
              onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => { handleHandlePointerDown(e, el, hd.id) },
            })) : null)
        }),
        drawMode && mode.kind === 'draw' ? (() => {
          const xmin = Math.min(mode.startX, mode.curX)
          const xmax = Math.max(mode.startX, mode.curX)
          const ymin = Math.min(mode.startY, mode.curY)
          const ymax = Math.max(mode.startY, mode.curY)
          return h('div', {
            className: css.ideoDrawPreview,
            style: { left: `${xmin / 10}%`, top: `${ymin / 10}%`, width: `${(xmax - xmin) / 10}%`, height: `${(ymax - ymin) / 10}%` },
          })
        })() : null),
      h('div', { className: css.ideoCoord },
        `${width}×${height} · ${elements.length} element${elements.length === 1 ? '' : 's'}`)),
    // ── the run row ──
    h('div', { className: css.ideoRunRow },
      h(Button, { variant: 'primary', onClick: run, disabled: runStatus === 'running' },
        runStatus === 'running' ? 'Rendering…' : 'Run'),
      runStatus === 'running' ? h(Button, { variant: 'outline', onClick: onStop }, 'Stop') : null,
      h(Button, { variant: 'ghost', onClick: onRemove }, 'Remove stage')),
  )
}

/** The built-in registration (the ui-tool law, verbatim). */
export const ideogram4Studio = {
  name: 'ideogram4-studio',
  inject: ['slots'],
  apply(ctx: Context): void {
    ctx.slots.inject('cards.stage.view', () =>
      ctx.slots.register({ name: 'cards.stage.view', key: 'ideogram4' }, Ideogram4Studio))
  },
}
