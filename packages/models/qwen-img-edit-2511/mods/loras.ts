// families/image/qwen-img-edit-2511/mods/loras.ts — QWEN'S LORAS
// FLAVOR: the family's own rows (the 2026-10-15 cure — before this
// file the flavor registered `rows: []` + `runtimeCatalog: true`,
// so the picker served the union of OTHER families' rows while the
// LoRAs actually on disk for qwen were offered to no one; the
// audit called it "a family with an empty runtime flavor serves an
// empty picker"). FAMILY-OWNED DATA — the rows live with the
// family (never in the pack contract, never in the family DECL);
// the pack contract (engines/comfyui-cordis/src/mods/packs.ts)
// supplies the inherited fields; DECL.mods boards 'loras'.
//
// Every row carries its upstream source_url — no link, no row.
// Files land in COMFYUI loras/<filename>; a user's OWN rows ride
// the user file (userLorasPath) beside this table.
import type { Context } from '@melite/comfyui-card-kit/card-definition'
// the ctx.comfyui augmentation rides the service module:
import { ComfyUIServiceFace } from '@melite/comfyui-card-kit/service-faces'

export const inject = ['comfyui']

export const QWEN_EDIT_ROWS = [
  // lightx2v's 4-step distill — the family's speed adapter (their
  // model card pairs it with cfg 1 at 4 steps; bf16 file)
  { id: 'qwen_edit_lightning_4step', filename: 'qwen/Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors', source_url: 'https://huggingface.co/lightx2v/Qwen-Image-Edit-2511-Lightning/resolve/main/Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors', label: 'Lightning 4-Step', category: 'distill', default_strength: 1, steps: 4 },
  // fal's camera-control adapter — 96 positions around the subject;
  // their card recommends strength 0.8–1.0 with the <sks> trigger
  // vocabulary ("<sks> front view eye-level shot close-up", …)
  { id: 'qwen_edit_multiple_angles', filename: 'qwen/qwen-image-edit-2511-multiple-angles-lora.safetensors', source_url: 'https://huggingface.co/fal/Qwen-Image-Edit-2511-Multiple-Angles-LoRA/resolve/main/qwen-image-edit-2511-multiple-angles-lora.safetensors', label: 'Multiple Angles', category: 'control', default_strength: 0.8, tooltip: 'camera control — prompt with the <sks> position vocabulary (front/back/quarter view × eye/low/high angle × shot size)' },
  // MCNL multi-concept (a re-upload of the aiunivers original) —
  // the only upstream that serves this exact file
  { id: 'qwen_edit_plus_mcnsfw', filename: 'qwen/qwen-image-edit-plus-nsfw-lora.safetensors', source_url: 'https://huggingface.co/ScottzillaSystems/qwen-image-edit-plus-nsfw-lora/resolve/main/qwen-image-edit-plus-nsfw-lora.safetensors', label: 'MCNL Multi-Concept', category: 'nsfw', default_strength: 0.8 },
]

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerFlavor({
    pack: 'loras',
    families: ['qwen-img-edit-2511'],
    rows: QWEN_EDIT_ROWS,
  }))
}
