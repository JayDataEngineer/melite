/**
 * enhance_prompt — the old langchain-era prompt enhancement, transferred to
 * the DSH agent system ON THE HARNESS MODEL. The AGENT orchestrates; the
 * per-model recipes stay SSOT in the gateway form-spec; the completion runs
 * through ctx.llm — the same DeepSeek adapter the host itself chats through.
 *
 * There is NO keystore lookup on this path and NO model configuration: a
 * host that can converse at all has a registered route, so "no model" cannot
 * happen here.
 *
 * Two modes, one tool (no mode flag — the MODEL's declaration decides):
 *
 *   - SIMPLE (one field declared, e.g. z-image): this call IS the enhance —
 *     the model's own recipe drives one harness-model completion.
 *   - AGENTIC (multi-field, e.g. music3: caption + lyrics): a call without
 *     `field` returns the DECLARED FIELD LIST and makes no LLM call; the
 *     agent then calls once per field — each with that field's own recipe.
 *
 * This tool never executes a run; it transforms text only.
 */
import type { ToolDefinition } from '../types.ts'
import { jsonClean } from '../json-clean.ts'
import { fetchDeclaredFields, enhanceOneField, GENERIC_ENHANCE_RECIPE, type LlmSeam } from '../enhance-agent.ts'

export function enhancePrompt(
  gatewayUrl: string,
  llm: LlmSeam,
  getDefaultLlm?: () => string | undefined,
): ToolDefinition {
  return {
    name: 'enhance_prompt',
    description:
      'Rewrite a rough generation prompt into a model-optimal one using the model\'s OWN declared recipe (per-model expert system prompts), '
      + 'completed by the DeepSeek harness model itself. Args: model (a catalog id) + prompt (the user\'s rough words). '
      + 'Most models are SIMPLE: one call returns the enhanced text. Multi-field models (music3: caption + lyrics) are AGENTIC: '
      + 'the first call returns the field list — then call ONCE PER FIELD with field set, handing back every enhanced piece. '
      + 'Never invent fields; only the declared ones exist.',
    parameters: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: 'Catalog model id (discover with model_catalog), e.g. "z-image", "music3".',
        },
        prompt: {
          type: 'string',
          description: 'The user\'s rough words for THIS field.',
        },
        field: {
          type: 'string',
          description: 'Which declared enhance field to rewrite ("prompt", "lyrics", …). Omit on the FIRST call: single-field models enhance '
            + 'immediately; multi-field models return their field list for per-field follow-ups.',
        },
        temperature: {
          type: 'number',
          description: 'Optional sampling temperature override.',
        },
      },
      required: ['model', 'prompt'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          model: { type: 'string' },
          field: { type: 'string', description: 'The enhanced field ("prompt", "lyrics", …); absent on a field-listing response.' },
          positive: { type: 'string', description: 'The enhanced prompt text.' },
          negative: { type: 'string', description: 'Enhanced negative prompt when the model uses negatives, else "".' },
          via: { type: 'string', description: 'The harness route that served ("provider/model").' },
          fields: {
            type: 'array',
            items: { type: 'string' },
            description: 'Declared enhance fields — present ONLY on the multi-field listing response (call again once per field).',
          },
        },
        required: ['model', 'positive'],
      },
      render: (_args, value) => {
        const v = value as { model?: string; field?: string; positive?: string; fields?: string[] }
        if (Array.isArray(v.fields) && v.fields.length > 0) {
          return [{
            type: 'text',
            text: 'enhance fields for ' + String(v.model ?? '?') + ': ' + v.fields.join(', ')
              + ' — call enhance_prompt once per field with field set',
          }]
        }
        const n = typeof v.positive === 'string' ? v.positive.length : 0
        return [{
          type: 'text',
          text: 'enhanced ' + String(v.model ?? '?') + (v.field ? '.' + v.field : '') + ' → ' + n + ' chars · paste onto the card',
        }]
      },
    },
    async execute(args, exec) {
      const a = args as { model?: unknown; prompt?: unknown; field?: unknown; temperature?: unknown }
      if (typeof a.model !== 'string' || a.model.length === 0) {
        throw new Error('enhance_prompt: "model" is required (a catalog model id string)')
      }
      if (typeof a.prompt !== 'string') {
        throw new Error('enhance_prompt: "prompt" is required (the user\'s rough words)')
      }
      if (a.field !== undefined && typeof a.field !== 'string') {
        throw new Error('enhance_prompt: "field" must be a string when given')
      }

      // The recipes: form-spec is the SSOT — the SAME shared core the
      // /melite-tools/enhance sweep route uses. ONE implementation, two doors.
      const { fields, names } = await fetchDeclaredFields(gatewayUrl, a.model, exec.signal)

      // AGENTIC MODE: no field + multiple declarations → list, don't guess.
      // A wrong guess would silently enhance the lyrics as a caption.
      const wantsField = typeof a.field === 'string' && a.field.length > 0 ? a.field : null
      if (!wantsField && names.length > 1) {
        return jsonClean({ model: a.model, positive: '', fields: names })
      }

      const fieldName = wantsField ?? (names[0] ?? '')
      // GENERIC FALLBACK RECIPE (2026-09-01): most models declare no
      // per-model recipe. Enhancing ONLY recipe-bearing models made the
      // tool throw for krea-2 and friends — useless. A model with no
      // declared recipe gets the generic diffusion-prompt rewrite; the
      // result is still a strict improvement over the user's rough words.
      // NOTE: enhanceOneField takes the recipe as the plain system-prompt
      // STRING (it wraps it into { system } itself). The fallback used to
      // pass { system: GENERIC_ENHANCE_RECIPE } — an object — which
      // silently nested at runtime. Caught by the dsh tsc wall (2026-09-04).
      const recipe: string = fieldName !== '' && fields[fieldName] !== undefined
        ? fields[fieldName]!
        : GENERIC_ENHANCE_RECIPE
      const usedFallback = fieldName === '' || fields[fieldName] === undefined

      // THE completion: the host default model (no walk, no fallbacks —
      // queue lane law). The default is read LIVE per call — a default
      // flipped in settings applies without a reboot.
      const result = await enhanceOneField(
        llm, recipe, a.prompt,
        typeof a.temperature === 'number' ? a.temperature : undefined,
        exec.signal,
        undefined,
        getDefaultLlm?.(),
      )
      return jsonClean({
        model: a.model,
        field: fieldName === '' ? 'prompt' : fieldName,
        recipe: usedFallback ? 'generic' : 'model-declared',
        positive: result.positive,
        negative: result.negative,
        via: result.via,
      })
    },
  }
}

