// card.ts — the trim card face (the swap lane's R0c preprocessing door).
//
// Clip in, timestamp-trimmed clip out: a VHS load window (skip +
// frame cap at the lane's 24 fps contract) re-combined to h264 with
// the source audio carried through. Pure VHS nodes — the compose
// door refuses an extension-less engine with the install rescue,
// never a mid-run abort.
import type { Context } from '@melite/comfyui-card-kit/card-definition'
import type {} from '@melite/comfyui-card-kit/service-faces'
import z from '@deepseek-ai/schemastery'
import type { ModelFacts } from '@melite/comfyui-card-kit/facts'
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph'
import { callableSchema, gatedResolve } from '@melite/comfyui-card-kit/admission'
import { bag } from '@melite/contracts/extraKeys'

export const FPS = 24

export const schema = z.object({
  // THE ONE MEDIA SEAT: the clip to trim.
  clip: z.string().role('path').description('Source Clip').extra('extra', bag({ order: 0, group: 'input', tooltip: 'The video to trim (24 fps in the engine).', required: true, wtype: 'file', media: 'video' })),
  // THE WINDOW (seconds, engine-evaluated): start trims the head,
  // end < 0 keeps the tail to the last frame.
  start_seconds: z.number().description('Start (s)').min(0).step(0.1).default(0).extra('extra', bag({ order: 0, group: 'general', width: 1, zone: 'params', wtype: 'number', tooltip: 'Trim head before this timestamp.' })),
  end_seconds: z.number().description('End (s)').min(-1).step(0.1).default(-1).extra('extra', bag({ order: 1, group: 'general', width: 1, zone: 'params', wtype: 'number', tooltip: '-1 keeps the tail to the last frame.' })),
})

const schemaFn = callableSchema(schema)

// THE IDENTITY RUNG (native — the card owns its label/description/
// genre/icon).
export const identity = {
  label: 'Trim Video',
  description: 'Cut a clip to a timestamp window: head/tail trim at 24 fps, source audio carried through.',
  genre: 'video',
  icon: 'video',
  principles: [
    'The window is frame-exact at 24 fps — seconds convert by round, never floor.',
    'The tail is open-ended: end < 0 keeps everything after start.',
    'Audio rides the combine — a trim never silences the clip.',
  ],
}

export const inject: string[] = ['comfyui']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerCard({
    id: 'trim',
    skeleton: 'trim',
    boarded: [],
    tags: ['video', 'trim', 'edit', 'form'],
    requiresModel: false,
    identity,
    sidebar: { key: 'video', order: 8 },
    flowKinds: {
      inputs: { clip: 'video' },
      outputs: { default: 'video' },
      requiresModel: false,
    },
    flowOutputBindings: [{ channel: 'default', node: '*', nodeClass: 'VHS_VideoCombine' }],
    // THE EXTENSION LAW: the load window + the combine ride VHS —
    // an extension-less engine refuses at the door with the install
    // rescue, never a mid-run engine abort.
    requires: ['ComfyUI-VideoHelperSuite'],
    schema: schemaFn,
    compose(p, _model: ModelFacts, g: GraphBuilder, runId: string) {
      // THE SCHEMA GATE: schemastery validates types and bounds; no
      // riders — the surface is the three declared knobs, nothing
      // else composes.
      const doc = gatedResolve('trim', schemaFn, [], p)
      if (typeof doc.clip !== 'string' || !(doc.clip as string).trim()) {
        throw new Error("required param 'clip' missing on the trim card — the video to trim")
      }
      const start = doc.start_seconds as number
      const end = doc.end_seconds as number
      if (end >= 0 && end <= start) {
        throw new Error(`empty trim window on the trim card — end_seconds (${end}) must exceed start_seconds (${start}), or stay -1 for the open tail`)
      }
      // THE LOAD WINDOW (the estate VHS convention, verbatim keys):
      // skip lands on round(start*24); the cap is 0 (all) for the
      // open tail, else the rounded window length.
      const loader = g.node('VHS_LoadVideo', {
        video: doc.clip as string,
        force_rate: FPS,
        custom_width: 0,
        custom_height: 0,
        frame_load_cap: end < 0 ? 0 : Math.max(1, Math.round((end - start) * FPS)),
        skip_first_frames: Math.round(start * FPS),
        select_every_nth: 1,
      })
      // THE COMBINE (the viggle-animate precedent, verbatim): h264
      // mp4 at the lane fps, the source clip's own audio carried
      // through on the loader's audio slot.
      g.node('VHS_VideoCombine', {
        images: loader.out(0),
        frame_rate: FPS,
        loop_count: 0,
        filename_prefix: `${runId}/trim`,
        format: 'video/h264-mp4',
        pingpong: false,
        save_output: true,
        audio: loader.out(2),
      }).out()
    },
  }))
}
