// Tier 3 — the quad-remesh card (the cpp autoremesher renderer
// port, 2026-09-07). ONE-IMPLEMENTATION RULE (the kimodo precedent):
// the cpp lane retired the day the melite-autoremesher-nodes pack
// won — AutoRemesher (GLB in, remeshed GLB out) IS the lane, and
// this single-node graph IS the render.
//
// NODE CONTRACT (vendor/comfyui_extensions/melite-autoremesher-nodes/nodes.py):
// budget law explicit > preset > model.yaml defaults, LOUD on
// missing (preset "" + target_quads 0 raises — silent defaults are
// banned); preset "" means "no budget class" (preset_params = {});
// smooth_normal is NOT a node input — the pack hardcodes
// `--smooth-normal 0.0` on the binary argv (nodes.py), so a non-zero
// card value could never take effect and refuses HERE, by name.
// filename_prefix is compose-stamped per run (`<runId>/remeshed`
// the family constant shape, never a knob: the card's own voice
// was "the run routes outputs by run id (compose stamps the prefix
// internally)"), NOT the node's "autoremesher/remeshed" default.
//
// RANGE CONTRACT: the card mirrors the live AutoRemesher input bounds
// so the editor and the node reject the same values. The model-less
// card owns its defaults; the node receives those values directly.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { quadRemeshLane } from '@melite/comfyui-card-kit'

const schema = z.object({
  // This card is model-less, so its six numeric defaults live in the
  // card schema; input remains required at compose.
  // RANGE RULE: schema min/max mirrors the live AutoRemesher input
  // contract, so the editor and the node refuse the same values.
  input: z.string().role('path').description("Input mesh").extra('extra', { order: null, tooltip: "GLB path or artifact-ref from a previous card", required: true, wtype: 'mesh', }),
  target_quads: z.number().description("Target quads").min(0).max(200000).default(50000).extra('extra', { order: null, tooltip: "Target quad count", min: 0, max: 200000 }),
  edge_scaling: z.number().description("Edge scaling").min(0).max(4).default(1).extra('extra', { order: null, min: 0, max: 4.0 }),
  sharp_edge: z.number().description("Sharp edge").min(0).max(180).default(90).extra('extra', { order: null, min: 0.0, max: 180.0 }),
  smooth_normal: z.number().description("Smooth normal").min(0).max(1).default(0).extra('extra', { order: null, min: 0.0, max: 1.0 }),
  adaptivity: z.number().description("Adaptivity").min(0).max(2).default(1).extra('extra', { order: null, min: 0, max: 2.0 }),
  anisotropy: z.number().description("Anisotropy").min(0).max(4).default(1).extra('extra', { order: null, min: 0, max: 4.0 }),
  // NO preset (the card has no preset field — the node budget class
  // is ALWAYS "" here; explicit knobs rule) and NO filename_prefix
  // (compose stamps `<runId>/remeshed` internally, never a knob).
})

export const inject = ['comfyui']

// THE IDENTITY RUNG (native 2026-09-10 — migrated from the frozen
// identity ring; the card owns its label/description/genre/icon).
export const identity = {
  label: 'Quad Remesh',
  description: 'High-poly mesh → clean quad topology',
  genre: '3d',
  icon: 'mesh',
  principles: [
    'target_quads is the budget — lower is cleaner, higher keeps detail',
    'sharp_edge below 90 preserves creases; above smooths them',
    'adaptivity above 1 concentrates quads at curvature',
    'Feed it a dense scan or TRELLIS output; it returns clean quads',
  ],
}

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerCard({
    id: 'quad-remesh',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'quad-remesh',
    boarded: ['autoremesher'],
    tags: ['3d', 'remesh', 'optimize'],
    identity,
    // THE DISCOVERY ROWS (migrated 2026-09-10 from the frozen
    // discovery export — the card owns its sidebar, surface, and
    // flow-stage declarations; the discovery arms derive from here).
    sidebar: { key: '3d', order: 13 },
    flowKinds: {
      inputs: { input: 'mesh' },
      outputs: { default: 'mesh' },
      requiresModel: false,
    },
    flowOutputBindings: [
      { channel: 'default', node: 'AutoRemesher.0', nodeClass: 'AutoRemesher' },
    ],
    requires: ['melite-autoremesher-nodes'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, _model, g, runId) {
      // THE SCHEMA GATE (the audio-trio admission precedent — the
      // card's own declaration validates the last hop into the
      // engine): schemastery walk enforces declared types + bounds
      // (a target_quads=50 draft refuses LOUD here, never composes
      // — declared 100..1000000), fills defaults, passes undeclared
      // keys through inert. The composer's reads below are reads of
      // the GATED doc.
      const doc = schema(p) as Record<string, unknown>
      const input = String(doc.input || '')
      if (!input.trim()) {
        throw new Error(
          `required param 'input' missing on the quad-remesh lane — the remesh needs the dense input mesh (GLB path or artifact-ref)`)
      }
      // The node hardcodes `--smooth-normal 0.0` on the binary argv
      // (melite-autoremesher-nodes nodes.py) — a non-zero card value
      // could never take effect, so it refuses HERE, never silently.
      const smooth = doc.smooth_normal as number
      if (typeof smooth === 'number' && smooth !== 0.0) {
        throw new Error(
          `smooth_normal = ${String(doc.smooth_normal)} refuses: the AutoRemesher node hardcodes --smooth-normal 0.0 (nodes.py) — the knob rides the card surface for the editor, but no graph can carry it`)
      }
      quadRemeshLane(doc, g, runId)
    },
  }))
}
