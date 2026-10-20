/**
 * comfy_manage — the ONE ComfyUI manager tool (2026-09-03).
 *
 * Wraps the estate's management plane — the built-in ComfyUI-Manager
 * (vendored into the managed engine's custom_nodes, riding ComfyUI's
 * own HTTP port — no side processes, 2026-09-10) plus the
 * Cordis provisioning and deployment legs — behind ONE action-dispatch tool. The SSOT is
 * packages/harness/estate-queue/src/managePlane.ts (ACTIONS +
 * HANDLERS + LIFECYCLE_GUARDED — the gateway doors row died with
 * the app; the manage seat serves the same vocabulary in-process);
 * this tool is its AI door (the manage seat, POST /v1/manage on
 * browser mounts). The manual door is
 * `provision manage <action>` (packages/engines/comfyui-cordis/scripts/provision.ts,
 * via `pnpm run provision -- manage <action> …`).
 *
 * INFRA UPKEEP, NOT EXECUTION (INFERENCE LAW): no action runs
 * inference. Lifecycle actions (restart/stop/switch_version/update)
 * are refused server-side while any run reads running/queued — the
 * guard lives in the SSOT, not the prompt.
 *
 * Progressive disclosure: status is the cheap index (server, security,
 * routing, active runs); install/download actions accept what the
 * status/cately discoveries return.
 */
import { remoteErrorOf } from '@deepseek-ai/dsh-typert-protocol'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolCallView } from '@deepseek-ai/dsh-tools'
import type { JsonValue, ToolDefinition } from '../types.ts'
import type { Estate } from '../estate.ts'
import { jsonClean } from '../json-clean.ts'

/** The manage seat's refusal code (the envelope rides the details —
 *  the same declaration manageRegistry makes at the seat; repeated
 *  here because this tool compiles without the seat's module graph —
 *  the cards-resource 'cards/unclassified' pattern). */
declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    'manage/refused': {
      readonly action?: string;
      readonly status?: number;
      readonly code?: string;
      readonly data?: unknown;
    };
  }
}

const MANAGE_TIMEOUT_MS = 300_000   // installs/downloads can take minutes

const ACTIONS = [
  'status', 'endpoint_set', 'logs', 'search_models',
  'list_extensions', 'snapshot_list',
  'install_extension', 'install_extension_url',
  'download_model', 'provision_model', 'acquire_weight',
  // the acquire-rescue verbs (the download-honesty cure, 2026-11-08):
  // the manage LANE answers both (managePlane ACTIONS rows); the
  // tool seat's client-side enum mirrors them so an agent-driven
  // acquire_retry/acquire_discard is not 422'd at this seat.
  'acquire_retry', 'acquire_discard',
  'restart', 'stop', 'launch', 'update', 'switch_version', 'free',
  'snapshot_save', 'snapshot_restore',
  'lora_list', 'lora_install',
  'refmods_list',
] as const

/** Canonical result — the typed mirror of output.schema (the music
 *  card's CardResult pattern: defineTool infers from the schema and
 *  checks the execute return against it). ok/action ride every shape
 *  (the comfy-manage ok/action pattern); detail/data are payload. */
type ManageResult = {
  ok: boolean;
  action: string;
  detail?: string;
  data?: JsonValue;
  error?: string;
  status?: number;
  code?: string;
  operation_id?: string;
  state?: string;
  bytes?: number;
  total?: number;
  next_action?: string;
  restart_required?: boolean;
  partial?: boolean;
  items?: JsonValue[];
  operations?: JsonValue[];
  rows?: JsonValue[];
  requested?: string[];
  succeeded?: string[];
  missed?: string[];
  misses?: string[];
} & Record<string, JsonValue>;

