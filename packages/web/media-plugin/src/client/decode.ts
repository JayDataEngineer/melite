/**
 * Wire types + door decoders for the /infer-media feeds — ONE validation
 * site per feed (audit F2: both panels re-checked shapes at render with
 * Array.isArray sprinkles; now the hook's decode does it once and
 * malformed shapes fall back to empty HERE, loudly typed).
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
  /** Card linkage served by the gateway's runs list (2026-08-30 full
   *  flow): the action card this run belongs to, for wand replay. */
  draft_id?: string
  /** Composed params doc (yaml-era params.calls[0].text feeds tile labels). */
  params?: unknown
  /** Set by the HOST door from the gateway's trailing marker row when the
   *  run's artifact list was truncated ({listed,total}) — surfaced in the
   *  panel stats so a 3-of-40 listing never looks like data loss. */
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
  return {
    runs: row<RunRow>(d.runs),
    errors: row<GatewayError>(d.errors),
  }
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
