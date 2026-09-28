/**
 * assets-tab — the ONE DSH right-sidebar tab that is NOT cards:
 *
 *   ComfyUI Manager — a direct GUI on the estate's management plane.
 *     Every button is ONE action of the manage-plane SSOT
 *     (@melite/estate-queue's managePlane.ts — Cordis provisioning +
 *     ComfyUI-Manager), reached over the `manage` Typert
 *     remote: a same-origin POST /api/manage/act carrying the
 *     client-request wire frame (the documented frame pair,
 *     api-gateway.md — the sanctioned caller shape for plugins outside
 *     the DSH web kernel; the host mounts the remote in the estate
 *     composition). The vocabulary mirrors the comfy_manage agent tool
 *     1:1. Progressive
 *     disclosure: status is the cheap index and refreshes SILENTLY
 *     after every mutating action (never through the result pane —
 *     that pane belongs to the user's last explicit dispatch);
 *     discovery (installed packs, snapshots) renders as ROWS in place.
 *     INFERENCE LAW honored by construction — no action here
 *     runs inference, and lifecycle actions are refused SERVER-side
 *     while any run reads running/queued (the guard lives in the SSOT,
 *     never in this panel).
 *
 * Transport history (kill ledger): the tab's calls died with the
 * gateway app (this plugin's /v1/manage proxy, then a ctx.remote.lane
 * shape that never mounted client-side — "remote.lane is not a
 * function", 2026-09-10). The wire frame below is the DSH-native
 * replacement: no proxy, no gateway vocabulary, one fetch.
 *
 * Siblings' fate (NO LEGACY): Ray Media deleted with the media plugin
 * (5cbb5bcc — DSH's own media system owns that surface); Ray Flows
 * retired with the yaml spec library (35f2f830).
 */
import * as React from 'react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import css from './assets.module.css'

interface ManageReply {
  action?: string
  ok?: boolean
  detail?: string
  data?: unknown
  code?: string
  status?: number
  state?: string
  next_action?: string
  operation_id?: string
  misses?: string[]
  partial?: boolean
  restart_required?: boolean
}

interface ManagerQueueView {
  is_processing?: boolean
  in_progress_count?: number
  total_count?: number
  done_count?: number
}

interface ManagerView {
  reachable?: boolean
  reason?: string
  version?: unknown
  queue?: unknown
  security?: string
  unit?: string
  operations?: unknown[]
}

interface StatusView {
  state?: string
  next_action?: string
  endpoint?: {
    reachable?: boolean
    url?: string
    reason?: string
    comfyui_version?: unknown
    devices?: Array<{ name?: string; vram_total?: number; vram_free?: number }>
  }
  manager?: ManagerView
  active_runs?: string[]
  routing?: Record<string, unknown>
  resources?: ResourceView[]
  resources_detail?: string
  operations?: unknown[]
  model_options?: ModelOption[]
  model_options_detail?: string
  comfyui_versions?: VersionOption[]
  comfyui_versions_detail?: string
}

interface ResourceItemView {
  key?: string
  kind?: string
  state?: string
  outcome?: string
  integrity?: string
  errorCode?: string
  detail?: string
  path?: string
  sha256?: string
}

interface ResourceView {
  ref?: { kind?: string; owner?: string; id?: string; variant?: string; quant?: string }
  state?: string
  detail?: string
  operation_id?: string
  items?: ResourceItemView[]
}

interface ModelQuantOption {
  id: string
  label: string
  description?: string
}

interface ModelVariantOption {
  id: string
  label: string
  description?: string
  quants: ModelQuantOption[]
}

interface ModelOption {
  id: string
  label: string
  description?: string
  genre?: string
  variants: ModelVariantOption[]
}

interface VersionOption {
  id: string
  label: string
  version?: string
  tag?: string
  commit?: string
}

interface ProvisionReplyData {
  state: string
  operation_id?: string
  restart_required?: boolean
  partial?: boolean
  next_action?: string
  requested?: string[]
  succeeded?: string[]
  missed?: string[]
  misses?: string[]
  queued?: string[]
  items: Array<Record<string, unknown>>
  errors?: Array<{ file?: string; error?: string }>
}

interface ResultRecord {
  id: number
  reply: ManageReply
  receivedAt: number
}

type HealthKind = 'loading' | 'stale' | 'reachable' | 'manager-failure' | 'engine-failure' | 'status-failure'

const STATUS_STALE_MS = 30_000
const MUTATING: ReadonlySet<string> = new Set([
  'endpoint_set', 'install_extension', 'install_extension_url',
  'download_model', 'provision_model',
  'launch', 'restart', 'stop', 'update', 'switch_version', 'free',
  'snapshot_save', 'snapshot_restore',
])

const ACTION_LABELS: Readonly<Record<string, string>> = {
  status: 'Refresh status',
  endpoint_set: 'Set endpoint',
  list_extensions: 'Review installed packs',
  install_extension: 'Install declared packs',
  install_extension_url: 'Open raw-URL pack install',
  search_models: 'Search models',
  provision_model: 'Provision declared model',
  download_model: 'Open raw-URL model download',
  // THE LORA DOORS (2026-09-26): the sidebar's own vocabulary now
  // carries the custom-LoRA block.
  lora_list: 'List LoRAs the engine accepts',
  lora_install: 'Copy a LoRA in',
  snapshot_list: 'Review snapshots',
  snapshot_save: 'Save snapshot',
  snapshot_restore: 'Restore snapshot',
  launch: 'Launch ComfyUI',
  restart: 'Restart ComfyUI',
  stop: 'Stop ComfyUI',
  free: 'Free VRAM',
  update: 'Update ComfyUI',
  switch_version: 'Switch ComfyUI version',
}

