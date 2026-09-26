/** stageView.ts — the keyed `cards.stage.view` slot's OWNER currency
 *  (the ui-tool law verbatim): everything the bench host hands a card's
 *  stage surface. This is the CONTRACT a card package's own client
 *  entry programs against — the host (the card-view plugin) and every
 *  self-registering card studio import it from here, never from the
 *  host package (a card must not depend on the bench that hosts it:
 *  adding a card never touches the host, the DSH plugin contract).
 *
 *  The view is a pure function of what the bench already knows, plus
 *  the host callbacks the drill owns. Keyed by CARD name; an unclaimed
 *  key falls back to the generic form-spec card. */
import type {
  CardGenre,
  CardInputBinding,
  CardResult,
  CardStage,
  CardStatus,
  CardTag,
} from './card.ts'

export interface StageViewOwnerProps {
  /** Bench stage identity (stable across param edits). */
  stageId: string
  /** Wire card name — the keyed dispatch value. */
  cardName: string
  /** Frozen bench row (params/inputs/outputs as the SSOT holds them).
   *  `resolved` (when present) is the estate's SERVED compose input —
   *  prepareCardParams' own stamps, what the next run will see — the
   *  1:1 run law's served truth; the studio layers it under its user
   *  state (resolveValue's base arm). */
  row: Record<string, unknown>
  /** The estate's own runStatus field ('' when never run). */
  runStatus: string
  /** Patch stage params through drafts/patch (the slot's own door). */
  onPatch: (patch: Record<string, unknown>) => void
  onWireSlot?: (
    slotKey: string,
    upstreamId: string | null,
    outputName?: string | null,
  ) => void
  /** Start the run for THIS stage (the single-stage gateway). */
  onRun: () => void
  /** THE GESTURE REGISTRATION (hour-26, the 1:1 law): a studio that
   *  must PATCH ITS DOMAIN FIRST binds its run verb here — the frame's
   *  top-bar pill calls the bound verb, never a bare onRun that would
   *  start past un-flushed domain state. */
  bindRun?: (run: () => void) => void
  /** Cancel a live run (runs/stop). */
  onStop: () => void
  /** Remove the stage from the bench. */
  onRemove: () => void
  /** Host verb: report the envelope's size class (the zoom card
   *  frame listens — 'huge' grows the card; '' = the default). */
  onSurface: (size: string) => void
  /** The other stages' LATEST OUTPUTS (the picker's candidates —
   *  the slot is the wire: picking one writes this row's param). */
  upstream: Array<{ id: string; title: string; url: string }>
  /** The draft's last started run (client memory until the estate
   *  serves draft→run; the studio polls runs/status for artifacts). */
  runId: string | null
  effective?: {
    model?: string
    params?: Record<string, unknown>
    inputSlots?: string[]
  }
  priorStageIds?: string[]
}

export interface StageViewProjectionOptions {
  kind?: string
  service?: string
  genre?: CardGenre
  result?: (row: Record<string, unknown>, result: CardResult | null) => CardResult | null
}

export interface UpstreamStageProjectionOptions {
  kind?: string
  service?: string
  genre?: CardGenre
}

function recordOf(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function nonEmptyString(value: unknown): string {
  return typeof value === 'string' && value !== '' ? value : ''
}

function stringsOf(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry !== '')
    : []
}

function statusOf(value: string): CardStatus {
  switch (value.toLowerCase()) {
    case 'done':
    case 'completed':
    case 'succeeded':
      return 'done'
    case 'failed':
    case 'error':
      return 'error'
    case 'running':
      return 'running'
    case 'queued':
      return 'queued'
    case 'stale':
      return 'stale'
    case 'cached':
      return 'cached'
    case 'skipped':
      return 'skipped'
    case 'reused':
      return 'reused'
    default:
      return 'pending'
  }
}

function galleryOf(value: unknown): CardResult['gallery'] {
  if (!Array.isArray(value)) return undefined
  const gallery = value.flatMap((entry) => {
    const row = recordOf(entry)
    const name = nonEmptyString(row['name'])
    const url = nonEmptyString(row['url'])
    return name !== '' && url !== '' ? [{ name, url }] : []
  })
  return gallery.length > 0 ? gallery : undefined
}

function previewsOf(value: unknown): CardResult['motionPreviews'] {
  if (!Array.isArray(value)) return undefined
  const previews = value.flatMap((entry) => {
    const row = recordOf(entry)
    const label = nonEmptyString(row['label'])
    const artifact = nonEmptyString(row['artifact'])
    const url = row['url'] === null || typeof row['url'] === 'string'
      ? row['url'] as string | null
      : null
    return label !== '' && artifact !== '' ? [{ label, url, artifact }] : []
  })
  return previews.length > 0 ? previews : undefined
}

