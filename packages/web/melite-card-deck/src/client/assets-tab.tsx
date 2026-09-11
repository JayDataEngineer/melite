/**
 * assets-tab — the ONE DSH right-sidebar tab that is NOT cards:
 *
 *   ComfyUI Manager — a direct GUI on the estate's management plane.
 *     Every button is ONE action of the manage-plane SSOT
 *     (@melite/estate-queue's managePlane.ts — comfy-mcp +
 *     comfyui-manager + comfy-cli), reached over the `manage` Typert
 *     remote: a same-origin POST /api/manage/act carrying the
 *     client-request wire frame (the documented frame pair,
 *     api-gateway.md — the sanctioned caller shape for plugins outside
 *     the DSH web kernel; the host mounts the remote in the estate
 *     composition). The vocabulary mirrors the comfy_manage agent tool
 *     1:1 — enforced BOTH directions by the parity wall. Progressive
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
import { useCallback, useEffect, useState } from 'react'
import css from './assets.module.css'

/** One manage action's reply — the SSOT envelope {action, ok, detail, data}. */
interface ManageReply {
  action?: string
  ok?: boolean
  detail?: string
  data?: unknown
}

/** The status action's data member — managePlane.ts hStatus. */
interface StatusView {
  endpoint?: {
    reachable?: boolean
    url?: string
    reason?: string
    comfyui_version?: string
    devices?: Array<{ name?: string; vram_total?: number; vram_free?: number }>
  }
  server_info?: { running?: boolean } & Record<string, unknown>
  manager_security?: string
  active_runs?: string[]
  routing?: Record<string, unknown>
}

/** Correlation id for one client-request frame (the reference caller
 * uses a random uuid per call; crypto.randomUUID is the browser
 * standard). */
function nextRpcId(): string {
  const cryptoApi: Crypto | undefined = globalThis.crypto
  if (cryptoApi?.randomUUID !== undefined) return cryptoApi.randomUUID()
  return 'rpc-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36)
}

/** POST one manage action over the `manage` remote's wire door —
 * same-origin /api/manage/act carrying the documented client-request
 * frame (api-gateway.md; the manage-remote wall pins the server
 * half). The single argument is `doc` (the adapter's parameter name
 * — the wire field rides it verbatim).
 *
 * A refusal is a DOMAIN outcome: the envelope carries it (ok:false +
 * detail), and a manage/refused RemoteError maps back onto the same
 * shape (its details ride the refused envelope's action/status/data).
 * A channel surprise (no /api route, malformed frame) is an honest
 * REFUSAL reply — never a silent success, never a throw past the
 * panel (an AbortError rethrows — cancellation is the caller's). */
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
      return { action, ok: false, detail: 'manage wire: HTTP ' + String(response.status) }
    }
    const body: unknown = await response.json()
    if (typeof body !== 'object' || body === null || Reflect.get(body, 'type') !== 'server-response' || Reflect.get(body, 'rpcId') !== rpcId) {
      return { action, ok: false, detail: 'manage wire: malformed response frame' }
    }
    const result: unknown = Reflect.get(body, 'result')
    if (typeof result !== 'object' || result === null) {
      return { action, ok: false, detail: 'manage wire: malformed result' }
    }
    if (Reflect.get(result, 'ok') === true) {
      const value: unknown = Reflect.get(result, 'value')
      if (typeof value !== 'object' || value === null) {
        return { action, ok: false, detail: 'manage wire: malformed envelope' }
      }
      return {
        action: typeof Reflect.get(value, 'action') === 'string' ? Reflect.get(value, 'action') as string : action,
        ok: Reflect.get(value, 'ok') === true,
        detail: typeof Reflect.get(value, 'detail') === 'string' ? Reflect.get(value, 'detail') as string : '',
        data: Reflect.get(value, 'data'),
      }
    }
    // The RemoteError branch: code/message/details (a manage/refused
    // refusal carries the envelope's action/status/data in details).
    const error: unknown = Reflect.get(result, 'error')
    if (typeof error !== 'object' || error === null) {
      return { action, ok: false, detail: 'manage wire: refused without an error frame' }
    }
    const details: unknown = Reflect.get(error, 'details')
    const d = typeof details === 'object' && details !== null ? details as Record<string, unknown> : {}
    return {
      action: typeof d['action'] === 'string' ? d['action'] : action,
      ok: false,
      detail: typeof Reflect.get(error, 'message') === 'string' ? Reflect.get(error, 'message') as string : 'manage wire: refused',
      data: d['data'],
    }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw e
    return { action, ok: false, detail: e instanceof Error ? e.message : String(e) }
  }
}

