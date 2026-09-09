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

const schema = z.object({
  // THE ESTATE-FILE CONTRACT (the upscale-tools precedent): a
  // file-typed param must EXIST at compose time — absolute path
  // expected. A $spell ("$body") names a WIRED STAGE INPUT, never a
  // file: rides verbatim, the runtime rewrites it against the wired
  // input. Compile-time, never inference-time.
  body: z.string().description(
    'Body mesh — absolute GLB/GLTF/FBX/OBJ path, or a $spell naming the wired upstream stage input'
  ).extra('extra', { required: true }),
  garment: z.string().description(
    'Garment mesh — absolute GLB/GLTF/FBX/OBJ path, or a $spell naming the wired upstream stage input'
  ).extra('extra', { required: true }),
  out_path: z.string().description(
    'Absolute path the placed scene GLB is written to (caller-staged under the run scratch)'
  ).extra('extra', { required: true }),
  position_x: z.number().default(0).description('Garment offset X from the placement base'),
  position_y: z.number().default(0).description('Garment offset Y from the placement base'),
  position_z: z.number().default(0).description('Garment offset Z from the placement base'),
  rotation_x: z.number().default(0).description('Garment rotation degrees about X'),
  rotation_y: z.number().default(0).description('Garment rotation degrees about Y'),
  rotation_z: z.number().default(0).description('Garment rotation degrees about Z'),
  // RANGE RULE: whoever owns the default owns the floor.
  scale: z.number().min(0.01).default(1).description('Uniform garment scale'),
  snap_to: z.string().default('').description(
    'Object or armature-bone name to place relative to (default: the body root)'),
  mirror_x: z.boolean().default(false).description('Mirror the garment across X (symmetry)'),
  mcp_addr: z.string().default('').description(
    'Session host:port override (default: MELITE_BLENDER_MCP_ADDR, else 127.0.0.1:9876)'),
  autoboot: z.boolean().default(true).description(
    'Boot a headless session when none listens (false = human-synced session only)'),
  timeout: z.number().min(10).step(1).default(300).description(
    'Seconds for the session to answer'),
})

export const name = 'clothing-placement'
export const inject = ['comfyui']

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

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerCard({
    id: 'clothing-placement',
    skeleton: 'place',
    // no model families — the first pure-tool card (requiresModel:
    // false skips the {model:} demand in cardGate, compose, CLI).
    boarded: [],
    requiresModel: false,
    // AUTHORED PROSE, declared inline (M1, 2026-09-09: the card
    // emits the tool — the ring never carried this TS-added card;
    // the old TOOLS_JSON prose moves home. The identity rung's
    // named-divergence row dies with the second spelling.)
    identity: {
      label: 'Clothing Placement',
      description:
        'Place a garment mesh on a body mesh in a persistent Blender session (MCP) - snap, offset, rotate, scale, mirror; exports the placed scene GLB.',
      genre: '3d',
    },
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
}
