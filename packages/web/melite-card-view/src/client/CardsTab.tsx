/**
 * The Cards tab body — the bench's user plane (plan §5: "the user
 * browses visually in the tab").
 *
 * Bench view (`dsh-resource://cards/bench`): the stage rows with their
 * presentation extras (title/card), the revision trail's head, and the
 * Run gesture — which projects the stages onto the flow_inline wire
 * and starts them under the bench's own draft_id, EXACTLY what
 * melite_flow's bench verb does (one truth, two planes; the model's
 * plane is per-call reads, never this component's frames).
 *
 * Run view (`dsh-resource://cards/run/<runId>`): live status + stage
 * rows + artifacts, riding the resource provider's frames.
 *
 * The body is dispatched by the keyed `sidebar.right.pane.tab` seat
 * under the type's id; the address arrives through the standard
 * `useTabInfo` hook, the value through the standard `useResource`
 * hook. Local prop typings (the package's local-spelling pattern —
 * see index.ts) keep this package off sibling runtime imports.
 */
import { createElement as h, useCallback, useState } from 'react'
import type { CardsBenchValue, CardsRunValue, BenchStageRow } from './cards-resource.ts'

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

/** The Run gesture: start the bench as it stands. Errors surface inline
 *  (the door's own refusal text — logged, never thrown past React). */
async function runTheBench(
  bench: CardsBenchValue,
  onStarted: (runId: string) => void,
): Promise<void> {
  const stages = bench.stages.map(projectStage)
  if (stages.length === 0) return
  try {
    const res = await fetch('/v1/flows/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ flow_inline: { stages }, draft_id: bench.draftId }),
    })
    const doc: unknown = await res.json().catch(() => null)
    const runId = (doc as Record<string, unknown> | null)?.['run_id']
    if (res.ok && typeof runId === 'string' && runId !== '') {
      onStarted(runId)
    } else {
      const err = (doc as Record<string, unknown> | null)?.['error']
      console.error('[cards] run refused:', typeof err === 'string' ? err : 'HTTP ' + res.status)
    }
  } catch (e) {
    console.error('[cards] run request failed:', e)
  }
}

function StageRowView({ stage }: { stage: BenchStageRow }): ReturnType<typeof h> {
  const title = stage.title ?? stage.card ?? stage.id
  const engine = typeof stage.engine === 'string' && stage.engine !== '' ? stage.engine : 'comfyui'
  return h('li', { className: 'cards-stage', 'data-stage-id': stage.id },
    h('span', { className: 'cards-stage-title' }, String(title)),
    h('span', { className: 'cards-stage-engine' }, engine),
  )
}

function BenchView({ bench, onRun, running }: { bench: CardsBenchValue; onRun: () => void; running: boolean }): ReturnType<typeof h> {
  return h('section', { className: 'cards-bench', 'data-cards-bench': bench.rev },
    h('header', { className: 'cards-bench-head' },
      h('span', { className: 'cards-bench-rev' }, 'rev ' + bench.rev),
      h('button', {
        className: 'cards-run',
        type: 'button',
        disabled: running || bench.stages.length === 0,
        onClick: onRun,
      }, 'Run'),
    ),
    bench.stages.length === 0
      ? h('p', { className: 'cards-empty' }, 'The bench is empty — construct stages (the agent adds them; they land here).')
      : h('ol', { className: 'cards-stages' }, bench.stages.map((s) => h(StageRowView, { key: s.id, stage: s }))),
    bench.log.length > 0
      ? h('p', { className: 'cards-log-head' }, bench.log.length + ' log entr' + (bench.log.length === 1 ? 'y' : 'ies'))
      : null,
  )
}

function RunView({ run }: { run: CardsRunValue }): ReturnType<typeof h> {
  return h('section', { className: 'cards-run-view', 'data-run-status': run.status },
    h('header', { className: 'cards-run-head' },
      h('span', { className: 'cards-run-id' }, run.runId),
      h('span', { className: 'cards-run-status' }, run.status),
    ),
    run.stages.length === 0
      ? h('p', { className: 'cards-empty' }, 'No stage rows yet.')
      : h('ol', { className: 'cards-stages' }, run.stages.map((s) =>
          h('li', { key: s.id, className: 'cards-stage', 'data-stage-status': s.status },
            h('span', { className: 'cards-stage-title' }, s.id),
            h('span', { className: 'cards-stage-engine' }, s.status),
            s.url !== undefined
              ? h('a', { href: s.url, target: '_blank', rel: 'noreferrer', className: 'cards-stage-artifact' }, 'artifact')
              : null,
          ))),
  )
}

/** The tab body component. */
export function CardsTab(props: CardsTabProps): ReturnType<typeof h> {
  const info = typeof props.useTabInfo === 'function' ? props.useTabInfo() : undefined
  const address = info?.tab.navigation.address ?? info?.tab.contentId ?? 'dsh-resource://cards/bench'
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

  if (snapshot === undefined) {
    return h('p', { className: 'cards-missing' }, 'cards resource hook unavailable')
  }
  if (snapshot.status === 'loading' || snapshot.status === 'none') {
    return h('p', { className: 'cards-loading' }, 'loading ' + address + '…')
  }
  if (snapshot.status === 'failed') {
    return h('p', { className: 'cards-failed' }, snapshot.failure?.message ?? 'cards resource failed')
  }
  const value = snapshot.value
  if (value === undefined) {
    return h('p', { className: 'cards-failed' }, 'cards resource gave no value')
  }
  return value.kind === 'bench'
    ? h(BenchView, { bench: value, onRun, running })
    : h(RunView, { run: value })
}