/** Bytes → GB string (ComfyUI reports raw bytes in system_stats). */
function gb(bytes: unknown): string {
  return typeof bytes === 'number' && bytes > 0 ? (bytes / 2 ** 30).toFixed(1) : '?'
}

/** The result pane's data body: arrays render as lines (logs), else JSON. */
function DataBody({ data }: { data: unknown }): React.ReactElement {
  if (Array.isArray(data)) {
    return <pre className={css.pre}>{data.map((line) => String(line)).join('\n')}</pre>
  }
  return <pre className={css.pre}>{JSON.stringify(data, null, 2)}</pre>
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
        className={css.input + (mono ? ' ' + css.mono : '')}
        value={value}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value) }}
      />
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
      onClick={onClick}
    >
      {busy === true ? '… ' : ''}{children}
    </button>
  )
}

/** Mutating actions — the status section silently refreshes after each
 * (the result pane keeps the action's own reply; status never competes
 * for it — the shared-pane wipe bug, dead 2026-09-06). */
const MUTATING: ReadonlySet<string> = new Set([
  'install_extension', 'install_extension_url',
  'download_model', 'provision_model',
  'launch', 'restart', 'stop', 'update', 'switch_version', 'free',
  'snapshot_save', 'snapshot_restore',
])

/**
 * ComfyManagerPanel — the tab body. Exported for the vitest suite
 * (src/client/__tests__/assets-tab.test.tsx); the shell mounts it
 * through registerAssetsTab below. Hook-based: status auto-loads on
 * mount, every action posts through postManage and lands in the shared
 * result pane; mutating actions confirm first with the exact dispatch
 * and silently refresh the status section afterwards.
 */
