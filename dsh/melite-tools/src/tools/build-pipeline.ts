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
      'Compose the action cards for ONE Melite generation (image/video/audio/3D): creates a pipeline draft and the '
      + 'conversation renders the REAL editable card tiles (prompt, model params — refined in the card, run by the '
      + 'user pressing Run). Pick sound defaults and hand it back — do not ask for details first. Args: model (a '
      + 'catalog id from model_catalog) + prompt (+ optional params bag). For options or variations, call it once '
      + 'per variation — the cards stack in the conversation. This tool never executes anything — there is no run '
      + 'tool; ONLY the user starts runs, from the cards.',
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
          // the render text, not the raw value).
          text: 'cards draft ' + String(v.draftId ?? '?') + ' — ' + n + ' card' + (n === 1 ? '' : 's')
            + ' (' + String(v.model ?? '?') + ') · the user presses Run on the card',
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
      // Catalog read: the model's default params + its family label (the
      // card title — the same derivation familyEntryToCard makes).
      const cat = await gatewayRequest(gatewayUrl, 'GET', '/v1/model-catalog', undefined, exec.signal, CATALOG_TIMEOUT_MS) as CatalogShape
      const models = cat.models ?? {}
      const entry = models[a.model]
      if (entry === undefined) {
        const near = Object.keys(models).slice(0, 12).join(', ')
        throw new Error('build_pipeline: unknown model "' + a.model + '" — catalog has: ' + near)
      }
      const familyId = typeof entry.family === 'string' ? entry.family : a.model
      const famLabel = cat.families?.[familyId]?.label
      const title = typeof famLabel === 'string' && famLabel.length > 0 ? famLabel : familyId
      const defaults = (entry.defaults !== null && typeof entry.defaults === 'object' && !Array.isArray(entry.defaults))
        ? entry.defaults as Record<string, unknown>
        : {}
      const bag = (a.params !== null && typeof a.params === 'object' && !Array.isArray(a.params)) ? a.params : {}
      // Card params: model defaults < explicit params < the prompt arg.
      const params: Record<string, unknown> = { ...defaults, ...bag, prompt: a.prompt }
      // THE DRAFT — the old wire: POST /v1/pipelines/drafts. Cards, not runs.
      const draft = await gatewayRequest(gatewayUrl, 'POST', '/v1/pipelines/drafts', {
        intent: a.prompt,
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
