/**
 * anny client entry — the card package's OWN cards.stage.view surface
 * (the composition-root correction's law, 2026-09-12; anny's mount
 * lands 2026-09-13, hour 14 — the sixth studio card: the whole tenant
 * tree existed translated onto native seams, but no boot row, no
 * client face, no dsh.client block ever shipped, so the live GUI
 * fell back to the generic spec form while AnnyStudio sat dead).
 *
 * THE MOUNT LAW (verbatim, the mask-studio face): a UI-bearing
 * package ships BOTH faces — node half source-loaded, browser half
 * lib/client.js through the dsh.client declaration + ./client export.
 * This module is the ADAPTER that mounts the tenant — never a second
 * definition site: props translate onto the tenant contract
 * {stage, onSave, upstreams, onWireSlot, placeholderAssets?}; the
 * document rides stage.params; writes ride onSave → onPatch; the run
 * rides the host drill's own Run row.
 */
import { createElement as h } from 'react'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: the service seats this entry touches ride cordis Context
// declaration-merging from each owning package's ./client entry — the
// renderer owns ctx.slots. (The card-view client's own law, verbatim.)
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { CardResult, CardStage, StageViewOwnerProps } from '@melite/contracts'
// Type-only: the 'cards.stage.view' seam declaration (card-base owns
// the card-UI seams). Erased — the bundle stays pure.
import type {} from '@melite/card-base/slots'
import { AnnyStudio } from '../ui/studio/component.tsx'

/** The bench row → the tenant's CardStage. id/title/kind ride
 * verbatim; service names the card ('anny' — the family's join key);
 * params IS the document; result's artifact name→url map feeds the
 * mannequin/turnaround reads (the harvest shape, verbatim from the
 * mask face: artifacts first, assetUrls the ray-parity second). */
function toCardStage(props: StageViewOwnerProps): CardStage {
  const row = props.row
  const params = typeof row['params'] === 'object' && row['params'] !== null
    ? row['params'] as Record<string, unknown> : {}
  const result = typeof row['result'] === 'object' && row['result'] !== null
    ? row['result'] as Record<string, unknown> : {}
  const artifacts: Record<string, string> = {}
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
    kind: card !== '' ? card : 'anny',
    service: card !== '' ? card : 'anny',
    genre: '3d',
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

/** Upstream rows → read-only CardStages (the host's picker restricts to
 * indices BEFORE this card — never a write channel; picking one writes
 * this row's param, the slot IS the wire). */
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
    // Upstream rows ARE latest outputs — 'done' is the honest status.
    status: 'done',
    result: { artifacts: { [u.title]: u.url }, assetUrls: [u.url], metadata: {} },
  })) as CardStage[]
}

/** The anny surface — registered under key 'anny'. The ADAPTER: the
 * tenant mounted verbatim, one translate layer, zero paraphrase.
 * onWireSlot stays OMITTED (the host has no wire door — the upstream
 * picker IS the wire, per the owner contract; omitting hides the
 * tenant's wire affordance, the mask face's own law). The run rides
 * the host drill's Run row (onRun is not in the anny tenant
 * contract — turnaround runs from the rail's own verbs). */
export function AnnyStageView(props: StageViewOwnerProps): ReturnType<typeof h> {
  const stage = toCardStage(props)
  const upstreams = toUpstreams(props)
  return h(AnnyStudio, {
    stage,
    onSave: (params: Record<string, unknown>): void => { props.onPatch(params) },
    upstreams,
  })
}

/** The built-in registration (the ui-tool law, verbatim — the module
 * namespace IS the plugin: the loader consumes name/inject/apply). */
export const name = 'annyStudio'

export const inject = ['slots']

export function apply(ctx: ClientContext): void {
  ctx.slots.inject('cards.stage.view', () =>
    ctx.slots.register({ name: 'cards.stage.view', key: 'anny' }, AnnyStageView))
}
