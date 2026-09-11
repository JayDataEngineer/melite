/**
 * Wire types + route decoders for the gallery's same-origin feeds —
 * ONE validation site per feed (audit F2: both panels re-checked
 * shapes at render with Array.isArray sprinkles; now the hook's
 * decode does it once and malformed shapes fall back to empty HERE,
 * loudly typed).
 *
 * The runs feed rides the gallery's OWN host route
 * (GET /infer-gallery/runs — the host rewrites run-relative artifact
 * names to its same-origin artifact route, so no gateway origin ever
 * leaks); the drafts feed rides GET /infer-gallery/drafts.
 */
export interface RunArtifact {
  url?: string
  type?: string
  name?: string
  size?: number
}

export interface RunRow {
  run_id?: string
  name?: string
  flow?: string
  status?: string
  created_at?: number
  prompt?: string
  thumbnail?: string
  artifacts?: RunArtifact[]
  source?: string
  /** Card linkage served by the runs list (the action card this run
   * belongs to, for wand replay). */
  draft_id?: string
  /** Composed params doc (yaml-era params.calls[0].text feeds tile labels). */
  params?: unknown
  /** Served by the runs seat's trailing marker row when the run's
   * artifact list was truncated ({listed,total}) — surfaced in the
   * panel stats so a 3-of-40 listing never looks like data loss. */
  truncated?: { listed: number; total: number }
}

export interface DraftRow {
  draft_id?: string
  name?: string
  model?: string
  source?: string
}

export interface GatewayError {
  gateway: string
  message: string
}

export interface RunsFeed {
  runs: RunRow[]
  errors: GatewayError[]
}

const row = <T,>(v: unknown): T[] => (Array.isArray(v) ? v as T[] : [])

export function decodeRuns(json: unknown): RunsFeed {
  const d = (json ?? {}) as { runs?: unknown; errors?: unknown }
  /* ONE validation site (the estate collapse moved the deleted host
   * door's law here): a run without a string run_id is undedupeable
   * and unkeyable — DROPPED and counted loudly into the errors array
   * (the panel's existing error channel), never pushed as a partial,
   * never vanished silently. The route serves clean rows; this guards
   * the wire. */
  const errors = row<GatewayError>(d.errors)
  const runs: RunRow[] = []
  let dropped = 0
  for (const raw of row<unknown>(d.runs)) {
    const r = (raw ?? {}) as RunRow
    if (typeof r.run_id !== 'string' || r.run_id === '') { dropped += 1; continue }
    runs.push(r)
  }
  if (dropped > 0) {
    errors.push({ gateway: 'runs', message: 'dropped ' + String(dropped) + ' rows without run_id (unkeyable)' })
  }
  return { runs, errors }
}

export interface DraftsFeed {
  drafts: DraftRow[]
  errors: GatewayError[]
}

export function decodeDrafts(json: unknown): DraftsFeed {
  const d = (json ?? {}) as { drafts?: unknown; errors?: unknown }
  return {
    drafts: row<DraftRow>(d.drafts),
    errors: row<GatewayError>(d.errors),
  }
}
