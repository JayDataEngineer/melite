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

export interface GalleryRunRow {
  run_id?: string
  name?: string
  flow?: string
  status?: string
  created_at?: number
  prompt?: string
  thumbnail?: string
  artifacts?: RunArtifact[]
  /** THE ARCHIVED FACE (mass-archive law, operator ruling 2026-11-14,
   *  item (a)): the run's tucked-away rows ride ALONGSIDE the live
   *  list — the panel hides them unless the operator toggles them
   *  visible. Same row shape as artifacts, never merged into it. */
  archived?: RunArtifact[]
  source?: string
  /** Card linkage served by the runs list (the action card this run
   * belongs to, for wand replay). */
  draft_id?: string
  /** THE TEST SEAT (visible-bench law, operator ruling 2026-11-14,
   *  item (b)): the list serves test:true runs from the test-output/
   *  seat with this stamp — the feed no longer hides them. */
  test?: boolean
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

export interface FeedError {
  gateway: string
  message: string
}

export interface RunsFeed {
  runs: GalleryRunRow[]
  errors: FeedError[]
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
  const errors = row<FeedError>(d.errors)
  const runs: GalleryRunRow[] = []
  let dropped = 0
  for (const raw of row<unknown>(d.runs)) {
    const r = (raw ?? {}) as GalleryRunRow
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
  errors: FeedError[]
}

export function decodeDrafts(json: unknown): DraftsFeed {
  const d = (json ?? {}) as { drafts?: unknown; errors?: unknown }
  /* the runs law, mirrored: a draft without a string draft_id is
   * unkeyable — dropped and counted loudly, never rendered as an
   * empty face that hides a malformed wire */
  const errors = row<FeedError>(d.errors)
  const drafts: DraftRow[] = []
  let dropped = 0
  for (const raw of row<unknown>(d.drafts)) {
    const r = (raw ?? {}) as DraftRow
    if (typeof r.draft_id !== 'string' || r.draft_id === '') { dropped += 1; continue }
    drafts.push(r)
  }
  if (dropped > 0) {
    errors.push({ gateway: 'drafts', message: 'dropped ' + String(dropped) + ' rows without draft_id (unkeyable)' })
  }
  return { drafts, errors }
}

/** One browse-face row — the disk truth behind the runs window (the
 *  browse route walks the output trees directly; a run dir the
 *  queue's 500-row eviction window dropped still lists here). */
export interface BrowseEntry {
  name: string
  kind: 'dir' | 'file'
  size?: number
  /** ms since epoch (the route serves stat mtimeMs). */
  mtime?: number
}

/** One browse answer — one directory level, cursor-paginated with an
 *  honest total (nextCursor null means the walk is complete, never a
 *  silent cap). */
export interface BrowsePage {
  path: string
  entries: BrowseEntry[]
  total: number
  nextCursor: number | null
}

export function decodeBrowse(json: unknown): BrowsePage {
  const d = (json ?? {}) as { path?: unknown; entries?: unknown; total?: unknown; nextCursor?: unknown }
  /* the runs law, mirrored: a row without a name or with a foreign
   * kind is unrenderable — dropped here (the wire guard), never
   * pushed as a partial that paints an empty face over a malformed
   * answer */
  const entries: BrowseEntry[] = []
  for (const raw of row<unknown>(d.entries)) {
    const e = (raw ?? {}) as { name?: unknown; kind?: unknown; size?: unknown; mtime?: unknown }
    if (typeof e.name !== 'string' || e.name === '') continue
    if (e.kind !== 'dir' && e.kind !== 'file') continue
    entries.push({
      name: e.name,
      kind: e.kind,
      ...(typeof e.size === 'number' ? { size: e.size } : {}),
      ...(typeof e.mtime === 'number' ? { mtime: e.mtime } : {}),
    })
  }
  return {
    path: typeof d.path === 'string' ? d.path : '',
    entries,
    total: typeof d.total === 'number' ? d.total : entries.length,
    nextCursor: typeof d.nextCursor === 'number' ? d.nextCursor : null,
  }
}
