/**
 * motion client entry — the card package's OWN cards.stage.view
 * surface (the composition-root correction's law, closed 2026-09-12
 * for motion per the DSH extension examples: a UI-bearing package
 * ships BOTH faces — the node half stays source-loaded, the browser
 * half rides lib/client.js through the dsh.client declaration +
 * ./client export; the loader materializes it from the module
 * table). The studio was DEAD on the lane before this face existed
 * (component.tsx exported, nothing imported it).
 *
 * THE MOUNT LAW (the studio removal, 2026-08-19: a card is a SEAM
 * and whatever renders its authoring surface is INJECTED): the
 * motion card's authoring surface is this package's own studio —
 * src/ui/studio/component.tsx (MotionCardEditor, the pose-authoring
 * tenant). This module is the ADAPTER that mounts it on the bench
 * slot — never a second definition site: props translate onto the
 * tenant contract {stage, onSave, upstreams?}; the document rides
 * stage.params; writes ride onSave → onPatch (patchStageParams'
 * partial merge); the run rides the host drill's own Run row.
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
import type { CardResult, CardStage, StageViewOwnerProps } from '@melite/contracts'
import { MotionCardEditor } from '../ui/studio/component.tsx'

/** The bench row → the tenant's CardStage. id/title/kind ride
 * verbatim; service names the card ('motion' — the family's join
 * key); params IS the document; result's artifact name→url map feeds
 * the NPZ resolver + the preview body's asset reads. */
function toCardStage(props: StageViewOwnerProps): CardStage {
  const row = props.row
  const params = typeof row['params'] === 'object' && row['params'] !== null
    ? row['params'] as Record<string, unknown> : {}
  const result = typeof row['result'] === 'object' && row['result'] !== null
    ? row['result'] as Record<string, unknown> : {}
  const artifacts: Record<string, string> = {}
  // THE HARVEST SHAPE (the observer's carry, 2026-09-12): the name→url
  // map is the primary source; the flat assetUrls list is the
  // second (the motion_npz key rides the map; the .npz
  // suffix scan rides the list).
  const arts = typeof result['artifacts'] === 'object' && result['artifacts'] !== null
    ? result['artifacts'] as Record<string, unknown> : {}
  for (const [name, val] of Object.entries(arts)) {
    if (typeof val === 'string' && val !== '') artifacts[name] = val
  }
  const assetUrls = Array.isArray(result['assetUrls'])
    ? result['assetUrls'].filter((u): u is string => typeof u === 'string') : []
  const metadata = typeof result['metadata'] === 'object' && result['metadata'] !== null
    ? result['metadata'] as Record<string, unknown> : {}
  const card = typeof row['card'] === 'string' ? row['card'] : ''
  const title = typeof row['title'] === 'string' && row['title'] !== '' ? row['title']
    : card !== '' ? card : props.stageId
  const runStatus = typeof row['runStatus'] === 'string' ? row['runStatus'] : ''
  const cardResult: CardResult | null = (Object.keys(artifacts).length > 0 || assetUrls.length > 0)
    ? { artifacts, assetUrls, metadata } : null
  return {
    id: props.stageId,
    title,
    kind: card !== '' ? card : 'motion',
    service: card !== '' ? card : 'motion',
    genre: 'motion',
    params,
    inputs: [],
    inputIndices: [],
    result: cardResult,
    status: runStatus === 'done' ? 'done'
      : runStatus === 'failed' ? 'error'
      : runStatus === 'running' || runStatus === 'queued' ? 'running'
      : 'ready',
  } as CardStage
}

/** Upstream rows → read-only CardStages (the preview body's wire
 * picker restricts to indices BEFORE this card — never a write
 * channel). */
function toUpstreams(props: StageViewOwnerProps): CardStage[] {
  const upstream = props.upstream
  if (upstream === undefined || upstream.length === 0) return []
  return upstream.map((u) => ({
    id: u.id,
    title: u.title,
    kind: 'image',
    service: u.title,
    params: {},
    inputs: [],
    inputIndices: [],
    // Upstream rows ARE latest outputs (produced artifacts) — 'done'
    // is the honest status, not a default.
    status: 'done',
    result: { artifacts: { [u.title]: u.url }, assetUrls: [u.url], metadata: {} },
  })) as CardStage[]
}

/** The built-in registration (the ui-tool law, verbatim — the module
 * namespace IS the plugin: the loader consumes name/inject/apply). */
export const name = 'motionStudio'

export const inject = ['slots']

export function apply(ctx: ClientContext): void {
  ctx.slots.inject('cards.stage.view', () =>
    ctx.slots.register({ name: 'cards.stage.view', key: 'motion' }, MotionStudio))
}

/** The motion surface — registered under key 'motion'. The ADAPTER:
 * the tenant mounted verbatim, one translate layer, zero paraphrase.
 * onWireSlot stays OMITTED (the tenant's own contract: omitting
 * hides the wire affordance — the bench slot has no wire door). */
export function MotionStudio(props: StageViewOwnerProps): ReturnType<typeof h> {
  const stage = toCardStage(props)
  const upstreams = toUpstreams(props)
  return h(MotionCardEditor, {
    stage,
    onSave: (params: Record<string, unknown>): void => { props.onPatch(params) },
    upstreams,
  })
}
