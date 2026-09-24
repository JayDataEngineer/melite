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
import { defineStageViewRegistration } from '@melite/card-base/slots'
import {
  cardResultFromRecord,
  projectStageView,
  projectUpstreamStages,
  type CardResult,
  type StageViewOwnerProps,
} from '@melite/contracts'
import { VideoTimelineStudio } from '../ui/studio/component.tsx'

function harvestResult(
  row: Record<string, unknown>,
  base: CardResult | null,
): CardResult {
  const result = typeof row['result'] === 'object' && row['result'] !== null && !Array.isArray(row['result'])
    ? row['result'] as Record<string, unknown> : {}
  const artifacts = { ...(base?.artifacts ?? {}) }
  const gallery = Array.isArray(result['gallery']) ? result['gallery'] : []
  for (const entry of gallery) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) continue
    const item = entry as Record<string, unknown>
    const name = typeof item['name'] === 'string' ? item['name'] : ''
    const url = typeof item['url'] === 'string' ? item['url'] : ''
    if (name !== '' && url !== '') artifacts[name] = url
  }
  const primary = base?.assetUrls[0] ?? ''
  if (artifacts['video'] === undefined && primary !== '') artifacts['video'] = primary
  const url = typeof result['url'] === 'string' ? result['url'] : ''
  if (url !== '') artifacts['video'] = url
  const rawMetadata = result['metadata']
  const metadata = typeof rawMetadata === 'object' && rawMetadata !== null && !Array.isArray(rawMetadata)
    ? rawMetadata as Record<string, unknown> : base?.metadata ?? {}
  return {
    assetUrls: base?.assetUrls ?? [],
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
