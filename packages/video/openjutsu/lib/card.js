import z from '@deepseek-ai/schemastery';
import { declaredAction, instantiateAction } from '@melite/comfyui-card-kit';
import { callableSchema, gatedResolve } from '@melite/comfyui-card-kit/admission';
import { seedExtra } from '@melite/comfyui-card-kit/fields';
import { bag } from '@melite/contracts/extraKeys';
import { DECL as viggleDecl } from '@melite/models-viggle-animate';
// THE FAMILY BINDINGS (the atom vocabulary, stroke 3): the declared
// action composes the whole segment; an unbound family refuses loud
// at the dispatch. Keyed by OWNING FAMILY (`model.family ??
// model.id` — a route id keys nothing, the derived-row law).
export const ACTION_BINDINGS = {
    [viggleDecl.id]: (p, model, g, runId) => {
        instantiateAction(declaredAction(viggleDecl, 'animate'), p, model, g, runId);
    },
};
export const schema = z.object({
    // THE TWO MEDIA SEATS (the family's own required_defaults — the
    // relations law refuses the blank at the bench-write door first;
    // this compose gate is the backstop in the same field voice).
    clip: z.string().role('path').description('Driving Clip').extra('extra', bag({ order: 0, group: 'input', tooltip: 'The video whose motion, camera and background the subject follows (24 fps in the engine).', required: true, wtype: 'file' })),
    ref_image: z.string().role('path').description('Identity Still').extra('extra', bag({ order: 1, group: 'input', tooltip: 'One still of the character to place into the clip.', required: true, wtype: 'image' })),
    // THE ONE OWNER PER FLOOR: length/width/height/steps/shift_video/
    // shift_audio carry NO card default — the boarded family's DECL
    // owns those floors (124/0/0/3/3/3) and the service's one param
    // cascade folds them beneath stated params; a card default here
    // would silence the family calibration (the dual-floor law).
    length: z.number().description('Length (frames)').min(5).max(3600).step(1).extra('extra', bag({ order: 0, group: 'general', width: 1, zone: 'params', wtype: 'number', tooltip: 'Frames at 24 fps (124 ≈ 5.2 s) — set to your clip\'s frame count; the loader caps the drive at this window.' })),
    width: z.number().description('Width').min(0).max(16384).step(32).extra('extra', bag({ order: 1, group: 'resolution', columns: 2, width: 1, zone: 'params', wtype: 'number', tooltip: '0 = the clip\'s own width (the evaluated configuration).' })),
    height: z.number().description('Height').min(0).max(16384).step(32).extra('extra', bag({ order: 2, group: 'resolution', columns: 2, width: 1, zone: 'params', wtype: 'number', tooltip: '0 = the clip\'s own height.' })),
    steps: z.number().description('Euler Updates').min(1).max(8).step(1).extra('extra', bag({ order: 3, group: 'sampling', width: 1, zone: 'params', wtype: 'number', tooltip: 'DMD2 Euler updates — 3 is the baseline (the four-point sigma schedule); 4 for harder motion. A riding DMD row owns unstated steps.' })),
    shift_video: z.number().description('Video Shift').min(0.1).max(20).step(0.1).extra('extra', bag({ order: 4, group: 'sampling', columns: 2, width: 1, zone: 'params', wtype: 'number', tooltip: 'The MiniMax-H3 sigma shift, video stream — the upstream baseline is 3.' })),
    shift_audio: z.number().description('Audio Shift').min(0.1).max(20).step(0.1).extra('extra', bag({ order: 5, group: 'sampling', columns: 2, width: 1, zone: 'params', wtype: 'number', tooltip: 'The MiniMax-H3 sigma shift, audio stream — the upstream baseline is 3.' })),
    seed: z.number().description('Seed').step(1).default(-1).extra('extra', bag(seedExtra({ order: 6, group: 'sampling', width: 1, zone: 'params', tooltip: '-1 mints a fresh seed per run.' }))),
});
const schemaFn = callableSchema(schema);
// THE IDENTITY RUNG (native — the card owns its label/description/
// genre/icon).
export const identity = {
    label: 'Openjutsu',
    description: 'Character swap in video: one still sets identity, a driving clip sets motion — the Viggle-Animate fine-tune renders the swap and carries the clip\'s own audio through.',
    genre: 'video',
    icon: 'video',
    principles: [
        'The clip drives, the still casts: motion/camera/background come from the clip, identity from the still — never the reverse.',
        'The lane has no prompt seat: the frozen text embed IS the text surface (computed once upstream; the text encoder is never loaded).',
        'The DMD envelope is the sampling contract: three Euler updates on the four-point schedule is the baseline — euler, CFG-free, shift 3/3.',
    ],
};
export const inject = ['comfyui'];
export function apply(ctx) {
    ctx.effect(() => ctx.comfyui.registerCard({
        id: 'openjutsu',
        // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
        skeleton: 'openjutsu',
        boarded: [viggleDecl.id],
        tags: ['video', 'swap', 'character', 'openjutsu', 'animate'],
        identity,
        // THE DISCOVERY ROWS: the video cluster's second door — the
        // timeline studio sits at order 6, the swap door beside it.
        sidebar: { key: 'video', order: 7 },
        flowKinds: {
            inputs: {
                clip: 'video',
                ref_image: 'image',
            },
            outputs: { default: 'video' },
            requiresModel: true,
        },
        flowOutputBindings: [{ channel: 'default', node: '*', nodeClass: 'VHS_VideoCombine' }],
        // THE EXTENSION LAW: the clip loader + the combine ride the
        // VHS pack; the conditioning nodes ride the Viggle pack. An
        // extension-less engine refuses at the door with the install
        // rescue — never a mid-run engine abort.
        requires: ['ComfyUI-VideoHelperSuite', 'ComfyUI-Viggle-Animate-H3'],
        schema: schemaFn,
        compose(p, model, g, runId) {
            // THE SCHEMA GATE (the image-gen admission precedent — the
            // card's own declaration validates the last hop into the
            // engine): schemastery walk enforces the declared types and
            // bounds; the riders admit the loras bag + the model stamp
            // verbatim (the mod-plane keys — nothing drops). Every other
            // unstated key refuses 'unknown-param', named.
            const doc = gatedResolve('openjutsu', schemaFn, ['loras', 'model'], p);
            if (typeof doc.clip !== 'string' || !doc.clip.trim()) {
                throw new Error("required param 'clip' missing on the openjutsu card (the driving clip — the video whose motion the subject follows)");
            }
            if (typeof doc.ref_image !== 'string' || !doc.ref_image.trim()) {
                throw new Error("required param 'ref_image' missing on the openjutsu card (the identity still — one image of the character to place)");
            }
            const bound = ACTION_BINDINGS[model.family ?? model.id];
            if (bound) {
                bound(doc, model, g, runId);
                return;
            }
            throw new Error(`no declared action for family '${String(model.family ?? model.id)}' on the openjutsu card — the card boards viggle-animate alone (the swap lane is one family, one action); this address owns none`);
        },
    }));
}
//# sourceMappingURL=card.js.map