function recordOf(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function stringOr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function modelCatalog(value: unknown): ModelOption[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((row) => {
    const record = recordOf(row)
    if (record === null || typeof record['id'] !== 'string' || record['id'] === '') return []
    const variants = Array.isArray(record['variants']) ? record['variants'].flatMap((variantRow) => {
      const variant = recordOf(variantRow)
      if (variant === null || typeof variant['id'] !== 'string' || variant['id'] === '') return []
      const quants = Array.isArray(variant['quants']) ? variant['quants'].flatMap((quantRow) => {
        const quant = recordOf(quantRow)
        if (quant === null || typeof quant['id'] !== 'string' || quant['id'] === '') return []
        return [{
          id: quant['id'],
          label: stringOr(quant['label'], quant['id']),
          ...(typeof quant['description'] === 'string' ? { description: quant['description'] } : {}),
        }]
      }) : []
      return [{
        id: variant['id'],
        label: stringOr(variant['label'], variant['id']),
        ...(typeof variant['description'] === 'string' ? { description: variant['description'] } : {}),
        quants,
      }]
    }) : []
    return [{
      id: record['id'],
      label: stringOr(record['label'], record['id']),
      ...(typeof record['description'] === 'string' ? { description: record['description'] } : {}),
      ...(typeof record['genre'] === 'string' ? { genre: record['genre'] } : {}),
      variants,
    }]
  })
}

function versionCatalog(value: unknown): VersionOption[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((row) => {
    if (typeof row === 'string' || typeof row === 'number') {
      const id = String(row)
      return id === '' ? [] : [{ id, label: id }]
    }
    const record = recordOf(row)
    if (record === null) return []
    const version = typeof record['version'] === 'string' ? record['version'] : undefined
    const tag = typeof record['tag'] === 'string' ? record['tag'] : undefined
    const commit = typeof record['commit'] === 'string' ? record['commit'] : undefined
    const id = version ?? tag ?? commit ?? stringOr(record['id'])
    if (id === '') return []
    return [{
      id,
      label: version !== undefined && tag !== undefined && version !== tag ? version + ' — ' + tag : version ?? tag ?? commit ?? id,
      ...(version === undefined ? {} : { version }),
      ...(tag === undefined ? {} : { tag }),
      ...(commit === undefined ? {} : { commit }),
    }]
  })
}

function numberOr(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function replyFields(envelope: Record<string, unknown>, data: unknown): Partial<ManageReply> {
  const nested = recordOf(data)
  const fields: Partial<ManageReply> = {}
  const text = (key: 'code' | 'state' | 'next_action' | 'operation_id'): void => {
    const value = typeof envelope[key] === 'string' ? envelope[key] : nested?.[key]
    if (typeof value === 'string') fields[key] = value
  }
  text('code')
  text('state')
  text('next_action')
  text('operation_id')
  const status = numberOr(envelope['status']) ?? numberOr(nested?.['status'])
  if (status !== undefined) fields.status = status
  const partial = typeof envelope['partial'] === 'boolean' ? envelope['partial'] : nested?.['partial']
  if (typeof partial === 'boolean') fields.partial = partial
  const restart = typeof envelope['restart_required'] === 'boolean' ? envelope['restart_required'] : nested?.['restart_required']
  if (typeof restart === 'boolean') fields.restart_required = restart
  const misses = Array.isArray(envelope['misses']) ? envelope['misses'] : nested?.['misses']
  if (Array.isArray(misses)) fields.misses = misses.filter((item): item is string => typeof item === 'string')
  return fields
}

function nextRpcId(): string {
  const cryptoApi: Crypto | undefined = globalThis.crypto
  if (cryptoApi?.randomUUID !== undefined) return cryptoApi.randomUUID()
  return 'rpc-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36)
}

// THE LORA BLOCK (the operator's 2026-09-26 order: custom LoRAs belong
// in the ComfyUI Manager sidebar). The block is its own module and
// speaks the manage plane's own two doors (`lora_list`, `lora_install`).
import LoraBlock from './lora-section.tsx'

export async function postManage(action: string, payload: Record<string, unknown>, signal?: AbortSignal): Promise<ManageReply> {
  const rpcId = nextRpcId()
  try {
    const response = await fetch('/api/manage/act', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'client-request',
        rpcId,
        method: 'manage/act',
        payload: { args: { doc: { action, ...payload } } },
      }),
      ...(signal === undefined ? {} : { signal }),
    })
    if (!response.ok) {
      return {
        action,
        ok: false,
        code: 'manage/http',
        status: response.status,
        detail: 'manage wire: HTTP ' + String(response.status),
      }
    }
    const body: unknown = await response.json()
    if (typeof body !== 'object' || body === null || Reflect.get(body, 'type') !== 'server-response' || Reflect.get(body, 'rpcId') !== rpcId) {
      return { action, ok: false, code: 'manage/wire', detail: 'manage wire: malformed response frame' }
    }
    const result: unknown = Reflect.get(body, 'result')
    if (typeof result !== 'object' || result === null) {
      return { action, ok: false, code: 'manage/wire', detail: 'manage wire: malformed result' }
    }
    if (Reflect.get(result, 'ok') === true) {
      const value: unknown = Reflect.get(result, 'value')
      const envelope = recordOf(value)
      if (envelope === null) {
        return { action, ok: false, code: 'manage/wire', detail: 'manage wire: malformed envelope' }
      }
      const data = envelope['data']
      return {
        action: stringOr(envelope['action'], action),
        ok: envelope['ok'] === true,
        detail: stringOr(envelope['detail']),
        data,
        ...replyFields(envelope, data),
      }
    }
    const error: unknown = Reflect.get(result, 'error')
    const errorRecord = recordOf(error)
    if (errorRecord === null) {
      return { action, ok: false, code: 'manage/wire', detail: 'manage wire: refused without an error frame' }
    }
    const details = recordOf(errorRecord['details']) ?? {}
    const data = details['data']
    return {
      action: stringOr(details['action'], action),
      ok: false,
      detail: stringOr(errorRecord['message'], 'manage wire: refused'),
      data,
      ...replyFields(details, data),
      code: stringOr(details['code'], stringOr(errorRecord['code'], 'manage/refused')),
    }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw e
    return {
      action,
      ok: false,
      code: 'manage/transport',
      detail: e instanceof Error ? e.message : String(e),
    }
  }
}

function gb(bytes: unknown): string {
  return typeof bytes === 'number' && bytes > 0 ? (bytes / 2 ** 30).toFixed(1) : '?'
}

function displayValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value === null) return 'null'
  if (value === undefined) return ''
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

function managerVersion(value: unknown): string {
  const record = recordOf(value)
  if (record !== null) {
    for (const key of ['version', 'v', 'tag', 'commit']) {
      if (typeof record[key] === 'string' && record[key] !== '') return record[key]
    }
  }
  return displayValue(value)
}

function queueSummary(value: unknown): string {
  const queue = recordOf(value) as ManagerQueueView | null
  if (queue === null) return displayValue(value)
  const active = numberOr(queue.in_progress_count) ?? 0
  const total = numberOr(queue.total_count) ?? 0
  const done = numberOr(queue.done_count) ?? 0
  return (queue.is_processing === true ? 'working' : 'idle') + ' · ' + String(active) + ' active · ' + String(done) + '/' + String(total) + ' complete'
}

function statusView(data: unknown): StatusView | null {
  return recordOf(data) as StatusView | null
}

function provisionData(data: unknown): ProvisionReplyData | null {
  const value = recordOf(data)
  if (value === null || typeof value['state'] !== 'string' || !Array.isArray(value['items'])) return null
  return value as unknown as ProvisionReplyData
}

function resultContract(reply: ManageReply): {
  state: string
  operationId: string
  partial: boolean
  restartRequired: boolean
  nextAction: string
  code: string
  status?: number
} {
  const data = recordOf(reply.data) ?? {}
  const state = reply.state ?? stringOr(data['state'])
  return {
    state,
    operationId: reply.operation_id ?? stringOr(data['operation_id']),
    partial: state === 'partial' || (reply.partial ?? (typeof data['partial'] === 'boolean' ? data['partial'] : false)),
    restartRequired: state === 'restart_required' || (reply.restart_required ?? (typeof data['restart_required'] === 'boolean' ? data['restart_required'] : false)),
    nextAction: reply.next_action ?? stringOr(data['next_action']),
    code: reply.code ?? stringOr(data['code']),
    status: reply.status,
  }
}