export function ComfyManagerPanel(): React.ReactElement {
  const [epUrl, setEpUrl] = useState('')
  const [status, setStatus] = useState<StatusView | null>(null)
  const [statusDetail, setStatusDetail] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [result, setResult] = useState<ManageReply | null>(null)

  // Browse state — discovery renders as rows in place (never re-typed
  // into install inputs by hand).
  const [extRows, setExtRows] = useState<string[] | null>(null)
  const [extFilter, setExtFilter] = useState('')
  const [snapRows, setSnapRows] = useState<string[] | null>(null)

  // Form state — one member per manage action input.
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
  const [updateTarget, setUpdateTarget] = useState('comfy')
  const [force, setForce] = useState(false)

  /** Silent status refresh — updates the status section ONLY. The
   * result pane belongs to the user's last explicit dispatch; a status
   * reply landing there used to wipe search/browse results. */
  const fetchStatus = useCallback(async (): Promise<void> => {
    try {
      const reply = await postManage('status', {})
      if (reply.ok === true) {
        const view = reply.data as StatusView | undefined ?? null
        setStatus(view)
        // Seed the server-url field from the live status ONLY while
        // the operator has not typed (functional update — no epUrl
        // dep, so typing/clearing never refetches and a refresh never
        // clobbers an in-progress edit).
        const live = (view as { endpoint?: { url?: unknown } } | null)?.endpoint?.url
        if (typeof live === 'string' && live !== '') {
          setEpUrl((prev) => (prev === '' ? live : prev))
        }
      }
      setStatusDetail(reply.detail ?? '')
    } catch (e) {
      setStatusDetail('request failed: ' + String(e))
    }
  }, [])

  useEffect(() => { void fetchStatus() }, [fetchStatus])

  /** Dispatch one action; the reply lands in the result pane. A
   * mutating action silently refreshes the status section afterwards
   * (launch/restart/stop visibly change it — the panel must show the
   * world the action made, not the world before it). */
  const run = useCallback(async (action: string, payload: Record<string, unknown> = {}): Promise<ManageReply | null> => {
    setBusy(action)
    try {
      const reply = await postManage(action, payload)
      setResult(reply)
      return reply
    } catch (e) {
      setResult({ action, ok: false, detail: 'request failed: ' + String(e) })
      return null
    } finally {
      setBusy(null)
      if (MUTATING.has(action)) void fetchStatus()
    }
  }, [fetchStatus])

  /** Browse rows: installed packs — the manage rail's rows are
   *  {name, version} objects; render "name — version" (never
   *  [object Object] — the operator-caught regression). */
  const loadExtensions = useCallback(async (): Promise<void> => {
    const reply = await run('list_extensions')
    if (reply !== null && reply.ok === true && Array.isArray(reply.data)) {
      setExtRows(reply.data.map((row): string => {
        if (typeof row === 'string') return row
        if (typeof row === 'object' && row !== null) {
          const r = row as { name?: unknown; version?: unknown; ver?: unknown }
          const name = typeof r.name === 'string' ? r.name : '?'
          const ver = typeof r.version === 'string' ? r.version
            : typeof r.ver === 'string' ? r.ver : '?'
          return name + ' — ' + ver
        }
        return String(row)
      }))
    }
  }, [run])

  /** Browse rows: saved snapshots. */
  const loadSnapshots = useCallback(async (): Promise<void> => {
    const reply = await run('snapshot_list')
    if (reply !== null && reply.ok === true && Array.isArray(reply.data)) {
      setSnapRows(reply.data.map(String))
    }
  }, [run])

  /** Mutating actions confirm with the exact dispatch (one sentence). */
  function confirmRun(action: string, sentence: string, payload: Record<string, unknown> = {}, after?: () => void): void {
    if (window.confirm(sentence)) {
      void run(action, payload).then(() => { if (after !== undefined) after() })
    }
  }

  const ep = status?.endpoint
  const up = ep?.reachable === true
  const workspaceUp = status?.server_info?.running === true
  const activeRuns = status?.active_runs ?? []
  return (
    <div className={css.root} data-comfy-manager="">
      <div className={css.head}>
        <h2 className={css.title}>ComfyUI Manager</h2>
        <span className={css.sub}>{statusDetail}</span>
        <Btn onClick={() => { void fetchStatus() }} primary>Refresh</Btn>
      </div>

      {/* ── STATUS (the cheap index — everything else keys off it) ── */}
      <section className={css.section}>
        <h3 className={css.sectionTitle}>Server</h3>
        <div className={css.kvRow}>
          <span className={up ? css.dotOk : workspaceUp ? css.dotWarn : css.dotBad} aria-hidden="true" />
          <span className={css.kvKey}>{up ? 'reachable' : workspaceUp ? 'workspace up, server down' : 'not reachable'}</span>
          <span className={css.mono}>{ep?.url ?? ''}{ep?.reachable !== true && ep?.reason !== undefined ? ' — ' + ep.reason : ''}</span>
        </div>
        {ep?.comfyui_version !== undefined && ep.comfyui_version !== null && (
          <div className={css.kvRow}><span className={css.kvKey}>version</span><span className={css.mono}>{String(ep.comfyui_version)}</span></div>
        )}
        {/* THE OPERATOR'S URL CHANGE (endpoint_set): validate-first —
            an unreachable URL is refused server-side and never
            written; the field seeds from the live status. */}
        <div className={css.row}>
          <Field label="server url" value={epUrl} placeholder="http://127.0.0.1:8188" mono onChange={setEpUrl} />
          <Btn
            busy={busy === 'endpoint_set'}
            disabled={epUrl.trim() === ''}
            onClick={() => { void run('endpoint_set', { url: epUrl.trim() }) }}
          >Set</Btn>
        </div>
        {(ep?.devices ?? []).map((d, i) => {
          const total = typeof d.vram_total === 'number' ? d.vram_total : 0
          const free = typeof d.vram_free === 'number' ? d.vram_free : 0
          const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((free / total) * 100))) : 0
          return (
            <div className={css.device} key={i}>
              <span className={css.kvKey}>{d.name ?? 'gpu'}</span>
              <span className={css.bar}><span className={css.barFill} style={{ width: pct + '%' }} /></span>
              <span className={css.mono}>{gb(free)} / {gb(total)} GB free</span>
            </div>
          )
        })}
        <div className={css.chips}>
          {status?.manager_security !== undefined && (
            <span className={css.chip}>manager security: {String(status.manager_security)}</span>
          )}
          {Object.entries(status?.routing ?? {}).map(([k, v]) => (
            <span className={css.chip} key={k}>{k}: {String(v)}</span>
          ))}
          <span className={activeRuns.length > 0 ? css.chipWarn : css.chip}>
            active runs: {activeRuns.length}{activeRuns.length > 0 ? ' (' + activeRuns.join(', ') + ')' : ''}
          </span>
        </div>
      </section>

      {/* ── RESULT (the last reply — every action lands here) ── */}
      {result !== null && (
        <section className={css.section} data-testid="manage-result">
          <div className={css.resultHead}>
            <span className={result.ok === true ? css.resultOk : css.resultBad}>{result.ok === true ? 'OK' : 'REFUSED'}</span>
            <span className={css.mono}>{result.action ?? '?'}</span>
            <span className={css.sub}>{result.detail ?? ''}</span>
          </div>
          {result.data !== undefined && result.data !== null && (
            <details className={css.details}>
              <summary>data</summary>
              <DataBody data={result.data} />
            </details>
          )}
        </section>
      )}

      {/* ── EXTENSIONS (EXTENSION LAW: declared, installed via the rail) ── */}
      <section className={css.section}>
        <h3 className={css.sectionTitle}>Extensions</h3>
        <div className={css.row}>
          <Field label="filter installed" value={extFilter} placeholder="kj, moge…" onChange={setExtFilter} />
          <Btn busy={busy === 'list_extensions'} onClick={() => { void loadExtensions() }}>Installed packs</Btn>
        </div>
        {extRows !== null && (
          <ul className={css.list} data-testid="ext-list">
            {extRows
              .filter((r) => r.toLowerCase().includes(extFilter.trim().toLowerCase()))
              .map((r) => (
                <li className={css.listRow} key={r}><span className={css.mono}>{r}</span></li>
              ))}
            {extRows.length === 0 && <li className={css.listRow}>no packs installed</li>}
          </ul>
        )}
        <div className={css.row}>
          <Field label="registry ids (comma-separated)" value={extIds} placeholder="ComfyUI-KJNodes, ComfyUI-VideoHelperSuite" mono onChange={setExtIds} />
          <Btn
            busy={busy === 'install_extension'}
            disabled={extIds.trim() === ''}
            onClick={() => {
              const nodes = extIds.split(',').map((s) => s.trim()).filter((s) => s !== '')
              confirmRun('install_extension', 'Install extension pack(s) ' + nodes.join(', ') + ' through the manager rail?', { nodes },
                () => { if (extRows !== null) void loadExtensions() })
            }}
          >Install</Btn>
        </div>
        <div className={css.row}>
          <Field label="git URL (cm_cli direct)" value={extUrl} placeholder="https://github.com/…" mono onChange={setExtUrl} />
          <Btn
            busy={busy === 'install_extension_url'}
            disabled={extUrl.trim() === ''}
            onClick={() => {
              confirmRun('install_extension_url', 'Install extension from ' + extUrl.trim() + '?', { url: extUrl.trim() },
                () => { if (extRows !== null) void loadExtensions() })
            }}
          >Install from URL</Btn>
        </div>
      </section>

      {/* ── SNAPSHOTS (the Manager's safety net, on the cm_cli rail) ── */}
      <section className={css.section}>
        <h3 className={css.sectionTitle}>Snapshots</h3>
        <p className={css.sub}>Save before update / switch_version — restore is refused while runs are active (force overrides).</p>
        <div className={css.row}>
          <Btn busy={busy === 'snapshot_list'} onClick={() => { void loadSnapshots() }}>List snapshots</Btn>
          <Btn busy={busy === 'snapshot_save'} primary onClick={() => {
            confirmRun('snapshot_save', 'Save an environment snapshot (comfyui + packs + pip)?', {},
              () => { void loadSnapshots() })
          }}>Save snapshot</Btn>
        </div>
        {snapRows !== null && (
          <ul className={css.list} data-testid="snap-list">
            {snapRows.map((s) => (
              <li className={css.listRow} key={s}>
                <span className={css.mono}>{s}</span>
                <Btn
                  danger
                  busy={busy === 'snapshot_restore'}
                  onClick={() => {
                    confirmRun('snapshot_restore', 'Restore snapshot ' + s + '? Rewrites extensions + deps (restart required) — refused while runs are active unless force.', { snapshot: s, force },
                      () => { void loadSnapshots() })
                  }}
                >Restore</Btn>
              </li>
            ))}
            {snapRows.length === 0 && <li className={css.listRow}>no snapshots — save one before switch/update</li>}
          </ul>
        )}
      </section>

      {/* ── MODELS (search → download/provision what it returns) ── */}
      <section className={css.section}>
        <h3 className={css.sectionTitle}>Models</h3>
        <div className={css.row}>
          <Field label="search" value={modelQuery} placeholder="sdxl, wan…" onChange={setModelQuery} />
          <Btn
            busy={busy === 'search_models'}
            disabled={modelQuery.trim() === ''}
            onClick={() => { void run('search_models', { query: modelQuery.trim() }) }}
          >Search</Btn>
        </div>
        <div className={css.row}>
          <Field label="download URL" value={dlUrl} placeholder="https://…/model.safetensors" mono onChange={setDlUrl} />
          <Field label="relative path" value={dlPath} placeholder="models/checkpoints" mono onChange={setDlPath} />
          <Field label="filename" value={dlName} placeholder="model.safetensors" mono onChange={setDlName} />
          <Btn
            busy={busy === 'download_model'}
            disabled={dlUrl.trim() === ''}
            onClick={() => {
              const payload: Record<string, unknown> = { url: dlUrl.trim() }
              if (dlPath.trim() !== '') payload.relative_path = dlPath.trim()
              if (dlName.trim() !== '') payload.filename = dlName.trim()
              confirmRun('download_model', 'Queue download of ' + (dlName.trim() || dlUrl.trim()) + '?', payload)
            }}
          >Download</Btn>
        </div>
        <div className={css.row}>
          <Field label="provision catalog id" value={provModel} placeholder="z-image" mono onChange={setProvModel} />
          <Field label="variant" value={provVariant} onChange={setProvVariant} />
          <Field label="quant" value={provQuant} onChange={setProvQuant} />
          <Btn
            busy={busy === 'provision_model'}
            disabled={provModel.trim() === ''}
            onClick={() => {
              const payload: Record<string, unknown> = { model: provModel.trim() }
              if (provVariant.trim() !== '') payload.variant = provVariant.trim()
              if (provQuant.trim() !== '') payload.quant = provQuant.trim()
              confirmRun('provision_model', 'Provision model ' + provModel.trim() + ' from the catalog (present files are skipped)?', payload)
            }}
          >Provision</Btn>
        </div>
      </section>

      {/* ── LOGS ── */}
      <section className={css.section}>
        <h3 className={css.sectionTitle}>Logs</h3>
        <div className={css.row}>
          <Field label="tail lines" value={logTail} onChange={setLogTail} mono />
          <Btn
            busy={busy === 'logs'}
            onClick={() => {
              const tail = Math.max(1, Math.min(Number.parseInt(logTail, 10) || 200, 2000))
              void run('logs', { tail })
            }}
          >View logs</Btn>
        </div>
      </section>

      {/* ── LIFECYCLE (infra upkeep — the server refuses while runs are
           active unless force; INFERENCE LAW's guard lives in the SSOT) ── */}
      <section className={css.section}>
        <h3 className={css.sectionTitle}>Lifecycle</h3>
        {activeRuns.length > 0 && (
          <p className={css.dangerNote}>{activeRuns.length} active run(s) — lifecycle actions will be refused unless force is set.</p>
        )}
        <div className={css.row}>
          <Btn busy={busy === 'launch'} onClick={() => { confirmRun('launch', 'Launch the ComfyUI server?') }}>Launch</Btn>
          <Btn busy={busy === 'restart'} danger onClick={() => { confirmRun('restart', 'Restart the ComfyUI server?', { force }) }}>Restart</Btn>
          <Btn busy={busy === 'stop'} danger onClick={() => { confirmRun('stop', 'Stop the ComfyUI server?', { force }) }}>Stop</Btn>
          <Btn busy={busy === 'free'} onClick={() => { confirmRun('free', 'Ask ComfyUI to free memory (next worker iteration)?') }}>Free VRAM</Btn>
        </div>
        <div className={css.row}>
          <label className={css.field}>
            <span className={css.fieldLabel}>update target</span>
            <select className={css.input} value={updateTarget} onChange={(e) => { setUpdateTarget(e.target.value) }}>
              <option value="comfy">comfy</option>
              <option value="cli">cli</option>
              <option value="all">all</option>
            </select>
          </label>
          <Btn busy={busy === 'update'} danger onClick={() => { confirmRun('update', 'Update ' + updateTarget + '?', { target: updateTarget, force }) }}>Update</Btn>
          <Field label="switch to version" value={swVersion} placeholder="commit / tag" mono onChange={setSwVersion} />
          <Btn
            busy={busy === 'switch_version'}
            danger
            disabled={swVersion.trim() === ''}
            onClick={() => { confirmRun('switch_version', 'Switch ComfyUI to ' + swVersion.trim() + '?', { version: swVersion.trim(), force }) }}
          >Switch</Btn>
        </div>
        <label className={css.checkRow}>
          <input type="checkbox" checked={force} onChange={(e) => { setForce(e.target.checked) }} />
          force (override the active-run guard)
        </label>
      </section>
    </div>
  )
}

