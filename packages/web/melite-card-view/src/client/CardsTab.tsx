/**
 * The Cards tab body — the bench's user plane (plan §5: "the user
 * browses visually in the tab").
 *
 * Bench view (`dsh-resource://cards/bench`): the stage rows GROUPED BY
 * CARD (the categories — each card's stages under its own header with
 * a count), each row opening a DSH Modal drilldown (id/card/engine/
 * params — the chat tile's drilldown pattern, primitives Modal), the
 * revision trail's head, and the Run gesture — which projects the
 * stages onto the flow_inline wire and starts them under the bench's
 * own draft_id, EXACTLY what melite_flow's bench verb does (one
 * truth, two planes; the model's plane is per-call reads, never this
 * component's frames).
 *
 * Run view (`dsh-resource://cards/run/<runId>`): live status + stage
 * rows + artifacts, riding the resource provider's frames — plus the
 * way back: "Back to bench" navigates home, and "Restore to bench"
 * turns the card BACK INTO A FLOW (drafts/get on the run's draft_id
 * + per-stage bench/add-stage as the user, CAS-chained).
 *
 * ADDRESS LAW (the `loading sidebar://cards…` hang, dead 2026-09-11):
 * the shell's navigation address is the SHELL's (guide clicks arrive
 * as the tab id's own address, not a cards address). An address that
 * does not parse as a cards address serves the BENCH — the tab never
 * sits on a resource no provider claims.
 *
 * The body is dispatched by the keyed `sidebar.right.pane.tab` seat
 * under the type's id; the address arrives through the standard
 * `useTabInfo` hook, the value through the standard `useResource`
 * hook. Local prop typings (the package's local-spelling pattern —
 * see index.ts) keep this package off sibling runtime imports.
 */
import { createElement as h, useCallback, useState } from 'react'
import { Pill, StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import { CardDrill } from './card-drill.tsx'
import { paramFields, patchStageParams } from './draft.ts'
import css from './card.module.css'
import type { CardsBenchValue, CardsRunValue, BenchStageRow } from './cards-resource.ts'
import { CARDS_BENCH_ADDRESS, parseCardsAddress, restoreRunToBench } from './cards-resource.ts'
import { mediaUrl } from './draft.ts'

/** The injected tab information hook's shape (dsh-client-ui-sidebar-right's
 *  UseSidebarRightTabInfo, spelled locally). */
interface TabInfo {
  readonly tab: {
    readonly kind: string
    readonly contentId?: string
    readonly navigation: { readonly address: string }
    readonly actions: { openResource(address: string): void }
  }
}

/** The global standard resource hook's shape (UseResource specialized to
 *  the cards protocol, local spelling). */
interface ResourceHook {
  (address: string): { status: 'none' | 'loading' | 'live' | 'failed'; value?: CardsBenchValue | CardsRunValue; failure?: { message?: string } }
}

export interface CardsTabProps {
  useTabInfo?: () => TabInfo
  useResource?: ResourceHook
}

/** The flow_inline projection — the SAME wire shape melite_flow's bench
 *  verb sends (runner-owned keys strip; ids/engines/params stay). */
function projectStage(s: BenchStageRow): Record<string, unknown> {
  const row: Record<string, unknown> = { id: s.id, engine: s.engine ?? 'comfyui' }
  if (s.params !== undefined && Object.keys(s.params).length > 0) row['params'] = s.params
  if (Array.isArray(s.inputs) && s.inputs.length > 0) row['inputs'] = s.inputs
  if (Array.isArray(s.outputs) && s.outputs.length > 0) row['outputs'] = s.outputs
  return row
}

/** Correlation id for one client-request frame (crypto.randomUUID is
 *  the browser standard). */
function nextRpcId(): string {
  const cryptoApi: Crypto | undefined = globalThis.crypto
  if (cryptoApi?.randomUUID !== undefined) return cryptoApi.randomUUID()
  return 'rpc-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36)
}

/** The Run gesture: start the bench as it stands, over the runs
 *  remote's wire door (same-origin POST /api/runs/start carrying the
 *  client-request frame — api-gateway.md; the gateway-era /v1/flows
 *  start died with the app, nothing serves it). Errors surface inline
 *  (the RemoteError branch's own refusal text — logged, never thrown
 *  past React). */
async function runTheBench(
  bench: CardsBenchValue,
  onStarted: (runId: string) => void,
): Promise<void> {
  const stages = bench.stages.map(projectStage)
  if (stages.length === 0) return
  const rpcId = nextRpcId()
  try {
    const res = await fetch('/api/runs/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'client-request',
        rpcId,
        method: 'runs/start',
        payload: { args: { doc: { flow_inline: { stages }, draft_id: bench.draftId } } },
      }),
    })
    if (!res.ok) {
      console.error('[cards] run refused: HTTP ' + String(res.status))
      return
    }
    const body: unknown = await res.json().catch(() => null)
    if (typeof body !== 'object' || body === null
        || Reflect.get(body, 'type') !== 'server-response'
        || Reflect.get(body, 'rpcId') !== rpcId) {
      console.error('[cards] run refused: malformed response frame')
      return
    }
    const result: unknown = Reflect.get(body, 'result')
    if (typeof result !== 'object' || result === null) {
      console.error('[cards] run refused: malformed result')
      return
    }
    if (Reflect.get(result, 'ok') === true) {
      const runId = Reflect.get(Reflect.get(result, 'value') as object, 'run_id')
      if (typeof runId === 'string' && runId !== '') {
        onStarted(runId)
      } else {
        console.error('[cards] run refused: no run_id in the answer')
      }
      return
    }
    const error: unknown = Reflect.get(result, 'error')
    const message = typeof error === 'object' && error !== null
      && typeof Reflect.get(error, 'message') === 'string'
      ? Reflect.get(error, 'message') : 'runs/start refused'
    console.error('[cards] run refused:', message)
  } catch (e) {
    console.error('[cards] run request failed:', e)
  }
}