function recordValue(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function contractFields(data: unknown, envelope?: Record<string, unknown>): Partial<ManageResult> {
  const fields: Partial<ManageResult> = {}
  const sources = [recordValue(data), recordValue(envelope)]
  for (const source of sources) {
    if (source === null) continue
    if (typeof source.operation_id === 'string') fields.operation_id = source.operation_id
    if (typeof source.status === 'number') fields.status = source.status
    if (typeof source.code === 'string') fields.code = source.code
    if (typeof source.state === 'string') fields.state = source.state
    // THE F9 TRACKER FIELDS (the agent's poll read): live landed
    // bytes + declared total ride top-level beside state — the
    // tracker's bytes/total without digging into data.
    if (typeof source.bytes === 'number') (fields as Record<string, unknown>).bytes = source.bytes
    if (typeof source.total === 'number') (fields as Record<string, unknown>).total = source.total
    if (typeof source.next_action === 'string') fields.next_action = source.next_action
    if (typeof source.restart_required === 'boolean') fields.restart_required = source.restart_required
    if (typeof source.partial === 'boolean') fields.partial = source.partial
    if (Array.isArray(source.items)) fields.items = source.items as JsonValue[]
    if (Array.isArray(source.operations)) fields.operations = source.operations as JsonValue[]
    if (Array.isArray(source.rows)) fields.rows = source.rows as JsonValue[]
    if (Array.isArray(source.requested)) fields.requested = source.requested.filter((item): item is string => typeof item === 'string')
    if (Array.isArray(source.succeeded)) fields.succeeded = source.succeeded.filter((item): item is string => typeof item === 'string')
    if (Array.isArray(source.missed)) fields.missed = source.missed.filter((item): item is string => typeof item === 'string')
    if (Array.isArray(source.misses)) fields.misses = source.misses.filter((item): item is string => typeof item === 'string')
  }
  if (fields.state === 'partial') fields.partial = true
  if (Array.isArray(data) && fields.rows === undefined) fields.rows = data as JsonValue[]
  return fields
}

function asText(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value === null || value === undefined) return '?'
  try {
    const encoded = JSON.stringify(value)
    return encoded === undefined ? '?' : encoded
  } catch {
    return '?'
  }
}

function rowText(value: unknown): string {
  if (typeof value === 'string') return value
  const row = recordValue(value)
  if (row === null) return asText(value)
  const name = typeof row.name === 'string' ? row.name : typeof row.id === 'string' ? row.id : undefined
  const key = typeof row.key === 'string' ? row.key : undefined
  const state = typeof row.state === 'string' ? row.state : undefined
  const outcome = typeof row.outcome === 'string' ? row.outcome : undefined
  const version = typeof row.version === 'string' ? row.version : undefined
  const filename = typeof row.filename === 'string' ? row.filename : undefined
  const path = typeof row.path === 'string' ? row.path : undefined
  const head = name ?? key ?? 'row'
  const traits = [row.type, row.base].filter((item): item is string => typeof item === 'string' && item !== '')
  const stateText = [state, outcome].filter((item, index, values): item is string => typeof item === 'string' && item !== '' && values.indexOf(item) === index).join('/')
  const tail = [version, filename, path, stateText].filter((item): item is string => typeof item === 'string' && item !== '')
  return head + (traits.length > 0 ? ' (' + traits.join(', ') + ')' : '') + (tail.length > 0 ? ' — ' + tail.join(' · ') : '')
}

function operationText(value: unknown): string {
  const row = recordValue(value)
  if (row === null) return asText(value)
  const id = typeof row.operation_id === 'string' ? row.operation_id : typeof row.id === 'string' ? row.id : '?'
  const name = typeof row.name === 'string' ? row.name : undefined
  const state = typeof row.state === 'string' ? row.state : typeof row.outcome === 'string' ? row.outcome : 'unknown'
  const outcome = typeof row.outcome === 'string' && row.outcome !== state ? ' · ' + row.outcome : ''
  const path = typeof row.path === 'string' ? row.path : undefined
  return 'operation ' + id + (name === undefined ? '' : ' · ' + name) + ' · ' + state + outcome + (path === undefined ? '' : ' · ' + path)
}

