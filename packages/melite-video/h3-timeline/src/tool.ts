// tool.ts — the h3_timeline agent tool face (the DSH plane).
//
// The engine face (card.ts) registers the card in the gateway
// process; THIS face registers `h3_timeline` where a composing host
// provides a tools service. The timeline tool lives where the
// timeline is defined: the calls[] shot laws are the CARD GATE's
// (card.ts schema() — every composer's gate), this face only ships
// the doc (one stage, calls as the array; the py-era JSON-string
// unwrap still fires gateway-side for old senders — the array rides
// composeDraftDoc verbatim).
//
// Tool-plane name: h3_timeline (the DSH plain-name convention — the
// card id, hyphens→underscores, no suffix). Registry-row plane:
// h3_timeline_card (cardWireName) — two planes, two names.
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolDefinition, ParameterSchemaSpec } from '@deepseek-ai/dsh-tools'
import { emitParamsSpec } from '@melite/comfyui/params-emit'
import { carrier, identity, BOARDED } from './card.ts'

export const TOOL_NAME = 'h3_timeline'
const FLOW = 'h3-timeline'
const DEFAULT_MODEL: string = BOARDED[0]
const TIMEOUT_MS = 15e3

/** A gateway JSON error (non-2xx): status + the named body. */
class GatewayError extends Error {
  readonly status: number
  readonly body: string
  readonly named: string
  constructor(status: number, body: string, named: string) {
    super(`gateway ${status}: ${body}`)
    this.status = status
    this.body = body
    this.named = named
  }
}

/** One JSON call to a gateway door. Native cancellation
 *  composition (Node >= 20.3): AbortSignal.any propagates a
 *  pre-aborted caller signal and owns the timeout. */
async function gwJson(
  baseUrl: string,
  method: string,
  path: string,
  body?: Record<string, unknown>,
  signal?: AbortSignal,
  timeoutMs = TIMEOUT_MS,
): Promise<Record<string, unknown>> {
  const request = AbortSignal.any([
    ...(signal !== undefined ? [signal] : []),
    AbortSignal.timeout(timeoutMs),
  ])
  const res = await fetch(baseUrl + path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: request,
  })
  const text = await res.text()
  if (!res.ok) {
    let named = ''
    try {
      named = String((JSON.parse(text) as { error?: unknown }).error ?? '')
    } catch { /* non-JSON body rides the raw text */ }
    throw new GatewayError(res.status, text.slice(0, 500), named)
  }
  return JSON.parse(text) as Record<string, unknown>
}

/** The canonical value: model + run ids on success, the named
 *  refusal as a domain outcome. */
type CardResult = {
  flow: string
  model: string
  run_id?: string
  draft_id?: string
  status?: string
  error?: string
}

