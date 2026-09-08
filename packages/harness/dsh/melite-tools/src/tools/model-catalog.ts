/**
 * model_catalog — the discovery surface, compacted for a model context.
 *
 * GET {gateway}/v1/model-catalog returns the full catalog (families, models,
 * capabilities, engine/quant orders — ~96 models with variants/presets/
 * provisioning blocks). This tool compacts it: per model only id, label,
 * family, form, engines, variant ids and preset keys (detail=true adds
 * defaults, full presets, variants and the source declaration), plus an
 * optional substring filter so the model can aim before it reads.
 */
import type { ToolDefinition } from '../types.ts'
import { gatewayRequest } from '../gateway.ts'
import { jsonClean } from '../json-clean.ts'

const CATALOG_TIMEOUT_MS = 20_000
const DEFAULT_LIMIT = 50

interface ModelEntry {
  label?: unknown
  family?: unknown
  form?: unknown
  capability?: unknown
  engine?: unknown
  checkpoint?: unknown
  defaults?: unknown
  variants?: unknown
  presets?: unknown
  source?: unknown
}

export function modelCatalog(gatewayUrl: string): ToolDefinition {
  return {
    name: 'model_catalog',
    description:
      "List Melite's model catalog (GET /v1/model-catalog), compacted: model ids with label/family/form/engines/variant "
      + 'ids/preset keys, plus the capability → default-family map. Filter with query (substring over id, label and '
      + 'family); detail=true adds per-model defaults, presets, variants and the provision source. Use an exact id '
      + 'from here for flow_start / compose.',
    // Wire shape (2026-08-22): ctx.tools.register passes parameters through
    // schemaOf() VERBATIM to the provider — no author-map compilation happens
    // on this path. The old author shape (property map with inline
    // required:true) went out as a malformed schema (no type/properties/
    // required keywords), and the model answered every call with empty
    // arguments {} — the "compose: model is required" loop. Full
    // JSON-Schema object or nothing.
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Substring filter over model id, label and family (case-insensitive). Omit for everything.',
        },
        limit: {
          type: 'integer',
          description: `Max models returned (${DEFAULT_LIMIT} default; the summary counts the total regardless).`,
        },
        detail: {
          type: 'boolean',
          description: 'Include defaults, full presets, variants and the source declaration per matched model.',
        },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          model_count: { type: 'integer' },
          returned: { type: 'integer' },
          models: { type: 'object', additionalProperties: true },
          capabilities: { type: 'object', additionalProperties: true },
          families: { type: 'object', additionalProperties: true },
        },
        required: ['model_count', 'returned', 'models'],
      },
      render: (_args, value) => {
        const v = value as {
          model_count: number
          returned: number
          models: Record<string, { label?: string; family?: string; form?: string }>
        }
        const lines = [`melite catalog: ${v.returned}/${v.model_count} models`]
        for (const [id, m] of Object.entries(v.models)) {
          lines.push(`  ${id} — ${m.label ?? id} (family=${m.family ?? '?'} form=${m.form ?? '?'})`)
        }
        return [{ type: 'text', text: lines.join('\n') }]
      },
    },
    async execute(args, exec) {
      const a = args as { query?: unknown; limit?: unknown; detail?: unknown }
      const catalog = await gatewayRequest(gatewayUrl, 'GET', '/v1/model-catalog', undefined, exec.signal, CATALOG_TIMEOUT_MS) as {
        families?: Record<string, unknown>
        models?: Record<string, ModelEntry>
        engine_order?: unknown
        quant_order?: unknown
        capabilities?: Record<string, Record<string, unknown>>
      }
      const models = catalog.models ?? {}
      const q = typeof a.query === 'string' ? a.query.toLowerCase() : ''
      const matched = Object.entries(models).filter(([id, m]) => {
        if (!q) return true
        return (
          id.toLowerCase().includes(q)
          || String(m.label ?? '').toLowerCase().includes(q)
          || String(m.family ?? '').toLowerCase().includes(q)
        )
      })
      const limit = Math.min(Math.max(Number(a.limit ?? DEFAULT_LIMIT) || DEFAULT_LIMIT, 1), 500)
      const detail = a.detail === true

      const compactModels: Record<string, unknown> = {}
      for (const [id, m] of matched.slice(0, limit)) {
        const variantIds = Array.isArray(m.variants)
          ? (m.variants as Array<{ id?: unknown }>).map((v) => v?.id).filter((x): x is string => typeof x === 'string')
          : []
        const presetKeys = m.presets && typeof m.presets === 'object' ? Object.keys(m.presets) : []
        const base: Record<string, unknown> = {
          label: m.label,
          family: m.family,
          form: m.form,
          ...(m.capability !== undefined ? { capability: m.capability } : {}),
          ...(typeof m.engine === 'string' ? { engine: m.engine } : {}),
          variants: variantIds,
          presets: presetKeys,
        }
        if (detail) {
          base.defaults = m.defaults ?? {}
          base.presets = m.presets ?? {}
          base.variants = m.variants ?? []
          base.source = m.source ?? null
        }
        compactModels[id] = base
      }

      const compactCapabilities: Record<string, unknown> = {}
      for (const [id, c] of Object.entries(catalog.capabilities ?? {})) {
        compactCapabilities[id] = {
          label: c.label,
          description: c.description,
          default_family: c.default_family,
          families: c.families,
        }
      }

      const compactFamilies: Record<string, unknown> = {}
      for (const [id, f] of Object.entries(catalog.families ?? {})) {
        const entry = f as { label?: unknown; genre?: unknown }
        compactFamilies[id] = { label: entry.label, genre: entry.genre }
      }

      return jsonClean({
        model_count: Object.keys(models).length,
        returned: Object.keys(compactModels).length,
        truncated: matched.length > limit,
        engine_order: catalog.engine_order ?? [],
        quant_order: catalog.quant_order ?? [],
        models: compactModels,
        capabilities: compactCapabilities,
        families: compactFamilies,
      })
    },
  }
}