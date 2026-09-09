// @melite/melite-3d-clothing-placement — the clothing-placement
// card (the Blender MCP card): garment-on-body placement through
// a PERSISTENT Blender session.
//
// PACKAGE HOME (M2′ stroke 1, 2026-09-09, P48.1): a card IS a
// plugin — its own package (receipt: references/deepseek-harness
// packages/shell/tool-bash), self-registering via named exports
// name/inject/apply (Harness-Packages law: function plugins
// named-export; no default export, no mixed forms). Content moved
// VERBATIM from
// comfyui-cordis/src/cards/3d/clothing-placement/card.ts (git mv).
// The glob walk in loadCardDefs never sees it again; composition
// is the explicit package list.
//
// PURE LAW-0 CARD (2026-09-08 purge-complaint ruling): TS-native from
// birth — no model→family resolution (requiresModel: false; the
// admission pre-check skips when no row exists) and the card's own
// Schemastery parse is the real gate.
// The card RUNS via the flow path (card stages → cardGate →
// ctx.comfyui.compose), never the {model:}/draft path.
//
// Graph: MeliteBlenderMCPCall(macro=place_garment, args) runs the
// pack-shipped bpy macro in the session (human-synced interactive
// Blender + MCP add-on, or the node's headless autoboot) and the
// result JSON lands as a SaveText provenance artifact beside the
// placed GLB the macro writes to out_path.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { identity, schema } from './card.ts'
import { buildCardTool } from './tool.ts'
import type { ToolsServiceLike } from './tool.ts'


export const name = 'clothing-placement'
export const inject = ['comfyui']

export const Config = z.object({
  gateway: z.string().default('http://localhost:33081').description(
    'The Melite gateway base URL (the flow doors the tool face calls)'),
})

function estateFile(param: string, ref: unknown): void {
  if (!ref || !(ref as string).trim()) {
    throw new Error(`required param '${param}' missing or empty on the clothing-placement card`)
  }
  const s = String(ref).trim()
  if (s.startsWith('$')) return // wired stage input — rides verbatim
  const abs = s.startsWith('/') ? s : resolve(s)
  if (!(existsSync(abs) && statSync(abs).isFile())) {
    throw new Error(`${param} '${s}' is not a file on this estate (absolute path expected)`)
  }
}

export function apply(ctx: Context, config: ReturnType<typeof Config>): void {
  ctx.effect(() => ctx.comfyui.registerCard({
    id: 'clothing-placement',
    skeleton: 'place',
    // no model families — the first pure-tool card (requiresModel:
    // false skips the {model:} demand in cardGate, compose, CLI).
    boarded: [],
    requiresModel: false,
    identity,
    requires: ['melite-blender-proxy-nodes'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, _model, g, runId) {
      estateFile('body', p.body)
      estateFile('garment', p.garment)
      // out_path is a WRITE target (the macro creates it): the
      // contract is non-empty + an existing parent dir, never a
      // pre-existing file.
      if (!p.out_path || !(p.out_path as string).trim()) {
        throw new Error("required param 'out_path' missing or empty on the clothing-placement card")
      }
      const outAbs = resolve(String(p.out_path).trim())
      const parent = resolve(outAbs, '..')
      if (!(existsSync(parent) && statSync(parent).isDirectory())) {
        throw new Error(`out_path parent '${parent}' is not a directory on this estate (stage it first)`)
      }
      const args = JSON.stringify({
        body: String(p.body).trim(),
        garment: String(p.garment).trim(),
        out: String(p.out_path).trim(),
        position: [p.position_x, p.position_y, p.position_z],
        rotation: [p.rotation_x, p.rotation_y, p.rotation_z],
        scale: p.scale,
        snap_to: String(p.snap_to ?? ''),
        mirror_x: Boolean(p.mirror_x),
      })
      const result = g.node('MeliteBlenderMCPCall', {
        macro: 'place_garment',
        args,
        timeout: p.timeout,
        mcp_addr: String(p.mcp_addr ?? ''),
        autoboot: Boolean(p.autoboot),
      }).out()
      g.node('SaveText', {
        text: result,
        format: 'json',
        filename_prefix: `${runId}/placement`,
      })
    },
  }))

  // TOOL FACE (M2′ stroke 2): where the composing host provides a
  // tools service, the card ALSO emits its DSH tool — in-package,
  // one spelling (schema/identity from card.ts, name from the id
  // law). The optional-service law (Harness-Packages): ctx.get for a
  // service not in inject — the gateway process has no tools
  // service, so there the package contributes only its card.
  const tools = ctx.get('tools') as ToolsServiceLike | undefined
  if (tools !== undefined) {
    const gatewayUrl = (config?.gateway ?? '').trim() || process.env.MELITE_GATEWAY_URL || 'http://localhost:33081'
    ctx.effect(() => tools.register(buildCardTool(gatewayUrl.replace(/\/+$/, ''))))
  }
}
