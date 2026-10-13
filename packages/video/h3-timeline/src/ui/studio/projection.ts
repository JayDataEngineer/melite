/**
 * projection.ts — the h3 tenant's owner-currency projection (PURE
 * MOVE from src/client/index.ts, 2026-10-27, the one-truth currency
 * completion: the tenant speaks StageViewOwnerProps and projects
 * its CardStage internally — the adapter is a pass-through, no
 * second contract at the boundary). Every line below the export is
 * verbatim from the adapter; the harvest shape law (named map, flat
 * list, gallery, stage url, junk refused) is unchanged.
 */
import {
  cardResultFromRecord,
  projectStageView,
  projectUpstreamStages,
  type CardResult,
  type CardStage,
  type StageViewOwnerProps,
} from '@melite/contracts'
import { refGenreOf } from '@melite/models-h3/timelineContract'

type H3HistoryRow = {
  runId?: string
  status?: string
  at?: number
  durationSec?: number
  video: string
}

function recordOf(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function isWindowName(name: string): boolean {
  return /^h3_t4_w\d+_\d+_\.mp4$/i.test(name) || /^video_w\d+_/.test(name)
}

function videoUrlOf(
  artifacts: Record<string, unknown>,
  assetUrls: readonly string[],
  direct: unknown,
  allowWindow = false,
): string {
  const rows = Object.entries(artifacts)
    .filter((entry): entry is [string, string] => {
      const [name, url] = entry
      return typeof url === 'string' && url !== '' && refGenreOf(name, url) === 'video'
    })
  const film = rows.find(([name, url]) => /(?:^|\/)h3_t4_film_\d+_\.mp4$/i.test(name) || /h3_t4_film_\d+_\.mp4(?:$|[?#])/i.test(url))
  if (film !== undefined) return film[1] as string
  if (typeof direct === 'string' && direct !== '' && refGenreOf('', direct) === 'video') return direct
  const named = rows.find(([name]) => allowWindow || !isWindowName(name))
  if (named !== undefined) return named[1] as string
  const flat = assetUrls.find((url) => refGenreOf('', url) === 'video')
  return flat ?? ''
}

/** THE ONE PER-ENTRY HARVEST LAW (the rail-law audit, 2026-10-31:
 * this law was owned twice — here and a drift copy in StudioPreview
 * with a different priority order and no error arm — one owner now).
 * One raw history entry → one row, or null when it holds no video:
 * the named artifact map (film lead, windows allowed), then a
 * directly-named video url (either the raw `url` key or an
 * already-harvested row's `video` key), then the flat assetUrls; an
 * absent status with a present error folds to 'failed'.
 *
 * @param value one raw history entry (row.history, metadata.history,
 * or an already-harvested H3HistoryRow).
 * @returns the normalized row, or null when no video survives. */
function historyEntryOf(value: unknown): H3HistoryRow | null {
  const entry = recordOf(value)
  const artifacts = recordOf(entry['artifacts'])
  const assetUrls = Array.isArray(entry['assetUrls'])
    ? entry['assetUrls'].filter((url): url is string => typeof url === 'string')
    : []
  const direct = typeof entry['url'] === 'string' ? entry['url']
    : typeof entry['video'] === 'string' ? entry['video'] : ''
  const video = videoUrlOf(artifacts, assetUrls, direct, true)
  if (video === '') return null
  const runId = typeof entry['runId'] === 'string'
    ? entry['runId']
    : typeof entry['run_id'] === 'string' ? entry['run_id'] : undefined
  const error = typeof entry['error'] === 'string' ? entry['error'] : ''
  const status = typeof entry['status'] === 'string'
    ? entry['status']
    : error !== '' ? 'failed' : undefined
  const duration = typeof entry['durationSec'] === 'number' ? entry['durationSec'] : undefined
  const at = typeof entry['at'] === 'number' ? entry['at'] : undefined
  return {
    ...(runId !== undefined ? { runId } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(at !== undefined ? { at } : {}),
    ...(duration !== undefined ? { durationSec: duration } : {}),
    video,
  }
}

/** One source list → deduped rows, newest-first, estate cap 12 (the
 *  dedupe key is the run id, else the video url). */
function historyRowsFrom(sources: readonly unknown[]): H3HistoryRow[] {
  const rows: H3HistoryRow[] = []
  for (const value of sources) {
    const row = historyEntryOf(value)
    if (row !== null) rows.push(row)
  }
  const seen = new Set<string>()
  return rows.filter((entry): boolean => {
    const key = entry.runId ?? entry.video
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 12)
}

function historyRows(
  row: Record<string, unknown>,
  result: Record<string, unknown>,
  metadata: Record<string, unknown>,
): H3HistoryRow[] {
  const sources: unknown[] = []
  if (Array.isArray(row['history'])) {
    sources.push(result)
    sources.push(...row['history'])
  }
  const legacy = metadata['history']
  if (Array.isArray(legacy)) sources.push(...legacy)
  return historyRowsFrom(sources)
}

/** The studio's history read (THE ONE OWNER, rail-law audit
 *  2026-10-31): the stage's own two history sources — the harvested
 *  result.metadata.history and the stage-level history list —
 *  through the same per-entry law, dedupe, and cap the contract's
 *  harvest rides. The preview imports THIS; no second harvest face.
 *
 * @param stage the projected document stage.
 * @returns the deduped history rows (newest first, cap 12). */
export function stageHistoryRows(stage: CardStage): H3HistoryRow[] {
  const sources: unknown[] = []
  const metadataHistory = stage.result?.metadata?.history
  if (Array.isArray(metadataHistory)) sources.push(...metadataHistory)
  if (Array.isArray(stage.history)) sources.push(...stage.history)
  return historyRowsFrom(sources)
}

function harvestResult(
  row: Record<string, unknown>,
  base: CardResult | null,
): CardResult {
  const result = recordOf(row['result'])
  const artifacts = { ...(base?.artifacts ?? {}) }
  const gallery = Array.isArray(result['gallery']) ? result['gallery'] : []
  for (const entry of gallery) {
    const item = recordOf(entry)
    const name = typeof item['name'] === 'string' ? item['name'] : ''
    const url = typeof item['url'] === 'string' ? item['url'] : ''
    if (name !== '' && url !== '') artifacts[name] = url
  }
  const assetUrls = base?.assetUrls ?? []
  const video = videoUrlOf(artifacts, assetUrls, result['url'])
  if (video !== '') artifacts['video'] = video
  else if (artifacts['video'] !== undefined && refGenreOf('video', artifacts['video']) !== 'video') {
    delete artifacts['video']
  }
  const rawMetadata = result['metadata']
  const metadata = {
    ...(base?.metadata ?? {}),
    ...recordOf(rawMetadata),
  }
  const history = historyRows(row, result, metadata)
  if (history.length > 0) metadata['history'] = history
  return {
    assetUrls,
    artifacts,
    metadata,
    ...(base?.durationSec === undefined ? {} : { durationSec: base.durationSec }),
    ...(base?.gallery === undefined ? {} : { gallery: base.gallery }),
    ...(base?.motionPreviews === undefined ? {} : { motionPreviews: base.motionPreviews }),
  }
}

/**
 * The tenant's owner-currency projection: the bench host's
 * StageViewOwnerProps become the document stage (params IS the
 * document) plus the read-only upstream stages. The write channel
 * needs no projection — onSave IS owner.onPatch, 1:1.
 *
 * @param owner the bench host's StageViewOwnerProps for this stage.
 * @returns the projected CardStage and the upstream CardStages.
 */
export function projectH3StageViewProps(owner: StageViewOwnerProps): {
  stage: CardStage
  upstreams: CardStage[]
} {
  return {
    stage: projectStageView(owner, {
      genre: 'video',
      result: harvestResult,
    }),
    upstreams: projectUpstreamStages(owner),
  }
}