function inferredNextAction(reply: ManageReply): string {
  const contract = resultContract(reply)
  if (contract.nextAction !== '') return contract.nextAction
  if (reply.action === 'list_extensions') return 'install_extension'
  if (reply.action === 'snapshot_list') return 'snapshot_save'
  if (contract.restartRequired) return 'restart'
  return ''
}

function freshness(at: number, now: number): string {
  const age = Math.max(0, now - at)
  if (age >= STATUS_STALE_MS) return 'stale'
  if (age < 5_000) return 'fresh'
  return String(Math.floor(age / 1_000)) + 's old'
}

function receivedLabel(at: number): string {
  return new Date(at).toISOString().slice(11, 19) + ' UTC'
}

function healthKind(status: StatusView | null, receivedAt: number | null, loading: boolean, error: string, now: number): HealthKind {
  if (status === null) return error === '' ? 'loading' : 'status-failure'
  if (loading || error !== '' || receivedAt === null || now - receivedAt >= STATUS_STALE_MS) return 'stale'
  if (status.endpoint?.reachable !== true) return 'engine-failure'
  if (status.manager?.reachable !== true) return 'manager-failure'
  return 'reachable'
}

function healthLabel(kind: HealthKind): string {
  if (kind === 'loading') return 'Loading status'
  if (kind === 'stale') return 'Stale status'
  if (kind === 'reachable') return 'Engine + manager reachable'
  if (kind === 'manager-failure') return 'Manager failure'
  if (kind === 'engine-failure') return 'Engine failure'
  return 'Status unavailable'
}

function healthDotClass(kind: HealthKind): string {
  if (kind === 'reachable') return css.dotOk
  if (kind === 'loading' || kind === 'stale') return css.dotWarn
  return css.dotBad
}

function resourceLabel(resource: ResourceView): string {
  const ref = resource.ref
  if (ref === undefined) return 'resource'
  const kind = ref.kind === 'extension' ? 'extension' : 'model'
  const owner = ref.owner === undefined ? '' : ref.owner + '/'
  const variant = ref.variant === undefined ? '' : ':' + ref.variant
  const quant = ref.quant === undefined ? '' : ':' + ref.quant
  return kind + ' ' + owner + (ref.id ?? '?') + variant + quant
}

function resourceStateClass(state: string): string {
  if (state === 'active' || state === 'ready') return css.stateOk
  if (state === 'failed' || state === 'blocked' || state === 'absent' || state === 'missing') return css.stateBad
  if (state === 'partial' || state === 'restart_required' || state === 'installed' || state === 'pending') return css.stateWarn
  return css.stateNeutral
}

function rowLine(row: unknown): string {
  if (typeof row === 'string') return row
  const value = recordOf(row)
  if (value !== null) {
    const name = typeof value['name'] === 'string' ? value['name'] : undefined
    const version = typeof value['version'] === 'string' ? value['version'] : undefined
    if (name !== undefined && version !== undefined) return name + ' — ' + version
    if (name !== undefined) {
      const traits = [value['type'], value['base']].filter((item): item is string => typeof item === 'string' && item !== '')
      const file = typeof value['filename'] === 'string' ? value['filename'] : undefined
      const head = traits.length > 0 ? name + ' (' + traits.join(', ') + ')' : name
      return file === undefined ? head : head + ' — ' + file
    }
  }
  return displayValue(row)
}

function DataBody({ data }: { data: unknown }): React.ReactElement {
  if (Array.isArray(data)) {
    return <pre className={css.pre} tabIndex={0} aria-label="Result output">{data.map(rowLine).join('\n')}</pre>
  }
  return <pre className={css.pre} tabIndex={0} aria-label="Result output">{displayValue(data)}</pre>
}

interface FieldProps {
  label: string
  value: string
  placeholder?: string
  mono?: boolean
  onChange(value: string): void
}

function Field({ label, value, placeholder, mono, onChange }: FieldProps): React.ReactElement {
  return (
    <label className={css.field}>
      <span className={css.fieldLabel}>{label}</span>
      <input
        className={css.input + (mono === true ? ' ' + css.mono : '')}
        value={value}
        placeholder={placeholder}
        onChange={(event) => { onChange(event.target.value) }}
      />
    </label>
  )
}

function SearchField({ label, value, options, placeholder, mono = false, onChange }: {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  placeholder?: string
  mono?: boolean
  onChange(value: string): void
}): React.ReactElement {
  const listId = useId()
  return (
    <label className={css.field}>
      <span className={css.fieldLabel}>{label}</span>
      <input
        className={css.input + (mono === true ? ' ' + css.mono : '')}
        type="search"
        list={listId}
        value={value}
        placeholder={placeholder}
        onChange={(event) => { onChange(event.target.value) }}
      />
      <datalist id={listId}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </datalist>
    </label>
  )
}

