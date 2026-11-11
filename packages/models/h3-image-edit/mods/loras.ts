// @melite/models-h3-image-edit/mods/loras.ts — THE H3-IMAGE FAMILY'S
// LORAS FLAVOR SEED (the mod plane, the operator's law 2026-09-12:
// "MOD SYSTEM IS CORE. NEVER HARDCODED. The LORAS should not be on
// cards, the MOD SYSTEM SHOULD"; every family applies LoRAs,
// 2026-11-06): no first-party rows — the H3-Image release ships no
// adapters, and the h3 VIDEO turbo line (silveroxides/lightx2v
// dareties) is the VIDEO unet's, never this checkpoint's — boarding
// it here would be the F34b class again (a claim the catalog never
// held). User-provided files ride the same bag the pack registers;
// first-party rows land the day an adapter exists for THIS
// checkpoint. Boarding gated ≡ DECL.mods = ['loras'] at boot
// (declared — the pack lands with it).
import type {} from '@melite/comfyui-card-kit/service-faces'
import type { Context } from '@melite/comfyui-card-kit/card-definition'


export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerFlavor({
    pack: 'loras',
    families: ['h3-image-edit'],
    rows: [],
  }))
}
