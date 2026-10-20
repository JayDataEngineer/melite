/**
 * assets-tab — the ONE DSH right-sidebar tab that is NOT cards:
 *
 *   ComfyUI Manager — a direct GUI on the estate's management plane.
 *     Every button is ONE action of the manage-plane SSOT
 *     (@melite/estate-queue's managePlane.ts — Cordis provisioning +
 *     ComfyUI-Manager), reached over the `manage` Typert remote
 *     (MANAGE_TYPERT_REMOTE — the host binds it in the estate
 *     composition; the deck seats the namespace card-base's
 *     manageRemote() accessor hands back). The vocabulary mirrors the
 *     comfy_manage agent tool 1:1. Progressive
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
 * function", 2026-09-10), then rode a hand-rolled fetch frame
 * (2026-09-10 to 2026-10-01). Today the panel rides the MOUNTED
 * `manage` Typert namespace (@melite/estate-manage's generated
 * client, seated by the deck's apply): the Connection owns
 * transport, RPC ids, and frame validation; this panel owns the
 * envelope's reply mapping and its voices.
 *
 * Siblings' fate (NO LEGACY): Ray Media deleted with the media plugin
 * (5cbb5bcc — DSH's own media system owns that surface); Ray Flows
 * retired with the yaml spec library (35f2f830).
 */
import * as React from 'react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import css from './assets.module.css'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: the seats register() touches ride cordis Context
// declaration-merging from each owning package's ./client entry — the
// renderer owns ctx.slots, sidebar-right owns ctx.sidebarRightTabs.
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type { IconProps } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ManageActDoc, ManageEnvelopeRow, ManageJsonValue } from '@melite/estate-manage/types'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import { Button, Checkbox, DisclosureRow, Menu, IconBranchOutlineRegular, IconDownloadOutlineRegular, IconLinkOutlineRegular, IconPlusOutlineRegular, IconRefreshOutlineRegular, Input } from '@deepseek-ai/dsh-client-ui-primitives'
import { assetsCopy } from '../assetsCopy.ts'

/** The engine's local address — the endpoint field's placeholder and
 *  the value a BLANK Set sends (the field's own default, not a
 *  configurable): ComfyUI's stock bind. */
const DEFAULT_ENDPOINT = 'http://127.0.0.1:8188'

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

/** The operator-confirm gate for a manage arm (2026-10-22, the
 *  auto-mode cure). The lane's auto_provision posture lets agent
 *  sessions — which cannot answer a window.confirm dialog — run the
 *  two DECLARED arms without the prompt: provisioning a declared
 *  model and installing declared registry packs. Everything else
 *  keeps the prompt in every posture: the raw-URL arms are outside
 *  the declaration forever (an unvetted source never rides the
 *  auto lane), and the lifecycle arms stop/restart a shared server.
 * @param action the manage arm id.
 * @param autoProvision the lane's auto_provision posture (status).
 * @returns true when the arm needs the operator confirm first.
 */
export function confirmNeeded(action: string, autoProvision: boolean): boolean {
  if (!autoProvision) return true
  return action !== 'provision_model' && action !== 'install_extension'
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
  /** THE CENSUS PARTIAL MARK (the anima burn, 2026-10-20): true when
   * the scan could not check every declared resource inside its
   * status budget — 'unknown' rows ride the roster and the section
   * must never title its count as the whole truth. */
  census_partial?: boolean
  operations?: unknown[]
  model_options?: ModelOption[]
  model_options_detail?: string
  comfyui_versions?: VersionOption[]
  comfyui_versions_detail?: string
  auto_provision?: boolean
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
  'acquire_retry', 'acquire_discard',
  'launch', 'restart', 'stop', 'update', 'switch_version', 'free',
  'snapshot_save', 'snapshot_restore',
])

const ACTION_LABELS: Readonly<Record<string, string>> = {
  status: assetsCopy.actionRefreshStatus,
  endpoint_set: assetsCopy.actionSetEndpoint,
  list_extensions: assetsCopy.actionReviewPacks,
  install_extension: assetsCopy.actionInstallDeclared,
  install_extension_url: assetsCopy.actionOpenRawPack,
  search_models: assetsCopy.actionSearchModels,
  provision_model: assetsCopy.actionProvisionModel,
  download_model: assetsCopy.actionOpenRawModel,
  // THE RESOURCE ACTION DOORS (audit B2-4): the result dock names
  // the door the fold's Retry/Discard verbs fire.
  acquire_retry: assetsCopy.resourceRetryButton,
  acquire_discard: assetsCopy.resourceDiscardButton,
  // THE LORA DOORS (2026-09-26): the sidebar's own vocabulary now
  // carries the custom-LoRA block.
  lora_list: assetsCopy.actionListLoras,
  lora_install: assetsCopy.actionCopyLora,
  snapshot_list: assetsCopy.actionReviewSnapshots,
  snapshot_save: assetsCopy.saveSnapshot,
  snapshot_restore: assetsCopy.actionRestoreSnapshot,
  launch: assetsCopy.actionLaunch,
  restart: assetsCopy.actionRestart,
  stop: assetsCopy.actionStop,
  free: assetsCopy.freeVram,
  update: assetsCopy.updateComfyui,
  switch_version: assetsCopy.switchVersionSummary,
}

