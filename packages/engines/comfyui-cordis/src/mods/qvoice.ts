// mods/qvoice.ts — the qvoice pack (py mods/qvoice.py, 1:1 port):
// the voice-lock card's exported speaker embeddings ride here —
// .qvoice file + PCA steering. Same flavor on both tts families
// (the same-pack merge law: shapes agree). Declared as a cordis
// plugin registering through ctx.comfyui.registerMod.
import type { Context } from '@deepseek-ai/cordis'

export const inject = ['comfyui']

const QVOICE_FIELDS = [
  {
    name: 'qvoice',
    type: 'file',
    label: 'Voice (.qvoice)',
    group: 'qvoice',
    zone: 'mods',
    tooltip:
      'Pre-computed speaker embedding (.qvoice/.voice — the voice-lock card exports these). Present = synthesize with THIS voice instead of the preset one.',
    order: 0,
  },
  {
    name: 'voice_pca_strengths',
    type: 'textarea',
    label: 'PCA Steering',
    group: 'qvoice',
    zone: 'mods',
    tooltip:
      'JSON knobs over the embedding\'s principal components, e.g. {"pca_pc1.dir": 0.5} — subtle voice direction without re-designing the persona.',
    order: 1,
  },
]

export function apply(ctx: Context): void {
  ctx.comfyui.registerMod({ pack: 'qvoice', families: ['qwen3-tts'], fields: QVOICE_FIELDS })
  ctx.comfyui.registerMod({ pack: 'qvoice', families: ['qwen3-tts-base'], fields: QVOICE_FIELDS })
}
