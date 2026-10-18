import type {} from '@melite/comfyui-card-kit/service-faces'
// families/image/qwen-img-edit-21/mods/loras.ts — the loras flavor
// seed for the 2.1 edit lane (the 2511 shape). FIRST-PARTY ROW
// (2026-11-08, the AusBoss deltas): the Consistency LoRA — the
// drift-lock adapter trained on drift-corrected edit pairs
// (author's held-out runs: restyle worst-corner drift 24.3 px →
// 1.6 px, out-of-region repaint 12.8% → 7.5%). No trigger word;
// strength 1 (lower lets drift back). HONEST LIMITS (the author's
// own): it holds the EXISTING pose — movement edits and big
// removals switch it off; it can soften edit strength slightly.
// THE PROVENANCE: the row's fetch truth is the DECL's provisions
// entry (sha256 + size there, one truth — the h3 law); the file
// lands in loras/qwen-img-edit-21/. Registered as an effect on the
// boot fiber: dispose retracts the flavor. Boarding gated ≡
// DECL.mods = [...'loras'...] at boot (declared — the pack lands
// with it); user-provided files ride the same bag the pack
// registers.
import type { Context } from '@melite/comfyui-card-kit/card-definition'


export const inject = ['comfyui']

export const LORA_ROWS = [
  {
    id: 'qwen21_consistency',
    filename: 'qwen-img-edit-21/qwen-image-2.1-consistency.safetensors',
    source_url: 'https://huggingface.co/ausboss/Qwen-Image-2.1-Consistency-LoRA/resolve/main/qwen-image-2.1-consistency.safetensors',
    label: 'Consistency (drift lock)',
    category: 'alignment',
    default_strength: 1,
    tooltip: "Keeps the edit on the original's frame — restyles and recolours stop drifting off the picture. Holds the EXISTING pose: switch it off for movement edits and big removals.",
  },
]

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerFlavor({
    pack: 'loras',
    families: ['qwen-img-edit-21'],
    rows: LORA_ROWS,
  }))
}