export function cardResultFromRecord(value: unknown): CardResult | null {
  const result = recordOf(value)
  const artifacts: Record<string, string> = {}
  for (const [name, url] of Object.entries(recordOf(result['artifacts']))) {
    const clean = nonEmptyString(url)
    if (clean !== '') artifacts[name] = clean
  }
  const assetUrls = stringsOf(result['assetUrls'])
  const metadata = recordOf(result['metadata'])
  if (Object.keys(artifacts).length === 0 && assetUrls.length === 0) return null
  return {
    artifacts,
    assetUrls,
    metadata,
    ...(typeof result['durationSec'] === 'number' ? { durationSec: result['durationSec'] } : {}),
    ...(galleryOf(result['gallery']) === undefined ? {} : { gallery: galleryOf(result['gallery']) }),
    ...(previewsOf(result['motionPreviews']) === undefined ? {} : { motionPreviews: previewsOf(result['motionPreviews']) }),
  }
}

function inputBindingsOf(value: unknown): CardInputBinding[] {
  const bindings: CardInputBinding[] = []
  for (const [slot, raw] of Object.entries(recordOf(value))) {
    const ref = recordOf(raw)
    const stage = nonEmptyString(ref['stage'])
    if (stage !== '') {
      const output = nonEmptyString(ref['output'])
      bindings.push({
        slot,
        source: output === '' ? { stage } : { stage, output },
      })
    } else if (typeof ref['initial'] === 'string') {
      bindings.push({ slot, source: { initial: true } })
    }
  }
  return bindings
}

export function projectStageView(
  owner: StageViewOwnerProps,
  options: StageViewProjectionOptions = {},
): CardStage {
  const row = owner.row
  const resolved = recordOf(row['resolved'])
  const rowParams = recordOf(row['params'])
  const params = owner.effective?.params ?? rowParams
  const card = nonEmptyString(row['card']) || owner.cardName
  const kind = options.kind ?? (card || 'stage')
  const service = options.service ?? (nonEmptyString(row['service']) || kind)
  const model = nonEmptyString(owner.effective?.model)
    || nonEmptyString(resolved['model'])
    || nonEmptyString(row['model'])
    || nonEmptyString(params['model'])
    || service
  const inputSlots = (owner.effective?.inputSlots ?? []).filter(
    (slot): slot is string => typeof slot === 'string' && slot !== '',
  )
  const inputBindings = inputBindingsOf(row['inputs'])
  const inputs = inputBindings.flatMap((binding) =>
    'stage' in binding.source ? [binding.source.stage] : [],
  )
  const inputOutputs = inputBindings.map((binding) =>
    'stage' in binding.source ? binding.source.output ?? null : null,
  )
  const priorStageIds = owner.priorStageIds ?? owner.upstream.map((stage) => stage.id)
  const inputIndices = inputs.map((id) => priorStageIds.indexOf(id))
  const result = cardResultFromRecord(row['result'])
  const harvested = options.result === undefined ? result : options.result(row, result)
  const resultRecord = recordOf(row['result'])
  const metadata = recordOf(harvested?.metadata)
  const error = nonEmptyString(row['error'])
    || nonEmptyString(resultRecord['error'])
    || nonEmptyString(metadata['error'])
  const runId = owner.runId
    || nonEmptyString(row['runId'])
    || nonEmptyString(resultRecord['runId'])
    || nonEmptyString(resultRecord['run_id'])
    || nonEmptyString(metadata['runId'])
    || null
  const tags = Array.isArray(row['tags'])
    ? row['tags'].filter((tag): tag is CardTag => tag === 'ai_generated')
    : undefined
  return {
    id: owner.stageId,
    title: nonEmptyString(row['title']) || card || owner.stageId,
    kind,
    service,
    model,
    ...(options.genre === undefined ? {} : { genre: options.genre }),
    ...(tags === undefined ? {} : { tags }),
    params,
    ...(inputSlots.length === 0 ? {} : { inputSlots }),
    ...(inputBindings.length === 0 ? {} : { inputBindings }),
    inputs,
    ...(inputOutputs.length === 0 ? {} : { inputOutputs }),
    inputIndices,
     result: harvested,
     ...(Array.isArray(row['history']) ? { history: row['history'] as unknown[] } : {}),
     status: statusOf(owner.runStatus),
    ...(error === '' ? {} : { error }),
    runId,
    ...(typeof row['saveToAssets'] === 'boolean' ? { saveToAssets: row['saveToAssets'] } : {}),
  }
}

export function projectUpstreamStages(
  owner: Pick<StageViewOwnerProps, 'upstream'>,
  options: UpstreamStageProjectionOptions = {},
): CardStage[] {
  return owner.upstream.map((upstream) => ({
    id: upstream.id,
    title: upstream.title,
    kind: options.kind ?? 'image',
    service: options.service ?? '',
    genre: options.genre ?? 'image',
    params: {},
    inputs: [],
    inputIndices: [],
    result: {
      artifacts: upstream.title === '' ? {} : { [upstream.title]: upstream.url },
      assetUrls: upstream.url === '' ? [] : [upstream.url],
      metadata: {},
    },
    status: 'done',
  }))
}