/** The server-rack glyph — ComfyUI management (the GPU backend + its upkeep). */
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
  /** The native right-sidebar tab registry (ui-sidebar-right — the
   *  better-sidebar registry retired with the plugin, 2026-09-10). */
  sidebarRightTabs: {
    register(def: {
      id: string
      kind: string
      title(): string
      guide?: Array<{
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

function register(ctx: TabCtx, id: string, kind: string, title: string, guideOrder: number, guideDescription: string, icon: React.ComponentType<{ size?: number }>, component: React.ComponentType<Record<string, unknown>>): void {
  // Stage one — the tab type (page kind: no patterns, opened by kind).
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id,
    kind,
    title: () => title,
    guide: [{
      order: guideOrder,
      title: () => title,
      description: () => guideDescription,
      icon: icon as unknown as React.ComponentType<{ size?: number; className?: string }>,
    }],
  }), 'melite-card-deck: ' + id + ' tab type')
  // Stage two — the body, dispatched under the type's id. The panel
  // carries its own wire caller (postManage) — no transport threading.
  ctx.slots.inject('sidebar.right.pane.tab', () => {
    const dispose = ctx.slots.register(
      { name: 'sidebar.right.pane.tab', key: id },
      component,
    )
    return typeof dispose === 'function' ? dispose : () => {}
  })
}

/**
 * Register the non-card tab on the native right-sidebar registry
 * (ui-sidebar-right's two-registration contract, 2026-09-10 migration —
 * the shipped documentpreview is the reference).
 *
 * NO CHROME-DRIVING SELF-HEAL. The 2026-08-26 auto-open tick machine that
 * used to live here (a 400ms interval that synthetic-clicked the shell's
 * expand toggle, the better-sidebar + button, and the menu's Ray Media
 * item) is deleted (2026-09-05): it could never latch and instead
 * toggled the host's + menu open/closed every 400ms forever. A plugin
 * never drives host chrome on a timer; reachability belongs to the user
 * (the guide page lists this tab) or to the service API
 * (ctx.sidebarRight.openTab), never to synthetic clicks on the shell's
 * buttons.
 */
export function registerAssetsTab(ctx: TabCtx): void {
  register(ctx, 'melite-card-deck:comfy', 'comfy-manager', 'ComfyUI Manager', 61, 'The estate\'s ComfyUI manager — packs, snapshots, status.', ComfyIcon as unknown as React.ComponentType<{ size?: number }>, ComfyManagerPanel as unknown as React.ComponentType<Record<string, unknown>>)
}
