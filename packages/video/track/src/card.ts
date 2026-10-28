// card.ts — the track card face (the swap lane's R0a preprocessing door).
//
// Clip in; tracked person mask + grey-mannequin motion reference +
// staged mask frames out. Reference-faithful single-clip chain
// (simple.api.json): scaled frames → SAM3 video track (person +
// face arms) → H3PeopleMask (edit arm + mannequin arm + face arm) →
// H3GreyMannequins → grown edit mask → staged files. The hat-fix
// branch is a documented delta (not composed). Pure staging — the
// swap itself rides the timeline's replace mod downstream.
import type { Context } from '@melite/comfyui-card-kit/card-definition'
import type {} from '@melite/comfyui-card-kit/service-faces'
import z from '@deepseek-ai/schemastery'
import type { ModelFacts } from '@melite/comfyui-card-kit/facts'
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph'
import { callableSchema, gatedResolve } from '@melite/comfyui-card-kit/admission'
import { bag } from '@melite/contracts/extraKeys'
import { DECL as maskDecl, PROVISIONS as MASK_PROVISIONS } from '@melite/models-mask'

export const FPS = 24
export const SAM3_CKPT = 'sam3.1_multiplex_fp16.safetensors'

/** THE ARM WEIGHTS (the silent-truncation law): the video track
 *  always runs, so the SAM3 video checkpoint is always touched —
 *  an absent weight refuses loud at compose, never a silent
 *  downstream death. */
const armWeights = (_merged: Record<string, unknown>): readonly string[] => [SAM3_CKPT]

export const schema = z.object({
  // THE ONE MEDIA SEAT: the clip to track.
  clip: z.string().role('path').description('Source Clip').extra('extra', bag({ order: 0, group: 'input', tooltip: 'The video to track (24 fps in the engine).', required: true, wtype: 'file', media: 'video' })),
  // THE TWO TRACK ARMS (the reference's own prompts, verbatim seats):
  // the person arm proposes the swap subject, the face arm the
  // mannequin's face region.
  prompt: z.string().description('Track Prompt').default('person').extra('extra', bag({ order: 0, group: 'general', width: 1, zone: 'params', wtype: 'text', tooltip: 'SAM3 text selection — what to track (the swap subject).' })),
  face_prompt: z.string().description('Face Prompt').default('face').extra('extra', bag({ order: 1, group: 'general', width: 1, zone: 'params', wtype: 'text', tooltip: 'The face track arm — the mannequin face region.' })),
  detection_threshold: z.number().description('Detection Threshold').min(0.05).max(0.95).step(0.05).default(0.35).extra('extra', bag({ order: 2, group: 'general', width: 1, zone: 'params', wtype: 'number', tooltip: 'SAM3 track confidence (the reference runs 0.35).' })),
  // THE EDIT-ARM MASK (reference node 39, verbatim defaults):
  // headroom + hold shape the swap region; max_people caps subjects.
  headroom: z.number().description('Headroom').min(0).max(1).step(0.05).default(0.1).extra('extra', bag({ order: 0, group: 'mask', width: 1, zone: 'params', wtype: 'number', tooltip: 'Headroom above the tracked person in the edit mask.' })),
  hold_frames: z.number().description('Hold Frames').min(0).max(10).step(1).default(2).extra('extra', bag({ order: 1, group: 'mask', width: 1, zone: 'params', wtype: 'number', tooltip: 'Temporal hold on the edit mask.' })),
  max_people: z.number().description('Max People').min(0).max(10).step(1).default(1).extra('extra', bag({ order: 2, group: 'mask', width: 1, zone: 'params', wtype: 'number', tooltip: 'Cap tracked subjects (0 = no cap).' })),
  mask_expand: z.number().description('Mask Expand').min(0).max(128).step(1).default(40).extra('extra', bag({ order: 3, group: 'mask', width: 1, zone: 'params', wtype: 'number', tooltip: 'Grow the edit mask (the reference runs 40).' })),
  // THE MANNEQUIN (reference node 41, verbatim defaults): the blur
  // pair hides identity while keeping motion.
  mannequin_blur: z.number().description('Mannequin Blur').min(0).max(1).step(0.01).default(0.04).extra('extra', bag({ order: 0, group: 'mannequin', width: 1, zone: 'params', wtype: 'number', tooltip: 'Body blur on the grey motion reference.' })),
  mannequin_face_blur: z.number().description('Face Blur').min(0).max(1).step(0.01).default(0.05).extra('extra', bag({ order: 1, group: 'mannequin', width: 1, zone: 'params', wtype: 'number', tooltip: 'Face blur on the grey motion reference.' })),
  frame_load_cap: z.number().description('Frame Cap').min(0).step(1).default(0).extra('extra', bag({ order: 0, group: 'general', width: 1, zone: 'params', wtype: 'number', tooltip: '0 loads the whole clip; otherwise the first N frames.' })),
})

const schemaFn = callableSchema(schema)

// THE IDENTITY RUNG (native — the card owns its label/description/
// genre/icon).
export const identity = {
  label: 'Video Mask',
  description: 'Track a clip into a person mask and a grey-mannequin motion reference: SAM3 track, H3 mask arms, staged files for the swap.',
  genre: 'video',
  icon: 'video',
  principles: [
    'The mannequin carries motion without identity — never the raw clip as motion reference.',
    'The staged files are the contract: mannequin video + mask frames land in the run tree for the replace mod — whose mask seat takes ONE image (the pixel-max union over the frames is recommended; folders never stage), never the folder.',
    'The face arm is fixed to the reference (headroom 0, hold 0) — only the edit arm is tunable.',
  ],
}

