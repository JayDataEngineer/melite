/**
 * card_run — the HEADLESS run door for ACTION CARDS.
 *
 * A card draft is a 1-length flow: build_flow (or a dedicated
 * card tool) composed it, the draft document IS the card. This tool
 * walks it into the QUEUE — the queue's own registration door, never a
 * bypass:
 *
 *   GET  {gateway}/v1/flows/drafts/<id>   (fetch the composed card)
 *   POST {gateway}/v1/flows/start         {model, ...params, draft_id}
 *
 * CARD BIRTH LAW (operator order 2026-09-06): the start rides the id
 * of the draft it was composed from — a cardless start 4xxes BEFORE
 * any run registers.
 *
 * QUEUE LANE LAW kept: the model is named EXPLICITLY (the draft
 * stage's service; a params.model that disagrees is a LOUD refusal,
 * never a silent pick). No hand-assembled graphs — the {model} door
 * composes through the plugin's card hooks, same as the editor's Run.
 *
 * Multi-stage drafts are NOT cards — they refuse loudly and point at
 * flow_run (named templates own multi-step flows).
 *
 * Registered ONLY in headless mounts (MELITE_HEADLESS=1): the browser
 * interface keeps its law — the model composes, the USER presses Run.
 */
import type { ToolDefinition } from '../types.ts'
import { gatewayRequest, RayGatewayError } from '../gateway.ts'
import { jsonClean } from '../json-clean.ts'

const TIMEOUT_MS = 20_000

interface DraftStage {
  id?: unknown
  title?: unknown
  kind?: unknown
  service?: unknown
  params?: unknown
}

/** Pull the gateway's named {error} out of a non-2xx body (fallback:
 * the raw body — still loud, still named). */
function _namedError(body: string, fallback: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: unknown }
    if (parsed && typeof parsed.error === 'string' && parsed.error) return parsed.error
  } catch { /* non-JSON body */ }
  return body || fallback
}

