/**
 * build_pipeline — compose the action cards. THE OLD CONTRACT, the old
 * name (agent/prompts/BASE_PROMPT.md: "build_pipeline composes the cards
 * the user reviews and runs"; docs/agent/CAPABILITIES.md: "It composes; it
 * never executes — there is no run tool").
 *
 * Execute POSTs the DRAFT to {gateway}/v1/pipelines/drafts — the exact
 * wire the old backend tool used — and returns the slim projection
 * {draftId, stages}. The conversation then renders the REAL action cards
 * (the editor's InlinePipelineCards surface, embedded per draft): the
 * user reviews the tiles, edits in the zoom drilldown, and presses Run —
 * the ONLY run door (a user gesture inside the card surface). This tool
 * cannot execute anything; there is no run tool.
 */
import type { ToolDefinition } from '../types.ts'
import { gatewayRequest } from '../gateway.ts'
import { jsonClean } from '../json-clean.ts'

const CATALOG_TIMEOUT_MS = 15_000
const DRAFT_TIMEOUT_MS = 15_000

interface CatalogModel {
  family?: unknown
  label?: unknown
  defaults?: unknown
}

interface CatalogShape {
  models?: Record<string, CatalogModel>
  families?: Record<string, { label?: unknown }>
}

export function buildPipeline(gatewayUrl: string): ToolDefinition {
  return {
    name: 'build_pipeline',
    description:
      'Compose a pipeline from the allowed card tools ONLY. Allowed models: h3-timeline, qwen3_tts_voicedesign, qwen3-tts, music3, krea-2, img-edit. '
      + 'Creates a pipeline draft; the conversation renders editable card tiles (prompt, model params — refined in the card, run by the '
      + 'user pressing Run). Args: model (one of the allowed models) + prompt (+ optional params bag). '
      + 'This tool never executes anything — there is no run tool; ONLY the user starts runs, from the cards.',
    parameters: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: 'Catalog model id (discover with model_catalog), e.g. "z-image", "music3", "trellis".',
        },
        prompt: {
          type: 'string',
          description: 'Generation prompt (text-to-X). The card carries it; the user can refine it before running.',
        },
        params: {
          type: 'object',
          additionalProperties: true,
          description: 'Extra card params over the model defaults (e.g. {"seed":7}). '
            + 'An explicit prompt argument wins over params.prompt.',
        },
      },
      required: ['model', 'prompt'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          card: { type: 'string', description: 'Always "draft" — editable cards, never a run.' },
          draftId: { type: 'string', description: 'The backend draft id the card surface hydrates.' },
          stages: {
            type: 'array',
            items: { type: 'object', additionalProperties: true },
            description: 'Slim stage rows (id/title/kind/service) — one per action card.',
          },
        },
        required: ['card', 'draftId', 'stages'],
      },
      render: (_args, value) => {
        const v = value as { draftId?: string; model?: string; stages?: unknown[] }
        const n = Array.isArray(v.stages) ? v.stages.length : 0
        return [{
          type: 'text',
          // The toolview parses the draft id out of this line (content is
          // the render text, not the raw value): it takes the token right
          // after the FIRST 'card ' — so the draft id must come IMMEDIATELY
          // after 'card ' (the gateway card-tools contract), with no other
          // 'card ' occurrence earlier in the line.
          text: 'card ' + String(v.draftId ?? '?')
            + ' (' + String(v.model ?? '?') + ') — ' + n + ' stage' + (n === 1 ? '' : 's')
            + ' · the user presses Run on the card',
        }]
      },
    },
    async execute(args, exec) {
      const a = args as { model?: unknown; prompt?: unknown; params?: Record<string, unknown> }
      if (typeof a.model !== 'string' || a.model.length === 0) {
        throw new Error('build_pipeline: "model" is required (a catalog model id string)')
      }
      if (typeof a.prompt !== 'string' || a.prompt.length === 0) {
        throw new Error('build_pipeline: "prompt" is required (what to put on the card)')
      }
      // MODEL ALLOWLIST — only models with dedicated card tools may be used.
      const ALLOWED_MODELS = new Set([
        'h3-timeline',
        'qwen3_tts_voicedesign',
        'qwen3-tts',
        'music3',
        'krea-2',
        'img-edit',
      ])
      if (!ALLOWED_MODELS.has(a.model)) {
        throw new Error('build_pipeline: model "' + a.model + '" is not allowed. Use one of: ' + [...ALLOWED_MODELS].join(', '))
      }
      // Catalog read: the model's default params + its family label (the
      // card title — the same derivation familyEntryToCard makes).
      const cat = await gatewayRequest(gatewayUrl, 'GET', '/v1/model-catalog', undefined, exec.signal, CATALOG_TIMEOUT_MS) as CatalogShape
      const models = cat.models ?? {}
      const entry = models[a.model]
      if (entry === undefined) {
        const near = Object.keys(models).slice(0, 12).join(', ')
        throw new Error('build_pipeline: unknown model "' + a.model + '" — catalog has: ' + near)
      }
      // RUNNABILITY GATE — ask the server's own resolver if this model
      // can actually produce a pipeline at Run time. If not, refuse.
      // This is a read-only check — no run registered, no GPU claimed.
      try {
        const v = await gatewayRequest(gatewayUrl, 'GET',
          '/v1/card-tools/validate?model=' + encodeURIComponent(a.model),
          undefined, exec.signal, 10_000) as { runnable?: boolean; error?: string }
        if (v.runnable !== true) {
          throw new Error('build_pipeline: ' + (v.error || 'model "' + a.model + '" cannot run'))
        }
      } catch (e: unknown) {
        // If the endpoint doesn't exist (old gateway), allow through —
        // the old gateway doesn't have the validate gate.
        if (e instanceof Error && /cannot run/.test(e.message)) throw e
      }
      const familyId = typeof entry.family === 'string' ? entry.family : a.model
      const famLabel = cat.families?.[familyId]?.label
      // CARD MANIFEST RESOLUTION — the action card's own declaration wins:
      // /v1/card-tools carries this model's card (image_card, tts_card, …)
      // with its stage_title ("Image", "Speech"…) and its params_schema
      // defaults. Without this the card renders as a generic model tile
      // titled by the family label ("Krea 2") — the exact regression the
      // operator reported. Manifest > catalog, always.
      let title = typeof famLabel === 'string' && famLabel.length > 0 ? famLabel : familyId
      let cardDefaults: Record<string, unknown> = {}
      try {
        const tools = await gatewayRequest(gatewayUrl, 'GET', '/v1/card-tools', undefined, exec.signal, CATALOG_TIMEOUT_MS) as Array<Record<string, unknown>>
        const manifest = Array.isArray(tools)
          ? tools.find((t) => t.model === a.model)
          : undefined
        if (manifest !== undefined) {
          const st = manifest.stage_title
          if (typeof st === 'string' && st.length > 0) title = st
          const props = (manifest.params_schema !== null && typeof manifest.params_schema === 'object'
            && (manifest.params_schema as { properties?: Record<string, { default?: unknown }> }).properties) ?? {}
          for (const [k, spec] of Object.entries(props)) {
            if (spec.default !== undefined) cardDefaults[k] = spec.default
          }
        }
      } catch {
        // Card-tools door unreachable: fall through with the family label —
        // the draft still composes; loud failure would lose the card.
      }
      const defaults = (entry.defaults !== null && typeof entry.defaults === 'object' && !Array.isArray(entry.defaults))
        ? entry.defaults as Record<string, unknown>
        : {}
      const bag = (a.params !== null && typeof a.params === 'object' && !Array.isArray(a.params)) ? a.params : {}
      // Card params: card manifest defaults < model defaults < explicit
      // params < the prompt arg (most specific wins).
      const params: Record<string, unknown> = { ...cardDefaults, ...defaults, ...bag, prompt: a.prompt }
      // Intent: the SHORT headline (the embed's card name) — the full prompt
      // lives in params.prompt; a novel-length prompt as intent is noise.
      const intent = a.prompt.length > 80 ? a.prompt.slice(0, 77) + '…' : a.prompt
      // THE DRAFT — the old wire: POST /v1/pipelines/drafts. Cards, not runs.
      const draft = await gatewayRequest(gatewayUrl, 'POST', '/v1/pipelines/drafts', {
        intent,
        stages: [{
          title,
          kind: 'generation',
          service: a.model,
          params,
        }],
      }, exec.signal, DRAFT_TIMEOUT_MS) as { draftId?: unknown; stages?: unknown }
      if (typeof draft.draftId !== 'string' || draft.draftId === '') {
        throw new Error('build_pipeline: gateway draft POST returned no draftId')
      }
      const value: Record<string, unknown> = {
        card: 'draft',
        draftId: draft.draftId,
        model: a.model,
        title,
        stages: Array.isArray(draft.stages) ? draft.stages : [],
      }
      return jsonClean(value)
    },
  }
}