export const inject: string[] = ['comfyui']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerCard({
    id: 'track',
    skeleton: 'track',
    boarded: [],
    tags: ['video', 'mask', 'edit', 'form'],
    requiresModel: false,
    identity,
    // THE FAMILY OWNS THE DOWNLOADS: the SAM3 video checkpoint rows
    // live in the mask-select family's DECL (sam3.1_multiplex is the
    // video-track weight) — the card serves the export, authors no
    // row of its own.
    provisions: MASK_PROVISIONS,
    provisionOwner: maskDecl.id,
    sidebar: { key: 'video', order: 10 },
    flowKinds: {
      inputs: { clip: 'video' },
      outputs: { default: 'video' },
      requiresModel: false,
    },
    // THE DECLARED HERO: the mannequin video leads; the staged mask
    // frames ride the run tree beside it.
    primaryFile: 'mannequin',
    flowOutputBindings: [{ channel: 'default', node: '*', nodeClass: 'VHS_VideoCombine' }],
    // THE EXTENSION LAW: the track rides native SAM3.1, the mask +
    // mannequin arms ride the oneclick-swap pack — an extension-less
    // engine refuses at the door with the install rescue.
    requires: ['ComfyUI-VideoHelperSuite', 'comfyui-h3-oneclick-swap'],
    // THE ARM WEIGHTS (the silent-truncation law): the touched
    // provision rows are checked against the models tree at compose
    // — an absent SAM3 weight refuses loud, never a silent death.
    armWeights,
    schema: schemaFn,
    compose(p, _model: ModelFacts, g: GraphBuilder, runId: string) {
      // THE SCHEMA GATE: the surface is the declared knobs, nothing
      // else composes.
      const doc = gatedResolve('track', schemaFn, [], p)
      if (typeof doc.clip !== 'string' || !(doc.clip as string).trim()) {
        throw new Error("required param 'clip' missing on the track card — the video to track")
      }
      // THE LOAD + SCALE (reference nodes 5 + 35, verbatim keys):
      // full-clip load at 24 fps, shrunk to the track's 1008 edge.
      const frames = g.node('VHS_LoadVideo', {
        video: doc.clip as string,
        force_rate: FPS,
        custom_width: 0,
        custom_height: 0,
        frame_load_cap: doc.frame_load_cap as number,
        skip_first_frames: 0,
        select_every_nth: 1,
      }).out(0)
      const scaled = g.node('ImageScaleToMaxDimension', {
        upscale_method: 'area',
        largest_size: 1008,
        image: frames,
      }).out(0)
      // THE SAM3 MODEL (reference node 23): the multiplex video
      // checkpoint — model for the track, CLIP for the text arms.
      const sam = g.node('CheckpointLoaderSimple', { ckpt_name: SAM3_CKPT })
      const sampler = (text: string) => g.node('SAM3_VideoTrack', {
        detection_threshold: doc.detection_threshold as number,
        max_objects: 0,
        detect_interval: 1,
        images: scaled,
        model: sam.out(0),
        conditioning: g.node('CLIPTextEncode', { text, clip: sam.out(1) }).out(0),
      })
      // THE THREE MASK ARMS (reference nodes 38/39, 40, 70/71):
      // one person track shared by the edit arm (tunable) and the
      // mannequin arm (headroom 0, hold 1); the face track is fixed.
      const personTrack = sampler(doc.prompt as string)
      const editMask = g.node('H3PeopleMask', {
        headroom: doc.headroom as number,
        hold_frames: doc.hold_frames as number,
        max_people: doc.max_people as number,
        track_data: personTrack.out(0),
      })
      const manMask = g.node('H3PeopleMask', {
        headroom: 0,
        hold_frames: 1,
        max_people: doc.max_people as number,
        track_data: personTrack.out(0),
      })
      const faceMask = g.node('H3PeopleMask', {
        headroom: 0,
        hold_frames: 0,
        max_people: 0,
        track_data: sampler(doc.face_prompt as string).out(0),
      })
      // THE MANNEQUIN (reference node 41, verbatim keys): grey
      // motion reference — identity hidden by the blur pair.
      const mannequin = g.node('H3GreyMannequins', {
        blur: doc.mannequin_blur as number,
        face_blur: doc.mannequin_face_blur as number,
        images: scaled,
        mask: manMask.out(0),
        size: manMask.out(1),
        faces: faceMask.out(0),
        face_size: faceMask.out(1),
      }).out(0)
      g.node('VHS_VideoCombine', {
        images: mannequin,
        frame_rate: FPS,
        loop_count: 0,
        filename_prefix: `${runId}/mannequin`,
        format: 'video/h264-mp4',
        pingpong: false,
        save_output: true,
      }).out()
      // THE STAGED EDIT MASK (reference node 42, verbatim keys):
      // grown, converted, saved + previewed for the run tree.
      const grown = g.node('GrowMaskWithBlur', {
        expand: doc.mask_expand as number,
        incremental_expandrate: 0,
        tapered_corners: true,
        flip_input: false,
        blur_radius: 0,
        lerp_alpha: 1,
        decay_factor: 1,
        fill_holes: true,
        mask: editMask.out(0),
      }).out(0)
      const maskImage = g.node('MaskToImage', { mask: grown }).out(0)
      g.node('SaveImage', { images: maskImage, filename_prefix: `${runId}/mask` }).out()
      g.node('PreviewImage', { images: maskImage }).out()
    },
  }))
}
