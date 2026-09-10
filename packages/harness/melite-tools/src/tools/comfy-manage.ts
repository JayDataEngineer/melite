/**
 * comfy_manage — the ONE ComfyUI manager tool (2026-09-03).
 *
 * Wraps the estate's management plane — the built-in ComfyUI-Manager
 * (vendored into the managed engine's custom_nodes, riding ComfyUI's
 * own HTTP port — no external Python anywhere, 2026-09-10) plus the
 * estate TS legs (model downloads, systemd, journal logs) — behind
 * ONE action-dispatch tool. The SSOT is
 * packages/gateway/doors/src/doors/manage.ts (ACTIONS + HANDLERS +
 * LIFECYCLE_GUARDED — python/manage.py is deleted); this tool is its
 * AI door (POST /v1/manage). The manual door is
 * `provision manage <action>` (packages/engines/comfyui-cordis/scripts/provision.ts,
 * via ./setup.sh manage …).
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
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolCallView } from '@deepseek-ai/dsh-tools'
import type { JsonValue, ToolDefinition } from '../types.ts'
import { RayGatewayError } from '../estate.ts'
import { jsonClean } from '../json-clean.ts'

const MANAGE_TIMEOUT_MS = 300_000   // installs/downloads can take minutes

const ACTIONS = [
  'status', 'logs', 'search_models',
  'list_extensions', 'snapshot_list',
  'install_extension', 'install_extension_url',
  'download_model', 'provision_model',
  'restart', 'stop', 'launch', 'update', 'switch_version', 'free',
  'snapshot_save', 'snapshot_restore',
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
} & Record<string, JsonValue>;

export function comfyManage(request: EstateRequest): ToolDefinition {
  // PRESENTATION ADAPTATION (tool-presentation wall + conversion
  // invariance — presentCall output must not change): defineTool
  // soft-gates presentCall behind arg validation (invalid → undefined),
  // but the raw face always returned the tool's own generic card, and
  // the wall pins that (junk/invalid args during streaming + replay
  // still render the generic view, never throw). The presenter is
  // shared: it rides the definition AND is re-attached over the gate
  // below. execute validation (ToolArgsError/INVALID_ARGS) is
  // unaffected.
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

      + 'managed workspace only), snapshot_list / snapshot_save / '
      + 'snapshot_restore (environment snapshots; restore is refused while '
      + 'runs are active); install_extension (registry ids), '
      + 'install_extension_url (git url), download_model (url), provision_model '
      + '(catalog id — the model_catalog id); restart, stop, launch, update '
      + '(target comfy|cli|all), switch_version, free. INFRA UPKEEP only — it '
      + 'never runs inference, and lifecycle actions are refused while runs are '
      + 'active (stop them or pass force).',
    // ParameterSchemaSpec grammar: the map IS the implicit object root
    // (no type/properties wrapper), per-property `required: true`.
    parameters: {
      action: {
        type: 'string',
        enum: ACTIONS as unknown as string[],
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
        description: 'install_extension_url / download_model: the git URL or file URL.',
      },
      relative_path: {
        type: 'string',
        description: 'download_model: destination under the models root, e.g. "models/checkpoints".',
      },
      filename: { type: 'string', description: 'download_model: on-disk filename.' },
      model: {
        type: 'string',
        description: 'provision_model: catalog id from model_catalog, e.g. "z-image".',
      },
      variant: { type: 'string', description: 'provision_model: optional variant id.' },
      quant: { type: 'string', description: 'provision_model: optional quant cell id.' },
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
          error: { type: 'string', description: 'The refusal text — present exactly when the tool refused (render prints REFUSED).' },
        },
      },
      render: (_args, value) => {
        const v = value as { ok?: boolean; action?: string; detail?: string }
        return [{
          type: 'text',
          text: 'comfy_manage ' + String(v.action ?? '?') + ': ' + String(v.detail ?? ''),
        }]
      },
    },
    async execute(args, exec): Promise<ManageResult> {
      const a = (args ?? {}) as Record<string, unknown>
      // forward only declared fields — the SSOT envelope is extra=forbid
      const body: Record<string, unknown> = { action: a.action }
      for (const k of ['nodes', 'url', 'relative_path', 'filename', 'model',
                       'variant', 'quant', 'query', 'tail', 'version',
                       'target', 'force', 'snapshot']) {
        if (a[k] !== undefined && a[k] !== null && a[k] !== '') body[k] = a[k]
      }
      let res: Record<string, unknown>
      // Ledger row 32 (2026-09-10): exec is contract-required — the
      // old `?? new AbortController().signal` fallback detached the
      // 300s manage call from caller cancellation (a host cancel
      // kept the HTTP leg burning). A missing exec is a harness
      // miswire and refuses loud, never silently degrades.
      if (exec?.signal === undefined) {
        return jsonClean<ManageResult>({ ok: false, action: String(a.action ?? '?'), detail: 'comfy_manage miswire: no execution context signal — the host runtime must pass exec' })
      }
      try {
        res = await request( 'POST', '/v1/manage', body,
          exec.signal,
          MANAGE_TIMEOUT_MS) as Record<string, unknown>
      } catch (e) {
        // A refusal (4xx/5xx) IS the answer, not a crash: the SSOT's
        // body carries {action, ok:false, detail} — surface it as the
        // value so the model reads WHY (active runs, catalog miss…).
        if (e instanceof RayGatewayError) {
          try {
            const parsed = JSON.parse(e.body) as Record<string, unknown>
            if (typeof parsed.action === 'string' && typeof parsed.detail === 'string') {
              return jsonClean({
                ok: false, action: parsed.action, detail: parsed.detail,
                data: parsed.data ?? null,
              }) as ManageResult
            }
          } catch { /* fall through to rethrow */ }
        }
        throw e
      }
      return jsonClean({
        ok: res.ok === true,
        action: res.action,
        detail: res.detail,
        data: res.data ?? null,
      }) as ManageResult
    },
  });
  // Re-attach the unconditional presenter over defineTool's
  // soft-validation gate (see the adaptation above).
  def.presentCall = presentCall;
  return def;
}
