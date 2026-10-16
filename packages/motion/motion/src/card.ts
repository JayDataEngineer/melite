// Tier 3 — the motion card (the motion_t1 renderer port). Kimodo
// checkpoint lane + optional RaySomaxBake preview skin (melite-poser
// stopgap).
// Decl + admission + one kit recipe call — the lane body rides @melite/comfyui-card-kit (kimodoLane).
import type { Context } from '@melite/comfyui-card-kit/card-definition'
import z from '@deepseek-ai/schemastery'
import { DECL as kimodoDecl } from '@melite/models-kimodo'
import { declaredAction, finalizeMotion, instantiateAction, type ActionBinding as Binding } from '@melite/comfyui-card-kit'
import { ComfyUIServiceFace } from '@melite/comfyui-card-kit/service-faces'
import { vocabulary } from '@melite/comfyui-card-kit/vocab'
import { bag } from '@melite/contracts/extraKeys'
import { seedExtra } from '@melite/comfyui-card-kit/fields'
import { callableSchema, gatedResolve } from '@melite/comfyui-card-kit/admission'

export const schema = z.object({
  prompt: z.string().description("Prompt").extra('extra', bag({ order: 0, group: "prompt", columns: 1, tooltip: "What the body DOES — verb-first, one continuous action per segment. Multi-segment: separate with | and pair with motion_prompts.", required: true, wtype: 'textarea', })),
  seed: z.number().description("Seed").step(1).extra('extra', bag(seedExtra({ order: 1, group: 'prompt', width: 1, tooltip: 'Same seed + prompt = same motion take.' }))),
  duration_sec: z.number().description("Duration (s)").min(1).max(10).step(0.5).extra('extra', bag({ order: 0, group: "generation", width: 1, tooltip: "Length of one generated motion segment. Upstream caps a single prompt at 10 s; a longer clip is motion_prompts segments." })),
  diffusion_steps: z.number().description("Diffusion steps").min(10).max(200).step(1).extra('extra', bag({ order: 1, group: "generation", width: 1, tooltip: "More steps = smoother arcs; 25 is the calibrated default.", wtype: 'number' })),
  num_samples: z.number().description("Samples").min(1).max(4).step(1).extra('extra', bag({ order: 2, group: "generation", width: 1, tooltip: "Takes per prompt (each becomes its own NPZ).", wtype: 'number' })),
  num_transition_frames: z.number().description("Transition frames").min(0).max(60).step(1).extra('extra', bag({ order: 3, group: "generation", width: 1, tooltip: "Blend frames when chaining onto a previous motion (motion_npz).", wtype: 'number' })),
  // the diffusion guidance vocabulary is CLOSED (python compose
  // voice: separated | regular | nocfg) — schemastery names a bad
  // value loudly instead of wiring it to the GPU silently.
  cfg_type: vocabulary(["separated", "regular", "nocfg"]).description("CFG mode").extra('extra', bag({ order: 0, group: "guidance", width: 1, tooltip: "separated = independent text/action guidance (calibrated); nocfg = fastest.", wtype: 'select' })),
  cfg_weight_a: z.number().description("CFG weight A").min(0).max(15).step(0.5).extra('extra', bag({ order: 1, group: "guidance", width: 1, tooltip: "Text guidance weight (separated mode)." })),
  cfg_weight_b: z.number().description("CFG weight B").min(0).max(15).step(0.5).extra('extra', bag({ order: 2, group: "guidance", width: 1, tooltip: "Action guidance weight (separated mode)." })),
  motion_npz: z.string().description("Chain from NPZ").extra('extra', bag({ order: 0, group: "chain", tooltip: "Previous motion NPZ to continue — the new prompt takes over after num_transition_frames of blend." })),
  motion_prompts: z.string().description("Multi-segment prompts").extra('extra', bag({ order: 1, group: "chain", tooltip: "Segment prompts joined with | — one motion per segment, auto-chained in order.", wtype: 'textarea' })),
  motion_constraints: z.string().description("Joint constraints").extra('extra', bag({ order: 2, group: "chain", tooltip: "Pin joints (e.g. left_foot:ground) — JSON or key:value lines, applied per segment.", wtype: 'textarea' })),
  preview_glb: z.string().role('path').description("Preview character GLB").extra('extra', bag({ order: 0, group: "output", tooltip: "SOMAX-rigged character GLB — the motion is skinned onto it (somax bake) as an animated GLB artifact.", wtype: 'file' })),
})

const schemaFn = callableSchema(schema)

