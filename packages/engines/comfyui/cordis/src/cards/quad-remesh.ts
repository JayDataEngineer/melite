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
// filename_prefix is compose-stamped per run (`<runId>/remeshed` —
// the family constant shape, never a knob: the py card's own voice
// was "the run routes outputs by run id (compose stamps the prefix
// internally)"), NOT the node's "autoremesher/remeshed" default.
//
// RANGE FLOORS (retired schema.py voice — deliberately NOT ported):
// the card decl still carries the editor floors (target_quads>=100,
// edge 0.1-10, sharp 0-180, adaptivity/anisotropy 0.1-2); at compose
// everything rides through to the node's own loud laws (a 0 means
// "preset default" per the node tooltips, falling through to the
// model.yaml defaults — documented, never silent; preset "" +
// target_quads 0 raises IN THE NODE, named). Compose refuses only
// what can never run (empty input) and what can never apply
// (smooth_normal != 0.0).
import type { Context } from '@deepseek-ai/cordis'
import { z } from '../atoms.ts'
import { quadRemeshLane } from '../kit.ts'

const schema = z.object({
  // Ride keys (no .default — the compose-door cascade overlays model
  // defaults, then explicit params): input is py-required (bare
  // z.string() is the image-gen prompt precedent — optional at
  // parse, refused loud at compose). The six numeric defaults are
  // the py card Slider defaults verbatim (drift wall leg (d)).
  input: z.string(),
  target_quads: z.number().default(50000),
  edge_scaling: z.number().default(1.0),
  sharp_edge: z.number().default(90.0),
  smooth_normal: z.number().default(0.0),
  adaptivity: z.number().default(1.0),
  anisotropy: z.number().default(1.0),
  // NO preset (the card has no preset field — the node budget class
  // is ALWAYS "" here; explicit knobs rule) and NO filename_prefix
  // (compose stamps `<runId>/remeshed` internally, never a knob).
})

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.comfyui.registerCard({
    id: 'quad-remesh',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'quad-remesh',
    boarded: ['autoremesher'],
    requires: ['melite-autoremesher-nodes'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, _model, g, runId) {
      const input = String(p.input || '')
      if (!input.trim()) {
        throw new Error(
          `required param 'input' missing on the quad-remesh lane — the remesh needs the dense input mesh (OBJ/STL/PLY path or artifact-ref)`)
      }
      // The node hardcodes `--smooth-normal 0.0` on the binary argv
      // (melite-autoremesher-nodes nodes.py) — a non-zero card value
      // could never take effect, so it refuses HERE, never silently.
      const smooth = p.smooth_normal as number
      if (typeof smooth === 'number' && smooth !== 0.0) {
        throw new Error(
          `smooth_normal = ${String(p.smooth_normal)} refuses: the AutoRemesher node hardcodes --smooth-normal 0.0 (nodes.py) — the knob rides the card surface for the editor, but no graph can carry it`)
      }
      quadRemeshLane(p, g, runId)
    },
  })
}
