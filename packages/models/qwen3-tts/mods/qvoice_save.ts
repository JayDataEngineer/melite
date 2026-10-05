// families/audio/qwen3-tts/mods/qvoice_save.ts — the 0.6B family's
// QVOICE SAVE boarding (operator 2026-09-23, the full law: qvoice
// SAVES and LOADS across ALL qwen3-tts — a mod for saving, a mod for
// loading, every address). The families list names the registered
// ATOM only (the interlock: routes compose, the registry holds
// atoms) — the base route 'qwen3-tts-base' carries the envelope
// through the ROUTE→ATOM FOLD at the spec door (discovery.ts
// specBody). The exporter is the studio's own pipeline
// (AudiocoreVoiceStudio export_lite/export_wdelta — it loads its own
// model variants; the lane's checkpoint only resolves directories),
// so the save is engine-legal from any lane: no VoiceDesign variant
// is claimed for the 0.6B (the 1:1 law against upstream's
// released-models table holds — the mod boards, the checkpoint
// matrix does not grow). The card's save-intent admission
// (voice_name + design_prompt) gates the fire.
import type { Context } from '@deepseek-ai/cordis'
// the Context merge (ctx.comfyui) lives in the service module —
// pulling the type seats the augmentation in this program
import type { ComfyUIService } from '@melite/comfyui-cordis/service'

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerFlavor({
    pack: 'qvoice_save',
    families: ['qwen3-tts'],
  }))
}
