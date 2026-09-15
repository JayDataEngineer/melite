// Tier 3 — the blender-shot card (the 3d lane's OBSERVE arm,
// 2026-09-15). ONE-IMPLEMENTATION RULE: the persistent Blender
// session IS the eyes — MeliteBlenderRenderShot photographs it
// (a mesh path imports fresh; empty keeps the CURRENT session
// scene, the iterative case) and the IMAGE rides SaveImage into
// the run's artifacts, where eyes (agent or operator) read it and
// the loop decides the next act off pixels, not log text.
//
// NODE CONTRACT (vendor/comfyui_extensions/melite-blender-proxy-nodes/):
// the node derives the shot path server-side from ComfyUI's output
// dir + the run-stamped tag (the card never smuggles absolute
// engine paths — Layer A makes API calls, never host paths); the
// shot basename sanitizes to [A-Za-z0-9-_], the tag carries the
// run id so every shot is deterministic per run. Blender itself is
// a host requirement (SKINTOKEN_BLENDER_BIN / BLENDER_BIN, else
// PATH) — unresolvable = loud refusal at RUN time.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { ComfyUIService } from '@melite/comfyui-cordis/service'

const schema = z.object({
  // Ride keys (no .default — refused loud at compose when absent):
  // the mesh to photograph; empty photographs the live session.
  scene: z.string().description("Mesh to photograph").extra('extra', { order: 0, tooltip: "Mesh to photograph (GLB/GLTF/FBX/OBJ); empty = keep the current session scene", required: false, wtype: 'text', }),
  // RANGE RULE (whoever owns the default owns the floor): the card
  // owns all three — the node's INPUT_TYPES floors mirror this,
  // never the reverse.
  width: z.number().description("Shot width px").min(256).max(1536).step(64).default(768).extra('extra', { order: 1, tooltip: "Render width px", min: 256, max: 1536 }),
  height: z.number().description("Shot height px").min(256).max(1536).step(64).default(768).extra('extra', { order: 2, tooltip: "Render height px", min: 256, max: 1536 }),
  timeout: z.number().description("Timeout seconds").min(10).max(3600).step(10).default(300).extra('extra', { order: 3, tooltip: "Seconds for the session to answer", min: 10, max: 3600 }),
})

export const inject = ['comfyui']

// THE IDENTITY RUNG (native 2026-09-10 — migrated from the frozen
// identity ring; the card owns its label/description/genre/icon).
export const identity = {
  label: 'Blender Shot',
  description: 'Photograph the Blender session (a mesh, or the live scene the acts just changed); the shot rides the artifacts for eyes to read',
  genre: '3d',
  icon: 'box',
  principles: [
    'the shot is the observe arm — acts mutate the session, this photographs it',
    'empty scene keeps the live session: photograph what the last act changed',
    'the loop reads the shot and decides the next act off pixels, never log text',
    'Blender itself is a host requirement (SKINTOKEN_BLENDER_BIN / BLENDER_BIN, else PATH)',
  ],
}

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerCard({
    id: 'blender-shot',
    // stage-row id the compose emits (TS owns the truth post-flip).
    skeleton: 'blender_shot',
    // no model families — the fourth pure-tool card
    // (clothing-placement precedent: boarded [] + requiresModel
    // false skips the {model:} demand in cardGate, compose, CLI).
    boarded: [],
    tags: ['3d', 'blender', 'shot', 'observe'],
    identity,
    // THE DISCOVERY ROWS (the card owns its sidebar, surface, and
    // flow-stage declarations; the discovery arms derive from here).
    sidebar: { key: '3d', order: 25 },
    flowKinds: {
      inputs: { scene: 'mesh' },
      outputs: { default: 'image' },
      requiresModel: false,
    },
    requiresModel: false,
    requires: ['melite-blender-proxy-nodes'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, _model, g, runId) {
      // scene is OPTIONAL and never refused: empty photographs the
      // LIVE session (the iterative case — the loop's whole point).
      // A first-ever empty shot simply sees the startup scene.
      const scene = String(p.scene ?? '')
      const shot = g.node('MeliteBlenderRenderShot', {
        scene,
        tag: `${runId}_shot`,
        width: p.width as number,
        height: p.height as number,
        timeout: p.timeout as number,
      }).out()
      g.node('SaveImage', {
        images: shot,
        filename_prefix: `${runId}/shot`,
      })
    },
  }))
}
