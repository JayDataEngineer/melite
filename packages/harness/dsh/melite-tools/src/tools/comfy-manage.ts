/**
 * comfy_manage — the ONE ComfyUI manager tool (2026-09-03).
 *
 * Wraps the estate's management plane — comfy-mcp (comfy-cli wrapper) +
 * comfyui-manager (security=medium, confirm-gated) + comfy-cli — behind
 * ONE action-dispatch tool. The SSOT is
 * packages/gateway-doors/src/doors/manage.ts (ACTIONS + HANDLERS +
 * LIFECYCLE_GUARDED — python/manage.py is deleted); this tool is its
 * AI door (POST /v1/manage). The manual door is
 * `provision manage <action>` (packages/engines/comfyui/scripts/provision.ts,
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
import type { ToolDefinition } from '../types.ts'
import { gatewayRequest, RayGatewayError } from '../gateway.ts'
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

export function comfyManage(gatewayUrl: string): ToolDefinition {
  return {
    name: 'comfy_manage',
    description:
      'The ONE ComfyUI manager: wraps comfy-mcp + comfyui-manager (security=medium) '
      + '+ comfy-cli. Actions: status (server/security/routing/active runs — start '
      + 'here), logs, search_models; list_extensions (installed packs — '
      + 'managed workspace only), snapshot_list / snapshot_save / '
      + 'snapshot_restore (environment snapshots; restore is refused while '
      + 'runs are active); install_extension (registry ids), '
      + 'install_extension_url (git url), download_model (url), provision_model '
      + '(catalog id — the model_catalog id); restart, stop, launch, update '
      + '(target comfy|cli|all), switch_version, free. INFRA UPKEEP only — it '
      + 'never runs inference, and lifecycle actions are refused while runs are '
      + 'active (stop them or pass force).',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ACTIONS as unknown as string[],
          description: 'The management action to dispatch.',
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
          enum: ['comfy', 'cli', 'all'],
          description: 'update: what to update (default "comfy").',
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
      required: ['action'],
    },
    presentCall(args) {
      const a = (typeof args === "object" && args !== null ? args : {}) as { action?: unknown };
      return {
        card: 'generic',
        title: `ComfyUI ${String(a.action ?? '?')}`,
        kind: 'execute',
        rawInput: String(a.action ?? '?'),
      };
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          ok: { type: 'boolean' },
          action: { type: 'string' },
          detail: { type: 'string', description: 'One-line human summary.' },
        },
        required: ['ok', 'action'],
      },
      render: (_args, value) => {
        const v = value as { ok?: boolean; action?: string; detail?: string }
        return [{
          type: 'text',
          text: 'comfy_manage ' + String(v.action ?? '?') + ': ' + String(v.detail ?? ''),
        }]
      },
    },
    async execute(args, exec) {
      const a = (args ?? {}) as Record<string, unknown>
      // forward only declared fields — the SSOT envelope is extra=forbid
      const body: Record<string, unknown> = { action: a.action }
      for (const k of ['nodes', 'url', 'relative_path', 'filename', 'model',
                       'variant', 'quant', 'query', 'tail', 'version',
                       'target', 'force', 'snapshot']) {
        if (a[k] !== undefined && a[k] !== null && a[k] !== '') body[k] = a[k]
      }
      let res: Record<string, unknown>
      try {
        res = await gatewayRequest(gatewayUrl, 'POST', '/v1/manage', body,
          exec?.signal ?? new AbortController().signal,
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
              })
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
      })
    },
  }
}