function statusText(data: unknown): string[] {
  const value = recordValue(data)
  if (value === null) return []
  const endpoint = recordValue(value.endpoint)
  const manager = recordValue(value.manager)
  const out: string[] = []
  if (typeof value.state === 'string') out.push('state: ' + value.state)
  if (endpoint !== null) {
    out.push('endpoint: ' + String(endpoint.reachable === true ? 'reachable' : 'not reachable') + (typeof endpoint.url === 'string' ? ' · ' + endpoint.url : ''))
    if (typeof endpoint.comfyui_version === 'string') out.push('comfyui: ' + endpoint.comfyui_version)
  }
  if (manager !== null) {
    const version = manager.version === undefined ? '' : ' · ' + asText(manager.version)
    const queue = manager.queue === undefined ? '' : ' · queue ' + asText(manager.queue)
    const security = typeof manager.security === 'string' ? ' · security ' + manager.security : ''
    const reason = typeof manager.reason === 'string' ? ' · ' + manager.reason : ''
    out.push('manager: ' + (manager.reachable === true ? 'reachable' : 'unavailable') + version + queue + security + reason)
  }
  if (value.routing !== undefined) out.push('routing: ' + asText(value.routing))
  if (Array.isArray(value.active_runs)) out.push('active_runs: ' + (value.active_runs.length === 0 ? 'none' : value.active_runs.map(asText).join(', ')))
  // THE FINDING-10 SPLIT (2026-10-13): unsettled sidecars are
  // historical rows, not concurrent actives — the tool line names
  // the distinction the status view reports (engine queue empty ⇒
  // no claim can be live; ComfyUI executes serially).
  const engineQueue = recordValue(value.engine_queue)
  if (engineQueue !== null) out.push('engine queue: running ' + asText(engineQueue.running) + ' · pending ' + asText(engineQueue.pending))
  if (Array.isArray(value.stale_claims) && value.stale_claims.length > 0) out.push('stale_claims (historical, never settled): ' + value.stale_claims.map(asText).join(', '))
  if (typeof value.active_runs_note === 'string') out.push('note: ' + value.active_runs_note)
  if (Array.isArray(value.resources)) {
    // THE CENSUS HONESTY LAW AT THE TOOL FACE (audit F2,
    // 2026-10-20): the display cap is itself a scan cut — it must
    // name itself. An agent reading 20 of 25 rows would title the
    // roster complete; the truncation line keeps the count honest.
    const shown = value.resources.slice(0, 20)
    for (const resource of shown) {
      const row = recordValue(resource)
      if (row === null) continue
      const ref = recordValue(row.ref)
      const label = ref === null ? 'resource' : [ref.kind, ref.owner, ref.id].filter((item): item is string => typeof item === 'string').join('/')
      out.push('resource: ' + label + ' · ' + asText(row.state))
    }
    if (value.resources.length > shown.length) {
      out.push('resource: +' + String(value.resources.length - shown.length) + ' more (display cap — the roster is longer than shown)')
    }
  }
  if (value.census_partial === true) {
    out.push('census: partial — the scan could not check every resource or item; unknown rows are not health verdicts')
  }
  const operations = Array.isArray(value.operations)
    ? value.operations
    : manager !== null && Array.isArray(manager.operations) ? manager.operations : []
  // THE DISPLAY CAP NAMES ITSELF (audit V4, the resources cap's own
  // law one list over): 20 of 25 operations rendered without a note
  // titles the ledger complete.
  const shownOperations = operations.slice(0, 20)
  for (const operation of shownOperations) out.push(operationText(operation))
  if (operations.length > shownOperations.length) {
    out.push('operation: +' + String(operations.length - shownOperations.length) + ' more (display cap — the ledger is longer than shown)')
  }
  if (typeof value.resources_detail === 'string') out.push('resource_status: ' + value.resources_detail)
  return out
}

function actionRows(action: string, data: unknown, rows: unknown): string[] {
  const nested = recordValue(data)
  const nestedRows = nested === null ? undefined : [nested.rows, nested.items, nested.lines].find((candidate) => Array.isArray(candidate))
  const values = Array.isArray(rows) ? rows : Array.isArray(data) ? data : Array.isArray(nestedRows) ? nestedRows : []
  if (action === 'logs') return values.slice(0, 200).map((row) => typeof row === 'string' ? row : rowText(row))
  if (values.length === 0) return ['rows: none']
  return ['rows:', ...values.slice(0, 50).map((row) => '  ' + rowText(row))]
}

function inferredNext(action: string, data: unknown): string | undefined {
  const value = recordValue(data)
  if (value !== null && typeof value.next_action === 'string') return value.next_action
  if (action === 'status') return 'status'
  if (action === 'list_extensions') return 'install_extension'
  if (action === 'snapshot_list') return 'snapshot_save'
  if (value !== null && value.state === 'restart_required') return 'restart'
  return undefined
}

