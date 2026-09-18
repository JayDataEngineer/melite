// Tier 3 — the video-gen card (the wan_vace_t1 + scail2_t1 renderer
// ports). One card, one arm per boarded family (the img-gen shape:
// each video family has a different node topology, one interface);
// node order mirrors the python renderers exactly (creation order IS
// the node-id order; the parity wall pins it).
//
// Lane data is FACTS, never card constants: unet / text_encoder /
// clip_type / vae ride model.lane_inputs rows; the per-family knobs
// (width/length/steps/cfg...) ride model.defaults through the service
// cascade (the schema below mirrors only the python step-doc's own
// defaults — the wan Doc, the card's default family). The one loader
// with no facts row is the wan Lightning LoRA: the python holds it as
// a WanVaceT1Doc default, mirrored in the kit arm.
//
// No finalize pass: python strips nothing on either arm, and the
// pin's autofills (VHS_LoadVideoPath.format, WanSCAILToVideo's
// pose_end/previous_frame_count/replacement_mode/video_frame_offset)
// are byte-stable with comfy-script's api_format — verified by the
// golden ritual, pinned by the wall.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { ModelFacts } from '@melite/comfyui-card-kit/facts'
import type { ComfyUIService } from '@melite/comfyui-cordis/service'
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph'
import { wanVace, scail2, VIDEO_NEGATIVE_FALLBACK, VIDEO_REQUIRED_PATHS } from '@melite/comfyui-card-kit'
import { SAMPLERS, SCHEDULERS } from '@melite/comfyui-card-kit/vocab'
import { samplingExtra } from '@melite/comfyui-card-kit/fields'

const schema = z.object({
  prompt: z.string().description("Prompt").extra('extra', { order: 0, group: "prompt", columns: 2, width: 1, required: true, wtype: 'textarea', }),
  negative_prompt: z.string().description("Negative Prompt").extra('extra', { order: 1, group: "prompt", width: 1, wtype: 'textarea' }),
  // ride-the-model keys (cascade-owned): HINT-ONLY ranges via extra
  // (RANGE RULE 2026-09-08 — whoever owns the default owns the floor).
  width: z.number().description("Width").min(320).max(1280).step(16).extra('extra', { order: 0, group: "resolution", columns: 3, width: 1, min: 320, max: 1280, wtype: 'number' }),
  height: z.number().description("Height").min(320).max(720).step(16).extra('extra', { order: 1, group: "resolution", width: 1, min: 320, max: 720, wtype: 'number' }),
  length: z.number().description("Frames").min(9).max(121).step(4).extra('extra', { order: 2, group: "resolution", columns: 3, width: 1, tooltip: "4n+1 (Wan latent grid). 49 ≈ 2s, 81 ≈ 3.4s at 24fps.", wtype: 'number' }),
  fps: z.number().description("FPS").min(8).max(30).step(1).extra('extra', { order: 3, group: "resolution", width: 1, min: 8, max: 30, wtype: 'number' }),
  seed: z.number().description("Seed").step(1).default(-1).extra('extra', { order: 4, group: "resolution", width: 1 }),
  steps: z.number().description("Steps").min(1).max(50).step(1).extra('extra', samplingExtra('steps', { min: 1, max: 50 })),
  cfg: z.number().description("Guidance Scale").min(1).max(12).step(0.1).extra('extra', samplingExtra('cfg', { tooltip: "Lightning-distilled lanes run CFG 1 (guidance baked in)." })),
  sampler: SAMPLERS.description("Sampler").extra('extra', samplingExtra('sampler')),
  scheduler: SCHEDULERS.description("Scheduler").extra('extra', samplingExtra('scheduler')),
  reference_image: z.string().role('path').description("Reference image").extra('extra', { order: 0, group: "input", width: 1, tooltip: "The anchor frame — identity, subject, scene (wan-vace); the character to animate (scail2-animate).", wtype: 'image' }),
  pose_video: z.string().role('path').description("Driving video").extra('extra', { order: 1, group: "input", width: 1, tooltip: "The motion source — SCAIL-2 drives the reference character with this video.", wtype: 'video', families: ['scail2-animate'] }),
  pose_strength: z.number().description("Pose strength").min(0).max(2).step(0.05).default(1).extra('extra', { order: 2, group: "sampling", width: 1, tooltip: "How tightly SCAIL-2 follows the driving motion.", families: ['scail2-animate'] }),
})

export const inject = ['comfyui']

// THE IDENTITY RUNG (native 2026-09-10 — migrated from the frozen
// identity ring; the card owns its label/description/genre/icon).
export const identity = {
  label: 'Video',
  description: "Text/reference-to-video — the generate_video interface card boarding wan-vace and scail2-animate; one surface, one arm per family",
  genre: 'video',
  icon: 'video',
  principles: [
    'prompt is required — an empty/whitespace prompt is rejected loud, never sampled with empty conditioning',
    'The reference image anchors identity/scene — prompt the MOTION, not the subject',
    'Wan frames are 4n+1 (49 ≈ 2s at 24fps); SCAIL-2 drives a character from a pose video',
    'Defaults are shape, not value: resolution/steps/cfg come from the model folder, merged at serve time',
    'A family boards only when it can feed truthfully — lane facts + the arm template, no phantom options',
  ],
}

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerCard({
    id: 'video-gen',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'generate',
    boarded: ['wan-vace', 'scail2-animate'],
    tags: ['video', 'generate', 'text-to-video'],
    identity,
    // THE DISCOVERY ROWS (migrated 2026-09-10 from the frozen
    // discovery export — the card owns its sidebar, surface, and
    // flow-stage declarations; the discovery arms derive from here).
    sidebar: { key: 'video', order: 15 },
    flowKinds: {
      inputs: { prompt: 'text', reference_image: 'image', pose_video: 'video' },
      outputs: { default: 'video' },
      requiresModel: false,
    },
    // every render combines video through VideoHelperSuite
    // (VHS_LoadVideoPath + VHS_VideoCombine) — card-level, both
    // families ride the shared renderer.
    requires: ['comfyui-videohelpersuite'],
    // THE OPTIONAL BOTTOM SEAM (the form-seams stroke 2026-09-17):
    // the card claims a scrub timeline along the shell's bottom —
    // wired to the shared FilmPlayer the preview seat renders once
    // a video lands. Before any run there is nothing to scrub.
    preview: { timeline: true },
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, model: ModelFacts, g: GraphBuilder, runId: string) {
      // THE SCHEMA GATE (the music/sfx/tts admission precedent —
      // the card's own declaration validates the last hop into the
      // engine): schemastery walk enforces declared types + bounds
      // (steps is 1–50, cfg 1–12, width 320–1280 — anything else
      // refuses LOUD, never composes), fills defaults (seed -1,
      // pose_strength 1), admits legacy keys inert. The composer's
      // reads below are reads of the GATED doc.
      const doc = schema(p) as unknown as Record<string, unknown>
      if (!doc.prompt || !(doc.prompt as string).trim()) {
        throw new Error(`required param 'prompt' missing or empty on the ${model.id} video card (what MOVES)`)
      }
      for (const key of VIDEO_REQUIRED_PATHS[model.id] ?? ['reference_image', 'pose_video']) {
        if (!String(doc[key] ?? '').trim()) {
          throw new Error(`required param '${key}' missing on the ${model.id} lane (it is what the family consumes — see the card's input slots)`)
        }
      }
      const negative = (doc.negative_prompt as string) || VIDEO_NEGATIVE_FALLBACK
      if (model.id === 'scail2-animate') scail2(doc, negative, model, g, runId)
      else wanVace(doc, negative, model, g, runId)
    },
  }))
}
