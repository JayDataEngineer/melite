// families/audio/qwen3-tts-voicedesign/mods/qvoice.ts — the 1.7B
// family's QVOICE BOARDING (THE CARRY, operator 2026-09-23: qvoice
// works across ALL qwen3-tts): a saved .qvoice performs through the
// studio's generate pipeline on the 1.7B lanes exactly as on the
// 0.6B — the speak lane routes a stated entry to the studio, the
// Base lane carries it as upstream's design-then-clone flow (the
// exported voice IS the clone prompt). Owner-only scoping per the
// 0.6B precedent: formSpec('tts', '<route>') drops the absorbed
// qvoice fields off owning routes; the owner keeps them. Shapes
// live on the contract, one shape.
import type { Context } from '@deepseek-ai/cordis'

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerFlavor({
    pack: 'qvoice',
    families: ['qwen3-tts-voicedesign'],
  }))
}
