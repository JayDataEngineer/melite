/**
 * flow_run — the HEADLESS run door for TEMPLATES (named flows).
 *
 * A template is a declared multi-step flow in the estate
 * (flows/<name>/flow.py — a PYTHON declaration: frozen pydantic rows,
 * typed edges, validated at construction). This tool runs one
 * through the QUEUE by name:
 *
 *   POST {gateway}/v1/flows/drafts  {flow: <name>, ...params}
 *     → {draftId} (compose the card FIRST)
 *   POST {gateway}/v1/flows/start  {flow: <name>, ...params, draft_id}
 *
 * CARD BIRTH LAW (operator order 2026-09-06): the start door 4xxes a
 * start without a doc-backed draft_id BEFORE any run registers — so
 * this tool composes the headless card at the drafts door, then rides
 * the minted id on the start envelope. No door-side auto-mint (a
 * banned silent fallback); the two calls are both explicit here.
 *
 * The wire key is `flow` — the live door (resolve_request accepts
 * {flow:name} / {model:id}; the {yaml:} key retired 2026-09-04 with
 * the yaml text parser — docs/queue/flows.md).
 *
 * QUEUE LANE LAW kept: the template is named EXPLICITLY; an unknown
 * name is a LOUD named 4xx before any run registers. No hand-assembled
 * graph from the model — the estate owns the flow, the agent names it.
 *
 * L4 of the test/prod barrier: the test flag (default false) is
 * passed through to the start body. When the agent sets test:true
 * (a scratch submission), the gateway routes the run to
 * data/runs/test-output/ and the asset view hides it from production.
 *
 * Registered ONLY in headless mounts (MELITE_HEADLESS=1).
 */
import type { ToolDefinition } from '../types.ts'
import { gatewayRequest, RayGatewayError } from '../gateway.ts'
import { jsonClean } from '../json-clean.ts'

const TIMEOUT_MS = 20_000

export function flowRun(gatewayUrl: string): ToolDefinition {
  return {
    name: 'flow_run',
    description:
      'Run a NAMED TEMPLATE (multi-step flow) through the serial GPU queue (headless run '
      + 'door). Args: template (a lane from lane_bundle_peek kind=template — creature-flow, '
      + 'humanoid-flow, audio-native-tts...) + optional params (merged over the template\'s '
      + 'declared inputs). Unknown names are refused loudly BEFORE any run registers. '
      + 'Returns {run_id}; poll with run_status. One active run machine-wide.',
    parameters: {
      type: 'object',
      properties: {
        template: {
          type: 'string',
          description: 'The template name exactly as peeked — the flows/<name>/flow.py module name (the module IS the name).',
        },
        params: {
          type: 'object',
          description: 'Optional overrides merged over the template defaults (seed, prompts, knobs).',
          additionalProperties: true,
        },
        test: {
          type: 'boolean',
          description: 'L4 barrier: when true, the run is routed to the test-output root and '
            + 'hidden from the production /v1/assets view. Use for scratch submissions '
            + '(the agent probing a flow, the user pre-flighting a card, etc.). '
            + 'Default false (production).',
          default: false,
        },
      },
      required: ['template'],
    },
    presentCall(args) {
      const a = (typeof args === "object" && args !== null ? args : {}) as { template?: unknown };
      return {
        card: 'generic',
        title: `Run flow ${String(a.template ?? '?')}`,
        kind: 'execute',
        rawInput: String(a.template ?? '?'),
      };
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          run_id: { type: 'string', description: 'The queue run id — poll with run_status(run_id).' },
          status: { type: 'string', description: 'Registration status (queued/running).' },
          template: { type: 'string', description: 'The named template that was submitted.' },
        },
        required: ['run_id', 'template'],
      },
      render: (args, value) => {
        const v = value as { run_id?: string; template?: string; status?: string; error?: string }
        if (v && v.error) return [{ type: 'text', text: 'flow_run REFUSED: ' + v.error }]
        return [{
          type: 'text',
          text: 'flow_run ' + String(v.template ?? '?') + ' \u2192 ' + String(v.run_id ?? '?')
            + ' [' + String(v.status ?? 'queued') + '] — poll with run_status',
        }]
      },
    },
    async execute(args, exec) {
      const a = (typeof args === "object" && args !== null ? args : {}) as { template?: unknown; params?: unknown; test?: unknown }
      const template = typeof a.template === 'string' ? a.template : ''
      if (!template) return jsonClean({ error: 'template is required' })
      const overrides = (a.params && typeof a.params === 'object' && !Array.isArray(a.params))
        ? (a.params as Record<string, unknown>) : {}
      // L4: test flag rides into the start body. The gateway uses it
      // to route the run to test-output and to tag the sidecar.
      const testFlag = a.test === true
      // QUEUE LANE LAW: named flow, overrides spread, nothing composed
      // here. The wire key is `flow` (the live door).
      // CARD BIRTH LAW: compose the headless card FIRST (the drafts
      // door mints the doc), then ride its id on the start envelope.
      const composeBody = { ...overrides, flow: template }
      let draftId = ''
      try {
        const composed = await gatewayRequest(
          gatewayUrl, 'POST', '/v1/flows/drafts',
          composeBody, exec.signal, TIMEOUT_MS,
        ) as { draftId?: unknown; draft_id?: unknown; error?: string }
        if (composed && typeof composed.error === 'string' && composed.error) {
          return jsonClean({ template, error: composed.error })
        }
        const minted = composed && (composed.draftId ?? composed.draft_id)
        if (typeof minted !== 'string' || !minted) {
          return jsonClean({ template, error: 'card compose returned no draftId' })
        }
        draftId = minted
      } catch (e) {
        if (e instanceof RayGatewayError) {
          let named = ''
          try {
            named = String((JSON.parse(e.body) as { error?: unknown }).error ?? '')
          } catch { named = '' }
          return jsonClean({ template, error: named || e.body || 'card compose refused the template' })
        }
        throw e
      }
      const startBody = { ...overrides, flow: template, test: testFlag, draft_id: draftId }
      let res: { run_id?: string; status?: string; error?: string }
      try {
        res = await gatewayRequest(
          gatewayUrl, 'POST', '/v1/flows/start',
          startBody, exec.signal, TIMEOUT_MS,
        ) as { run_id?: string; status?: string; error?: string }
      } catch (e) {
        if (e instanceof RayGatewayError) {
          let named = ''
          try {
            named = String((JSON.parse(e.body) as { error?: unknown }).error ?? '')
          } catch { named = '' }
          return jsonClean({ template, error: named || e.body || 'queue refused the template' })
        }
        throw e
      }
      if (res && typeof res.error === 'string') {
        return jsonClean({ template, error: res.error })
      }
      return jsonClean({
        run_id: res && typeof res.run_id === 'string' ? res.run_id : '',
        status: res && typeof res.status === 'string' ? res.status : 'queued',
        template,
      })
    },
  }
}