function renderManage(_args: unknown, value: unknown): Array<{ type: 'text'; text: string }> {
  const result = recordValue(value)
  const action = typeof result?.action === 'string' ? result.action : '?'
  const detail = typeof result?.detail === 'string' ? result.detail : ''
  const data = result?.data
  const first = 'comfy_manage ' + action + ': ' + detail
  const lines = [first]
  if (result === null) return [{ type: 'text', text: first }]
  if (result.ok !== true) {
    lines.push('REFUSED: ' + (typeof result.code === 'string' ? result.code : 'manage/refused') + (typeof result.status === 'number' ? ' · status ' + String(result.status) : ''))
    if (typeof result.error === 'string' && result.error !== detail) lines.push('error: ' + result.error)
  }
  if (action === 'status') {
    lines.push(...statusText(data))
  } else if (action === 'logs' || action === 'search_models' || action === 'list_extensions' || action === 'snapshot_list') {
    lines.push(...actionRows(action, data, result.rows))
  } else if (result.state !== undefined || result.items !== undefined || result.operations !== undefined || result.operation_id !== undefined || result.bytes !== undefined || result.total !== undefined) {
    if (typeof result.state === 'string') lines.push('state: ' + result.state)
    if (typeof result.operation_id === 'string') lines.push('operation: ' + result.operation_id)
    // THE F9 TRACKER LINE (the agent's poll read): bytes/total in the
    // same line the popup tracker renders — real landed bytes.
    if (typeof result.bytes === 'number' || typeof result.total === 'number') {
      lines.push('progress: ' + String(result.bytes ?? '?') + '/' + String(result.total ?? '?') + ' bytes')
    }
    // THE REASON LINE (audit 2026-10-10): a settled op carries its
    // blocked/failed CAUSE in the envelope's data.detail — the poll
    // read must surface it, never swallow the why.
    const nestedDetail = data !== undefined && data !== null && typeof data === 'object'
      ? (data as { detail?: unknown }).detail
      : undefined
    if (typeof nestedDetail === 'string' && nestedDetail !== '' && nestedDetail !== detail) {
      lines.push('reason: ' + nestedDetail)
    }
    if (Array.isArray(result.requested)) lines.push('requested: ' + result.requested.join(', '))
    if (Array.isArray(result.succeeded)) lines.push('succeeded: ' + result.succeeded.join(', '))
    if (Array.isArray(result.missed)) lines.push('missed: ' + result.missed.join(', '))
    if (Array.isArray(result.misses)) lines.push('misses: ' + result.misses.join(', '))
    if (Array.isArray(result.items)) {
      for (const item of result.items.slice(0, 50)) lines.push('item: ' + rowText(item))
    }
    if (Array.isArray(result.operations)) {
      for (const operation of result.operations.slice(0, 20)) lines.push(operationText(operation))
    }
  } else if (data !== undefined && data !== null) {
    lines.push('data: ' + asText(data))
  }
  const next = typeof result.next_action === 'string' ? result.next_action : inferredNext(action, data)
  if (next !== undefined && next !== '') lines.push('next_action: ' + next)
  return [{ type: 'text', text: lines.join('\n') }]
}

