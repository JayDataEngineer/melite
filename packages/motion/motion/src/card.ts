// Tier 3 — the motion card (the motion_t1 renderer port). Kimodo
// checkpoint lane + optional RaySomaxBake preview skin (melite-poser
// stopgap).
// Decl + admission + one kit recipe call — the lane body lives in src/kit.ts.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { motionLane, finalizeMotion } from '@melite/comfyui-card-kit'
import type { ComfyUIService } from '@melite/comfyui-cordis/service'
import { vocabulary } from '@melite/comfyui-card-kit/vocab'

export const schema = z.object({
  prompt: z.string().description("Prompt").extra('extra', { order: 0, group: "prompt", columns: 1, tooltip: "What the body DOES — verb-first, one continuous action per segment. Multi-segment: separate with | and pair with motion_prompts.", required: true, wtype: 'textarea', }),
  seed: z.number().description("Seed").step(1).default(42).extra('extra', { order: 1, group: "prompt", width: 1, tooltip: "Same seed + prompt = same motion take." }),
  duration_sec: z.number().description("Duration (s)").min(1).max(30).step(0.5).default(5).extra('extra', { order: 0, group: "generation", width: 1, tooltip: "Length of the generated motion segment." }),
  diffusion_steps: z.number().description("Diffusion steps").min(10).max(200).step(1).default(25).extra('extra', { order: 1, group: "generation", width: 1, tooltip: "More steps = smoother arcs; 25 is the calibrated default.", wtype: 'number' }),
  num_samples: z.number().description("Samples").min(1).max(4).step(1).default(1).extra('extra', { order: 2, group: "generation", width: 1, tooltip: "Takes per prompt (each becomes its own NPZ).", wtype: 'number' }),
  num_transition_frames: z.number().description("Transition frames").min(0).max(60).step(1).default(10).extra('extra', { order: 3, group: "generation", width: 1, tooltip: "Blend frames when chaining onto a previous motion (motion_npz).", wtype: 'number' }),
  // the diffusion guidance vocabulary is CLOSED (python compose
  // voice: separated | regular | nocfg) — schemastery names a bad
  // value loudly instead of wiring it to the GPU silently.
  cfg_type: vocabulary(["separated", "regular", "nocfg"]).description("CFG mode").default("separated").extra('extra', { order: 0, group: "guidance", width: 1, tooltip: "separated = independent text/action guidance (calibrated); nocfg = fastest.", wtype: 'select' }),
  cfg_weight_a: z.number().description("CFG weight A").min(0).max(15).step(0.5).default(2.5).extra('extra', { order: 1, group: "guidance", width: 1, tooltip: "Text guidance weight (separated mode)." }),
  cfg_weight_b: z.number().description("CFG weight B").min(0).max(15).step(0.5).default(5).extra('extra', { order: 2, group: "guidance", width: 1, tooltip: "Action guidance weight (separated mode)." }),
  motion_npz: z.string().description("Chain from NPZ").extra('extra', { order: 0, group: "chain", tooltip: "Previous motion NPZ to continue — the new prompt takes over after num_transition_frames of blend." }),
  motion_prompts: z.string().description("Multi-segment prompts").extra('extra', { order: 1, group: "chain", tooltip: "Segment prompts joined with | — one motion per segment, auto-chained in order.", wtype: 'textarea' }),
  motion_constraints: z.string().description("Joint constraints").extra('extra', { order: 2, group: "chain", tooltip: "Pin joints (e.g. left_foot:ground) — JSON or key:value lines, applied per segment.", wtype: 'textarea' }),
  preview_glb: z.string().role('path').description("Preview character GLB").extra('extra', { order: 0, group: "output", tooltip: "SOMAX-rigged character GLB — the motion is skinned onto it (somax bake) as an animated GLB artifact.", wtype: 'file' }),
})

export const BOARDED: string[] = ['kimodo']

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

export function registerCard(ctx: Context, comfy: ComfyUIService): void {
  ctx.effect(() => comfy.registerCard({
    id: 'motion',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'motion',
    boarded: ['kimodo'],
    tags: ['motion', 'animate', 'generate'],
    identity,
    // THE DISCOVERY ROWS (migrated 2026-09-10 from the frozen
    // discovery export — the card owns its sidebar, surface, and
    // flow-stage declarations; the discovery arms derive from here).
    sidebar: { key: 'motion', order: 9 },
    surface: { size: 'huge', layout: 'studio' },
    flowKinds: {
      inputs: { prompt: 'text' },
      outputs: { default: 'video' },
      requiresModel: false,
    },
    requires: ['melite-kimodo-nodes', 'melite-poser-nodes'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, model, g) {
      if (!p.prompt || !(p.prompt as string).trim()) {
        throw new Error("required param 'prompt' missing on the motion card — the motion lane generates FROM a text prompt")
      }
      motionLane(p, model, g)
    },
    finalize: finalizeMotion,
  }))
}
