/**
 * provision_model - queue ONE catalog model's weight download through the
 * gateway's provision route (routes/catalog/model_provision.ts): the D2
 * source: declaration in the owning plugin's model YAML resolves into a
 * ComfyUI-Manager install payload; Manager is the EXECUTOR that downloads.
 *
 * INFRA UPKEEP, NOT EXECUTION (2026-08-26, gap gamma of AUDIT-AGENT-CARDS-
 * DOWNLOADS.md): the CARDS-NOT-RUNS law bans GPU inference from the model -
 * this tool appends to a download queue and starts no run; there is still
 * no run tool. When a card Run short-circuits download_required, the USER
 * gets the modal inside the card surface; THIS tool is the conversational
 * path for "fetch this model's weights" before/without a run.
 */
import type { ToolDefinition } from '../types.ts'
import { gatewayRequest } from '../gateway.ts'
import { jsonClean } from '../json-clean.ts'

const PROVISION_TIMEOUT_MS = 30_000
const STATUS_TIMEOUT_MS = 10_000

interface ProvisionResponse {
  model?: unknown
  variant?: unknown
  payload?: Record<string, unknown> | null
  manager?: { accepted?: unknown; status?: unknown; worker_kicked?: unknown } | null
  queue?: unknown
  error?: unknown
}

interface ProvisionStatus {
  reachable?: unknown
  manager_version?: unknown
  queue?: unknown
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

export function provisionModel(gatewayUrl: string): ToolDefinition {
  return {
    name: 'provision_model',
    description:
      'Queue the weight download for ONE Melite catalog model (POST /v1/models/provision; ComfyUI-Manager '
      + 'downloads to the executor volume). Use when model_catalog shows a model whose weights are not '
      + 'provisioned yet, when the user asks to fetch/install/download a model, or after an action card failed '
      + 'on missing weights. INFRA UPKEEP only - it queues bytes, runs nothing; there is still no run tool. '
      + 'Args: model (a catalog id from model_catalog) + optional variant id.',
    parameters: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: 'Catalog model id (discover with model_catalog), e.g. "z-image".',
        },
        variant: {
          type: 'string',
          description: 'Optional variant/route cell id when the model declares variants/quants.',
        },
      },
      required: ['model'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          queued: { type: 'boolean', description: 'true when Manager accepted the install.' },
          model: { type: 'string' },
          detail: { type: 'string', description: 'One-line human summary of the queue outcome.' },
        },
        required: ['queued', 'model'],
      },
      render: (_args, value) => {
        const v = value as { queued?: boolean; model?: string; detail?: string }
        return [{
          type: 'text',
          text: 'provision_model ' + String(v.model ?? '?') + ': ' + String(v.detail ?? (v.queued ? 'queued' : 'not queued')),
        }]
      },
    },
    async execute(args, exec) {
      const a = args as { model?: unknown; variant?: unknown }
      if (typeof a.model !== 'string' || a.model.length === 0) {
        throw new Error('provision_model: "model" is required (a catalog model id string)')
      }
      const body: Record<string, unknown> = { model: a.model }
      if (typeof a.variant === 'string' && a.variant.length > 0) body.variant = a.variant

      // Non-2xx arrives as RayGatewayError carrying the gateway's operator-
      // facing body VERBATIM (404 unknown model / 422 no-source or repo-only
      // decl / 503 Manager unreachable) - let it propagate; that IS the
      // honest answer, not a tool-shaped paraphrase.
      const res = await gatewayRequest(
        gatewayUrl, 'POST', '/v1/models/provision', body,
        exec.signal, PROVISION_TIMEOUT_MS,
      ) as ProvisionResponse

      const accepted = res.manager?.accepted === true
      const workerKicked = res.manager?.worker_kicked === true

      // Best-effort queue snapshot - never fail the tool because the read
      // stumbled; the POST verdict is the answer.
      let statusSnapshot: ProvisionStatus | null = null
      try {
        statusSnapshot = await gatewayRequest(
          gatewayUrl, 'GET', '/v1/models/provision/status', undefined,
          exec.signal, STATUS_TIMEOUT_MS,
        ) as ProvisionStatus
      } catch {
        statusSnapshot = null
      }

      const detail = accepted
        ? 'ACCEPTED by ComfyUI-Manager'
          + (res.payload?.save_path != null ? ' -> ' + String(res.payload.save_path) : '')
          + (workerKicked ? ' (worker kicked)' : ' (queue/start not confirmed)')
        : 'NOT accepted - see manager.status'

      const value: Record<string, unknown> = jsonClean({
        queued: accepted,
        model: str(res.model) ?? a.model,
        variant: str(res.variant),
        filename: res.payload ? str(res.payload.filename) : null,
        save_path: res.payload ? str(res.payload.save_path) : null,
        url: res.payload ? str(res.payload.url) : null,
        registry_match: res.payload?.registry_match === true,
        manager_status: res.manager ? str(res.manager.status) : null,
        worker_kicked: workerKicked,
        manager_reachable: statusSnapshot ? statusSnapshot.reachable === true : null,
        detail,
      })
      return value
    },
  }
}