export function cardRun(gatewayUrl: string): ToolDefinition {
  return {
    name: 'card_run',
    description:
      'Run a composed ACTION CARD through the serial GPU queue (headless run door). '
      + 'Args: draftId (from build_flow / the lane\'s card tool). The draft\'s single '
      + 'stage is submitted as {model, ...params} to the queue start door — the same '
      + 'composition path as the editor\'s Run button. Returns {run_id}; poll it with '
      + 'run_status. Multi-stage drafts are refused (use flow_run with a named '
      + 'template). One active run machine-wide — submissions queue in order.',
    parameters: {
      type: 'object',
      properties: {
        draftId: {
          type: 'string',
          description: 'The draft id returned by build_flow / the card tool, e.g. "draft-6a998b0f-...-0".',
        },
        test: {
          type: 'boolean',
          description: 'L4 barrier: when true, the run is routed to the test-output root and '
            + 'hidden from the production /v1/assets view. Use for scratch submissions. '
            + 'Default false (production).',
          default: false,
        },
      },
      required: ['draftId'],
    },
    presentCall(args) {
      const a = (typeof args === "object" && args !== null ? args : {}) as { draftId?: unknown; test?: unknown };
      return {
        card: 'generic',
        title: `Run card ${String(a.draftId ?? '?')}`,
        kind: 'execute',
        rawInput: String(a.draftId ?? '?'),
      };
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          run_id: { type: 'string', description: 'The queue run id — poll with run_status(run_id).' },
          status: { type: 'string', description: 'Registration status (queued/running).' },
          model: { type: 'string', description: 'The explicitly-named model that was submitted.' },
          draft: { type: 'string', description: 'The source draft id.' },
        },
        required: ['run_id', 'model', 'draft'],
      },
      render: (args, value) => {
        const v = value as { run_id?: string; model?: string; status?: string; error?: string }
        if (v && v.error) return [{ type: 'text', text: 'card_run REFUSED: ' + v.error }]
        return [{
          type: 'text',
          text: 'card_run ' + String(v.model ?? '?') + ' \u2192 ' + String(v.run_id ?? '?')
            + ' [' + String(v.status ?? 'queued') + '] — poll with run_status',
        }]
      },
    },
    async execute(args, exec) {
      const a = (typeof args === "object" && args !== null ? args : {}) as { draftId?: unknown; test?: unknown }
      const draftId = typeof a.draftId === 'string' ? a.draftId : ''
      if (!draftId) return jsonClean({ error: 'draftId is required' })

      let docRes: unknown
      try {
        docRes = await gatewayRequest(
          gatewayUrl, 'GET',
          '/v1/flows/drafts/' + encodeURIComponent(draftId),
          undefined, exec.signal, TIMEOUT_MS,
        )
      } catch (e) {
        if (e instanceof RayGatewayError) {
          return jsonClean({ draft: draftId, error: _namedError(e.body, 'draft fetch failed') })
        }
        throw e
      }
      let doc: { stages?: unknown; error?: string } = {}
      if (typeof docRes === 'string') {
        try { doc = JSON.parse(docRes) } catch { doc = { error: 'draft is not JSON' } }
      } else if (docRes && typeof docRes === 'object') {
        doc = docRes as typeof doc
      }
      if (doc && typeof doc.error === 'string') {
        return jsonClean({ draft: draftId, error: doc.error })
      }
      const stages = Array.isArray(doc.stages) ? (doc.stages as DraftStage[]) : []
      if (stages.length === 0) {
        return jsonClean({ draft: draftId, error: 'draft has no stages — compose it with build_flow first' })
      }
      if (stages.length > 1) {
        return jsonClean({
          draft: draftId,
          error: 'draft has ' + stages.length + ' stages — multi-step flows run via flow_run with a NAMED template, never a hand-assembled card',
        })
      }
      const stage = stages[0]
      const model = typeof stage.service === 'string' && stage.service ? stage.service : ''
      if (!model) {
        return jsonClean({ draft: draftId, error: 'draft stage carries no service (model) — recompose the card' })
      }
      const params = (stage.params && typeof stage.params === 'object')
        ? { ...(stage.params as Record<string, unknown>) } : {}
      const paramsModel = typeof params.model === 'string' ? params.model : ''
      if (paramsModel && paramsModel !== model) {
        return jsonClean({
          draft: draftId,
          error: 'stage.service says ' + JSON.stringify(model) + ' but params.model says '
            + JSON.stringify(paramsModel) + ' — the draft is inconsistent; recompose it',
        })
      }
      // L4: test flag rides into the start body (L1 + L2 + L3 are
      // downstream in the gateway).
      const testFlag = a.test === true
      // QUEUE LANE LAW: the model named EXPLICITLY, params spread at the
      // top level, no hand-assembled graph, no fallback.
      // CARD BIRTH LAW (operator order 2026-09-06): the start door
      // 4xxes a start without a doc-backed draft_id — ride the id of
      // the draft doc this tool just fetched (it exists by
      // construction: the GET above succeeded).
      const startBody = { ...params, model, test: testFlag, draft_id: draftId }
      let res: { run_id?: string; status?: string; error?: string }
      try {
        res = await gatewayRequest(
          gatewayUrl, 'POST', '/v1/flows/start',
          startBody, exec.signal, TIMEOUT_MS,
        ) as { run_id?: string; status?: string; error?: string }
      } catch (e) {
        if (e instanceof RayGatewayError) {
          return jsonClean({ draft: draftId, model, error: _namedError(e.body, 'queue refused the card') })
        }
        throw e
      }
      if (res && typeof res.error === 'string') {
        return jsonClean({ draft: draftId, model, error: res.error })
      }
      return jsonClean({
        run_id: res && typeof res.run_id === 'string' ? res.run_id : '',
        status: res && typeof res.status === 'string' ? res.status : 'queued',
        model,
        draft: draftId,
      })
    },
  }
}