export function comfyManage(estate: Estate): ToolDefinition {
  // PRESENTATION SEAT (§7 P7, the tool-presentation wall — one
  // seat for the invalid face): the presenter rides defineTool
  // validation, and defineTool's soft gate OWNS invalid args
  // (invalid → undefined, never throw). The pre-purge re-attach over
  // that gate (a second, ungated seat rendering the generic card for
  // junk) is deleted — conversion invariance (presentCall output must
  // not change) now reads against the gated face. execute validation
  // (ToolArgsError/INVALID_ARGS) is unaffected.
  const presentCall: (args: unknown) => ToolCallView = (args) => {
    const a = (typeof args === "object" && args !== null ? args : {}) as { action?: unknown };
    return {
      card: 'generic',
      title: `ComfyUI ${String(a.action ?? '?')}`,
      kind: 'execute',
      rawInput: String(a.action ?? '?'),
    };
  };
  // Ledger row 8 (2026-09-10): defineTool wraps the literal — the
  // registry gains schema compilation + input validation
  // (ToolArgsError/INVALID_ARGS) + timeoutMs enforcement this face
  // never had as a raw registration.
  const def = defineTool({
    name: 'comfy_manage',
    description:
      'managed workspace only), snapshot_list / snapshot_save / '
      + 'snapshot_restore (environment snapshots; restore is refused while '
      + 'runs are active); endpoint_set (point at a different ComfyUI server '
      + 'url — validate-first: an unreachable url is refused, never written); install_extension (registry ids), '
       + 'install_extension_url (git url + optional ref pin) and download_model (url) refuse without operator_confirmed=true — the human\'s explicit URL approval, never the agent\'s own; provision_model '
       + '(declared model id from melite_load; Manager search results are external-catalog rows, not provision ids); acquire_weight '
       + '(THE run-failure weight door — ONE door with the bench popup Download button: start with model + optional file/variant/quant, '
       + 'take the operation_id from the answer, then poll the SAME action with operation_id for live bytes/total until a terminal state); lora_list (the '
       + 'engine-accepted LoRA names plus the user rows file) and lora_install (copy or upload a LoRA file the operator '
       + 'already has — never fetched; the answer names the restart that follows); refmods_list (the engine\'s own '
      + 'MiniMaxH3RefModsLoader mod combos off /object_info — the refmod picker\'s candidate feed, read-only); restart, stop, launch, update '
       + '(target comfy), switch_version, free. INFRA UPKEEP only — it '
      + 'never runs inference, and lifecycle actions are refused while runs are '
      + 'active (stop them or pass force).',
    // ParameterSchemaSpec grammar: the map IS the implicit object root
    // (no type/properties wrapper), per-property `required: true`.
    parameters: {
      action: {
        type: 'string',
        enum: ACTIONS,
        description: 'The management action to dispatch.',
        required: true,
      },
      nodes: {
        type: 'array',
        items: { type: 'string' },
        description: 'install_extension: registry node-pack ids, e.g. ["ComfyUI-KJNodes"].',
      },
      url: {
        type: 'string',
        description: 'install_extension_url / download_model / endpoint_set: the git URL, file URL, or ComfyUI server URL.',
      },
      ref: {
        type: 'string',
        description: 'install_extension_url: the git commit SHA or tag to pin — unpinned URLs float with the branch head and a later install lands different bytes. Every declared nodes.yaml row is pinned; operator free-text installs carry the same law through this param.',
      },
      operator_confirmed: {
        type: 'boolean',
        description: 'install_extension_url / download_model: pass true ONLY after the human running you explicitly approved this URL — the flag is recorded with the operation and the door refuses without it. Never set it on your own judgment.',
      },
      relative_path: {
        type: 'string',
        description: 'download_model: destination under the models root, e.g. "models/checkpoints".',
      },
      filename: { type: 'string', description: 'download_model: on-disk filename. lora_install: required with data (the name the engine combo will list).' },
      path: { type: 'string', description: 'lora_install: source path of a LoRA file the operator already has (copied, never fetched).' },
      data: { type: 'string', description: 'lora_install: base64 LoRA bytes (the browser-upload arm; requires filename).' },
      families: {
        type: 'array',
        items: { type: 'string' },
        description: 'lora_install: family ids for the row suggestion in the answer (e.g. ["z-image"]).',
      },
      model: {
        type: 'string',
        description: 'provision_model / acquire_weight: declared model id from melite_load (e.g. "z-image"); Manager search rows are not provision ids.',
      },
      variant: { type: 'string', description: 'provision_model / acquire_weight: optional variant id.' },
      quant: { type: 'string', description: 'provision_model / acquire_weight: optional quant cell id.' },
      file: { type: 'string', description: 'acquire_weight: the missing weight filename for display (e.g. "sam2.1_hiera_large.pt"); the DECL owns the fetch source.' },
      operation_id: { type: 'string', description: 'acquire_weight: poll key — the operation_id from the start answer; the tracker polls the same action with this until a terminal state.' },
      query: { type: 'string', description: 'search_models: search text.' },
      tail: { type: 'integer', description: 'logs: line count (default 200).' },
      version: { type: 'string', description: 'switch_version: target ComfyUI version.' },
      target: {
        type: 'string',
        enum: ['comfy'],
        description: 'update: what to update (comfy only — comfy-cli is retired; the built-in manager updates ComfyUI itself).',
      },
      force: {
        type: 'boolean',
        description: 'Override the active-run guard on lifecycle actions.',
      },
      snapshot: {
        type: 'string',
        description: 'snapshot_restore: a snapshot filename from snapshot_list.',
      },
    },
    presentCall,
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          ok: { type: 'boolean', required: true },
          action: { type: 'string', required: true },
          detail: { type: 'string', description: 'One-line human summary.' },
          error: { type: 'string', description: 'The refusal text — present exactly when the tool refused.' },
          status: { type: 'number', description: 'Structured refusal status returned by the manage seat.' },
          code: { type: 'string', description: 'Structured refusal code returned by the manage seat.' },
          operation_id: { type: 'string', description: 'Provisioning operation correlation id when the manage seat returned one.' },
          state: { type: 'string', description: 'Provisioning or status state.' },
          bytes: { type: 'number', description: 'acquire_weight: live landed bytes for the weight fetch (the tracker numerator — real, never animation).' },
          total: { type: 'number', description: 'acquire_weight: declared size_bytes total for the weight fetch (the tracker denominator).' },
          next_action: { type: 'string', description: 'The next existing manage action to take.' },
          restart_required: { type: 'boolean', description: 'Whether ComfyUI must restart before the result is active.' },
          partial: { type: 'boolean', description: 'True when some requested resources succeeded and others did not.' },
          items: { type: 'array', description: 'Per-resource provisioning item results.' },
          operations: { type: 'array', description: 'Operation rows correlated to the returned resource results.' },
          rows: { type: 'array', description: 'Rows returned by a read action.' },
           requested: { type: 'array', items: { type: 'string' }, description: 'Requested resource ids.' },
           succeeded: { type: 'array', items: { type: 'string' }, description: 'Resource ids whose requested work succeeded.' },
           missed: { type: 'array', items: { type: 'string' }, description: 'Resource ids that did not succeed.' },
           misses: { type: 'array', items: { type: 'string' }, description: 'Per-resource failure details for missed ids.' },
        },
      },
      render: renderManage,
    },
    async execute(args, exec): Promise<ManageResult> {
      // defineTool input validation runs in the wrapper BEFORE the body
      // (invalid args throw ToolArgsError there) — args is always a
      // defined object here, so no nullish fallback exists to cover
      // (2026-09-12).
      const a = args as Record<string, unknown>
      // forward only declared fields — the SSOT envelope is extra=forbid
      const body: Record<string, unknown> = { action: a.action }
      for (const k of ['nodes', 'url', 'ref', 'relative_path', 'filename', 'file', 'model',
                       'variant', 'quant', 'query', 'tail', 'version',
                       'target', 'force', 'snapshot', 'path', 'data',
                       'families', 'operation_id', 'operator_confirmed']) {
        if (a[k] !== undefined && a[k] !== null && a[k] !== '') body[k] = a[k]
      }
      let res: Record<string, unknown>
      // Ledger row 32 (2026-09-10): exec is contract-required — the
      // old `?? new AbortController().signal` fallback detached the
      // 300s manage call from caller cancellation (a host cancel
      // kept the HTTP leg burning). A missing exec is a harness
      // miswire and refuses loud, never silently degrades.
      if (exec?.signal === undefined) {
        // action is a required enum string — the wrapper gate guarantees
        // a string at the body, so no nullish fallback rides (2026-09-12).
         return jsonClean<ManageResult>({
           ok: false,
           action: String(a.action),
           detail: 'comfy_manage miswire: no execution context signal — the host runtime must pass exec',
           error: 'comfy_manage miswire: no execution context signal',
           code: 'manage/miswire',
           status: 500,
         })
      }
      try {
        res = await estate.manageAct(body, exec.signal, MANAGE_TIMEOUT_MS) as Record<string, unknown>
      } catch (e) {
        // A refusal IS the answer, not a crash: the manage seat
        // throws manage/refused CARRYING the envelope (action,
        // detail, data — REBUILD-15) — surface it as the value so
        // the model reads WHY (active runs, catalog miss…).
        const re = remoteErrorOf(e)
        if (re !== null && re !== undefined && re.code === 'manage/refused') {
          const d = (re as { details?: { action?: unknown; data?: unknown; status?: unknown; code?: unknown } }).details ?? {}
          if (typeof d.action === 'string') {
            const fields = contractFields(d.data)
            if (typeof d.status === 'number') fields.status = d.status
            fields.code = typeof d.code === 'string' ? d.code : re.code
            return jsonClean({
              ok: false,
              action: d.action,
              detail: re.message,
              error: re.message,
              data: d.data ?? null,
              ...fields,
            }) as ManageResult
          }
        }
        throw e
      }
      const response = recordValue(res) ?? {}
      const action = typeof response.action === 'string' ? response.action : String(a.action)
      const detail = typeof response.detail === 'string' ? response.detail : ''
      const fields = contractFields(response.data, response)
      if (typeof response.status === 'number') fields.status = response.status
      if (typeof response.code === 'string') fields.code = response.code
       const partialMiss = fields.partial === true || fields.state === 'partial' || (Array.isArray(fields.missed) && fields.missed.length > 0)
       const ok = response.ok === true && !partialMiss
       return jsonClean({
         ok,
         action,
         detail,
         ...(ok ? {} : { error: detail }),
         data: res.data ?? null,
         ...fields,
       }) as ManageResult
    },
  });
  // (§7 P7: the presenter rides defineTool validation — no second,
  // ungated seat over the gate. The tool-presentation wall pins the
  // gated face.)
  return def;
}