export const buildH3TimelineTool = (gatewayUrl: string): ToolDefinition =>
  defineTool({
    name: TOOL_NAME,
    description: identity.description,
    // the carrier carries the knob surface; the calls[] SHOTS node
    // is THIS plane's declaration (the DSL's lossless json node —
    // the item shape is documented in the description, the laws are
    // the card gate's at execute time).
    parameters: {
      ...emitParamsSpec(carrier as never, BOARDED),
      calls: {
        type: 'json',
        required: true,
        description: 'Shots — one per film shot: [{ text, start_frame, end_frame, image?, seam_carry?, refs?, last_frame?, audio? }]. Spans are ints (end > start); seam_carry 0 = hard cut, else 1-64.',
      },
    } as ParameterSchemaSpec,
    presentCall(args: unknown) {
      const a = (args ?? {}) as Record<string, unknown>
      const calls = Array.isArray(a.calls) ? (a.calls as unknown[]).length : 0
      return {
        card: 'generic',
        title: identity.label,
        kind: 'execute',
        rawInput: `model=${String(a.model ?? DEFAULT_MODEL)} shots=${calls}`,
      };
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          flow: { type: 'string', required: true },
          model: { type: 'string', required: true },
          run_id: { type: 'string', description: 'The queue run id — poll with run_status.' },
          draft_id: { type: 'string', description: 'The minted card draft id.' },
          status: { type: 'string', description: 'Registration status (queued/running).' },
          error: { type: 'string', description: 'Named refusal reason, when the gateway refused.' },
        },
      },
      render: (_args, value) => {
        const v = (value ?? {}) as Record<string, unknown>
        if (typeof v.error === 'string' && v.error) {
          return [{ type: 'text', text: `${TOOL_NAME} REFUSED: ${v.error}` }]
        }
        return [{
          type: 'text',
          text: `${TOOL_NAME} [${String(v.model ?? '?')}] → ${String(v.run_id ?? '?')} — poll with run_status`,
        }]
      },
      presentationMeta: (_args, value) => {
        const v = (value ?? {}) as Record<string, unknown>
        return {
          flow: String(v.flow ?? FLOW),
          model: String(v.model ?? '?'),
          ...typeof v.run_id === 'string' && v.run_id !== '' ? { run_id: v.run_id } : {},
          ...typeof v.draft_id === 'string' && v.draft_id !== '' ? { draft_id: v.draft_id } : {},
          ...typeof v.status === 'string' && v.status !== '' ? { status: v.status } : {},
          ...typeof v.error === 'string' && v.error !== '' ? { error: v.error } : {},
        }
      },
    },
    presentResult(_args: unknown, result: { content?: unknown; isError?: boolean; meta?: unknown }) {
      if (result?.meta == null) return undefined
      const m = result.meta as Record<string, unknown>
      const model = typeof m.model === 'string' && m.model !== '' ? m.model : '?'
      if (typeof m.error === 'string' && m.error !== '') {
        return { card: 'generic', title: `${identity.label} [${model}] — REFUSED` }
      }
      const runId = typeof m.run_id === 'string' && m.run_id !== '' ? m.run_id : '?'
      return { card: 'generic', title: `${identity.label} [${model}] → ${runId}` }
    },
    async execute(args, exec): Promise<CardResult> {
      const a = (args ?? {}) as Record<string, unknown>
      const model = typeof a.model === 'string' && a.model !== '' ? a.model : DEFAULT_MODEL
      const params: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(a)) if (k !== 'model') params[k] = v
      try {
        // DOOR ONE (compose — CARD BIRTH LAW): one stage; calls rides
        // as the array, the shot laws fire in the card gate.
        const draft = await gwJson(gatewayUrl, 'POST', '/v1/flows/drafts', {
          intent: FLOW,
          stages: [{ title: identity.label, kind: 'generation', service: model, params }],
        }, exec?.signal)
        const draftId = typeof draft.draftId === 'string' ? draft.draftId : ''
        if (draftId === '') return { flow: FLOW, model, error: 'gateway draft POST returned no draftId' }
        // THE ENVELOPE LIFT (card_compose_body 363-372): the start
        // body carries the card params BESIDE the envelope keys —
        // the editor's own wire posts the SAME body (params + model)
        // with draft_id added; the {model:} arm lifts body-minus-
        // envelope as the ONE params stanza. A params-less body
        // composes defaults only and refuses on required fields.
        const started = await gwJson(gatewayUrl, 'POST', '/v1/flows/start', {
          ...params,
          model,
          draft_id: draftId,
        }, exec?.signal)
        const named = typeof started.error === 'string' ? started.error : ''
        if (named !== '') return { flow: FLOW, model, error: named }
        if (typeof started.run_id !== 'string' || started.run_id === '') {
          return { flow: FLOW, model, error: 'gateway start returned no run_id' }
        }
        return {
          flow: FLOW,
          model,
          draft_id: draftId,
          run_id: started.run_id,
          status: typeof started.status === 'string' ? started.status : 'queued',
        }
      } catch (e) {
        if (e instanceof GatewayError) {
          return { flow: FLOW, model, error: e.named || e.body || `gateway ${e.status}` }
        }
        throw e
      }
    },
  })