// THE FAMILY ID COMES FROM ITS DECL (the closure gate's RULE 5)
export const BOARDED: string[] = [kimodoDecl.id]

// THE FAMILY BINDINGS (the atom vocabulary, stroke 3): every
// boarded family's declared compose action, keyed by the row's
// family address. A family-less row (the declared fallback) rides
// the legacy lane arm below — never a silent second copy.
export const ACTION_BINDINGS: Record<string, Binding> = {
  [kimodoDecl.id]: (p, model, g, runId) => void instantiateAction(declaredAction(kimodoDecl, 'compose'), p, model, g, runId),
}

/** The identity rung (label/description — the authored prose the
 *  emitted tool row carries; the ring's spelling, stated once). */
export const identity = {
  label: 'Motion',
  description: 'Text → 3D human motion (SOMA-77 pose NPZ). Chain segments, constrain joints, skin onto a rigged character GLB.',
  genre: 'motion',
  icon: 'motion',
}

/** The CARD face's plugin apply (the dual-face law, 2026-09-12):
 * the cardPackages SSOT composes THIS subpath in the engine plane —
 * '@melite/motion-motion/card' — where the registry seat lives. The
 * package root is the web profile's row-mount marker (the tool ride
 * is melite-tools', the studio ride is the client face's). */
export const inject = ['comfyui']

export function apply(ctx: Context): void {
  registerCard(ctx, ctx.comfyui)
}

export function registerCard(ctx: Context, comfy: ComfyUIServiceFace): void {
  ctx.effect(() => comfy.registerCard({
    id: 'motion',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'motion',
    // (A-C3, 2026-09-28: the literal was the drift class — a DECL
    // rename silently diverged from the hand list. The spread is
    // the derivation; closure-gate RULE 5 pins it.)
    boarded: [...BOARDED],
    tags: ['motion', 'animate', 'generate'],
    identity,
    // THE DISCOVERY ROWS (migrated 2026-09-10 from the frozen
    // discovery export — the card owns its sidebar, surface, and
    // flow-stage declarations; the discovery arms derive from here).
    sidebar: { key: 'motion', order: 9 },
    surface: { size: 'huge', layout: 'studio' },
    flowKinds: {
      // preview_glb joins the ports (the naming law's census,
      // 2026-10-09): the character the motion skins onto is a REAL
      // wire seat — a prior motion stage's animated_glb (mesh)
      // chains straight in (motion → motion re-skinning).
      inputs: { prompt: 'text', motion_npz: 'data', preview_glb: 'mesh' },
      outputs: { motion_npz: 'data', animated_glb: 'mesh' },
      requiresModel: false,
    },
    flowOutputBindings: [
      { channel: 'motion_npz', node: 'KimodoTextToPose.0', nodeClass: 'KimodoTextToPose' },
      {
        channel: 'animated_glb',
        node: 'RaySomaxBake.0',
        nodeClass: 'RaySomaxBake',
        when: (params) => typeof params['preview_glb'] === 'string' && params['preview_glb'] !== '',
      },
    ],
    requires: ['melite-kimodo-nodes', 'melite-poser-nodes'],
    schema: schemaFn,
    compose(p, model, g, runId) {
      // THE SCHEMA GATE (the audio-trio admission precedent — the
      // card's own declaration validates the last hop into the
      // engine): schemastery walk enforces declared types + bounds
      // (a diffusion_steps=500 draft refuses LOUD here, never
      // composes — declared 10..200; the closed cfg_type row refuses
      // outside separated|regular|nocfg), fills defaults, passes
      // undeclared keys through inert. The composer's reads below
      // are reads of the GATED doc.
      // THE BG BRICK CURE (journey wave-2): the studio persists
      // motion_bg_image into stage.params; it rides here as a
      // declared rider (UI-only — no ACTION_BINDINGS read consumes
      // it, so it never reaches the serialized graph; the card.spec
      // hop-5 arm pins that half).
      const doc = gatedResolve('motion', schemaFn, ['model', 'motion_bg_image'], p)
      if (!doc.prompt || !(doc.prompt as string).trim()) {
        throw new Error("required param 'prompt' missing on the motion card — the motion lane generates FROM a text prompt")
      }
      const bound = ACTION_BINDINGS[model.family ?? model.id]
      if (bound) bound(doc, model, g, runId)
      else {
        throw new Error(
          `no declared action for family '${String(model.family ?? model.id)}' on the motion card — every boarded family (kimodo) composes its own declared segment; this address owns none`)
      }
    },
    finalize: finalizeMotion,
  }))
}