/** THE CATEGORIES: bench stages grouped by card (first-appearance
 *  order — the agent's construction order survives; stages with no
 *  card gather under 'uncategorized', never dropped). */
export function groupStagesByCard(stages: BenchStageRow[]): Array<{ card: string; rows: BenchStageRow[] }> {
  const groups: Array<{ card: string; rows: BenchStageRow[] }> = []
  for (const s of stages) {
    const card = typeof s.card === 'string' && s.card !== '' ? s.card : 'uncategorized'
    const known = groups.find((g) => g.card === card)
    if (known === undefined) groups.push({ card, rows: [s] })
    else known.rows.push(s)
  }
  return groups
}

/** Bench row run-status → the installed StateDot union (FlowCards'
 *  CardRowLine law: done|warning|ongoing|error — a stage that never
 *  ran shows NO dot, never a fake state). */
const STAGE_DOT: Record<string, 'done' | 'ongoing' | 'error' | 'warning' | null> = {
  queued: 'warning', pending: 'warning', running: 'ongoing', done: 'done', failed: 'error', ready: null,
}

function StageRowView({ stage, onOpen }: { stage: BenchStageRow; onOpen: (stage: BenchStageRow) => void }): ReturnType<typeof h> {
  const title = stage.title ?? stage.card ?? stage.id
  const engine = typeof stage.engine === 'string' && stage.engine !== '' ? stage.engine : 'comfyui'
  const rawStatus = typeof stage.runStatus === 'string' ? stage.runStatus : undefined
  const dot = rawStatus !== undefined ? (STAGE_DOT[rawStatus] ?? null) : null
  // THE CARD GRAMMAR (FlowCards' CardRowLine): kind Pill, bold title,
  // engine Pill, live StateDot — a card row, never a bare text line
  // (the 2026-09-11 "[REDACTED 2026-11-05] text" regression stays dead).
  return h('li', { className: css.stage, 'data-stage-id': stage.id },
    h('button', { className: css.row, type: 'button', 'data-stage-status': rawStatus ?? 'ready', onClick: () => onOpen(stage) },
      h(Pill, null, String(stage.card ?? 'card')),
      h('span', { className: css.rowTitle }, String(title)),
      h(Pill, null, engine),
      dot !== null ? h(StateDot, { state: dot }) : null,
    ),
  )
}

