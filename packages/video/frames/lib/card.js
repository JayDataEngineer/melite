import z from '@deepseek-ai/schemastery';
import { callableSchema, gatedResolve } from '@melite/comfyui-card-kit/admission';
import { bag } from '@melite/contracts/extraKeys';
export const FPS = 24;
export const schema = z.object({
    // THE ONE MEDIA SEAT: the clip to fan into frames.
    clip: z.string().role('path').description('Source Clip').extra('extra', bag({ order: 0, group: 'input', tooltip: 'The video to split into staged frames (24 fps in the engine).', required: true, wtype: 'file', media: 'video' })),
    // THE FAN (engine-evaluated): every-Nth frame; 48 = one contact
    // frame every 2 s at 24 fps. Cap 0 loads the whole clip.
    every_nth: z.number().description('Every Nth Frame').min(1).step(1).default(48).extra('extra', bag({ order: 0, group: 'general', width: 1, zone: 'params', wtype: 'number', tooltip: 'Frame stride — 48 keeps one frame every 2 s.' })),
    frame_load_cap: z.number().description('Frame Cap').min(0).step(1).default(0).extra('extra', bag({ order: 1, group: 'general', width: 1, zone: 'params', wtype: 'number', tooltip: '0 loads the whole clip; otherwise the first N frames.' })),
});
const schemaFn = callableSchema(schema);
// THE IDENTITY RUNG (native — the card owns its label/description/
// genre/icon).
export const identity = {
    label: 'Video Frames',
    description: 'Fan a clip into staged frame images: every-Nth at 24 fps, saved to the run tree for downstream seats.',
    genre: 'video',
    icon: 'video',
    principles: [
        'The run tree is the folder — no new output type; downstream seats take staged paths.',
        'Stride and cap are engine-evaluated — the load window and the saved set always agree.',
    ],
};
export const inject = ['comfyui'];
export function apply(ctx) {
    ctx.effect(() => ctx.comfyui.registerCard({
        id: 'frames',
        skeleton: 'frames',
        boarded: [],
        tags: ['video', 'frames', 'edit', 'form'],
        requiresModel: false,
        identity,
        sidebar: { key: 'video', order: 9 },
        flowKinds: {
            inputs: { clip: 'video' },
            outputs: { default: 'image' },
            requiresModel: false,
        },
        flowOutputBindings: [{ channel: 'default', node: '*', nodeClass: 'SaveImage' }],
        // THE EXTENSION LAW: the load rides VHS (native SaveImage needs
        // no pack) — an extension-less engine refuses at the door with
        // the install rescue, never a mid-run engine abort.
        requires: ['ComfyUI-VideoHelperSuite'],
        schema: schemaFn,
        compose(p, _model, g, runId) {
            // THE SCHEMA GATE: the surface is the three declared knobs,
            // nothing else composes.
            const doc = gatedResolve('frames', schemaFn, [], p);
            if (typeof doc.clip !== 'string' || !doc.clip.trim()) {
                throw new Error("required param 'clip' missing on the frames card — the video to fan into frames");
            }
            const loader = g.node('VHS_LoadVideo', {
                video: doc.clip,
                force_rate: FPS,
                custom_width: 0,
                custom_height: 0,
                frame_load_cap: doc.frame_load_cap,
                skip_first_frames: 0,
                select_every_nth: doc.every_nth,
            });
            // THE STAGE: native SaveImage fans the batch — one numbered
            // file per frame under the run prefix (the folder downstream
            // seats read).
            g.node('SaveImage', {
                images: loader.out(0),
                filename_prefix: `${runId}/frames`,
            }).out();
        },
    }));
}
//# sourceMappingURL=card.js.map
