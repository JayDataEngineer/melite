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
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: the service seats this entry touches ride cordis Context
// declaration-merging from each owning package's ./client entry — the
// renderer owns ctx.slots. (The card-view client's own law, verbatim.)
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: the 'cards.stage.view' seam declaration (card-base owns
// the card-UI seams). Erased — the bundle stays pure.
import type {} from '@melite/card-base/slots'
import type { CardStage, StageViewOwnerProps } from '@melite/contracts'
import { VideoTimelineStudio } from '../ui/studio/component.tsx'

/** The bench row → the tenant's CardStage. id/title/kind ride verbatim;
 * service names the family (the served claim's join key); params IS the
 * document (useDocState hydrates from it); result's artifact name→url
 * map feeds the refs pickers + the filmstrip (useFilmAudio's artifact
 * index: own run first, upstreams win collisions). */
function toCardStage(props: StageViewOwnerProps): CardStage {
  const row = props.row
  const params = typeof row['params'] === 'object' && row['params'] !== null
    ? row['params'] as Record<string, unknown> : {}
  const result = typeof row['result'] === 'object' && row['result'] !== null
    ? row['result'] as Record<string, unknown> : {}
  const gallery = Array.isArray(result['gallery'])
    ? result['gallery'] as Array<Record<string, unknown>> : []
  const url = typeof result['url'] === 'string' ? result['url'] : ''
  const arts = typeof result['artifacts'] === 'object' && result['artifacts'] !== null
    ? result['artifacts'] as Record<string, unknown> : {}
  const assetUrls = Array.isArray(result['assetUrls'])
    ? result['assetUrls'].filter((u): u is string => typeof u === 'string') : []
  const metadata = typeof result['metadata'] === 'object' && result['metadata'] !== null
    ? result['metadata'] as Record<string, unknown> : {}
  const artifacts: Record<string, string> = {}
  // THE HARVEST SHAPE (what the estate's watchRun patch actually writes
  // — pinned by the real draft rows: stitch + windows + flat list):
  // result.artifacts is the name→url map (video, video_w\d+_main...);
  // result.assetUrls is the ray-parity FLAT list, stitch first.
  for (const [name, val] of Object.entries(arts)) {
    if (typeof val === 'string' && val !== '') artifacts[name] = val
  }
  // the flat list is the second source (older rows, degraded stores) —
  // only the head (the stitch) feeds the hero key; the windows keep
  // their named entries from the artifact map above.
  if (artifacts['video'] === undefined && assetUrls.length > 0) {
    artifacts['video'] = assetUrls[0]!
  }
  // gallery entries carry their OWN urls — map name→url verbatim (the
  // window tiles read /^video_w\d+_/ keys with non-empty urls; a
  // name→name map is fake data the no-fake-data guard exists for).
  for (const g of gallery) {
    const name = typeof g['name'] === 'string' ? g['name'] : ''
    const gurl = typeof g['url'] === 'string' ? g['url'] : ''
    if (name !== '' && gurl !== '') artifacts[name] = gurl
  }
  // THE HERO KEY: useDerivedView's final cut is arts.video ?? urls[0]
  // — the row's result.url (the run's stage url) is the final cut.
  if (url !== '') artifacts['video'] = url
  const card = typeof row['card'] === 'string' ? row['card'] : ''
  return {
    id: props.stageId,
    title: typeof row['title'] === 'string' && row['title'] !== '' ? row['title']
      : card !== '' ? card : props.stageId,
    kind: card !== '' ? card : 'video',
    service: card !== '' ? card : 'h3-timeline',
    genre: 'video',
    params,
    inputs: [],
    inputIndices: [],
    result: { artifacts, assetUrls, metadata },
    status: props.runStatus === 'done' ? 'done'
      : props.runStatus === 'failed' ? 'error'
      : props.runStatus === 'running' || props.runStatus === 'queued' ? 'running'
      : 'ready',
  } as CardStage
}

/** Upstream rows → read-only CardStages (the pickers' artifact index;
 * the wire picker's prior-stages filter — never a write channel). */
function toUpstreams(props: StageViewOwnerProps): CardStage[] {
  const upstream = props.upstream
  if (upstream === undefined || upstream.length === 0) return []
  return upstream.map((u) => ({
    id: u.id,
    title: u.title,
    kind: 'image',
    service: '',
    genre: 'image',
    params: {},
    inputs: [],
    inputIndices: [],
    // Upstream rows ARE latest outputs (produced artifacts) — 'done'
    // is the honest status, not a default.
    status: 'done',
    result: { artifacts: { [u.title]: u.url }, assetUrls: [u.url], metadata: {} },
  })) as CardStage[]
}

/** The registration (the ui-tool law): the card package registers its
 * own shipped studio's view under its card key. */
/** The built-in registration (the ui-tool law, verbatim — the
 * module namespace IS the plugin: the loader consumes name/inject/apply). */
export const name = 'h3TimelineStudio'

export const inject = ['slots']

export function apply(ctx: ClientContext): void {
ctx.slots.inject('cards.stage.view', () =>
  ctx.slots.register({ name: 'cards.stage.view', key: 'h3-timeline' }, H3TimelineStudio))
}

/** The timeline surface — registered under key 'h3-timeline'. The
 * ADAPTER: the tenant mounted verbatim, one translate layer, zero
 * paraphrase. */
export function H3TimelineStudio(props: StageViewOwnerProps): ReturnType<typeof h> {
  const stage = toCardStage(props)
  // the kit's TooltipProvider wrap died with the kit (2026-09-12):
  // the tenant's Tips are DSH Tooltips now — self-providing, no
  // app-root provider needed.
  return h('div', { 'data-testid': 'h3-studio-tenant', style: { height: '100%', minHeight: 0 } },
    h(VideoTimelineStudio, {
      stage,
      running: props.runStatus === 'running',
      onSave: props.onPatch,
      upstreams: toUpstreams(props),
    }),
  )
}