function recordOf(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function stringOr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

/** A refusal voice must carry words: an empty message names the wire's
 *  own refusal rather than rendering a blank line (the card-base
 *  manage lane's law). */
function nonEmptyOr(value: unknown, fallback: string): string {
  return typeof value === 'string' && value !== '' ? value : fallback
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

/** The manage lane's face (the generated namespace's one method —
 *  structural so this panel never imports the remote package at
 *  runtime). */
export interface ManageLane {
  readonly act: (doc: ManageActDoc, signal?: AbortSignal) => Promise<RemoteResult<ManageEnvelopeRow>>
}

/** The seated manage namespace (the deck's apply seats it off its
 *  'remote.manage' inject — the loader guarantees the namespace
 *  exists when apply runs; a panel that renders without it refuses
 *  loud, never silent). */
let seatedManage: ManageLane | undefined

/** Seat the manage namespace (called once by the deck's apply;
 *  `undefined` unseats — the loud-refusal arm a panel render without
 *  the contribution meets). */
export function seatManageNamespace(lane: ManageLane | undefined): void {
  seatedManage = lane
}

// THE LORA BLOCK (the operator's 2026-09-26 order: custom LoRAs belong
// in the ComfyUI Manager sidebar). The block is its own module and
// speaks the manage plane's own two doors (`lora_list`, `lora_install`).
import LoraBlock from './lora-section.tsx'

export async function postManage(action: string, payload: Record<string, ManageJsonValue>, signal?: AbortSignal): Promise<ManageReply> {
  const lane = seatedManage
  if (lane === undefined) {
    throw new Error('manage remote not mounted — the manage contribution must mount before any call')
  }
  const doc: ManageActDoc = { action, ...payload }
  try {
    const settled = await lane.act(doc, signal)
    if (settled.ok === true) {
      const row = settled.value
      const envelope = recordOf(row) ?? {}
      const data = row.data
      return {
        action: row.action,
        ok: row.ok,
        detail: stringOr(row.detail),
        data,
        ...replyFields(envelope, data),
      }
    }
    // The protocol's ONE failure face: the thrown RemoteError folded
    // into the RemoteResult error branch — its message rides verbatim,
    // its details carry the refusal envelope (manage/refused's law).
    const failure: unknown = settled.error
    const errorRecord = recordOf(failure) ?? {}
    const details = recordOf(errorRecord['details']) ?? {}
    const data = details['data']
    return {
      action: stringOr(details['action'], action),
      ok: false,
      detail: nonEmptyOr(errorRecord['message'], 'manage wire: refused'),
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
  return assetsCopy.queueSummary({
    processing: queue.is_processing === true,
    active,
    done,
    total,
  })
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
  if (age >= STATUS_STALE_MS) return assetsCopy.freshnessStale
  if (age < 5_000) return assetsCopy.freshnessFresh
  return assetsCopy.freshnessAged({ seconds: Math.floor(age / 1_000) })
}

function receivedLabel(at: number): string {
  return assetsCopy.receivedUtc({ time: new Date(at).toISOString().slice(11, 19) })
}

function healthKind(status: StatusView | null, receivedAt: number | null, loading: boolean, error: string, now: number): HealthKind {
  if (status === null) return error === '' ? 'loading' : 'status-failure'
  if (loading || error !== '' || receivedAt === null || now - receivedAt >= STATUS_STALE_MS) return 'stale'
  if (status.endpoint?.reachable !== true) return 'engine-failure'
  if (status.manager?.reachable !== true) return 'manager-failure'
  return 'reachable'
}

function healthLabel(kind: HealthKind): string {
  if (kind === 'loading') return assetsCopy.healthLoading
  if (kind === 'stale') return assetsCopy.healthStale
  if (kind === 'reachable') return assetsCopy.healthReachable
  if (kind === 'manager-failure') return assetsCopy.healthManagerFailure
  if (kind === 'engine-failure') return assetsCopy.healthEngineFailure
  return assetsCopy.healthUnavailable
}

function healthDotClass(kind: HealthKind): string {
  if (kind === 'reachable') return css.dotOk
  if (kind === 'loading' || kind === 'stale') return css.dotWarn
  return css.dotBad
}

function resourceLabel(resource: ResourceView): string {
  const ref = resource.ref
  if (ref === undefined) return assetsCopy.resourceFallback
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
    return <pre className={css.pre} tabIndex={0} aria-label={assetsCopy.resultOutputAria}>{data.map(rowLine).join('\n')}</pre>
  }
  return <pre className={css.pre} tabIndex={0} aria-label={assetsCopy.resultOutputAria}>{displayValue(data)}</pre>
}

interface FieldProps {
  label: string
  value: string
  placeholder?: string
  mono?: boolean
  onChange(value: string): void
}

function Field({ label, value, placeholder, mono, onChange }: FieldProps): React.ReactElement {
  // The label row is this tab's layout; the control is the DSH atom
  // (Input passes native attributes through; mono rides className).
  return (
    <label className={css.field}>
      <span className={css.fieldLabel}>{label}</span>
      <Input
        className={mono === true ? css.mono : undefined}
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
      <Input
        className={mono === true ? css.mono : undefined}
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
  // THE DSH MENU SELECT (the zoom.tsx idiom): owner-held open bit,
  // trigger Button rendered in place, compact rows, check selection.
  const [open, setOpen] = useState(false)
  const current = options.find((option) => option.value === value)
  return (
    <div className={css.field}>
      <span className={css.fieldLabel}>{label}</span>
      <Menu
        open={open}
        onClose={() => { setOpen(false) }}
        compact
        portal
        items={[
          { id: '', label: placeholder },
          ...options.map((option) => ({ id: option.value, label: option.label })),
        ]}
        selectedId={value}
        onSelect={(id) => { setOpen(false); onChange(id) }}
        anchor={<Button size="sm" variant="outline" aria-label={label} disabled={disabled} onClick={() => { setOpen(!open) }}>{current?.label ?? placeholder}</Button>}
      />
    </div>
  )
}

function resultLabel(reply: ManageReply, state: string): string {
  if (state === 'partial') return assetsCopy.resultPartial
  if (state === 'restart_required') return assetsCopy.resultRestartRequired
  if (reply.ok !== true) return assetsCopy.resultRefused
  if (state !== '') return state.toUpperCase()
  return assetsCopy.resultOk
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
      aria-label={kind === 'mutation' ? assetsCopy.mutationResultAria : assetsCopy.readResultAria}
    >
      <div className={css.resultRecordHead}>
        <span className={good ? css.resultOk : warn ? css.resultWarn : css.resultBad}>{label}</span>
        <span className={css.resultAction}>{reply.action ?? assetsCopy.unknownFallback}</span>
        <span className={css.resultKind}>{kind === 'mutation' ? assetsCopy.mutationKind : assetsCopy.readKind}</span>
      </div>
      <div className={css.resultMeta}>
        {contract.state !== '' && <span><strong>{assetsCopy.stateLabel}</strong> <span className={css.mono}>{contract.state}</span></span>}
        {contract.operationId !== '' && <span><strong>{assetsCopy.operationIdLabel}</strong> <span className={css.mono}>{contract.operationId}</span></span>}
        {reply.ok !== true && <span><strong>{assetsCopy.errorCodeLabel}</strong> <span className={css.mono}>{contract.code === '' ? assetsCopy.refusedCodeFallback : contract.code}{contract.status === undefined ? '' : assetsCopy.httpSuffix({ status: contract.status })}</span></span>}
        <span><strong>{assetsCopy.receivedLabel}</strong> <time dateTime={new Date(record.receivedAt).toISOString()}>{receivedLabel(record.receivedAt)}</time> · {freshness(record.receivedAt, now)}</span>
      </div>
      <p className={css.resultDetail}><strong>{assetsCopy.detailLabel}</strong> {reply.detail ?? ''}</p>
      {showFlags && (
        <div className={css.resultFlags}>
          <span>{assetsCopy.partialLabel} {contract.partial ? assetsCopy.yesValue : assetsCopy.noValue}</span>
          <span>{assetsCopy.restartRequiredLabel} {contract.restartRequired ? assetsCopy.yesValue : assetsCopy.noValue}</span>
        </div>
      )}
      {nextAction !== '' && (
        <div className={css.nextRow}>
          <Button disabled={locked} onClick={() => { onFollow(nextAction) }}>{assetsCopy.nextLabel({ label: ACTION_LABELS[nextAction] ?? nextAction })}</Button>
        </div>
      )}
      {provision !== null && (
        <div data-testid="provision-state">
          {(provision.requested !== undefined || provision.succeeded !== undefined || provision.missed !== undefined) && (
            <div className={css.resultFlags}>
              <span>{assetsCopy.requestedLabel} {(provision.requested ?? []).join(', ') || assetsCopy.noneFallback}</span>
              <span>{assetsCopy.succeededLabel} {(provision.succeeded ?? []).join(', ') || assetsCopy.noneFallback}</span>
              <span>{assetsCopy.missedLabel} {(provision.missed ?? []).join(', ') || assetsCopy.noneFallback}</span>
              {(provision.misses ?? []).length > 0 && <span>{assetsCopy.detailsLabel} {provision.misses?.join(' · ')}</span>}
            </div>
          )}
          {provision.items.map((item, index) => {
            const itemState = stringOr(item['state'], assetsCopy.unknownFallback)
            return (
              <div className={css.resultItem} key={stringOr(item['key'], String(index))}>
                <span className={resourceStateClass(itemState)}>{itemState}</span>
                <span className={css.mono}>{stringOr(item['key'], assetsCopy.itemFallback)}</span>
                {typeof item['integrity'] === 'string' && <span className={css.sub}>{item['integrity']}</span>}
                {typeof item['errorCode'] === 'string' && <span className={css.errorCode}>{item['errorCode']}</span>}
                {typeof item['detail'] === 'string' && <span className={css.sub}>{item['detail']}</span>}
              </div>
            )
          })}
          {(provision.errors ?? []).map((error, index) => (
            <p className={css.errorCode} key={String(error.file ?? index)}>{error.file ?? assetsCopy.errorFileFallback}: {error.error ?? assetsCopy.errorDetailFallback}</p>
          ))}
        </div>
      )}
      {reply.data !== undefined && reply.data !== null && provision === null && (
        <div className={css.resultData} data-testid="result-data">
          <span className={css.resultDataLabel}>{assetsCopy.outputLabel}</span>
          <DataBody data={reply.data} />
        </div>
      )}
    </article>
  )
}

interface ConfirmRunOptions {
  payload?: Record<string, ManageJsonValue>
  after?(): void
  onUse?(): void
}

export function ComfyManagerPanel(): React.ReactElement {
  // The manage folds' open state (the DisclosureRow law, pattern
  // campaign S4): CONTROLLED, keyed by the manage id (resource rows
  // key on their resource label — one Set seats every fold). The raw
  // <details> elements were uncontrolled.
  const [openFolds, setOpenFolds] = useState<ReadonlySet<string>>(() => new Set())
  const toggleFold = (key: string) => {
    setOpenFolds((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  // THE FIELD DEFAULTS TO THE ENGINE ADDRESS (the operator's
  // 2026-11-05 order, uppercase MUST: "ENDPOINT SETTINGS MUST
  // DEFAULT TO THAT WHEN BLANK"): the value carries the stock local
  // address from the start — a blank never reads as unset. The
  // status reply's live url owns the field only until the user
  // types (touched); a deliberate retype — even one that retypes
  // the default — is never clobbered by a refresh.
  const [epUrl, setEpUrl] = useState(DEFAULT_ENDPOINT)
  const epTouchedRef = useRef(false)
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
  const [extRef, setExtRef] = useState('')
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
        // seed only while UNTOUCHED: the live url owns the field
        // from mount until the user types; the default it opened at
        // is a stand-in, never a lock
        if (typeof live === 'string' && live !== '' && !epTouchedRef.current) setEpUrl(live)
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

  const run = useCallback(async (action: string, payload: Record<string, ManageJsonValue> = {}, recordOutput = true): Promise<ManageReply | null> => {
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
    if (confirmNeeded(action, status?.auto_provision === true)) {
      if (!window.confirm(sentence)) return
    }
    options.onUse?.()
    void run(action, options.payload ?? {}).then((reply) => {
      if (reply !== null && (reply.ok === true || resultContract(reply).partial)) options.after?.()
    })
  }

  function forceSentence(value: boolean): string {
    return assetsCopy.forceSentence({ on: value })
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
    if (target !== null) {
      setOpenFolds((prev) => new Set(prev).add(action))
    }
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
        <h2 className={css.title}>{assetsCopy.panelTitle}</h2>
        {statusDetail !== '' && <span className={css.sub}>{statusDetail}</span>}
      </div>

      <section className={css.section + ' ' + css.healthPanel} aria-live="polite" aria-busy={statusLoading}>
        <div className={css.healthTop}>
          <span className={healthDotClass(kind)} aria-hidden="true" />
          <div className={css.healthCopy}>
            <h3 className={css.healthTitle}>{assetsCopy.healthTitle}</h3>
            <strong className={css.healthLabel} data-testid="health-state">{healthLabel(kind)}</strong>
          </div>
          <Button aria-busy={statusLoading} disabled={locked || (statusLoading)} variant="primary" onClick={() => { void fetchStatus() }}>{assetsCopy.refreshButton}</Button>
        </div>
        {statusError !== '' && <p className={status === null ? css.dangerNote : css.warningNote}>{assetsCopy.refreshFailedNote({ error: statusError, showingLast: status !== null })}</p>}
        {statusLoading && status !== null && <p className={css.sub}>{assetsCopy.refreshingNote}</p>}
        <dl className={css.healthGrid}>
          <div className={css.healthItem}>
            <dt>{assetsCopy.endpointTerm}</dt>
            <dd className={css.wrapText}>{ep?.url ?? assetsCopy.notReported}</dd>
          </div>
          <div className={css.healthItem}>
            <dt>{assetsCopy.engineTerm}</dt>
            <dd>{up ? assetsCopy.reachableValue : assetsCopy.failureValue}{ep?.reason === undefined ? '' : ' · ' + ep.reason}</dd>
          </div>
          <div className={css.healthItem}>
            <dt>{assetsCopy.comfyuiTerm}</dt>
            <dd className={css.mono}>{ep?.comfyui_version === undefined || ep.comfyui_version === null ? '?' : displayValue(ep.comfyui_version)}</dd>
          </div>
          <div className={css.healthItem}>
            <dt>{assetsCopy.managerTerm}</dt>
            <dd>{manager?.reachable === true ? assetsCopy.reachableValue : assetsCopy.failureValue}{manager?.reason === undefined ? '' : ' · ' + manager.reason}</dd>
          </div>
          <div className={css.healthItem}>
            <dt>{assetsCopy.managerVersionTerm}</dt>
            <dd className={css.mono}>{manager?.version === undefined ? '?' : managerVersion(manager.version)}</dd>
          </div>
          <div className={css.healthItem}>
            <dt>{assetsCopy.managerQueueTerm}</dt>
            <dd>{manager?.queue === undefined ? '?' : queueSummary(manager.queue)}</dd>
          </div>
          <div className={css.healthItem}>
            <dt>{assetsCopy.securityTerm}</dt>
            <dd className={css.wrapText}>{manager?.security ?? assetsCopy.notReported}</dd>
          </div>
          <div className={css.healthItem}>
            <dt>{assetsCopy.managerUnitTerm}</dt>
            <dd className={css.wrapText}>{manager?.unit ?? '?'}</dd>
          </div>
          <div className={css.healthItem}>
            <dt>{assetsCopy.runsTerm}</dt>
            <dd>{activeRuns.length === 0 ? assetsCopy.runsIdle : assetsCopy.runsActive({
              count: activeRuns.length,
              // THE CLAMP (the operator's 2026-11-05 report: the run
              // list "takes over the full page"): three names carry
              // the state; the count stays truthful — the row never
              // eats the sidebar on a wide bench.
              names: activeRuns.length <= 3
                ? activeRuns.join(', ')
                : `${activeRuns.slice(0, 3).join(', ')} +${activeRuns.length - 3} more`,
            })}</dd>
          </div>
          <div className={css.healthItem}>
            <dt>{assetsCopy.routingTerm}</dt>
            <dd>{displayValue(status?.routing)}</dd>
          </div>
        </dl>
        <div className={css.nextRow}>
          <Button disabled={locked} onClick={() => { followNext(statusNextAction) }}>{assetsCopy.nextLabel({ label: ACTION_LABELS[statusNextAction] ?? statusNextAction })}</Button>
          {statusReceivedAt !== null && (
            <span className={css.freshness}>
              {assetsCopy.updatedLabel} <time dateTime={new Date(statusReceivedAt).toISOString()}>{receivedLabel(statusReceivedAt)}</time> · {freshness(statusReceivedAt, now)}
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
                  <span className={css.kvKey}>{device.name ?? assetsCopy.gpuFallback}</span>
                  <span className={css.bar}><span className={css.barFill} style={{ width: percent + '%' }} /></span>
                  <span className={css.mono}>{assetsCopy.vramSummary({ free: gb(free), total: gb(total) })}</span>
                </div>
              )
            })}
          </div>
        )}
        {/* The estate's ONE fold grammar (pattern campaign S4):
            DisclosureRow; the wrapper div keeps the anchor id and
            the panel chrome. The link glyph = the engine's address. */}
        <div className={css.advanced} id="manage-endpoint_set">
          <DisclosureRow
            icon={<IconLinkOutlineRegular size={14} />}
            title={assetsCopy.endpointSettings}
            open={openFolds.has('endpoint_set')}
            expandable
            expandOnRowClick
            onToggle={() => { toggleFold('endpoint_set') }}
          >
            <div className={css.row}>
              <Field label={assetsCopy.serverUrlField} value={epUrl} placeholder={DEFAULT_ENDPOINT} mono onChange={(next: string) => { epTouchedRef.current = true; setEpUrl(next) }} />
              {/* A BLANK FIELD SETS THE DEFAULT (the operator's 2026-10-22
               * order): the placeholder names the engine's own address, so
               * pressing Set with nothing typed must mean exactly that —
               * never a blank url refused downstream. */}
              <Button aria-busy={busy === 'endpoint_set'} disabled={locked || busy === 'endpoint_set'} onClick={() => { void run('endpoint_set', { url: epUrl.trim() === '' ? DEFAULT_ENDPOINT : epUrl.trim() }) }}>{assetsCopy.setButton}</Button>
            </div>
          </DisclosureRow>
        </div>
      </section>

      {(mutationResult !== null || visibleRead) && (
        <section className={css.section + ' ' + css.resultDock} data-testid="manage-result" aria-live="polite" aria-busy={locked}>
          <div className={css.resultHead}>
            <h3 className={css.sectionTitle}>{assetsCopy.resultDockTitle}</h3>
            <Button onClick={() => { setMutationResult(null); setReadResult(null) }}>{assetsCopy.clearResultButton}</Button>
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
          restart before the engine's list includes it. The family
          dropdown reads THIS panel's provision catalog — one
          vocabulary for "which families does a LoRA serve". */}
      <section className={css.section} id="manage-loras">
        <LoraBlock familyOptions={modelOptions} />
      </section>

      <section className={css.section} id="manage-resources">
        <h3 className={css.sectionTitle}>{assetsCopy.declaredResourcesTitle} <span className={css.count}>{resources.length}</span></h3>
        {/* THE SEAM NOTE ABOVE ITS SYMPTOMS (S2 + the anima burn's
            B2-2, 2026-10-20): the scan-wide reason renders WHENEVER
            the status carries it — with rows, with none, partial or
            whole. The old seat rendered it only inside the non-empty
            branch, so a timed-out scan painted "No declared
            resources reported." with the seam reason invisible
            exactly when it mattered. */}
        {status?.resources_detail !== undefined && (
          <p className={css.warningNote} data-testid="resources-scan-note">{assetsCopy.resourceScanNote({ detail: status.resources_detail })}</p>
        )}
        {/* THE CENSUS PARTIAL MARK (B2-1, the anima burn): the seat
            marks a scan that could not check every declared resource
            — the count never reads as the whole truth over unknown
            rows, and the note names the door out (Refresh). */}
        {status?.census_partial === true && (
          <p className={css.warningNote} data-testid="resources-census-partial">{assetsCopy.censusPartialNote}</p>
        )}
        {resources.length === 0 ? (
          <p className={css.sub}>{assetsCopy.noDeclaredResources}</p>
        ) : (
          <>
            {(() => {
              // ONE roll-up line (S3): counts by state class, painted
              // once — a billion reds compress to "14 failed".
              const buckets = new Map<string, number>()
              for (const resource of resources) {
                const state = resource.state ?? assetsCopy.unknownFallback
                buckets.set(state, (buckets.get(state) ?? 0) + 1)
              }
              const rollup = [...buckets.entries()]
                .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                .map(([state, count]) => `${count} ${state}`)
                .join(' · ')
              return <p className={css.sub} data-testid="resource-rollup">{rollup}</p>
            })()}
            <ul className={css.resourceList} data-testid="resource-status">
              {resources.map((resource, index) => {
                const state = resource.state ?? assetsCopy.unknownFallback
                const items = resource.items ?? []
                // captured once: the doors' payloads need the id as
                // a plain string, and the fold's closures lose the
                // JSX condition's narrowing
                const operationId = resource.operation_id
                // the fold's own roll-up: "2/3 failed" — the item
                // states compress like the section's (S1). THE
                // CENSUS HONESTY LAW (audit F4, 2026-10-20):
                // 'unknown' items are the scan's own artifact —
                // counting them good ("N items") titles a partial
                // check as the whole truth; they ride their own
                // unchecked voice, never the settled count.
                const badItems = items.filter((item) => {
                  const itemState = item.state ?? assetsCopy.unknownFallback
                  return itemState === 'failed' || itemState === 'blocked' || itemState === 'absent' || itemState === 'missing'
                }).length
                const uncheckedItems = items.filter((item) => {
                  const itemState = item.state ?? assetsCopy.unknownFallback
                  return itemState === 'unknown'
                }).length
                const itemRollup = items.length === 0
                  ? ''
                  : badItems === 0 && uncheckedItems === 0
                    ? `${items.length} item${items.length === 1 ? '' : 's'}`
                    : `${badItems > 0 ? `${badItems}/${items.length} failed` : ''}${badItems > 0 && uncheckedItems > 0 ? ' · ' : ''}${uncheckedItems > 0 ? `${uncheckedItems}/${items.length} unchecked` : ''}`
                return (
                  <li className={css.resourceRow} key={resourceLabel(resource) + ':' + index}>
                    {/* ONE FOLD PER RESOURCE (S1): the state badge is the
                        leading icon (the state IS the row's semantic);
                        the label is the title; the item roll-up rides
                        collapsedContent — the preview of what's inside,
                        hidden once the items themselves show. */}
                    <div className={css.resourceFold} data-testid="resource-fold">
                      <DisclosureRow
                        icon={<span className={resourceStateClass(state)}>{state}</span>}
                        title={resourceLabel(resource)}
                        open={openFolds.has('resource:' + index)}
                        expandable
                        expandOnRowClick
                        onToggle={() => { toggleFold('resource:' + index) }}
                        collapsedContent={(
                          <>
                            {itemRollup !== '' && <span className={css.sub}>{itemRollup}</span>}
                            {resource.operation_id !== undefined && <span className={css.mono}>{assetsCopy.operationIdValue({ id: resource.operation_id })}</span>}
                          </>
                        )}
                      >
                        {resource.detail !== undefined && <p className={css.sub}>{resource.detail}</p>}
                        {/* THE RESOURCE ACTION DOORS (audit B2-4, the
                            anima burn's follow-up: the fold offered
                            no way to act on a dead row — the doors
                            existed door-side only, and the operator
                            could not act on the red. A failed or
                            blocked row that carries an operation_id
                            gets the acquire_retry/acquire_discard
                            verbs; the door itself refuses anything
                            else (a live row 409s, an unknown id
                            404s) — the UI surfaces the door, it
                            never invents the verb. */}
                        {operationId !== undefined && (state === 'failed' || state === 'blocked') && (
                          <div className={css.row} data-testid="resource-doors">
                            <Button
                              aria-busy={busy === 'acquire_retry'}
                              disabled={locked || busy !== null}
                              onClick={() => { confirmRun('acquire_retry', assetsCopy.resourceRetryConfirm({ id: operationId }), { payload: { operation_id: operationId } }) }}
                            >{assetsCopy.resourceRetryButton}</Button>
                            <Button
                              aria-busy={busy === 'acquire_discard'}
                              disabled={locked || busy !== null}
                              onClick={() => { confirmRun('acquire_discard', assetsCopy.resourceDiscardConfirm({ id: operationId }), { payload: { operation_id: operationId } }) }}
                            >{assetsCopy.resourceDiscardButton}</Button>
                          </div>
                        )}
                        {items.length > 0 && (
                          <ul className={css.resourceItems}>
                            {items.map((item, itemIndex) => (
                              <li className={css.resourceItem} key={item.key ?? String(itemIndex)}>
                                <span className={resourceStateClass(item.state ?? assetsCopy.unknownFallback)}>{item.state ?? assetsCopy.unknownFallback}</span>
                                <span className={css.mono}>{item.key ?? item.kind ?? assetsCopy.itemFallback}</span>
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
                      </DisclosureRow>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

      <section className={css.section} id="manage-list_extensions">
        <h3 className={css.sectionTitle}>{assetsCopy.extensionsTitle}</h3>
        <div className={css.row}>
          <Field label={assetsCopy.filterInstalledField} value={extFilter} placeholder={assetsCopy.filterInstalledPlaceholder} onChange={setExtFilter} />
          <Button aria-busy={busy === 'list_extensions'} disabled={locked || busy === 'list_extensions'} onClick={() => { void loadExtensions() }}>{assetsCopy.installedPacksButton}</Button>
        </div>
        {extRows !== null && (
          <ul className={css.list} data-testid="ext-list">
            {extRows
              .filter((row) => row.toLowerCase().includes(extFilter.trim().toLowerCase()))
              .map((row) => <li className={css.listRow} key={row}><span className={css.wrapText}>{row}</span></li>)}
            {extRows.length === 0 && <li className={css.listRow}>{assetsCopy.noPacksInstalled}</li>}
          </ul>
        )}
        <div className={css.row}>
          <Field label={assetsCopy.declaredIdsField} value={extIds} placeholder={assetsCopy.declaredIdsPlaceholder} mono onChange={setExtIds} />
          <Button
            aria-busy={busy === 'install_extension'}
            disabled={locked || extIds.trim() === '' || busy === 'install_extension'}
            onClick={() => {
              const nodes = extIds.split(',').map((value) => value.trim()).filter((value) => value !== '')
              confirmRun('install_extension', 'Install declared extension pack(s) ' + nodes.join(', ') + ' through the manager rail?', {
                payload: { nodes },
                after: () => { if (extRows !== null) void loadExtensions(false) },
              })
            }}
          >{assetsCopy.installButton}</Button>
        </div>
        {/* The plus glyph = adding a pack; the operator badge rides
            collapsedContent (kept while open — the row stays marked). */}
        <div className={css.advanced} id="manage-install_extension_url">
          <DisclosureRow
            icon={<IconPlusOutlineRegular size={14} />}
            title={assetsCopy.installFromUrlSummary}
            open={openFolds.has('install_extension_url')}
            expandable
            expandOnRowClick
            onToggle={() => { toggleFold('install_extension_url') }}
            keepContentWhenOpen
            collapsedContent={<span className={css.operatorBadge}>{assetsCopy.operatorBadge}</span>}
          >
            <p className={css.operatorNote}>{assetsCopy.rawUrlNote}</p>
            <div className={css.row}>
              <Field label={assetsCopy.gitUrlField} value={extUrl} placeholder={assetsCopy.gitUrlPlaceholder} mono onChange={setExtUrl} />
              <Field label={assetsCopy.refPinField} value={extRef} placeholder={assetsCopy.refPinPlaceholder} mono onChange={setExtRef} />
              <Button
                aria-busy={busy === 'install_extension_url'}
                disabled={locked || extUrl.trim() === '' || busy === 'install_extension_url'}
                onClick={() => {
                  const url = extUrl.trim()
                  const ref = extRef.trim()
                  confirmRun('install_extension_url', 'Install extension from operator-vetted URL ' + url + (ref === '' ? ' (unpinned — floats with branch head)?' : ' @ ' + ref + '?'), {
                    // the browser confirm IS the human approval the flag asserts
                    payload: { url, ...(ref === '' ? {} : { ref }), operator_confirmed: true },
                    after: () => { if (extRows !== null) void loadExtensions(false) },
                  })
                }}
              >{assetsCopy.installFromUrlButton}</Button>
            </div>
          </DisclosureRow>
        </div>
      </section>

      <section className={css.section} id="manage-search_models">
        <h3 className={css.sectionTitle}>{assetsCopy.modelsTitle}</h3>
        <div className={css.row}>
          <Field label={assetsCopy.modelSearchField} value={modelQuery} placeholder={assetsCopy.modelSearchPlaceholder} onChange={setModelQuery} />
          <Button aria-busy={busy === 'search_models'} disabled={locked || modelQuery.trim() === '' || busy === 'search_models'} onClick={() => { void run('search_models', { query: modelQuery.trim() }) }}>{assetsCopy.searchButton}</Button>
        </div>
        {/* The download glyph = a model fetch; the declared catalog
            (provision) and the raw URL (download) are the SAME
            semantic — same glyph, the cross-tree canon. */}
        <div className={css.advanced} id="manage-provision_model">
          <DisclosureRow
            icon={<IconDownloadOutlineRegular size={14} />}
            title={assetsCopy.provisionSummary}
            open={openFolds.has('provision_model')}
            expandable
            expandOnRowClick
            onToggle={() => { toggleFold('provision_model') }}
          >
            <div className={css.row}>
              <SearchField
                label={assetsCopy.provisionCatalogField}
                value={provModel}
                options={modelOptions.map((model) => ({ value: model.id, label: model.label + (model.genre === undefined ? '' : ' · ' + model.genre) }))}
                placeholder={assetsCopy.provisionCatalogPlaceholder}
                mono
                onChange={changeModel}
              />
              {modelOptions.length === 0 ? (
                <>
                  <Field label={assetsCopy.variantField} value={provVariant} onChange={setProvVariant} />
                  <Field label={assetsCopy.quantField} value={provQuant} onChange={setProvQuant} />
                </>
              ) : (
                <>
                  <SelectField
                    label={assetsCopy.variantField}
                    value={provVariant}
                    options={(selectedModel?.variants ?? []).map((variant) => ({ value: variant.id, label: variant.label }))}
                    placeholder={assetsCopy.defaultVariantPlaceholder}
                    disabled={selectedModel === undefined}
                    onChange={changeVariant}
                  />
                  <SelectField
                    label={assetsCopy.quantField}
                    value={provQuant}
                    options={quantOptions.map((quant) => ({ value: quant.id, label: quant.label }))}
                    placeholder={assetsCopy.defaultQuantPlaceholder}
                    disabled={selectedVariant === undefined || quantOptions.length === 0}
                    onChange={setProvQuant}
                  />
                </>
              )}
              <Button
                aria-busy={busy === 'provision_model'}
                disabled={busy === 'provision_model' || locked || provModel.trim() === '' || (modelOptions.length > 0 && selectedModel === undefined)}
                onClick={() => {
                  const payload: Record<string, ManageJsonValue> = { model: provModel.trim() }
                  if (provVariant.trim() !== '') payload.variant = provVariant.trim()
                  if (provQuant.trim() !== '') payload.quant = provQuant.trim()
                  confirmRun('provision_model', 'Provision declared model ' + provModel.trim() + ' from the catalog?', { payload })
                }}
              >{assetsCopy.provisionButton}</Button>
            </div>
            {status?.model_options_detail !== undefined && <p className={css.warningNote}>{assetsCopy.modelCatalogNote({ detail: status.model_options_detail })}</p>}
          </DisclosureRow>
        </div>
        <div className={css.advanced} id="manage-download_model">
          <DisclosureRow
            icon={<IconDownloadOutlineRegular size={14} />}
            title={assetsCopy.downloadSummary}
            open={openFolds.has('download_model')}
            expandable
            expandOnRowClick
            onToggle={() => { toggleFold('download_model') }}
            keepContentWhenOpen
            collapsedContent={<span className={css.operatorBadge}>{assetsCopy.operatorBadge}</span>}
          >
            <p className={css.operatorNote}>{assetsCopy.rawDownloadNote}</p>
            <div className={css.row}>
              <Field label={assetsCopy.downloadUrlField} value={dlUrl} placeholder={assetsCopy.downloadUrlPlaceholder} mono onChange={setDlUrl} />
              <Field label={assetsCopy.relativePathField} value={dlPath} placeholder={assetsCopy.relativePathPlaceholder} mono onChange={setDlPath} />
              <Field label={assetsCopy.filenameField} value={dlName} placeholder={assetsCopy.filenamePlaceholder} mono onChange={setDlName} />
              <Button
                aria-busy={busy === 'download_model'}
                disabled={locked || dlUrl.trim() === '' || busy === 'download_model'}
                onClick={() => {
                  const payload: Record<string, ManageJsonValue> = { url: dlUrl.trim() }
                  if (dlPath.trim() !== '') payload.relative_path = dlPath.trim()
                  if (dlName.trim() !== '') payload.filename = dlName.trim()
                  // the browser confirm IS the human approval the flag asserts
                  confirmRun('download_model', 'Queue operator-vetted download of ' + (dlName.trim() || dlUrl.trim()) + '?', { payload: { ...payload, operator_confirmed: true } })
                }}
              >{assetsCopy.downloadButton}</Button>
            </div>
          </DisclosureRow>
        </div>
      </section>

      <section className={css.section} id="manage-snapshot_list">
        <h3 className={css.sectionTitle}>{assetsCopy.snapshotsTitle}</h3>
        <p className={css.sub}>{assetsCopy.snapshotsNote}</p>
        <div className={css.row}>
          <Button aria-busy={busy === 'snapshot_list'} disabled={locked || busy === 'snapshot_list'} onClick={() => { void loadSnapshots() }}>{assetsCopy.listSnapshotsButton}</Button>
          <Button aria-busy={busy === 'snapshot_save'} disabled={locked || busy === 'snapshot_save'} variant="primary" onClick={() => {
            confirmRun('snapshot_save', 'Save an environment snapshot (ComfyUI + packs + dependencies)?', {
              after: () => { void loadSnapshots(false) },
            })
          }}>{assetsCopy.saveSnapshot}</Button>
        </div>
        {snapRows !== null && (
          <ul className={css.list} data-testid="snap-list">
            {snapRows.map((snapshot) => (
              <li className={css.listRow + ' ' + css.snapshotRow} key={snapshot}>
                <span className={css.wrapText}>{snapshot}</span>
                <Button
                  className={css.btnDanger}
                  aria-busy={busy === 'snapshot_restore'}
                  disabled={locked || busy === 'snapshot_restore'}
                  onClick={() => {
                    const force = restoreForce
                    confirmRun('snapshot_restore', 'Restore snapshot ' + snapshot + '? This rewrites extensions and dependencies.' + forceSentence(force), {
                      payload: { snapshot, force },
                      onUse: () => { setRestoreForce(false) },
                      after: () => { void loadSnapshots(false) },
                    })
                  }}
                >{assetsCopy.restoreButton}</Button>
              </li>
            ))}
            {snapRows.length === 0 && <li className={css.listRow}>{assetsCopy.noSnapshots}</li>}
          </ul>
        )}
        <Checkbox className={css.checkRow} checked={restoreForce} label={assetsCopy.forceRestoreLabel} disabled={locked} onChange={setRestoreForce} />
      </section>

      <section className={css.section} id="manage-logs">
        <h3 className={css.sectionTitle}>{assetsCopy.logsTitle}</h3>
        <div className={css.row}>
          <Field label={assetsCopy.tailLinesField} value={logTail} onChange={setLogTail} mono />
          <Button aria-busy={busy === 'logs'} disabled={locked || busy === 'logs'} onClick={() => {
            const tail = Math.max(1, Math.min(Number.parseInt(logTail, 10) || 200, 2_000))
            void run('logs', { tail })
          }}>{assetsCopy.viewLogsButton}</Button>
        </div>
      </section>

      <section className={css.section} id="manage-lifecycle">
        <h3 className={css.sectionTitle}>{assetsCopy.lifecycleTitle}</h3>
        {activeRuns.length > 0 && <p className={css.dangerNote}>{assetsCopy.guardedRunsNote({ count: activeRuns.length })}</p>}
        {up && !byo ? (
          <>
            <div className={css.lifecycleActions}>
              <Button aria-busy={busy === 'restart'} disabled={locked || busy === 'restart'} className={css.btnDanger} onClick={() => {
                const force = lifecycleForce
                confirmRun('restart', 'Restart the ComfyUI server?' + forceSentence(force), {
                  payload: { force },
                  onUse: () => { setLifecycleForce(false) },
                })
              }}>{assetsCopy.restartButton}</Button>
              <Button aria-busy={busy === 'stop'} disabled={locked || busy === 'stop'} className={css.btnDanger} onClick={() => {
                const force = lifecycleForce
                confirmRun('stop', 'Stop the ComfyUI server?' + forceSentence(force), {
                  payload: { force },
                  onUse: () => { setLifecycleForce(false) },
                })
              }}>{assetsCopy.stopButton}</Button>
              <Button aria-busy={busy === 'free'} disabled={locked || busy === 'free'} onClick={() => {
                const force = lifecycleForce
                confirmRun('free', 'Ask ComfyUI to free memory on its next worker iteration?' + forceSentence(force), {
                  payload: { force },
                  onUse: () => { setLifecycleForce(false) },
                })
              }}>{assetsCopy.freeVram}</Button>
            </div>
            <Checkbox className={css.checkRow} checked={lifecycleForce} label={assetsCopy.forceLifecycleLabel} disabled={locked} onChange={setLifecycleForce} />
            {/* The refresh glyph = lifecycle engine maintenance. */}
            <div className={css.advanced} id="manage-update">
              <DisclosureRow
                icon={<IconRefreshOutlineRegular size={14} />}
                title={assetsCopy.advancedUpdateSummary}
                open={openFolds.has('update')}
                expandable
                expandOnRowClick
                onToggle={() => { toggleFold('update') }}
              >
                <div className={css.row}>
                  <Button aria-busy={busy === 'update'} disabled={locked || busy === 'update'} className={css.btnDanger} onClick={() => {
                    const force = lifecycleForce
                    confirmRun('update', 'Update ComfyUI through the built-in manager?' + forceSentence(force), {
                      payload: { target: 'comfy', force },
                      onUse: () => { setLifecycleForce(false) },
                    })
                  }}>{assetsCopy.updateComfyui}</Button>
                </div>
              </DisclosureRow>
            </div>
            {/* The branch glyph = version lineage: a version IS the lineage concept. */}
            <div className={css.advanced} id="manage-switch_version">
              <DisclosureRow
                icon={<IconBranchOutlineRegular size={14} />}
                title={assetsCopy.switchVersionSummary}
                open={openFolds.has('switch_version')}
                expandable
                expandOnRowClick
                onToggle={() => { toggleFold('switch_version') }}
              >
                <div className={css.row}>
                  {comfyuiVersions.length === 0 ? (
                    <Field label={assetsCopy.switchToVersionField} value={swVersion} placeholder={assetsCopy.switchVersionPlaceholder} mono onChange={setSwVersion} />
                  ) : (
                    <SelectField
                      label={assetsCopy.switchToVersionField}
                      value={swVersion}
                      options={comfyuiVersions.map((version) => ({ value: version.id, label: version.label }))}
                      placeholder={assetsCopy.selectVersionPlaceholder}
                      onChange={setSwVersion}
                    />
                  )}
                  {status?.comfyui_versions_detail !== undefined && <p className={css.warningNote}>{assetsCopy.versionCatalogNote({ detail: status.comfyui_versions_detail })}</p>}
                  <Button
                    aria-busy={busy === 'switch_version'}
                    disabled={locked || swVersion.trim() === '' || busy === 'switch_version'}
                    className={css.btnDanger}
                    onClick={() => {
                      const force = lifecycleForce
                      confirmRun('switch_version', 'Switch ComfyUI to ' + swVersion.trim() + '?' + forceSentence(force), {
                        payload: { version: swVersion.trim(), force },
                        onUse: () => { setLifecycleForce(false) },
                      })
                    }}
                  >{assetsCopy.switchButton}</Button>
                </div>
              </DisclosureRow>
            </div>
          </>
         ) : status === null ? (
           <p className={css.sub}>{assetsCopy.lifecycleLockedNote}</p>
         ) : byo ? (
           <p className={css.sub}>{assetsCopy.byoNote}</p>
         ) : (
           <div className={css.lifecycleActions}>
             <Button aria-busy={busy === 'launch'} disabled={locked || busy === 'launch'} variant="primary" onClick={() => { confirmRun('launch', 'Launch the ComfyUI server?') }}>{assetsCopy.launchButton}</Button>
           </div>
         )}
      </section>
    </div>
  )
}

function ComfyIcon({ size }: { size?: number }) {
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

/**
 * register — the ONE DSH right-sidebar tab registration helper over the
 * TYPED seats (D4 cure 2026-11-05: the local structural TabCtx freeze
 * died; the real registry/slot faces merge onto cordis Context from the
 * owning DSH packages' ./client entries, so a registry-shape change
 * surfaces at compile time). Copy rides assetsCopy (D1 cure) — this
 * call's title/guide arguments are dictionary reads, never literals.
 */
function register(ctx: ClientContext, id: string, kind: string, title: string, guideOrder: number, guideDescription: string, icon: React.ComponentType<IconProps>, component: (props: object) => React.ReactElement): void {
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
      icon,
    }],
  }), 'melite-card-deck: ' + id + ' tab type')
  ctx.slots.inject('sidebar.right.pane.tab', () => {
    const dispose = ctx.slots.register(
      { name: 'sidebar.right.pane.tab', key: id },
      component,
    )
    // THE FUNCTIONLESS SEAT (the wall's own arm): a registry that
    // answers no disposer degrades to a noop — the fiber unload never
    // crashes on a seat's loose return.
    return typeof dispose === 'function' ? dispose : () => {}
  })
}

export function registerAssetsTab(ctx: ClientContext): void {
  register(ctx, 'melite-card-deck:comfy', 'comfy-manager', assetsCopy.panelTitle, 61, assetsCopy.comfyGuide, ComfyIcon, ComfyManagerPanel)
}
