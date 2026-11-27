// mods/packs.ts — THE MOD PACKS: the distinct category taxonomy
// (operator order 2026-09-08: "we had a distinct mods category —
// LORAS, CONTROLNETS, in that vein"). One file
// registers every PACK CONTRACT — the Mod parents (ported from the RETIRED melite_cards dsl.py: LorasMod, ControlNetMod, MaskMod, the qvoice pack): the CATEGORY's field schema, inherited by every boarding family.
// A flavor (the family's own mods/<pack>.ts under the family's packaged mods (packages/models/<id>/mods/ — the packagedFlavors table in cardDefs.ts)) boards the pack and carries ONLY data — rows, the runtime door, or a bare boarding.
// Fields live HERE and nowhere else (subclassing: the flavor inherits, never re-declares).
//
// The Cordis contract shape: fields ARE a Schemastery object
// schema, wire types + UI meta on .extra('extra', bag({...})).
import '@melite/comfyui-card-kit/service-faces';
import z from '@deepseek-ai/schemastery';
import { bag } from '@melite/contracts/extraKeys';
// THE ONE HOME (the kit header's own law — "packs.ts keeps apply()
// and imports these back"): the mask pack's field schema lives in
// the kit's pack-fields.ts (the leaf tier, beside MASK_RIDERS and
// the admission gate). The parallel copy that lived HERE drifted
// from that law — the F7 cure (the inpaint denoise default, qa8
// 2026-11-01) moved the default in the kit and this file kept
// serving 0.5. The import retires the second writer.
import { MaskFields, QvoiceFields, QvoiceSaveFields } from '@melite/comfyui-card-kit/pack-fields';
export const inject = ['comfyui'];
// ── LORAS (the LorasMod): the LoRA stack. Entry steps (operator
// correction, 2026-09-18): a DISTILL adapter is married to its step
// count — one lora for four steps, another for eight — so the entry
// carries `steps applied` alongside strength (the row's catalog
// default seeds it; the sampler honors it when the caller pins
// nothing). The stack wire itself ({on, lora, str, v/a/t}) is
// unchanged — steps is a SAMPLER fact, not a loader fact. ──
const LorasFields = z.object({
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
const ControlNetFields = z.object({
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
const IPAdapterFields = z.object({
    ip_adapters: z.array(IPAdapterEntryFields)
        .description('IP-Adapter')
        .extra('extra', bag({ wtype: 'ip_adapters', group: 'ip_adapter', zone: 'mods', default: null, order: 3 })),
});
// ── MASK (the MaskMod): the region-modality contract — the schema
// is imported above from the kit's pack-fields.ts (the one home).
// ── QVOICE (the qvoice pack) + QVOICE SAVE: the field schemas live
// in the kit's pack-fields.ts (THE ONE HOME — the header's own law;
// QVOICE_RIDERS/QVOICE_SAVE_RIDERS and the admission gate read the
// same rows). The parallel copies that lived HERE drifted twice —
// the voiced strength wording, and the pick's missing `media` hint
// (the operator's 2026-11-27 burn: a Voice mod that could tune a
// persona but never choose one, because the served envelope told
// every picker the seat was an image seat). The import retires the
// second writer, the F7/MaskFields precedent. ──
export function apply(ctx) {
    const comfy = ctx.comfyui;
    // methods are called ON the service (never destructured — a
    // destructured method loses its receiver; registry.ts:92)
    ctx.effect(() => comfy.registerPack({ pack: 'loras', fields: LorasFields }));
    ctx.effect(() => comfy.registerPack({ pack: 'controlnet', fields: ControlNetFields }));
    ctx.effect(() => comfy.registerPack({ pack: 'ip_adapter', fields: IPAdapterFields }));
    ctx.effect(() => comfy.registerPack({ pack: 'mask', fields: MaskFields }));
    ctx.effect(() => comfy.registerPack({ pack: 'qvoice', fields: QvoiceFields }));
    ctx.effect(() => comfy.registerPack({ pack: 'qvoice_save', fields: QvoiceSaveFields }));
}
//# sourceMappingURL=packs.js.map
