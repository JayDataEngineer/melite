// @melite/models-z-image/mods/ip_adapter.ts — Z-IMAGE'S IP-ADAPTER
// FLAVOR (the py models/image/z-image/mods/ip_adapters/mod.yaml,
// 1:1): the four reference modes (style / composition / face /
// generic). FAMILY-OWNED DATA — the rows live with the family
// (never in the pack contract, never in the family DECL); the pack
// contract (engines/comfyui-cordis/src/mods/packs.ts) supplies the
// inherited fields. Registered as an effect on the cards boot's
// fiber: dispose retracts the flavor, the family's surface loses
// the mutation (revertible; the model declares the boarding via
// DECL.mods = ['loras', 'controlnet', 'ip_adapter'], boot-gated ≡
// this file's families — the paper's satisfaction law).
//
// THE FATE IS 'refused' — and this file is the receipt for WHY
// (the ray lineage, read end to end before porting):
//   - ray HAD a lane (services/comfyui/core.py apply_ipadapters @
//     182d4f5f: CLIPVisionLoader → CLIPVisionEncode →
//     IPAdapterModelLoader → IPAdapterApply) but it silently
//     degraded — `except AttributeError: logger.warning; break`,
//     no-image skip, weight<=0 skip: a used reference image was a
//     LOG LINE, never a run. The functionality this vocabulary
//     remembers never executed once, on any family.
//   - the weights NEVER stood on disk: not in ray's engine, not in
//     /opt, not in the shared /mnt volume — every retired served
//     spec marks all four rows installed:null, source:null (vs
//     installed:true on every LoRA/CN row the scanner verified).
//   - the four files are SD1.5 adapters (ip-adapter-light_v11,
//     plus_sd15, faceid-plusv2_sd15, sd15) — they cannot patch
//     Z-Image's S3-DiT; ray's clip_name='IPAdapter_model.safetensors'
//     even loaded an ADAPTER file as the vision encoder (a bug).
//   - no Z-Image IP-Adapter exists upstream (HF api: 0 results for
//     Z-Image IP-Adapter; alibaba-pai's Fun ecosystem ships
//     ControlNet unions only).
// So the rows ride as catalog vocabulary (the mode names, weights,
// tooltips — the retired declaration, byte-1:1) with NO source_url:
// no link, no row-fetch — and no lane. The firing gate
// (guard.ts refuseIPAdapterFiring) refuses every stated entry LOUD
// with exactly this receipt. The day a real Z-Image IP-Adapter
// lands upstream + a loader lane exists, the fate flips to 'fired'
// and the rows gain source_urls — never before.
import type { Context } from '@deepseek-ai/cordis'
// the Context merge (ctx.comfyui) lives in the service module —
// pulling the type seats the augmentation in this program
import { ComfyUIServiceFace } from '@melite/comfyui-card-kit/service-faces'

export const inject = ['comfyui']

// The retired declaration's model names — SD1.5-era files, kept as
// catalog notes only (the row's historical filename; NOT on disk,
// NOT fetchable through this estate, NOT executable on S3-DiT).
export const ZIMAGE_IPADAPTER_ROWS = [
  { id: 'style', filename: 'ip-adapter-light_v11.safetensors', label: 'Style', category: 'reference', default_weight: 1.0, tooltip: 'Encoder-only LIGHT preset — transfers look/feel.' },
  { id: 'composition', filename: 'ip-adapter-plus_sd15.safetensors', label: 'Composition', category: 'reference', default_weight: 1.0, tooltip: 'COMPOSITION preset — borrows layout/structure.' },
  { id: 'face', filename: 'ip-adapter-faceid-plusv2_sd15.safetensors', label: 'Face', category: 'reference', default_weight: 0.85, tooltip: 'FACEID preset — identity lock.' },
  { id: 'generic', filename: 'ip-adapter_sd15.safetensors', label: 'Generic', category: 'reference', default_weight: 1.0, tooltip: 'STANDARD preset — unspecified projection.' },
]

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerFlavor({
    pack: 'ip_adapter',
    families: ['z-image'],
    rows: ZIMAGE_IPADAPTER_ROWS,
  }))
}
