import z from '@deepseek-ai/schemastery';
import { bag } from '@melite/contracts/extraKeys';
// THE ONE HOME (the kit header's own law — "packs.ts keeps apply()
// and imports these back"): the mask pack's field schema lives in
// the kit's pack-fields.ts (the leaf tier, beside MASK_RIDERS and
// the admission gate). The parallel copy that lived HERE drifted
// from that law — the F7 cure (the inpaint denoise default, qa8
// 2026-11-01) moved the default in the kit and this file kept
// serving 0.5. The import retires the second writer.
import { MaskFields } from '@melite/comfyui-card-kit/pack-fields';
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
// ── QVOICE (the qvoice pack): a saved persona artifact — the
// .qvoice file (the qvoice_save mod exports them) + the clone
// pipeline's identity-intensity knob. The USE half of the
// voice-lock cycle (2026-09-20, the round-trip stroke: the
// artifact performs the text through the studio's Python clone
// pipeline — the AudiocoreTTS embedding path is dead at the C
// ABI, speaker_embedding hard-fails in build_speech_request). ──
const QvoiceFields = z.object({
    qvoice: z.string().role('path').description('Voice (.qvoice)')
        .extra('extra', bag({
        wtype: 'file', group: 'qvoice', zone: 'mods', order: 0,
        tooltip: 'A saved .qvoice persona (the Design mod exports these). Present = this voice performs the text (codec-level clone through the studio pipeline) instead of the preset timbre.',
    })),
    voice_strength: z.number().description('Voice Strength').min(0).max(2).step(0.05).default(1)
        .extra('extra', bag({
        wtype: 'number', group: 'qvoice', zone: 'mods', order: 1,
        tooltip: 'Identity intensity of the loaded persona — the embedding steers along its deviation from the voices-bank neutral (steered = neutral + (emb − neutral) × strength): below 1 pulls toward neutral, above 1 pushes further out. 1 is the saved voice bit-identical; a different strength re-samples the delivery (pacing and phrasing), so state a take deliberately.',
    })),
});
// ── QVOICE SAVE (the qvoice_save pack): design a voice from a
// description and export the .qvoice embedding (the voice-lock
// card's design half, moved into the TTS card's mods 2026-09-21 —
// the operator: "THE VOICE LOCK CARD DIES. THE VOICE LOCK SAVE
// AND LOAD GO INSIDE TTS CARD MODS"). Owner-only: the 1.7B
// VoiceDesign family fires it. THE BOOLEAN LAW (operator
// 2026-10-22: "IT IS A SIMPLE BOOLEAN… SAVE THE EMBEDDINGS TO
// MEDIA"): no name field — the toggle IS the save; the build mints
// the export name (voice-<runId>) and the receipt names itself
// from the minted file. ──
// THE MOD-PRESENCE LAW (operator 2026-10-22: "WHEN I PUT THE SAVE
// QVOICE MOD ON, IT JUST WORKS. IT IS LIKE A MOD… WHY WOULD IT
// HAVE A TOGGLE / BOOLEAN"): the chip IS the signal — add states
// save_qvoice:true, remove nulls it; no editor, no toggle, no
// knobs. The sampling surface is the card's own lane surface —
// restating it here duped every knob on the mods pane.
// THE NAMED-PRESENCE REFINEMENT (operator 2026-10-22: "Make sure
// that the 'design' mod has a popup, it can just be 'name' or
// something so a name can be used for the save file"): the pack
// carries exactly one text field - the add opens a one-field
// popup (the name), never a knob wall; empty stays lawful (the
// build mints the export name voice-<runId> and the receipt
// names itself from the minted file).
const QvoiceSaveFields = z.object({
    // The presence stamp the add/remove gesture writes; never
    // rendered as a widget (the pane's presence-kind law).
    save_qvoice: z.boolean().description('SAVE QVOICE')
        .extra('extra', bag({
        wtype: 'boolean', group: 'qvoice_save', zone: 'mods', order: 0,
        tooltip: 'The mod IS the save: present = the designed voice persists to media as a .qvoice; remove the mod = no save.',
    })),
    // The one text field the named-presence popup serves (the chip's
    // name for the save file); '' = unstated, the mint owns it.
    voice_name: z.string().description('NAME')
        .extra('extra', bag({
        wtype: 'text', group: 'qvoice_save', zone: 'mods', order: 1,
        tooltip: 'Names the .qvoice file this mod saves. Leave empty and the build mints a unique name for the run.',
    })),
});
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