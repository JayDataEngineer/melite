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
import { wanVace, scail2, VIDEO_NEGATIVE_FALLBACK, VIDEO_REQUIRED_PATHS } from '../kit.ts'

const schema = z.object({
  prompt: z.string(),
  negative_prompt: z.string(),
  reference_image: z.string(),
  pose_video: z.string(),
  pose_strength: z.number().default(1.0),
  width: z.number(),
  height: z.number(),
  length: z.number(),
  fps: z.number(),
  steps: z.number(),
  cfg: z.number(),
  sampler: z.string(),
  scheduler: z.string(),
  seed: z.number().default(-1),
})

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.comfyui.registerCard({
    id: 'video-gen',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'generate',
    boarded: ['wan-vace', 'scail2-animate'],
    // every render combines video through VideoHelperSuite
    // (VHS_LoadVideoPath + VHS_VideoCombine) — card-level, both
    // families ride the shared renderer.
    requires: ['comfyui-videohelpersuite'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, model: ModelFacts, g: GraphBuilder, runId: string) {
      if (!p.prompt || !(p.prompt as string).trim()) {
        throw new Error(`required param 'prompt' missing or empty on the ${model.id} video card (what MOVES)`)
      }
      for (const key of VIDEO_REQUIRED_PATHS[model.id] ?? ['reference_image', 'pose_video']) {
        if (!String(p[key] ?? '').trim()) {
          throw new Error(`required param '${key}' missing on the ${model.id} lane (it is what the family consumes — see the card's input slots)`)
        }
      }
      const negative = (p.negative_prompt as string) || VIDEO_NEGATIVE_FALLBACK
      if (model.id === 'scail2-animate') scail2(p, negative, model, g, runId)
      else wanVace(p, negative, model, g, runId)
    },
  })
}
