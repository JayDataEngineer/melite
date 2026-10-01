/**
 * h3-timeline client entry — the card package's OWN cards.stage.view
 * surface (2026-09-12, the composition-root correction: a card's
 * studio registers from ITS package, never from the bench host —
 * adding a card never touches the host, the DSH plugin contract).
 *
 * THE MOUNT LAW (the studio removal, 2026-08-19: a card is a SEAM and
 * whatever renders its authoring surface is INJECTED): the h3-timeline
 * card's authoring surface is this package's own studio —
 * src/ui/studio/component.tsx (VideoTimelineStudio, the 26-file
 * three-layer NLE tenant the family serves as studio.tenant
 * "video/h3-timeline"). This module is the ADAPTER that mounts it on
 * the bench slot — never a second definition site: props translate
 * 1:1 onto the tenant contract {stage, running, onSave, upstreams?};
 * the document rides stage.params; writes ride onSave → onPatch
 * (patchStageParams' partial merge — the E4 write channel, observed ⊆
 * the family's declared writes); the run rides the host drill's own
 * Run row.
 */
import { createElement as h } from 'react'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { defineStageViewRegistration } from '@melite/card-base'
import {
  cardResultFromRecord,
  projectStageView,
  projectUpstreamStages,
  type CardResult,
  type StageViewOwnerProps,
} from '@melite/contracts'
import { VideoTimelineStudio } from '../ui/studio/component.tsx'
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

function historyRows(
  row: Record<string, unknown>,
  result: Record<string, unknown>,
  metadata: Record<string, unknown>,
): H3HistoryRow[] {
  const rows: H3HistoryRow[] = []
  const add = (value: unknown): void => {
    const entry = recordOf(value)
    const artifacts = recordOf(entry['artifacts'])
    const assetUrls = Array.isArray(entry['assetUrls'])
      ? entry['assetUrls'].filter((url): url is string => typeof url === 'string')
      : []
    const direct = typeof entry['url'] === 'string' ? entry['url'] : ''
    const video = videoUrlOf(artifacts, assetUrls, direct, true)
    if (video === '') return
    const runId = typeof entry['runId'] === 'string'
      ? entry['runId']
      : typeof entry['run_id'] === 'string' ? entry['run_id'] : undefined
    const error = typeof entry['error'] === 'string' ? entry['error'] : ''
    const status = typeof entry['status'] === 'string'
      ? entry['status']
      : error !== '' ? 'failed' : undefined
    const duration = typeof entry['durationSec'] === 'number' ? entry['durationSec'] : undefined
    const at = typeof entry['at'] === 'number' ? entry['at'] : undefined
    rows.push({
      ...(runId !== undefined ? { runId } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(at !== undefined ? { at } : {}),
      ...(duration !== undefined ? { durationSec: duration } : {}),
      video,
    })
  }
  const generic = Array.isArray(row['history']) ? row['history'] : []
  if (Array.isArray(row['history'])) add(result)
  for (const entry of generic) add(entry)
  const legacy = metadata['history']
  if (Array.isArray(legacy)) {
    for (const entry of legacy) {
      const normalized = recordOf(entry)
      const video = typeof normalized['video'] === 'string' ? normalized['video'] : ''
      if (video === '') continue
      rows.push({
        ...(typeof normalized['runId'] === 'string' ? { runId: normalized['runId'] } : {}),
        ...(typeof normalized['status'] === 'string' ? { status: normalized['status'] } : {}),
        ...(typeof normalized['at'] === 'number' ? { at: normalized['at'] } : {}),
        ...(typeof normalized['durationSec'] === 'number' ? { durationSec: normalized['durationSec'] } : {}),
        video,
      })
    }
  }
  const seen = new Set<string>()
  return rows.filter((entry): boolean => {
    const key = entry.runId ?? entry.video
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 12)
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

/** The registration (the ui-tool law): the card package registers its
 * own shipped studio's view under its card key. */
/** The built-in registration (the ui-tool law, verbatim — the
 * module namespace IS the plugin: the loader consumes name/inject/apply). */
export const name = 'h3TimelineStudio'

// NO estate injects here (the fifth receipt, 2026-09-29): studios
// load BEFORE the mounter in the plugin URL, and a static estate
// inject parks this plugin forever waiting on card-view's own
// $mount. The estate bind rides the factory's armed lazy getter over
// the inject-free ctx.get seam — order-proof by construction.
export const inject = ['slots']

export const apply = defineStageViewRegistration('h3-timeline', H3TimelineStudio)

/** The timeline surface — registered under key 'h3-timeline'. The
 * ADAPTER: the tenant mounted verbatim, one translate layer, zero
 * paraphrase. */
export function H3TimelineStudio(props: StageViewOwnerProps): ReturnType<typeof h> {
  const stage = projectStageView(props, {
    genre: 'video',
    result: harvestResult,
  })
  // the kit's TooltipProvider wrap died with the kit (2026-09-12):
  // the tenant's Tips are DSH Tooltips now — self-providing, no
  // app-root provider needed.
  return h('div', { 'data-testid': 'h3-studio-tenant', style: { height: '100%', minHeight: 0 } },
    h(VideoTimelineStudio, {
      stage,
      running: props.runStatus === 'running',
      onSave: props.onPatch,
      upstreams: projectUpstreamStages(props),
    }),
  )
}