/** THE SHARED DRILLDOWN (card-drill.tsx): the bench stage's second
 *  state — editable params, Run on the card. THE SHARED-STATE LAW:
 *  the patch lands in the drafts domain (the bench IS a draft doc —
 *  the same records the agent authors through the bench verbs)
 *  BEFORE the run reads it; the run gesture is the user's, never the
 *  model's. */
function StageDrill({ stage, bench, running, onRun, onClose }: {
  stage: BenchStageRow
  bench: CardsBenchValue
  running: boolean
  onRun: () => void
  onClose: () => void
}): ReturnType<typeof h> {
  const title = String(stage.title ?? stage.card ?? stage.id)
  return h(CardDrill, {
    title: 'Stage ' + title,
    fields: paramFields(typeof stage.params === 'object' && stage.params !== null ? stage.params : {}),
    thumbUrl: null,
    running,
    onRun: async (patch: Record<string, unknown> | null): Promise<void> => {
      if (patch !== null) await patchStageParams(bench.draftId, stage.id, patch)
      onRun()
    },
    onClose,
  })
}

function BenchView({ bench, onRun, running }: {
  bench: CardsBenchValue
  onRun: () => void
  running: boolean
}): ReturnType<typeof h> {
  const [open, setOpen] = useState<BenchStageRow | null>(null)
  const onOpen = useCallback((stage: BenchStageRow): void => setOpen(stage), [])
  const onClose = useCallback((): void => setOpen(null), [])
  const groups = groupStagesByCard(bench.stages)
  return h('section', { className: css.cardsBench, 'data-cards-bench': bench.rev },
    h('header', { className: css.benchHead },
      h('span', { className: css.revTag }, 'rev ' + bench.rev),
      h('button', {
        className: css.runBtn,
        type: 'button',
        disabled: running || bench.stages.length === 0,
        onClick: onRun,
      }, 'Run'),
    ),
    bench.stages.length === 0
      ? h('p', { className: css.empty }, 'The bench is empty — construct stages (the agent adds them; they land here).')
      : groups.map((g) => h('section', { key: g.card, className: css.category, 'data-cards-category': g.card },
          h('h3', { className: css.catTitle }, g.card + ' · ' + String(g.rows.length)),
          h('ol', { className: css.stages }, g.rows.map((s) => h(StageRowView, { key: s.id, stage: s, onOpen }))),
        )),
    bench.log.length > 0
      ? h('p', { className: css.logHead }, bench.log.length + ' log entr' + (bench.log.length === 1 ? 'y' : 'ies'))
      : null,
    open !== null ? h(StageDrill, { stage: open, bench, running, onRun, onClose }) : null,
  )
}

