// Tier 3 — the quad-remesh card (the cpp autoremesher renderer
// port, 2026-09-07). ONE-IMPLEMENTATION RULE (the kimodo precedent):
// the cpp lane retired the day the melite-autoremesher-nodes pack
// won — AutoRemesher (GLB in, remeshed GLB out) IS the lane, and
// this single-node graph IS the render.
//
// NODE CONTRACT (vendor/comfyui_extensions/melite-autoremesher-nodes/nodes.py):
// budget law explicit > preset > preset.yaml defaults, LOUD on
// missing (a preset with no budget and target_quads 0 raises —
// silent defaults are banned); the card's preset knob names the
// budget class (hero default) and explicit target_quads > 0
// overrides it;
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
import { declaredAction, instantiateAction, type ActionBinding as Binding } from '@melite/comfyui-card-kit'
import { DECL as autoremesherDecl } from '@melite/models-autoremesher'
import { bag } from '@melite/contracts/extraKeys'
import { vocabulary } from '@melite/comfyui-card-kit/vocab'
import { gatedResolve } from '@melite/comfyui-cordis'

const schema = z.object({
  // This card is model-less, so its six numeric defaults live in the
  // card schema; input remains required at compose.
  // RANGE RULE: schema min/max mirrors the live AutoRemesher input
  // contract, so the editor and the node refuse the same values.
  input: z.string().role('path').description("Input mesh").extra('extra', bag({ order: null, tooltip: "GLB path or artifact-ref from a previous card. The remesh rebuilds the surface — input textures/UVs do not survive (no transfer rides the node); texture the quad mesh after.", required: true, wtype: 'mesh', })),
  target_quads: z.number().description("Target quads").min(0).max(200000).default(50000).extra('extra', bag({ order: null, tooltip: "Target quad count", min: 0, max: 200000 })),
  edge_scaling: z.number().description("Edge scaling").min(0).max(4).default(1).extra('extra', bag({ order: null, min: 0, max: 4.0 })),
  sharp_edge: z.number().description("Sharp edge").min(0).max(180).default(90).extra('extra', bag({ order: null, min: 0.0, max: 180.0 })),
  smooth_normal: z.number().description("Smooth normal").min(0).max(1).default(0).extra('extra', bag({ order: null, min: 0.0, max: 1.0 })),
  adaptivity: z.number().description("Adaptivity").min(0).max(2).default(1).extra('extra', bag({ order: null, min: 0, max: 2.0 })),
  anisotropy: z.number().description("Anisotropy").min(0).max(4).default(1).extra('extra', bag({ order: null, min: 0, max: 4.0 })),
  // THE BUDGET CLASS (the node's required combo — nodes.py INPUT_TYPES:
  // `preset: (preset_ids or ["prop"],)`, packs' presets/<class>.yaml own
  // the budgets). The old "always ''" contract predates the enum: the
  // wiring judge refuses '' against the live schema ("the input allows
  // 6 values" — the af-move commission's stop, 2026-10-09). hero = the
  // character class (80k); explicit target_quads > 0 overrides the
  // preset budget (the node's own explicit>preset law).
  preset: vocabulary(['complex_creature', 'creature', 'hero', 'large_prop', 'prop', 'rock']).description("Budget class").default('hero').extra('extra', bag({ order: null, tooltip: "Budget class — target_quads > 0 overrides its budget", wtype: 'select' })),
  // NO filename_prefix (compose stamps `<runId>/remeshed` internally,
  // never a knob).
})

/** The schema's callable face — ONE cast serving both seams (the
 *  registration's schema carrier and the compose strict resolve's
 *  judge): schemastery schemas are callable (Schema.resolve) but
 *  carry a typed data parameter, while both card-seam consumers
 *  take unknown. */
const schemaFn = schema as unknown as (v: unknown) => Record<string, unknown>

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
    'The output is untextured — the remesh rebuilds the surface and drops textures/UVs, so texture after',
  ],
}

// THE FAMILY BINDINGS (the atom vocabulary, stroke 3): every
// boarded family's declared compose action, keyed by the row's
// family address. A family-less row (the declared fallback) rides
// the legacy lane arm below — never a silent second copy.
export const ACTION_BINDINGS: Record<string, Binding> = {
  [autoremesherDecl.id]: (p, model, g, runId) => void instantiateAction(declaredAction(autoremesherDecl, 'remesh'), p, model, g, runId),
}

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerCard({
    id: 'quad-remesh',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'quad-remesh',
    boarded: [autoremesherDecl.id],
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
    schema: schemaFn,
    compose(p, model, g, runId) {
      // THE SCHEMA GATE (the audio-trio admission precedent — the
      // card's own declaration validates the last hop into the
      // engine): schemastery walk enforces declared types + bounds
      // (a target_quads=50 draft refuses LOUD here, never composes
      // — declared 100..1000000), fills defaults, passes undeclared
      // keys through inert. The composer's reads below are reads of
      // the GATED doc.
      const doc = gatedResolve('quad-remesh', schemaFn, ['model'], p)
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
      const bound = ACTION_BINDINGS[model.family ?? model.id]
      if (bound) bound(doc, model, g, runId)
      else {
        throw new Error(
          `no declared action for family '${String(model.family ?? model.id)}' on the quad-remesh card — every boarded family (autoremesher) composes its own declared segment; this address owns none`)
      }
    },
  }))
}
