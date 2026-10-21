// pack-fields.ts — the mod packs' static field vocabulary (moved from
// comfyui-cordis/src/mods/packs.ts, 2026-10-13, the workspace-cycle cure:
// leaf cards name riders + the engine registers packs, and neither side
// may depend on the other — so the pack field schemas live DOWN here,
// in the leaf tier beside the admission gate that reads them. packs.ts
// keeps apply() (the engine-side registration effect) and imports these
// back. The rider derivation stays beside the schemas: a new pack field
// is admitted the day it is declared — one home, no drift.
import z from '@deepseek-ai/schemastery';
import { bag } from '@melite/contracts/extraKeys';
export const LorasFields = z.object({
    loras: z.array(z.object({
        name: z.string(),
        strength: z.number(),
        steps: z.number().min(1).max(100).step(1)
            .description('Steps applied')
            .extra('extra', bag({ wtype: 'number', group: 'loras_controlnet', zone: 'mods', order: 1, width: 1 })),
    }))
        .description('LoRAs')
        .extra('extra', bag({ wtype: 'loras', group: 'loras_controlnet', zone: 'mods', default: null, order: 0 })),
});
// ── CONTROLNET (the ControlNetMod + the z-image flavor's
// controlnets/mod.yaml, 1:1): the ControlNet stack. ONE entry per
// conditioning map: the catalog TYPE (the family's served rows
// the union file for z-image), the map itself (caller-supplied
// no preprocessor executes in this plane), the pipeline artifact
// name when a brick feeds it (artifact wins over image_b64 at run
// time, the retired precedence), strength, the full-schedule step
// range (the live ZImageFunControlnet node carries NO schedule
// inputs — a non-default range refuses LOUD at fire time, never a
// silent full-strength run), and the enabled toggle. The pack-level
// floor clamps weak entries UP (with a log line). Max stack rides
// the discovery table per pack (z-image: 5, the declaration). ──
const ControlNetEntryFields = z.object({
    type: z.string().description('Type')
        .extra('extra', bag({ wtype: 'text', group: 'controlnet', zone: 'mods', order: 0, width: 1 })),
    image_b64: z.string().description('Conditioning')
        .extra('extra', bag({
        wtype: 'image', group: 'controlnet', zone: 'mods', order: 1, width: 2,
        tooltip: 'The conditioning map image (uploaded — the square stages it; a pipeline artifact name wins when set below).',
    })),
    artifact: z.string().default('').description('Artifact')
        .extra('extra', bag({
        wtype: 'text', group: 'controlnet', zone: 'mods', order: 2, width: 2,
        tooltip: 'Pipeline-wired conditioning source — the ctx artifact name (e.g. front_pose) produced by an upstream brick. Takes precedence over the Conditioning image at run time: when the artifact is present in ctx, the brick uploads THAT file as the conditioning image.',
    })),
    strength: z.number().min(0).max(2).step(0.05).default(0.7).description('Strength')
        .extra('extra', bag({ wtype: 'slider', group: 'controlnet', zone: 'mods', order: 3, width: 1 })),
    start_percent: z.number().min(0).max(1).step(0.05).default(0).description('Start')
        .extra('extra', bag({ wtype: 'slider', group: 'controlnet', zone: 'mods', order: 4, width: 1 })),
    end_percent: z.number().min(0).max(1).step(0.05).default(1).description('End')
        .extra('extra', bag({ wtype: 'slider', group: 'controlnet', zone: 'mods', order: 5, width: 1 })),
    enabled: z.boolean().default(true).description('Enabled')
        .extra('extra', bag({ wtype: 'boolean', group: 'controlnet', zone: 'mods', order: 6, width: 1 })),
    clip: z.string().default('').description('Clip')
        .extra('extra', bag({
        wtype: 'text', group: 'controlnet', zone: 'mods', order: 7, width: 2,
        tooltip: 'Video-valued conditioning source (002 H2) — a staged clip artifact name; only models whose apply node takes a video control source accept a clip-only entry (H3 Fun-ControlNet). Still-image models refuse it — they condition on a still image.',
    })),
    mask: z.string().default('').description('Mask')
        .extra('extra', bag({
        wtype: 'text', group: 'controlnet', zone: 'mods', order: 8, width: 2,
        tooltip: 'Mask-shaped conditioning source (002 H4) — a staged mask artifact name (1 marks the regions to regenerate). Only models that declare the mask channel show this input; a still-image entry with neither map nor mask refuses at run time.',
    })),
});
export const ControlNetFields = z.object({
    controlnets: z.array(ControlNetEntryFields)
        .description('ControlNet')
        .extra('extra', bag({ wtype: 'controlnets', group: 'loras_controlnet', zone: 'mods', default: null, order: 1 })),
    controlnet_strength_floor: z.number().min(0).max(1).step(0.05).default(0).description('ControlNet Strength Floor')
        .extra('extra', bag({
        wtype: 'slider', group: 'loras_controlnet', zone: 'mods', order: 2, width: 1,
        tooltip: 'Minimum strength any ControlNet in the stack may apply at. Entries below this are clamped UP (with a log line). 0.0 = no floor. Raise this when stacking many weak ControlNets that cost VRAM without visual benefit.',
    })),
});
// ── IP-ADAPTER (the IpAdapterMod, the ray ip_adapters/mod.yaml,
// 1:1 field set): the reference-image stack. ONE entry per
// reference: the image itself, the MODE (the family's served rows
// — style/composition/face/generic on z-image), and the weight.
// FATE 'refused' (guard.ts PACK_FATE): no lane builds this pack in
// this plane — ray's apply_ipadapters lane silently degraded
// (except-break) on weights that never stood on disk (SD1.5 files,
// no Z-Image-compatible artifact exists upstream), so the firing
// gate refuses every stated entry LOUD instead of skipping it.
// The row filenames are catalog vocabulary (the retired
// declaration, byte-1:1) — never fetch targets. ──
const IPAdapterEntryFields = z.object({
    image: z.string().description('Reference Image')
        .extra('extra', bag({
        wtype: 'image', group: 'ip_adapter', zone: 'mods', order: 0, width: 2,
        tooltip: 'The reference image. IP-Adapter cannot run on this setup — any stated entry refuses at run time.',
    })),
    kind: z.string().default('style').description('Mode')
        .extra('extra', bag({ wtype: 'text', group: 'ip_adapter', zone: 'mods', order: 1, width: 1 })),
    weight: z.number().min(0).max(2).step(0.05).default(1).description('Weight')
        .extra('extra', bag({ wtype: 'slider', group: 'ip_adapter', zone: 'mods', order: 2, width: 1 })),
});
export const IPAdapterFields = z.object({
    ip_adapters: z.array(IPAdapterEntryFields)
        .description('IP-Adapter')
        .extra('extra', bag({ wtype: 'ip_adapters', group: 'ip_adapter', zone: 'mods', default: null, order: 3 })),
});
// ── LAN-INPAINT (the LanPaintMod + the qwen flavor's image1
// override, inlined — see the seam note above) ──
export const LanpaintFields = z.object({
    image1: z.string().role('path').description('Image 1')
        .extra('extra', bag({ wtype: 'image', group: 'input', zone: 'inputs', order: -1, width: 1, columns: 3, required: true })),
    lanpaint_enabled: z.boolean().default(false).description('Force LanPaint')
        .extra('extra', bag({ wtype: 'boolean', group: 'lanpaint', visible_when: 'image1 != null', order: 1 })),
    lanpaint_num_steps: z.number().min(1).max(100).step(1).default(20).description('Num Steps')
        .extra('extra', bag({ wtype: 'number', group: 'lanpaint', visible_when: 'lanpaint_enabled=true', order: 2, width: 1 })),
    lanpaint_step_size: z.number().min(0.1).max(2).step(0.1).default(1.0).description('Step Size')
        .extra('extra', bag({ wtype: 'slider', group: 'lanpaint', visible_when: 'lanpaint_enabled=true', order: 3, width: 1 })),
    lanpaint_lambda: z.number().min(0).max(2).step(0.05).default(0.5).description('Lambda')
        .extra('extra', bag({ wtype: 'slider', group: 'lanpaint', visible_when: 'lanpaint_enabled=true', order: 4, width: 1 })),
    lanpaint_beta: z.number().min(0).max(2).step(0.05).default(0.5).description('Beta')
        .extra('extra', bag({ wtype: 'slider', group: 'lanpaint', visible_when: 'lanpaint_enabled=true', order: 5, width: 1 })),
    lanpaint_friction: z.number().min(0).max(2).step(0.05).default(0.5).description('Friction')
        .extra('extra', bag({ wtype: 'slider', group: 'lanpaint', visible_when: 'lanpaint_enabled=true', order: 6, width: 1 })),
    lanpaint_prompt_mode: z.union([z.const('negative'), z.const('positive')]).default('negative').description('Prompt Mode')
        .extra('extra', bag({ wtype: 'select', group: 'lanpaint', visible_when: 'lanpaint_enabled=true', order: 7, width: 1, options: ['negative', 'positive'] })),
    outpaint_top: z.number().min(0).max(512).step(8).default(0).description('Expand Top')
        .extra('extra', bag({ wtype: 'slider', group: 'lanpaint', visible_when: 'image1 != null', order: 8, width: 1 })),
    outpaint_right: z.number().min(0).max(512).step(8).default(0).description('Expand Right')
        .extra('extra', bag({ wtype: 'slider', group: 'lanpaint', visible_when: 'image1 != null', order: 9, width: 1 })),
    outpaint_bottom: z.number().min(0).max(512).step(8).default(0).description('Expand Bottom')
        .extra('extra', bag({ wtype: 'slider', group: 'lanpaint', visible_when: 'image1 != null', order: 10, width: 1 })),
    outpaint_left: z.number().min(0).max(512).step(8).default(0).description('Expand Left')
        .extra('extra', bag({ wtype: 'slider', group: 'lanpaint', visible_when: 'image1 != null', order: 11, width: 1 })),
    outpaint_overlap: z.number().min(0).max(64).step(1).default(16).description('Overlap')
        .extra('extra', bag({ wtype: 'slider', group: 'lanpaint', visible_when: 'image1 != null', order: 8, width: 1 })),
});
// ── MASK (the MaskMod): the region-modality contract ──
export const MaskFields = z.object({
    mask: z.any().description('Region Mask')
        .extra('extra', bag({
        wtype: 'mask', group: 'mask', zone: 'mods', order: -1,
        tooltip: 'Add the mask mod, then drop an RGBA PNG whose alpha channel marks the region.',
    })),
    input_mask: z.string().role('path').description('Region Mask')
        .extra('extra', bag({
        // THE MOD-MODAL LAW (operator, 2026-10-10, final form): the
        // image mask IS a mod — its row renders INSIDE the mask mod's
        // own modal, 1:1 with the lanpaint mod's image1 on image-gen
        // (THE reference image the operator pointed at): a mod field
        // styled as the mod's input seat — wtype image, group input,
        // zone inputs, order -1, width 1, columns 3. NEVER a card-face
        // inputs-section row of its own. The li stroke that pulled it
        // onto the card face was the deviation — erased to the
        // template, letter for letter.
        wtype: 'image', group: 'input', zone: 'inputs', order: -1, width: 1, columns: 3,
        tooltip: 'RGBA PNG whose alpha channel marks the region. On its own: the mask selects this entry\'s region. Alongside lanpaint: the inpaint region — present with the input images, the run switches to the lanpaint sampler.',
    })),
    mask_mode: z.union([z.const('auto'), z.const('crop_stitch'), z.const('full_frame')]).default('crop_stitch').description('Edit Scope')
        .extra('extra', bag({
        wtype: 'select', group: 'mask', zone: 'mods', order: 1, width: 1,
        options: [
            { value: 'auto', label: 'Whole image (default)' },
            { value: 'crop_stitch', label: 'Masked region (crop + stitch)' },
        ],
        tooltip: 'No mask modifier = whole-image editing by default. Add a mask modifier to choose Masked region (crop + stitch): crop the region, edit it, and composite it back.',
    })),
    mask_detector: z.union([z.const('off'), z.const('person'), z.const('face'), z.const('hand')]).default('off').description('Region Detector')
        .extra('extra', bag({
        wtype: 'select', group: 'mask', zone: 'mods', order: 2, width: 1,
        options: ['off', 'person', 'face', 'hand'],
        tooltip: 'Automated region source for crop_stitch (the Impact detectors): person = segmentation silhouette, face/hand = boxes. off = use the Region Mask.',
    })),
    mask_context_pad: z.number().min(0).max(256).step(8).default(64).description('Context Padding')
        .extra('extra', bag({ wtype: 'slider', group: 'mask', zone: 'mods', order: 3, width: 1, tooltip: 'Pixels of surrounding context kept in the crop (crop_stitch mode). More context = more coherence; 64 is the sweet spot.' })),
    mask_grow: z.number().min(-32).max(32).step(1).default(8).description('Grow / Shrink')
        .extra('extra', bag({ wtype: 'slider', group: 'mask', zone: 'mods', order: 4, width: 1, tooltip: 'Expand (+) or shrink (−) the region by an exact pixel disk before the run. Applied host-side.' })),
    mask_feather: z.number().min(0).max(32).step(1).default(8).description('Feather')
        .extra('extra', bag({ wtype: 'slider', group: 'mask', zone: 'mods', order: 5, width: 1, tooltip: 'Gaussian falloff the composite blends through — kills the pasted-on rectangle edge.' })),
    mask_threshold: z.number().min(0).max(1).step(0.05).default(0).description('Re-threshold')
        .extra('extra', bag({ wtype: 'slider', group: 'mask', zone: 'mods', order: 6, width: 1, tooltip: 'Re-binarize the feathered mask at this level. 0 = keep the soft falloff.' })),
    mask_invert: z.boolean().default(false).description('Invert')
        .extra('extra', bag({ wtype: 'boolean', group: 'mask', zone: 'mods', order: 7, width: 1, tooltip: 'Work OUTSIDE the painted region instead.' })),
    mask_detail_size: z.number().min(64).max(16384).step(8).default(512).description('Region Detail Size')
        .extra('extra', bag({ wtype: 'number', group: 'mask', zone: 'mods', order: 8, width: 1, tooltip: 'Working size the region detailer scales each region toward (DetailerForEach guide_size with bbox sizing, capped by the canonical max 1024).' })),
    mask_denoise: z.number().min(0.05).max(1).step(0.05).default(0.5).description('Region Denoise')
        .extra('extra', bag({ wtype: 'number', group: 'mask', zone: 'mods', order: 9, width: 1, tooltip: 'How strongly the region is reworked (DetailerForEach denoise): 0.5 keeps structure, 1 fully rewrites the crop.' })),
});
// ── QVOICE (the qvoice pack): a saved persona artifact — the
// .qvoice file (the qvoice_save mod exports them) + the clone
// pipeline's identity-intensity knob. The USE half of the
// voice-lock cycle (2026-09-20, the round-trip stroke: the
// artifact performs the text through the studio's Python clone
// pipeline — the AudiocoreTTS embedding path is dead at the C
// ABI, speaker_embedding hard-fails in build_speech_request). ──
export const QvoiceFields = z.object({
    qvoice: z.string().role('path').description('Voice (.qvoice)')
        .extra('extra', bag({
        wtype: 'file', group: 'qvoice', zone: 'mods', order: 0,
        tooltip: 'A saved .qvoice persona (the Design mod exports these). Present = this voice performs the text (codec-level clone through the studio pipeline) instead of the preset timbre.',
    })),
    voice_strength: z.number().description('Voice Strength').min(0).max(2).step(0.05).default(1)
        .extra('extra', bag({
        wtype: 'number', group: 'qvoice', zone: 'mods', order: 1,
        tooltip: 'Identity intensity of the loaded persona — below 1 pulls toward neutral, above 1 exaggerates it (the clone pipeline scales the embedding).',
    })),
});
// ── QVOICE SAVE (the qvoice_save pack): design a voice from a
// description and export the .qvoice embedding (the voice-lock
// card's design half, moved into the TTS card's mods 2026-09-21 —
// the operator: "THE VOICE LOCK CARD DIES. THE VOICE LOCK SAVE
// AND LOAD GO INSIDE TTS CARD MODS"). Owner-only: the 1.7B
// VoiceDesign family fires it. ──
export const QvoiceSaveFields = z.object({
    voice_name: z.string().description('Voice Name')
        .extra('extra', bag({
        wtype: 'text', group: 'qvoice_save', zone: 'mods', order: 0, required: true,
        tooltip: 'Name for the designed persona — becomes the .qvoice filename stem. Reused across every future TTS render.',
    })),
    // THE PROMPT MOVED TO THE LANE (operator 2026-09-23, three
    // variants three inputs): the design prompt is the VoiceDesign
    // lane's own required input — the card's task-named row
    // (design_prompt, "Voice Persona & Timbre"), visible on that
    // variant only. One knob, one owner: never restated here.
    temperature: z.number().description('Temperature').min(0).max(2).step(0.05).default(0.7)
        .extra('extra', bag({ group: 'qvoice_save', zone: 'mods', order: 2, tooltip: 'Design sampling temperature.' })),
    top_p: z.number().description('Top-P').min(0).max(1).step(0.01).default(0.9)
        .extra('extra', bag({ group: 'qvoice_save', zone: 'mods', order: 3, tooltip: 'Design sampling top-p.' })),
    speed: z.number().description('Speed').min(0.5).max(2).step(0.1).default(1)
        .extra('extra', bag({ group: 'qvoice_save', zone: 'mods', order: 4, tooltip: 'Design sampling speed.' })),
    repetition_penalty: z.number().description('Repetition Penalty').min(0.8).max(2).step(0.01).default(1.05)
        .extra('extra', bag({ group: 'qvoice_save', zone: 'mods', order: 5, tooltip: 'Design sampling repetition penalty.' })),
    seed: z.number().description('Seed').step(1).default(-1)
        .extra('extra', bag({ group: 'qvoice_save', zone: 'mods', order: 6, tooltip: 'Design seed (-1 = random).' })),
});
const fieldKeys = (fields) => Object.keys(fields.dict ?? {});
/** The loras pack's rider keys (every card boarding a lora family). */
export const LORAS_RIDERS = fieldKeys(LorasFields);
/** The lanpaint pack's rider keys (region-inpaint lanes). */
export const LANPAINT_RIDERS = fieldKeys(LanpaintFields);
/** The mask pack's rider keys (region-modality lanes). */
export const MASK_RIDERS = fieldKeys(MaskFields);
/** The qvoice pack's rider keys (voice-lock load lanes). */
export const QVOICE_RIDERS = fieldKeys(QvoiceFields);
/** The qvoice_save pack's rider keys (voice export lanes). */
export const QVOICE_SAVE_RIDERS = fieldKeys(QvoiceSaveFields);
//# sourceMappingURL=pack-fields.js.map