function RunView({ run, onBack, onRestored }: {
  run: CardsRunValue
  onBack: (() => void) | undefined
  onRestored: () => void
}): ReturnType<typeof h> {
  const [restoring, setRestoring] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const onRestore = useCallback((): void => {
    setRestoring(true)
    setNote(null)
    restoreRunToBench(run).then((report) => {
      const extra = report.notes.length > 0 ? ' (' + report.notes.join('; ') + ')' : ''
      const skipped = report.skipped > 0 ? ', ' + String(report.skipped) + ' skipped' : ''
      setNote('restored ' + String(report.added) + ' stage(s) to the bench' + skipped + extra)
      setRestoring(false)
      onRestored()
    }).catch((e: unknown) => {
      setNote(e instanceof Error ? e.message : String(e))
      setRestoring(false)
    })
  }, [run, onRestored])
  return h('section', { className: css.runView, 'data-run-status': run.status },
    h('header', { className: css.runHead },
      h('span', { className: css.runId }, run.runId),
      h('span', { className: css.runStatus }, run.status),
    ),
    h('div', { className: css.runActions },
      onBack !== undefined
        ? h('button', { className: css.back, type: 'button', onClick: onBack }, 'Back to bench')
        : null,
      h('button', {
        className: css.restore,
        type: 'button',
        disabled: restoring || run.draftId === null,
        title: run.draftId === null ? 'this run names no draft — nothing to restore' : 'copy this run\u2019s stages back onto the bench as your own',
        onClick: onRestore,
      }, restoring ? 'Restoring…' : 'Restore to bench'),
    ),
    note !== null ? h('p', { className: css.restoreNote }, note) : null,
    run.stages.length === 0
      ? h('p', { className: css.empty }, 'No stage rows yet.')
      : h('ol', { className: css.stages }, run.stages.map((s) =>
          h('li', { key: s.id, className: css.stage, 'data-stage-status': s.status },
            h('span', { className: css.stageTitle }, s.id),
            h('span', { className: css.stageEngine }, s.status),
            s.url !== undefined
              ? h('a', { href: mediaUrl(run.runId, s.url), target: '_blank', rel: 'noreferrer', className: css.stageArtifact }, 'artifact')
              : null,
          ))),
  )
}

/** ADDRESS LAW (the `loading sidebar://cards…` hang, dead 2026-09-11):
 *  the shell's navigation address is the SHELL's (guide clicks arrive
 *  as the tab id's own address, not a cards address). An address that
 *  does not parse as a cards address serves the BENCH — the tab never
 *  sits on a resource no provider claims. */
export function resolveCardsAddress(rawAddress: string): string {
  return parseCardsAddress(rawAddress) !== null ? rawAddress : CARDS_BENCH_ADDRESS
}

/** The tab body component. */
export function CardsTab(props: CardsTabProps): ReturnType<typeof h> {
  const info = typeof props.useTabInfo === 'function' ? props.useTabInfo() : undefined
  const rawAddress = info?.tab.navigation.address ?? info?.tab.contentId ?? CARDS_BENCH_ADDRESS
  const address = resolveCardsAddress(rawAddress)
  const openResource = info?.tab.actions.openResource
  const snapshot = typeof props.useResource === 'function' ? props.useResource(address) : undefined
  const [running, setRunning] = useState(false)

  const onStarted = useCallback((runId: string): void => {
    setRunning(false)
    if (openResource !== undefined) openResource('dsh-resource://cards/run/' + encodeURIComponent(runId))
  }, [openResource])

  const onRun = useCallback((): void => {
    if (snapshot?.value?.kind !== 'bench') return
    setRunning(true)
    void runTheBench(snapshot.value, onStarted)
  }, [snapshot, onStarted])

  const onBack = useCallback((): void => {
    if (openResource !== undefined) openResource(CARDS_BENCH_ADDRESS)
  }, [openResource])

  if (snapshot === undefined) {
    return h('p', { className: css.missing }, 'cards resource hook unavailable')
  }
  if (snapshot.status === 'loading' || snapshot.status === 'none') {
    return h('p', { className: css.loading }, 'loading ' + address + '…')
  }
  if (snapshot.status === 'failed') {
    return h('p', { className: css.failed }, snapshot.failure?.message ?? 'cards resource failed')
  }
  const value = snapshot.value
  if (value === undefined) {
    return h('p', { className: css.failed }, 'cards resource gave no value')
  }
  return value.kind === 'bench'
    ? h(BenchView, { bench: value, onRun, running })
    : h(RunView, { run: value, onBack: openResource !== undefined ? onBack : undefined, onRestored: onBack })
}