function SelectField({ label, value, options, placeholder, disabled = false, onChange }: {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  placeholder: string
  disabled?: boolean
  onChange(value: string): void
}): React.ReactElement {
  return (
    <label className={css.field}>
      <span className={css.fieldLabel}>{label}</span>
      <select className={css.input} value={value} disabled={disabled} onChange={(event) => { onChange(event.target.value) }}>
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

interface BtnProps {
  children: React.ReactNode
  onClick(): void
  busy?: boolean
  primary?: boolean
  danger?: boolean
  disabled?: boolean
}

function Btn({ children, onClick, busy, primary, danger, disabled }: BtnProps): React.ReactElement {
  return (
    <button
      type="button"
      className={[
        css.btn,
        primary === true ? ' ' + css.btnPrimary : '',
        danger === true ? ' ' + css.btnDanger : '',
      ].join('')}
      disabled={disabled === true || busy === true}
      aria-busy={busy === true}
      onClick={onClick}
    >
      {busy === true ? '… ' : ''}{children}
    </button>
  )
}

function ForceToggle({ checked, label, onChange, disabled }: {
  checked: boolean
  label: string
  onChange(value: boolean): void
  disabled: boolean
}): React.ReactElement {
  return (
    <label className={css.checkRow}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => { onChange(event.target.checked) }} />
      <span>{label}</span>
    </label>
  )
}

function resultLabel(reply: ManageReply, state: string): string {
  if (state === 'partial') return 'PARTIAL'
  if (state === 'restart_required') return 'RESTART REQUIRED'
  if (reply.ok !== true) return 'REFUSED'
  if (state !== '') return state.toUpperCase()
  return 'OK'
}

function ResultRecordView({ record, kind, now, locked, onFollow }: {
  record: ResultRecord
  kind: 'mutation' | 'output'
  now: number
  locked: boolean
  onFollow(action: string): void
}): React.ReactElement {
  const reply = record.reply
  const contract = resultContract(reply)
  const provision = provisionData(reply.data)
  const nextAction = inferredNextAction(reply)
  const label = resultLabel(reply, contract.state)
  const warn = contract.partial || contract.restartRequired
  const good = reply.ok === true && !warn
  const showFlags = kind === 'mutation' || contract.state !== '' || provision !== null
  return (
    <article
      className={css.resultRecord}
      data-testid={kind === 'mutation' ? 'mutation-result' : 'read-result'}
      aria-label={kind === 'mutation' ? 'Last mutation result' : 'Latest read result'}
    >
      <div className={css.resultRecordHead}>
        <span className={good ? css.resultOk : warn ? css.resultWarn : css.resultBad}>{label}</span>
        <span className={css.resultAction}>{reply.action ?? 'unknown'}</span>
        <span className={css.resultKind}>{kind === 'mutation' ? 'last mutation' : 'latest read'}</span>
      </div>
      <div className={css.resultMeta}>
        {contract.state !== '' && <span><strong>State:</strong> <span className={css.mono}>{contract.state}</span></span>}
        {contract.operationId !== '' && <span><strong>operation_id:</strong> <span className={css.mono}>{contract.operationId}</span></span>}
        {reply.ok !== true && <span><strong>Error code:</strong> <span className={css.mono}>{contract.code === '' ? 'manage/refused' : contract.code}{contract.status === undefined ? '' : ' · HTTP ' + String(contract.status)}</span></span>}
        <span><strong>Received:</strong> <time dateTime={new Date(record.receivedAt).toISOString()}>{receivedLabel(record.receivedAt)}</time> · {freshness(record.receivedAt, now)}</span>
      </div>
      <p className={css.resultDetail}><strong>Detail:</strong> {reply.detail ?? ''}</p>
      {showFlags && (
        <div className={css.resultFlags}>
          <span>Partial: {contract.partial ? 'yes' : 'no'}</span>
          <span>Restart required: {contract.restartRequired ? 'yes' : 'no'}</span>
        </div>
      )}
      {nextAction !== '' && (
        <div className={css.nextRow}>
          <Btn disabled={locked} onClick={() => { onFollow(nextAction) }}>Next: {ACTION_LABELS[nextAction] ?? nextAction}</Btn>
        </div>
      )}
      {provision !== null && (
        <div data-testid="provision-state">
          {(provision.requested !== undefined || provision.succeeded !== undefined || provision.missed !== undefined) && (
            <div className={css.resultFlags}>
              <span>Requested: {(provision.requested ?? []).join(', ') || 'none'}</span>
              <span>Succeeded: {(provision.succeeded ?? []).join(', ') || 'none'}</span>
              <span>Missed: {(provision.missed ?? []).join(', ') || 'none'}</span>
              {(provision.misses ?? []).length > 0 && <span>Details: {provision.misses?.join(' · ')}</span>}
            </div>
          )}
          {provision.items.map((item, index) => {
            const itemState = stringOr(item['state'], 'unknown')
            return (
              <div className={css.resultItem} key={stringOr(item['key'], String(index))}>
                <span className={resourceStateClass(itemState)}>{itemState}</span>
                <span className={css.mono}>{stringOr(item['key'], 'item')}</span>
                {typeof item['integrity'] === 'string' && <span className={css.sub}>{item['integrity']}</span>}
                {typeof item['errorCode'] === 'string' && <span className={css.errorCode}>{item['errorCode']}</span>}
                {typeof item['detail'] === 'string' && <span className={css.sub}>{item['detail']}</span>}
              </div>
            )
          })}
          {(provision.errors ?? []).map((error, index) => (
            <p className={css.errorCode} key={String(error.file ?? index)}>{error.file ?? 'error'}: {error.error ?? 'failed'}</p>
          ))}
        </div>
      )}
      {reply.data !== undefined && reply.data !== null && provision === null && (
        <div className={css.resultData} data-testid="result-data">
          <span className={css.resultDataLabel}>Output</span>
          <DataBody data={reply.data} />
        </div>
      )}
    </article>
  )
}

interface ConfirmRunOptions {
  payload?: Record<string, unknown>
  after?(): void
  onUse?(): void
}

export function ComfyManagerPanel(): React.ReactElement {
  const [epUrl, setEpUrl] = useState('')
  const [status, setStatus] = useState<StatusView | null>(null)
  const [statusDetail, setStatusDetail] = useState('Checking engine and manager…')
  const [statusError, setStatusError] = useState('')
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusReceivedAt, setStatusReceivedAt] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  const [busy, setBusy] = useState<string | null>(null)
  const [mutationResult, setMutationResult] = useState<ResultRecord | null>(null)
  const [readResult, setReadResult] = useState<ResultRecord | null>(null)
  const statusRequestRef = useRef(0)
  const dispatchingRef = useRef(false)
  const dispatchSequenceRef = useRef(0)
  const resultSequenceRef = useRef(0)
  const mountedRef = useRef(true)
  const statusControllerRef = useRef<AbortController | null>(null)
  const actionControllerRef = useRef<AbortController | null>(null)

  const [extRows, setExtRows] = useState<string[] | null>(null)
  const [extFilter, setExtFilter] = useState('')
  const [snapRows, setSnapRows] = useState<string[] | null>(null)
  const [logTail, setLogTail] = useState('200')
  const [extIds, setExtIds] = useState('')
  const [extUrl, setExtUrl] = useState('')
  const [modelQuery, setModelQuery] = useState('')
  const [dlUrl, setDlUrl] = useState('')
  const [dlPath, setDlPath] = useState('')
  const [dlName, setDlName] = useState('')
  const [provModel, setProvModel] = useState('')
  const [provVariant, setProvVariant] = useState('')
  const [provQuant, setProvQuant] = useState('')
  const [swVersion, setSwVersion] = useState('')
  const [lifecycleForce, setLifecycleForce] = useState(false)
  const [restoreForce, setRestoreForce] = useState(false)
  const modelOptions = useMemo(() => modelCatalog(status?.model_options), [status?.model_options])
  const selectedModel = modelOptions.find((model) => model.id === provModel.trim())
  const selectedVariant = selectedModel?.variants.find((variant) => variant.id === provVariant)
  const quantOptions = selectedVariant?.quants ?? []
  const comfyuiVersions = useMemo(() => versionCatalog(status?.comfyui_versions), [status?.comfyui_versions])
  const modelCatalogRef = useRef<ModelOption[] | null>(null)

  const fetchStatus = useCallback(async (): Promise<void> => {
    const request = ++statusRequestRef.current
    statusControllerRef.current?.abort()
    const controller = new AbortController()
    statusControllerRef.current = controller
    setStatusLoading(true)
    try {
      const reply = await postManage('status', {}, controller.signal)
      if (!mountedRef.current || request !== statusRequestRef.current) return
      if (reply.ok === true) {
        const view = statusView(reply.data)
        if (view === null) {
          setStatusError('status reply carried no status data')
          setStatusDetail('')
          return
        }
        const received = Date.now()
        setStatus(view)
        setStatusReceivedAt(received)
        setStatusError('')
        setStatusDetail(reply.detail ?? '')
        const live = view.endpoint?.url
        if (typeof live === 'string' && live !== '') setEpUrl((previous) => previous === '' ? live : previous)
      } else {
        setStatusError(reply.detail ?? 'status request failed')
        setStatusDetail('')
      }
    } catch (error) {
      if (mountedRef.current && !controller.signal.aborted && request === statusRequestRef.current) setStatusError('request failed: ' + String(error))
    } finally {
      if (statusControllerRef.current === controller) statusControllerRef.current = null
      if (mountedRef.current && request === statusRequestRef.current) setStatusLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void fetchStatus()
    return () => {
      mountedRef.current = false
      statusControllerRef.current?.abort()
      actionControllerRef.current?.abort()
    }
  }, [fetchStatus])
  useEffect(() => {
    const previous = modelCatalogRef.current
    modelCatalogRef.current = modelOptions
    if (previous === null || previous.length === 0) return
    if (modelOptions.length === 0) {
      setProvVariant('')
      setProvQuant('')
      return
    }
    const model = modelOptions.find((option) => option.id === provModel.trim())
    if (model === undefined) {
      setProvVariant('')
      setProvQuant('')
      return
    }
    const variant = model.variants.find((option) => option.id === provVariant) ?? model.variants[0]
    const variantId = variant?.id ?? ''
    const quantId = variant?.quants.find((option) => option.id === provQuant)?.id ?? variant?.quants[0]?.id ?? ''
    if (provVariant !== variantId) setProvVariant(variantId)
    if (provQuant !== quantId) setProvQuant(quantId)
  }, [modelOptions, provModel, provQuant, provVariant])
  useEffect(() => {
    const timer = window.setInterval(() => { setNow(Date.now()) }, 5_000)
    return () => { window.clearInterval(timer) }
  }, [])

  const run = useCallback(async (action: string, payload: Record<string, unknown> = {}, recordOutput = true): Promise<ManageReply | null> => {
    if (dispatchingRef.current) return null
    dispatchingRef.current = true
    const request = ++dispatchSequenceRef.current
    const controller = new AbortController()
    actionControllerRef.current = controller
    setBusy(action)
    try {
      const reply = await postManage(action, payload, controller.signal)
      if (mountedRef.current && request === dispatchSequenceRef.current) {
        const record = { id: ++resultSequenceRef.current, reply, receivedAt: Date.now() }
        if (MUTATING.has(action)) setMutationResult(record)
        else if (recordOutput) setReadResult(record)
      }
      return reply
    } catch (error) {
      if (controller.signal.aborted) return null
      if (mountedRef.current && request === dispatchSequenceRef.current) {
        const reply = { action, ok: false, code: 'manage/transport', detail: 'request failed: ' + String(error) }
        const record = { id: ++resultSequenceRef.current, reply, receivedAt: Date.now() }
        if (MUTATING.has(action)) setMutationResult(record)
        else if (recordOutput) setReadResult(record)
      }
      return null
    } finally {
      if (actionControllerRef.current === controller) actionControllerRef.current = null
      if (MUTATING.has(action) && mountedRef.current) await fetchStatus()
      if (mountedRef.current && request === dispatchSequenceRef.current) {
        dispatchingRef.current = false
        setBusy(null)
      }
    }
  }, [fetchStatus])

  const loadExtensions = useCallback(async (recordOutput = true): Promise<void> => {
    const reply = await run('list_extensions', {}, recordOutput)
    if (reply !== null && reply.ok === true && Array.isArray(reply.data)) {
      setExtRows(reply.data.map((row): string => {
        if (typeof row === 'string') return row
        const value = recordOf(row)
        if (value !== null) {
          const name = stringOr(value['name'], '?')
          const version = typeof value['version'] === 'string' ? value['version'] : typeof value['ver'] === 'string' ? value['ver'] : '?'
          return name + ' — ' + version
        }
        return String(row)
      }))
    }
  }, [run])

  const loadSnapshots = useCallback(async (recordOutput = true): Promise<void> => {
    const reply = await run('snapshot_list', {}, recordOutput)
    if (reply !== null && reply.ok === true && Array.isArray(reply.data)) setSnapRows(reply.data.map(String))
  }, [run])

  function confirmRun(action: string, sentence: string, options: ConfirmRunOptions = {}): void {
    if (!window.confirm(sentence)) return
    options.onUse?.()
    void run(action, options.payload ?? {}).then((reply) => {
      if (reply !== null && (reply.ok === true || resultContract(reply).partial)) options.after?.()
    })
  }

  function forceSentence(value: boolean): string {
    return ' Force override: ' + (value ? 'ON.' : 'OFF.')
  }

  function changeModel(value: string): void {
    const modelId = value.trim()
    setProvModel(value)
    if (modelOptions.length === 0) {
      if (provModel.trim() !== modelId) {
        setProvVariant('')
        setProvQuant('')
      }
      return
    }
    const model = modelOptions.find((option) => option.id === modelId)
    if (model === undefined) {
      setProvVariant('')
      setProvQuant('')
      return
    }
    const variant = model.variants.find((option) => option.id === provVariant) ?? model.variants[0]
    setProvVariant(variant?.id ?? '')
    setProvQuant(variant?.quants[0]?.id ?? '')
  }

  function changeVariant(value: string): void {
    setProvVariant(value)
    const variant = selectedModel?.variants.find((option) => option.id === value)
    setProvQuant(variant?.quants[0]?.id ?? '')
  }

  function focusAction(action: string): void {
    const target = document.getElementById('manage-' + action)
    if (target instanceof HTMLDetailsElement) target.open = true
    const focusable = target?.querySelector<HTMLElement>('input, select, button')
    focusable?.focus()
    if (typeof target?.scrollIntoView === 'function') target.scrollIntoView({ block: 'start' })
  }

  function followNext(action: string): void {
    if (action === 'status') {
      void fetchStatus()
      return
    }
    if (action === 'launch' && status?.endpoint?.reachable !== true) {
      confirmRun('launch', 'Launch the ComfyUI server?')
      return
    }
    if (action === 'restart' && status?.endpoint?.reachable === true) {
      const force = lifecycleForce
      confirmRun('restart', 'Restart the ComfyUI server?' + forceSentence(force), {
        payload: { force },
        onUse: () => { setLifecycleForce(false) },
      })
      return
    }
    focusAction(action)
  }

  const ep = status?.endpoint
  const manager = status?.manager
  const up = ep?.reachable === true
  const byo = status?.routing?.mode === 'byo'
  const activeRuns = status?.active_runs ?? []
  const resources = status?.resources ?? []
  const kind = healthKind(status, statusReceivedAt, statusLoading, statusError, now)
  const statusNextAction = status?.next_action ?? (up ? 'status' : 'launch')
  const locked = busy !== null
  const visibleRead = readResult !== null && (mutationResult === null || readResult.id > mutationResult.id)

  return (
    <div className={css.root} data-comfy-manager="" aria-busy={statusLoading || locked}>
      <div className={css.head}>
        <h2 className={css.title}>ComfyUI Manager</h2>
        {statusDetail !== '' && <span className={css.sub}>{statusDetail}</span>}
      </div>

      <section className={css.section + ' ' + css.healthPanel} aria-live="polite" aria-busy={statusLoading}>
        <div className={css.healthTop}>
          <span className={healthDotClass(kind)} aria-hidden="true" />
          <div className={css.healthCopy}>
            <h3 className={css.healthTitle}>Health</h3>
            <strong className={css.healthLabel} data-testid="health-state">{healthLabel(kind)}</strong>
          </div>
          <Btn busy={statusLoading} disabled={locked} primary onClick={() => { void fetchStatus() }}>Refresh</Btn>
        </div>
        {statusError !== '' && <p className={status === null ? css.dangerNote : css.warningNote}>Refresh failed: {statusError}{status === null ? '' : ' · showing the last confirmed status'}</p>}
        {statusLoading && status !== null && <p className={css.sub}>Refreshing · showing the last confirmed status</p>}
        <dl className={css.healthGrid}>
          <div className={css.healthItem}>
            <dt>Endpoint</dt>
            <dd className={css.wrapText}>{ep?.url ?? 'not reported'}</dd>
          </div>
          <div className={css.healthItem}>
            <dt>Engine</dt>
            <dd>{up ? 'reachable' : 'failure'}{ep?.reason === undefined ? '' : ' · ' + ep.reason}</dd>
          </div>
          <div className={css.healthItem}>
            <dt>ComfyUI</dt>
            <dd className={css.mono}>{ep?.comfyui_version === undefined || ep.comfyui_version === null ? '?' : displayValue(ep.comfyui_version)}</dd>
          </div>
          <div className={css.healthItem}>
            <dt>Manager</dt>
            <dd>{manager?.reachable === true ? 'reachable' : 'failure'}{manager?.reason === undefined ? '' : ' · ' + manager.reason}</dd>
          </div>
          <div className={css.healthItem}>
            <dt>Manager version</dt>
            <dd className={css.mono}>{manager?.version === undefined ? '?' : managerVersion(manager.version)}</dd>
          </div>
          <div className={css.healthItem}>
            <dt>Manager queue</dt>
            <dd>{manager?.queue === undefined ? '?' : queueSummary(manager.queue)}</dd>
          </div>
          <div className={css.healthItem}>
            <dt>Security</dt>
            <dd className={css.wrapText}>{manager?.security ?? 'not reported'}</dd>
          </div>
          <div className={css.healthItem}>
            <dt>Manager unit</dt>
            <dd className={css.wrapText}>{manager?.unit ?? '?'}</dd>
          </div>
          <div className={css.healthItem}>
            <dt>Runs</dt>
            <dd>{activeRuns.length === 0 ? 'idle' : activeRuns.length + ' active · ' + activeRuns.join(', ')}</dd>
          </div>
          <div className={css.healthItem}>
            <dt>Routing</dt>
            <dd>{displayValue(status?.routing)}</dd>
          </div>
        </dl>
        <div className={css.nextRow}>
          <Btn disabled={locked} onClick={() => { followNext(statusNextAction) }}>Next: {ACTION_LABELS[statusNextAction] ?? statusNextAction}</Btn>
          {statusReceivedAt !== null && (
            <span className={css.freshness}>
              Updated <time dateTime={new Date(statusReceivedAt).toISOString()}>{receivedLabel(statusReceivedAt)}</time> · {freshness(statusReceivedAt, now)}
            </span>
          )}
        </div>
        {(ep?.devices ?? []).length > 0 && (
          <div className={css.deviceList}>
            {(ep?.devices ?? []).map((device, index) => {
              const total = typeof device.vram_total === 'number' ? device.vram_total : 0
              const free = typeof device.vram_free === 'number' ? device.vram_free : 0
              const percent = total > 0 ? Math.max(0, Math.min(100, Math.round((free / total) * 100))) : 0
              return (
                <div className={css.device} key={String(device.name ?? index)}>
                  <span className={css.kvKey}>{device.name ?? 'gpu'}</span>
                  <span className={css.bar}><span className={css.barFill} style={{ width: percent + '%' }} /></span>
                  <span className={css.mono}>{gb(free)} / {gb(total)} GB free</span>
                </div>
              )
            })}
          </div>
        )}
        <details className={css.advanced} id="manage-endpoint_set">
          <summary>Endpoint settings</summary>
          <div className={css.row}>
            <Field label="server url" value={epUrl} placeholder="http://127.0.0.1:8188" mono onChange={setEpUrl} />
            <Btn busy={busy === 'endpoint_set'} disabled={locked || epUrl.trim() === ''} onClick={() => { void run('endpoint_set', { url: epUrl.trim() }) }}>Set</Btn>
          </div>
        </details>
      </section>

      {(mutationResult !== null || visibleRead) && (
        <section className={css.section + ' ' + css.resultDock} data-testid="manage-result" aria-live="polite" aria-busy={locked}>
          <div className={css.resultHead}>
            <h3 className={css.sectionTitle}>Result dock</h3>
            <Btn onClick={() => { setMutationResult(null); setReadResult(null) }}>Clear result</Btn>
          </div>
          {mutationResult !== null && <ResultRecordView record={mutationResult} kind="mutation" now={now} locked={locked} onFollow={followNext} />}
          {visibleRead && <ResultRecordView record={readResult} kind="output" now={now} locked={locked} onFollow={followNext} />}
        </section>
      )}

      {/* THE LORA BLOCK (the operator's 2026-09-26 order: custom
          LoRAs live in the ComfyUI Manager sidebar). It calls the
          manage plane's own doors — lora_list / lora_install — and
          states the two facts a user cannot otherwise see: the
          engine's accepted names, and that a copied file needs a
          restart before the engine's list includes it. */}
      <section className={css.section} id="manage-loras">
        <LoraBlock />
      </section>

      <section className={css.section} id="manage-resources">
        <h3 className={css.sectionTitle}>Declared resources <span className={css.count}>{resources.length}</span></h3>
        {resources.length === 0 ? (
          <p className={css.sub}>No declared resources reported.</p>
        ) : (
          <ul className={css.resourceList} data-testid="resource-status">
            {resources.map((resource, index) => {
              const state = resource.state ?? 'unknown'
              return (
                <li className={css.resourceRow} key={resourceLabel(resource) + ':' + index}>
                  <div className={css.resourceMain}>
                    <span className={resourceStateClass(state)}>{state}</span>
                    <span className={css.resourceName}>{resourceLabel(resource)}</span>
                    {resource.operation_id !== undefined && <span className={css.mono}>operation_id: {resource.operation_id}</span>}
                  </div>
                  {resource.detail !== undefined && <p className={css.sub}>{resource.detail}</p>}
                  {(resource.items ?? []).length > 0 && (
                    <ul className={css.resourceItems}>
                      {(resource.items ?? []).map((item, itemIndex) => (
                        <li className={css.resourceItem} key={item.key ?? String(itemIndex)}>
                          <span className={resourceStateClass(item.state ?? 'unknown')}>{item.state ?? 'unknown'}</span>
                          <span className={css.mono}>{item.key ?? item.kind ?? 'item'}</span>
                          {item.outcome !== undefined && item.outcome !== item.state && <span className={css.sub}>{item.outcome}</span>}
                          {item.integrity !== undefined && <span className={css.sub}>{item.integrity}</span>}
                          {item.errorCode !== undefined && <span className={css.errorCode}>{item.errorCode}</span>}
                          {item.path !== undefined && <span className={css.wrapText}>{item.path}</span>}
                          {item.sha256 !== undefined && <span className={css.hash}>{item.sha256}</span>}
                          {item.detail !== undefined && <span className={css.sub}>{item.detail}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {status?.resources_detail !== undefined && <p className={css.warningNote}>Resource scan: {status.resources_detail}</p>}
      </section>

      <section className={css.section} id="manage-list_extensions">
        <h3 className={css.sectionTitle}>Extensions</h3>
        <div className={css.row}>
          <Field label="filter installed" value={extFilter} placeholder="kj, moge…" onChange={setExtFilter} />
          <Btn busy={busy === 'list_extensions'} disabled={locked} onClick={() => { void loadExtensions() }}>Installed packs</Btn>
        </div>
        {extRows !== null && (
          <ul className={css.list} data-testid="ext-list">
            {extRows
              .filter((row) => row.toLowerCase().includes(extFilter.trim().toLowerCase()))
              .map((row) => <li className={css.listRow} key={row}><span className={css.wrapText}>{row}</span></li>)}
            {extRows.length === 0 && <li className={css.listRow}>no packs installed</li>}
          </ul>
        )}
        <div className={css.row}>
          <Field label="declared registry ids" value={extIds} placeholder="ComfyUI-KJNodes, ComfyUI-VideoHelperSuite" mono onChange={setExtIds} />
          <Btn
            busy={busy === 'install_extension'}
            disabled={locked || extIds.trim() === ''}
            onClick={() => {
              const nodes = extIds.split(',').map((value) => value.trim()).filter((value) => value !== '')
              confirmRun('install_extension', 'Install declared extension pack(s) ' + nodes.join(', ') + ' through the manager rail?', {
                payload: { nodes },
                after: () => { if (extRows !== null) void loadExtensions(false) },
              })
            }}
          >Install</Btn>
        </div>
        <details className={css.advanced} id="manage-install_extension_url">
          <summary><span className={css.operatorBadge}>Operator only · raw URL</span> Install extension from URL</summary>
          <p className={css.operatorNote}>This bypasses the declared registry ids. Use only for an operator-vetted source.</p>
          <div className={css.row}>
            <Field label="git URL (ComfyUI-Manager)" value={extUrl} placeholder="https://github.com/…" mono onChange={setExtUrl} />
            <Btn
              busy={busy === 'install_extension_url'}
              disabled={locked || extUrl.trim() === ''}
              onClick={() => {
                const url = extUrl.trim()
                confirmRun('install_extension_url', 'Install extension from operator-vetted URL ' + url + '?', {
                  payload: { url },
                  after: () => { if (extRows !== null) void loadExtensions(false) },
                })
              }}
            >Install from URL</Btn>
          </div>
        </details>
      </section>

      <section className={css.section} id="manage-search_models">
        <h3 className={css.sectionTitle}>Models</h3>
        <div className={css.row}>
          <Field label="search Manager external index" value={modelQuery} placeholder="sdxl, wan…" onChange={setModelQuery} />
          <Btn busy={busy === 'search_models'} disabled={locked || modelQuery.trim() === ''} onClick={() => { void run('search_models', { query: modelQuery.trim() }) }}>Search</Btn>
        </div>
        <details className={css.advanced} id="manage-provision_model">
          <summary>Provision a declared model</summary>
          <div className={css.row}>
            <SearchField
              label="provision catalog id"
              value={provModel}
              options={modelOptions.map((model) => ({ value: model.id, label: model.label + (model.genre === undefined ? '' : ' · ' + model.genre) }))}
              placeholder="Search declared models…"
              mono
              onChange={changeModel}
            />
            {modelOptions.length === 0 ? (
              <>
                <Field label="variant" value={provVariant} onChange={setProvVariant} />
                <Field label="quant" value={provQuant} onChange={setProvQuant} />
              </>
            ) : (
              <>
                <SelectField
                  label="variant"
                  value={provVariant}
                  options={(selectedModel?.variants ?? []).map((variant) => ({ value: variant.id, label: variant.label }))}
                  placeholder="Default variant"
                  disabled={selectedModel === undefined}
                  onChange={changeVariant}
                />
                <SelectField
                  label="quant"
                  value={provQuant}
                  options={quantOptions.map((quant) => ({ value: quant.id, label: quant.label }))}
                  placeholder="Default quant"
                  disabled={selectedVariant === undefined || quantOptions.length === 0}
                  onChange={setProvQuant}
                />
              </>
            )}
            <Btn
              busy={busy === 'provision_model'}
              disabled={locked || provModel.trim() === '' || (modelOptions.length > 0 && selectedModel === undefined)}
              onClick={() => {
                const payload: Record<string, unknown> = { model: provModel.trim() }
                if (provVariant.trim() !== '') payload.variant = provVariant.trim()
                if (provQuant.trim() !== '') payload.quant = provQuant.trim()
                confirmRun('provision_model', 'Provision declared model ' + provModel.trim() + ' from the catalog?', { payload })
              }}
            >Provision</Btn>
          </div>
          {status?.model_options_detail !== undefined && <p className={css.warningNote}>Model catalog: {status.model_options_detail}</p>}
        </details>
        <details className={css.advanced} id="manage-download_model">
          <summary><span className={css.operatorBadge}>Operator only · raw URL</span> Download a model from URL</summary>
          <p className={css.operatorNote}>Prefer a declared catalog id. Raw downloads are outside the resource declaration.</p>
          <div className={css.row}>
            <Field label="download URL (Manager)" value={dlUrl} placeholder="https://…/model.safetensors" mono onChange={setDlUrl} />
            <Field label="relative path" value={dlPath} placeholder="models/checkpoints" mono onChange={setDlPath} />
            <Field label="filename" value={dlName} placeholder="model.safetensors" mono onChange={setDlName} />
            <Btn
              busy={busy === 'download_model'}
              disabled={locked || dlUrl.trim() === ''}
              onClick={() => {
                const payload: Record<string, unknown> = { url: dlUrl.trim() }
                if (dlPath.trim() !== '') payload.relative_path = dlPath.trim()
                if (dlName.trim() !== '') payload.filename = dlName.trim()
                confirmRun('download_model', 'Queue operator-vetted download of ' + (dlName.trim() || dlUrl.trim()) + '?', { payload })
              }}
            >Download</Btn>
          </div>
        </details>
      </section>

      <section className={css.section} id="manage-snapshot_list">
        <h3 className={css.sectionTitle}>Snapshots</h3>
        <p className={css.sub}>Save before update or version switch. Restore needs restart and uses its own one-shot force control.</p>
        <div className={css.row}>
          <Btn busy={busy === 'snapshot_list'} disabled={locked} onClick={() => { void loadSnapshots() }}>List snapshots</Btn>
          <Btn busy={busy === 'snapshot_save'} disabled={locked} primary onClick={() => {
            confirmRun('snapshot_save', 'Save an environment snapshot (ComfyUI + packs + dependencies)?', {
              after: () => { void loadSnapshots(false) },
            })
          }}>Save snapshot</Btn>
        </div>
        {snapRows !== null && (
          <ul className={css.list} data-testid="snap-list">
            {snapRows.map((snapshot) => (
              <li className={css.listRow + ' ' + css.snapshotRow} key={snapshot}>
                <span className={css.wrapText}>{snapshot}</span>
                <Btn
                  danger
                  busy={busy === 'snapshot_restore'}
                  disabled={locked}
                  onClick={() => {
                    const force = restoreForce
                    confirmRun('snapshot_restore', 'Restore snapshot ' + snapshot + '? This rewrites extensions and dependencies.' + forceSentence(force), {
                      payload: { snapshot, force },
                      onUse: () => { setRestoreForce(false) },
                      after: () => { void loadSnapshots(false) },
                    })
                  }}
                >Restore</Btn>
              </li>
            ))}
            {snapRows.length === 0 && <li className={css.listRow}>no snapshots — save one before switch/update</li>}
          </ul>
        )}
        <ForceToggle checked={restoreForce} label="Force the next snapshot restore" disabled={locked} onChange={setRestoreForce} />
      </section>

      <section className={css.section} id="manage-logs">
        <h3 className={css.sectionTitle}>Logs</h3>
        <div className={css.row}>
          <Field label="tail lines" value={logTail} onChange={setLogTail} mono />
          <Btn busy={busy === 'logs'} disabled={locked} onClick={() => {
            const tail = Math.max(1, Math.min(Number.parseInt(logTail, 10) || 200, 2_000))
            void run('logs', { tail })
          }}>View logs</Btn>
        </div>
      </section>

      <section className={css.section} id="manage-lifecycle">
        <h3 className={css.sectionTitle}>Lifecycle</h3>
        {activeRuns.length > 0 && <p className={css.dangerNote}>{activeRuns.length} active run(s). Guarded actions refuse unless their one-shot force control is ON.</p>}
        {up && !byo ? (
          <>
            <div className={css.lifecycleActions}>
              <Btn busy={busy === 'restart'} disabled={locked} danger onClick={() => {
                const force = lifecycleForce
                confirmRun('restart', 'Restart the ComfyUI server?' + forceSentence(force), {
                  payload: { force },
                  onUse: () => { setLifecycleForce(false) },
                })
              }}>Restart</Btn>
              <Btn busy={busy === 'stop'} disabled={locked} danger onClick={() => {
                const force = lifecycleForce
                confirmRun('stop', 'Stop the ComfyUI server?' + forceSentence(force), {
                  payload: { force },
                  onUse: () => { setLifecycleForce(false) },
                })
              }}>Stop</Btn>
              <Btn busy={busy === 'free'} disabled={locked} onClick={() => {
                const force = lifecycleForce
                confirmRun('free', 'Ask ComfyUI to free memory on its next worker iteration?' + forceSentence(force), {
                  payload: { force },
                  onUse: () => { setLifecycleForce(false) },
                })
              }}>Free VRAM</Btn>
            </div>
            <ForceToggle checked={lifecycleForce} label="Force the next guarded lifecycle action" disabled={locked} onChange={setLifecycleForce} />
            <details className={css.advanced} id="manage-update">
              <summary>Advanced update</summary>
              <div className={css.row}>
                <Btn busy={busy === 'update'} disabled={locked} danger onClick={() => {
                  const force = lifecycleForce
                  confirmRun('update', 'Update ComfyUI through the built-in manager?' + forceSentence(force), {
                    payload: { target: 'comfy', force },
                    onUse: () => { setLifecycleForce(false) },
                  })
                }}>Update ComfyUI</Btn>
              </div>
            </details>
            <details className={css.advanced} id="manage-switch_version">
              <summary>Switch ComfyUI version</summary>
              <div className={css.row}>
                {comfyuiVersions.length === 0 ? (
                  <Field label="switch to version" value={swVersion} placeholder="commit / tag" mono onChange={setSwVersion} />
                ) : (
                  <SelectField
                    label="switch to version"
                    value={swVersion}
                    options={comfyuiVersions.map((version) => ({ value: version.id, label: version.label }))}
                    placeholder="Select version / tag"
                    onChange={setSwVersion}
                  />
                )}
                {status?.comfyui_versions_detail !== undefined && <p className={css.warningNote}>Version catalog: {status.comfyui_versions_detail}</p>}
                <Btn
                  busy={busy === 'switch_version'}
                  disabled={locked || swVersion.trim() === ''}
                  danger
                  onClick={() => {
                    const force = lifecycleForce
                    confirmRun('switch_version', 'Switch ComfyUI to ' + swVersion.trim() + '?' + forceSentence(force), {
                      payload: { version: swVersion.trim(), force },
                      onUse: () => { setLifecycleForce(false) },
                    })
                  }}
                >Switch</Btn>
              </div>
            </details>
          </>
         ) : status === null ? (
           <p className={css.sub}>Lifecycle controls unlock after status loads.</p>
         ) : byo ? (
           <p className={css.sub}>BYO endpoint selected. Estate lifecycle controls are unavailable; use Endpoint settings to choose the managed engine.</p>
         ) : (
           <div className={css.lifecycleActions}>
             <Btn busy={busy === 'launch'} disabled={locked} primary onClick={() => { confirmRun('launch', 'Launch the ComfyUI server?') }}>Launch</Btn>
           </div>
         )}
      </section>
    </div>
  )
}

function ComfyIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2.5" y="2.5" width="11" height="4.6" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <rect x="2.5" y="8.9" width="11" height="4.6" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="5.1" cy="4.8" r="0.9" fill="currentColor" />
      <circle cx="5.1" cy="11.2" r="0.9" fill="currentColor" />
      <path d="M8.2 4.8h3.2M8.2 11.2h3.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

interface TabCtx {
  effect(fn: () => void, name?: string): unknown
  sidebarRightTabs: {
    register(def: {
      id: string
      kind: string
      title(): string
      guide?: Array<{
        id: string
        order: number
        title(): string
        description?(): string
        icon?: React.ComponentType<{ size?: number; className?: string }>
      }>
    }): unknown
  }
  slots: {
    inject(name: 'sidebar.right.pane.tab', declare: () => unknown): unknown
    register(options: { name: 'sidebar.right.pane.tab'; key: string }, component: React.ComponentType<Record<string, unknown>>): unknown
  }
}

function register(ctx: TabCtx, id: string, kind: string, title: string, guideOrder: number, guideDescription: string, icon: React.ComponentType<{ size: number }>, component: React.ComponentType<Record<string, unknown>>): void {
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id,
    kind,
    title: () => title,
    guide: [{
      // SidebarRightGuideEntry.id is required (0.1.7): stable
      // identity within the provider; register() throws on dups and
      // a single undefined passed that check silently
      id: `${id}-guide`,
      order: guideOrder,
      title: () => title,
      description: () => guideDescription,
      icon: icon as unknown as React.ComponentType<{ size?: number; className?: string }>,
    }],
  }), 'melite-card-deck: ' + id + ' tab type')
  ctx.slots.inject('sidebar.right.pane.tab', () => {
    const dispose = ctx.slots.register(
      { name: 'sidebar.right.pane.tab', key: id },
      component,
    )
    return typeof dispose === 'function' ? dispose : () => {}
  })
}

export function registerAssetsTab(ctx: TabCtx): void {
  register(ctx, 'melite-card-deck:comfy', 'comfy-manager', 'ComfyUI Manager', 61, 'The estate\'s ComfyUI manager — packs, snapshots, status.', ComfyIcon as unknown as React.ComponentType<{ size: number }>, ComfyManagerPanel as unknown as React.ComponentType<Record<string, unknown>>)
}
