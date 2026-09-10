/**
 * assets-tab — the ONE DSH right-sidebar tab that is NOT cards:
 *
 *   Ray ComfyUI — the ComfyUI MANAGER, NATIVE (2026-09-06): a direct GUI
 *     on the estate's management plane. Every button is ONE action of
 *     the python/manage.py SSOT (comfy-mcp + comfyui-manager + comfy-cli
 *     behind POST /v1/manage — PROVISIONING LAW's "management is python
 *     packages"), reached same-origin through THIS plugin's own /v1
 *     gateway proxy. The vocabulary mirrors the comfy_manage agent tool
 *     1:1 — enforced BOTH directions by the parity wall
 *     (tests/walls/suites/test_manage_parity.py). Progressive
 *     disclosure: status is the cheap index and refreshes SILENTLY
 *     after every mutating action (never through the result pane —
 *     that pane belongs to the user's last explicit dispatch);
 *     discovery (installed packs, snapshots) renders as ROWS in place.
 *     INFERENCE LAW honored by construction — no action here
 *     runs inference, and lifecycle actions are refused SERVER-side
 *     while any run reads running/queued (the guard lives in the SSOT,
 *     never in this panel).
 *
 * WHY NATIVE (operator complaint 2026-09-06: "it is a card view in the
 * right panel — it was supposed to be a comfyui manager"): the
 * 2026-08-25 tab iframed /editor/?rayAssets=comfy to mount the
 * pre-plugin editor's ComfyManagerRailPanel. That surface died with the
 * editor consolidation — the editor's embed params are
 * ?meliteAssets=media|cards, there is no comfy section — so the iframe
 * fell through to the editor's DEFAULT card studio. The manager now
 * renders here, no iframe, no editor dependency.
 *
 * Siblings' fate (NO LEGACY): Ray Media lives in @infer-media/dsh-media
 * since 20eb2c58 (own plugin, own host routes); Ray Flows retired with
 * the yaml spec library (35f2f830).
 */
import * as React from 'react'
import { useCallback, useEffect, useState } from 'react'
import css from './assets.module.css'

/** One /v1/manage reply — the SSOT envelope {action, ok, detail, data}. */
interface ManageReply {
  action?: string
  ok?: boolean
  detail?: string
  data?: unknown
}

/** The status action's data member — python/manage.py `_h_status`. */
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

/** The estate lane face the deck client rides (R4): the typert
 * gateway's lane remote — the SAME door listener the /v1/manage
 * route wrapped, called through DSH's own transport. Stated
 * structurally; the client entry threads ctx.remote here. */
export interface EstateLaneRemote {
  lane(method: 'GET' | 'POST' | 'PATCH', path: string, body: unknown, signal?: AbortSignal): Promise<unknown>
}

/** POST one manage action over the estate lane. A refusal is a
 * DOMAIN outcome — the ManageReply carries it, never a throw past
 * the panel (the door contract, unchanged). */
async function postManage(remote: EstateLaneRemote, action: string, payload: Record<string, unknown>): Promise<ManageReply> {
  try {
    return await remote.lane('POST', '/v1/manage', { action, ...payload }) as ManageReply
  } catch (e) {
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
 * through registerRayAssetsTab below. Hook-based: status auto-loads on
 * mount, every action posts through postManage and lands in the shared
 * result pane; mutating actions confirm first with the exact dispatch
 * and silently refresh the status section afterwards.
 */
export function ComfyManagerPanel({ remote }: { remote?: EstateLaneRemote }): React.ReactElement {
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
      const reply = remote !== undefined ? await postManage(remote, 'status', {}) : { action: 'status', ok: false, detail: 'no estate lane remote — the deck client did not thread ctx.remote' }
      if (reply.ok === true) {
        setStatus(reply.data as StatusView | undefined ?? null)
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
      const reply = remote !== undefined ? await postManage(remote, action, payload) : { action, ok: false, detail: 'no estate lane remote — the deck client did not thread ctx.remote' }
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

  /** Browse rows: installed packs (cm_cli simple-show via the SSOT). */
  const loadExtensions = useCallback(async (): Promise<void> => {
    const reply = await run('list_extensions')
    if (reply !== null && reply.ok === true && Array.isArray(reply.data)) {
      setExtRows(reply.data.map(String))
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
    <div className={css.root} data-ray-comfy-manager="">
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
  /** The typert gateway's client transport (threaded by the entry's
   * inject; optional so a bare mount still renders a refusal). */
  remote?: EstateLaneRemote
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
  }), 'ray-card-deck: ' + id + ' tab type')
  // Stage two — the body, dispatched under the type's id.
  ctx.slots.inject('sidebar.right.pane.tab', () => {
    const wired = ctx.remote !== undefined
      ? (() => { const C = component; return (props: Record<string, unknown>): React.JSX.Element => React.createElement(C, { ...props, remote: ctx.remote }) })()
      : component
    const dispose = ctx.slots.register(
      { name: 'sidebar.right.pane.tab', key: id },
      wired,
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
export function registerRayAssetsTab(ctx: TabCtx): void {
  register(ctx, 'ray-card-deck:comfy', 'ray-comfy', 'Ray ComfyUI', 61, 'The estate\'s ComfyUI manager — packs, snapshots, status.', ComfyIcon as unknown as React.ComponentType<{ size?: number }>, ComfyManagerPanel as unknown as React.ComponentType<Record<string, unknown>>)
}
