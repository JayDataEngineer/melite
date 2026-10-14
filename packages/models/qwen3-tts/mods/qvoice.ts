// families/audio/qwen3-tts/mods/qvoice.ts — the 0.6B family's QVOICE
// LOAD boarding (operator 2026-09-23, the full law: qvoice SAVES and
// LOADS across ALL qwen3-tts). The families list names the registered
// ATOM only (the interlock: routes compose, the registry holds atoms)
// — every address the family serves, including the base route
// 'qwen3-tts-base', carries this envelope through the ROUTE→ATOM FOLD
// at the spec door (discovery.ts specBody). The clone lane performs a
// stated .qvoice through the studio's generate pipeline (the exported
// voice IS the clone prompt).
import type { Context } from '@melite/comfyui-card-kit/card-definition'
// the Context merge (ctx.comfyui) lives in the service module —
// pulling the type seats the augmentation in this program
import { ComfyUIServiceFace } from '@melite/comfyui-card-kit/service-faces'

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerFlavor({
    pack: 'qvoice',
    families: ['qwen3-tts'],
  }))
}
