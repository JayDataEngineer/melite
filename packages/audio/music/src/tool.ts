// tool.ts — the music agent tool face (the DSH plane).
import { GatewayError, jsonLane, type EstateCall } from '@melite/estate-call'
//
// The engine face (card.ts) registers the card in the gateway
// process; THIS face registers `music` where a composing host
// provides a tools service — the dsh agent host, which has no
// in-process ComfyUI and talks to the gateway over HTTP.
//
// Tool-plane name: music (the DSH plain-name convention — the
// card id, hyphens→underscores, no suffix). Registry-row plane:
// music_card (cardWireName) — two planes, two names, each stated
// once.
//
// THE MODEL INPUT: the params walk synthesizes the model knob from
// the boarded array; execute resolves the unstated default itself
// (the DSL plane carries no defaults — the fold lives in the
// description). The executor's stage doc carries it as `service`;
// the {model:} door at start owns admission legality server-side —
// this face stays thin.
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolDefinition, ParameterSchemaSpec } from '@deepseek-ai/dsh-tools'
import { emitParamsSpec } from '@melite/comfyui-cordis/params-emit'
import { schema, identity, BOARDED } from './card.ts'

export const TOOL_NAME = 'music'
const FLOW = 'music'
const DEFAULT_MODEL: string = BOARDED[0]
const TIMEOUT_MS = 15e3

export const buildMusicTool = (call: EstateCall): ToolDefinition => {
  const gw = jsonLane(call)
  return defineTool({
    name: TOOL_NAME,
    description: identity.description,
    parameters: emitParamsSpec(schema as never, BOARDED) as ParameterSchemaSpec,
    presentCall(args: unknown) {
      const a = (args ?? {}) as Record<string, unknown>
      return {
        card: 'generic',
        title: identity.label,
        kind: 'execute',
        rawInput: `model=${String(a.model ?? DEFAULT_MODEL)} prompt=${String(a.prompt ?? '?').slice(0, 60)}`,
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
      // presentationMeta: the tool-private payload persisted verbatim on
      // tool/result — the facts presenters and client renderers narrow
      // (model + run ids, or the named refusal). Pure: called on live
      // streaming AND session-log replay.
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
    // presentResult: the COMPLETED card's render intent — title only; the
    // raw result content (render above) carries the body line. Reads
    // result.meta (the projection), never re-derives.
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
        // DOOR ONE (compose — CARD BIRTH LAW): the stage doc names
        // the model as the stage's service; the params carry the
        // card's own surface.
        const draft = await gw( 'POST', '/v1/flows/drafts', {
          intent: FLOW,
          stages: [{ title: identity.label, kind: 'generation', service: model, params }],
        }, exec?.signal)
        const draftId = typeof draft.draftId === 'string' ? draft.draftId : ''
        if (draftId === '') return { flow: FLOW, model, error: 'gateway draft POST returned no draftId' }
        // DOOR TWO (start): draft_id + exactly one door key — the
        // {model:} arm resolves, composes, and queues the run.
        // THE ENVELOPE LIFT (card_compose_body 363-372): the start
        // body carries the card params BESIDE the envelope keys —
        // the editor's own wire posts the SAME body (params + model)
        // with draft_id added; the {model:} arm lifts body-minus-
        // envelope as the ONE params stanza. A params-less body
        // composes defaults only and refuses on required fields.
        const started = await gw( 'POST', '/v1/flows/start', {
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
          // Named refusals (4xx/5xx bodies carrying {error}) are
          // DOMAIN OUTCOMES — canonical values, not throws.
          return { flow: FLOW, model, error: e.named || e.body || `gateway ${e.status}` }
        }
        throw e // transport failures re-throw (infrastructure)
      }
    },
  })
}
