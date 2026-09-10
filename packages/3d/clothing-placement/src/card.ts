// The card's single-spelling data (M2′ stroke 2, 2026-09-09):
// the Schemastery schema and the authored identity. The plugin entry
// (index.ts), the tool face (tool.ts), and the gateway projection all
// derive from THIS module — never a second spelling.
import z from '@deepseek-ai/schemastery'
import type { Context } from '@deepseek-ai/cordis'
import { resolveLinkedInput } from '@melite/comfyui-cordis/linked'
import type { ComfyUIService } from '@melite/comfyui-cordis/service'
import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

export const schema = z.object({
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

export const identity = {
  label: 'Clothing Placement',
  description:
    'Place a garment mesh on a body mesh in a persistent Blender session (MCP) - snap, offset, rotate, scale, mirror; exports the placed scene GLB.',
  genre: '3d',
  icon: 'box',
} as const

/** Estate-file contract shared by the compose gate: file-typed
 *  params must EXIST at compose time (absolute path expected); a
 *  $spell names a wired stage input and rides verbatim. A linked
 *  upstream output arrives as its asset URL in two spellings:
 *  absolute URLs ride (the submit-time uploader fetches them);
 *  root-relative URLs rewrite to the runs-root mount path (same
 *  estate, verified NOW). Returns the composed value (callers write
 *  it back — downstream sees the mount path, never the URL). */
function estateFile(param: string, ref: unknown): string {
  if (!ref || !(ref as string).trim()) {
    throw new Error(`required param '${param}' missing or empty on the clothing-placement card`)
  }
  const s = resolveLinkedInput(String(ref).trim())
  if (s.startsWith('$')) return s // wired stage input — rides verbatim
  const lower = s.toLowerCase()
  if (lower.startsWith('http://') || lower.startsWith('https://')) return s // linked output URL — the uploader stages it
  const abs = s.startsWith('/') ? s : resolve(s)
  if (!(existsSync(abs) && statSync(abs).isFile())) {
    throw new Error(`${param} '${s}' is not a file on this estate (absolute path expected)`)
  }
  return abs
}

/** Register the card face into the engine registry (ctx.comfyui).
 *  Lives with the card's data; index.ts only wires. Verbatim from
 *  the package's founding apply (M2′ stroke 1). */
/** Register the card face into the engine registry. The service
 *  arrives as a parameter (index.ts probed it — comfyui is an
 *  optional dependency, not an injected one). */
export function registerCard(ctx: Context, comfy: ComfyUIService): void {
  ctx.effect(() => comfy.registerCard({
    id: 'clothing-placement',
    skeleton: 'place',
    // no model families — the first pure-tool card (requiresModel:
    // false skips the {model:} demand in cardGate, compose, CLI).
    boarded: [],
    tags: ['3d', 'character', 'place'],
    requiresModel: false,
    // THE DISCOVERY ROWS (authored 2026-09-10 — the card postdates
    // the frozen discovery export, so it never had a frozen row:
    // sidebar order 22 fills the retired auto-rig slot in the 3d
    // cluster; the flow stage wires body + garment meshes).
    sidebar: { key: '3d', order: 22 },
    flowKinds: {
      inputs: { body: 'mesh', garment: 'mesh' },
      outputs: { default: 'mesh' },
      requiresModel: false,
    },
    identity,
    requires: ['melite-blender-proxy-nodes'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, _model, g, runId) {
      p.body = estateFile('body', p.body)
      p.garment = estateFile('garment', p.garment)
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
