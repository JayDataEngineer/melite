/**
 * deck-data — typed fetchers over this package's host-half proxy.
 *
 * All fetches are same-origin (/melite-deck/*); the host half owns the gateway
 * hop. Errors surface as typed DeckError with the verbatim upstream body —
 * the UI renders them honestly instead of swallowing.
 */

export interface FormEntry {
  form: string
  label: string
  genre: string
  order: number
  plugin: string
  sidebar_key: string
  default_service: string
  hidden: boolean
}

export interface FormFieldOption { value: string; label: string }

export interface FormField {
  name: string
  type: string
  label: string
  default: unknown
  options: FormFieldOption[] | null
  required: boolean | null
  step: number | null
  tooltip: string | null
  section: string | null
  order: number | null
}

export interface FormSpec {
  model: string
  form: string
  genre: string
  service: string
  label: string
  fields: FormField[]
  guide: string | null
}

export interface CatalogModel {
  id: string
  label: string
  family: string
  form: string
}

export interface RunArtifact { url?: string; path?: string; type?: string }

export interface RunStage {
  url?: string
  file?: string
  type?: string
  status?: string
}

export interface RunStatus {
  stages?: RunStage[]
  run_id: string
  status: string
  error?: string
  artifacts?: RunArtifact[]
  log_tail?: string[]

  [k: string]: unknown
}

export class DeckError extends Error {
  readonly body: string
  constructor(message: string, body: string) {
    super(message)
    this.body = body
  }
}

async function getJson<T>(url: string): Promise<T> {
  const resp = await fetch(url, { headers: { accept: 'application/json' } })
  const text = await resp.text()
  if (!resp.ok) throw new DeckError(`deck proxy ${resp.status}`, text.slice(0, 600))
  try {
    return JSON.parse(text) as T
  } catch {
    throw new DeckError('deck proxy returned non-JSON', text.slice(0, 300))
  }
}

export function fetchForms(): Promise<FormEntry[]> {
  return getJson<{ forms: Record<string, FormEntry & { sidebar_key: string; default_service: string }> }>('/melite-deck/forms')
    .then(d => {
      const out: FormEntry[] = []
      for (const [id, f] of Object.entries(d.forms ?? {})) {
        if (f.hidden) continue
        out.push({
          form: id, label: f.label ?? id, genre: f.genre ?? 'other', order: f.order ?? 0,
          plugin: f.plugin ?? '', sidebar_key: f.sidebar_key ?? '', default_service: f.default_service ?? '',
          hidden: false,
        })
      }
      out.sort((a, b) => a.genre.localeCompare(b.genre) || a.label.localeCompare(b.label))
      return out
    })
}

export function fetchCatalog(): Promise<CatalogModel[]> {
  return getJson<Record<string, unknown> | Array<Record<string, unknown>>>('/melite-deck/models')
    .then(d => {
      // The gateway returns { families, models: {<id>: row}, engine_order, … }
      // — models is a KEYED OBJECT. Normalize every plausible shape to rows.
      const raw = Array.isArray(d)
        ? d
        : Array.isArray((d as { models?: unknown }).models)
          ? ((d as { models: Array<Record<string, unknown>> }).models)
          : (d as { models?: Record<string, Record<string, unknown>> }).models
      const rows: Array<[string, Record<string, unknown>]> = Array.isArray(raw)
        ? raw.map(r => [String(r.id ?? r.model ?? ''), r])
        : Object.entries((raw ?? {}) as Record<string, Record<string, unknown>>)
      return rows.map(([id, r]) => ({
        id,
        label: String(r.label ?? id),
        family: String(r.family ?? ''),
        form: String(r.form ?? ''),
      })).filter(m => m.id !== '')
    })
}

export function fetchFormSpec(model: string): Promise<FormSpec> {
  return getJson<FormSpec>(`/melite-deck/form-spec?model=${encodeURIComponent(model)}`)
}

export async function startRun(model: string, params: Record<string, unknown>): Promise<{ run_id: string }> {
  const resp = await fetch('/melite-deck/start', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, params }),
  })
  const text = await resp.text()
  if (!resp.ok) throw new DeckError(`start ${resp.status}`, text.slice(0, 600))
  try {
    const parsed = JSON.parse(text) as { run_id?: string }
    if (typeof parsed.run_id !== 'string' || parsed.run_id === '') {
      throw new DeckError('start returned no run_id', text.slice(0, 300))
    }
    return { run_id: parsed.run_id }
  } catch (e) {
    if (e instanceof DeckError) throw e
    throw new DeckError('start returned non-JSON', text.slice(0, 300))
  }
}

export function fetchRunStatus(runId: string): Promise<RunStatus> {
  return getJson<RunStatus>(`/melite-deck/status?run=${encodeURIComponent(runId)}`)
}

/** Terminal statuses (server-js runner.ts TERMINAL_RUN_STATUSES). */
export const TERMINAL_STATUSES: ReadonlySet<string> =
  new Set(['completed', 'failed', 'stopped', 'error', 'interrupted'])

export function isTerminal(status: string): boolean {
  return TERMINAL_STATUSES.has(status)
}

/** Same-origin artifact URL through the host-half path-restricted proxy. */
export function artifactUrl(a: RunArtifact): string {
  const p = typeof a.url === 'string' ? a.url : (typeof a.path === 'string' ? a.path : '')
  if (p === '') return ''
  return `/melite-deck/artifact?path=${encodeURIComponent(p)}`
}
