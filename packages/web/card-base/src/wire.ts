/**
 * wire.ts — @melite/card-base: the same-origin /v1 wire facts the
 * constructor's verbs ride (the viewer-base precedent: the base owns
 * the wire FACTS — door paths and shapes — while surfaces own their
 * own orchestration). Fetchers for the emission (catalog, form-spec)
 * and the one upload door.
 */
import type { CatalogCard, FormSpecDoc } from './spec.ts'

/** Read a same-origin /v1 JSON door. Non-200 → named throw (the door's
 *  own error text when present). */
async function v1Get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { ...(signal === undefined ? {} : { signal }) })
  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const err = typeof body === 'object' && body !== null ? Reflect.get(body, 'error') : undefined
    throw new Error(typeof err === 'string' ? err : path + ': HTTP ' + String(res.status))
  }
  return body as T
}

/** /v1/model-catalog → the cards section (the picker's ONE surface —
 *  action cards, one tile per card package; models are NOT entries). */
export async function fetchCardCatalog(signal?: AbortSignal): Promise<CatalogCard[]> {
  const doc = await v1Get<{ cards?: Record<string, Record<string, unknown>> }>('/v1/model-catalog', signal)
  const raw = doc['cards'] ?? {}
  const out: CatalogCard[] = []
  for (const [id, row] of Object.entries(raw)) {
    if (typeof row !== 'object' || row === null) continue
    const famsRaw = row['families']
    out.push({
      id,
      label: typeof row['label'] === 'string' ? row['label'] : id,
      description: typeof row['description'] === 'string' ? row['description'] : '',
      genre: typeof row['genre'] === 'string' ? row['genre'] : '',
      families: Array.isArray(famsRaw) ? famsRaw.filter((x): x is string => typeof x === 'string') : [id],
    })
  }
  return out.sort((a, b) => a.label.localeCompare(b.label))
}

/** /v1/form-spec?model=<family> — the card family's emission (fields
 *  + the declared edges + the mod kinds). */
export async function fetchFormSpec(model: string, signal?: AbortSignal): Promise<FormSpecDoc> {
  const doc = await v1Get<FormSpecDoc>('/v1/form-spec?model=' + encodeURIComponent(model), signal)
  if (!Array.isArray(doc['fields'])) throw new Error('form-spec: no fields array')
  return doc
}

/** One /v1/forms row — the card META table (label/genre/sidebar plus
 *  THE DECLARED EDGES: inputs/outputs as served from flowKinds).
 *  Surfaces kind-match picker candidates from THIS table without
 *  fetching per-card form-specs. */
export interface FormsTableRow {
  label: string
  genre?: string
  order?: number | string
  inputs?: Record<string, string>
  outputs?: Record<string, string>
}

/** /v1/forms — every card's meta row (the edge emission included). */
export async function fetchFormsTable(signal?: AbortSignal): Promise<Record<string, FormsTableRow>> {
  return v1Get<Record<string, FormsTableRow>>('/v1/forms', signal)
}

/** OS-file drop → the /v1/uploads door (png/jpeg/webp data-URL) → the
 *  input-dir path the param accepts. The door's own gates (type
 *  whitelist, one clean segment) are the law — the client only
 *  voices its refusals, never invents its own. */
export async function uploadInputFile(file: File): Promise<{ name: string; file: string }> {
  const isImage = file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/webp'
  const isAudio = file.type.startsWith('audio/')
  if (!isImage && !isAudio) {
    throw new Error('Input cards don\u2019t accept ' + (file.type !== '' ? file.type : 'that file') + ' \u2014 drop an image or audio file')
  }
  if (isAudio) {
    throw new Error('audio uploads have no door yet \u2014 the uploads door boards png / jpeg / webp only')
  }
  const dataUrl: string = await new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => { resolve(String(r.result)) }
    r.onerror = () => { reject(new Error('could not read the dropped file')) }
    r.readAsDataURL(file)
  })
  const res = await fetch('/v1/uploads', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ filename: file.name.replace(/[^A-Za-z0-9._-]/g, '_'), data: dataUrl }),
  })
  if (!res.ok) throw new Error('upload refused: HTTP ' + String(res.status))
  const out: unknown = await res.json()
  const path = typeof out === 'object' && out !== null && typeof Reflect.get(out, 'path') === 'string'
    ? Reflect.get(out, 'path') as string : ''
  if (path === '') throw new Error('upload answered without a path')
  // The PARAM currency is the ESTATE PATH ('data/input/x.png'), not
  // the bare name: the composing door's uploadReferenced stages local
  // paths into ComfyUI's input dir (a bare name is not a file the
  // estate can read — the run dies on the engine with 'Invalid image
  // file'). The display face is the data-URL mirror, never this.
  return { name: path, file: path.split('/').pop() ?? file.name }
}
