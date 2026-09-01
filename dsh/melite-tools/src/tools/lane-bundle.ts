/**
 * lane_bundle — the LANE DOOR.
 *
 * ONE call returns a lane's entire surface:
 *   GET {gateway}/v1/cards/<lane>/bundle → {lane, tools, skills}
 *     - tools: the card tool.json manifest(s) — name, model,
 *       params_schema, constraints (the input contract for a card).
 *     - skills: the lane's skill documents — AGENT.md rules, seam laws,
 *       grid laws, prompt recipes.
 *
 * NO ARGUMENT → the lane LISTING: every card manifest the gateway
 * serves (/v1/card-tools) as one compact row per lane — the lane key,
 * the card tool name, its title, and its param keys. The lane key
 * resolves either way: card-dir style ("image-gen", "tts",
 * "humanoid-flow") or model style ("krea-2", "qwen3-tts",
 * "h3-timeline") — the gateway matcher accepts both.
 *
 * The flow this tool anchors: lane_bundle() → list; lane_bundle(lane)
 * → manifest + skills; skill_read(id) → a skill's full body;
 * build_pipeline(model, prompt) → the card.
 */
import type { ToolDefinition } from '../types.ts'
import { gatewayRequest } from '../gateway.ts'
import { jsonClean } from '../json-clean.ts'

const TIMEOUT_MS = 15_000

interface BundleTool {
  name?: unknown
  model?: unknown
  version?: unknown
  kind?: unknown
  stage_title?: unknown
  description?: unknown
  params_schema?: unknown
  constraints?: unknown
}

interface BundleSkill {
  id?: unknown
  name?: unknown
  description?: unknown
}

function paramKeys(t: BundleTool): string[] {
  const sch = t.params_schema as { properties?: Record<string, unknown> } | undefined
  return sch && typeof sch.properties === 'object' ? Object.keys(sch.properties) : []
}

export function laneBundle(gatewayUrl: string): ToolDefinition {
  return {
    name: 'lane_bundle',
    description:
      'Load one inference lane\'s full bundle (tool manifest + skills), or LIST all lanes when called with no arguments. '
      + 'With {lane}: GET /v1/cards/<lane>/bundle → the lane\'s params_schema (the card\'s input contract) and its skill '
      + 'documents (rules, seam/grid laws, recipes) — read these BEFORE build_pipeline. Without arguments: one compact row '
      + 'per lane from the gateway\'s card catalog — lane key, card tool name, title, param keys. Lane keys resolve by card '
      + 'dir name ("video-gen", "image-gen", "tts", "sfx", "music", "3d-gen", "motion-gen", "body", "humanoid-flow") or by '
      + 'model id ("krea-2", "qwen3-tts", "h3-timeline").',
    parameters: {
      type: 'object',
      properties: {
        lane: {
          type: 'string',
          description: 'Optional lane key. Omit to LIST all lanes. Card-dir style ("image-gen", "tts") or model id ("krea-2", "qwen3-tts").',
        },
      },
      required: [],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          mode: { type: 'string', description: '"list" (no lane given) or "bundle".' },
          lanes: {
            type: 'array',
            description: 'List mode: one row per lane {lane, card, title, description, params}.',
          },
          lane: { type: 'string', description: 'Bundle mode: the resolved lane name.' },
          tools: { type: 'array', description: 'Bundle mode: card manifests with params_schema + constraints.' },
          skills: { type: 'array', description: 'Bundle mode: the lane\'s skill documents (id/name/description).' },
        },
        required: ['mode'],
      },
      render: (_args, value) => {
        const v = value as {
          mode?: string
          lanes?: Array<{ lane?: string; title?: string }>
          lane?: string
          tools?: BundleTool[]
          skills?: BundleSkill[]
        }
        if (v.mode === 'list') {
          const n = Array.isArray(v.lanes) ? v.lanes.length : 0
          return [{
            type: 'text',
            text: 'lane_bundle: ' + String(n) + ' lanes — '
              + (v.lanes ?? []).map((l) => String(l.lane ?? '?')).join(', '),
          }]
        }
        const nTools = Array.isArray(v.tools) ? v.tools.length : 0
        const nSkills = Array.isArray(v.skills) ? v.skills.length : 0
        return [{
          type: 'text',
          text: 'lane_bundle ' + String(v.lane ?? '?') + ': ' + String(nTools) + ' tool(s), '
            + String(nSkills) + ' skill(s) — read the skills, then build_pipeline',
        }]
      },
    },
    async execute(args, exec) {
      const a = args as { lane?: unknown }

      // LIST MODE — no lane: enumerate every card manifest as a lane row.
      if (typeof a.lane !== 'string' || a.lane.length === 0) {
        const manifests = await gatewayRequest(
          gatewayUrl, 'GET', '/v1/card-tools', undefined, exec.signal, TIMEOUT_MS,
        ) as BundleTool[]
        const rows = (Array.isArray(manifests) ? manifests : [])
          .filter((m) => typeof m?.name === 'string' && typeof m?.model === 'string')
          .map((m) => ({
            lane: String(m.model),
            card: typeof m.name === 'string' ? m.name : null,
            title: typeof m.stage_title === 'string' ? m.stage_title : null,
            description: typeof m.description === 'string' ? m.description : null,
            params: paramKeys(m),
          }))
        return jsonClean({ mode: 'list', lanes: rows, lane_count: rows.length })
      }

      // BUNDLE MODE — one lane's full surface.
      const lane = a.lane
      const res = await gatewayRequest(
        gatewayUrl, 'GET', '/v1/cards/' + encodeURIComponent(lane) + '/bundle',
        undefined, exec.signal, TIMEOUT_MS,
      ) as { lane?: string; tools?: BundleTool[]; skills?: BundleSkill[] }

      const tools = Array.isArray(res.tools)
        ? res.tools.map((t) => ({
            name: t.name,
            model: t.model,
            description: t.description,
            params_schema: t.params_schema,
            constraints: t.constraints,
          }))
        : []

      // Skills stay as index rows (id/name/description) — full bodies load
      // on demand via skill_read: progressive disclosure.
      const skills = Array.isArray(res.skills)
        ? res.skills.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
          }))
        : []

      return jsonClean({
        mode: 'bundle',
        lane: res.lane ?? lane,
        tools,
        skills,
        tool_count: tools.length,
        skill_count: skills.length,
      })
    },
  }
}
