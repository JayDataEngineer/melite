// mods/qvoice.ts — the qvoice pack (1:1 port of the py qvoice
// mod): the voice-lock card's exported speaker embeddings —
// .qvoice file + PCA steering. Same flavor on both tts families
// (the same-pack merge law: shapes validated equal at
// registration). The Cordis contract shape: fields ARE a
// Schemastery object schema, wire types on .extra('extra', {wtype}).
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

export const inject = ['comfyui']

const QvoiceFields = z.object({
  qvoice: z.string().role('path').description('Voice (.qvoice)')
    .extra('extra', {
      wtype: 'file', group: 'qvoice', zone: 'mods', order: 0,
      tooltip: 'Pre-computed speaker embedding (.qvoice/.voice — the voice-lock card exports these). Present = synthesize with THIS voice instead of the preset one.',
    }),
  voice_pca_strengths: z.string().description('PCA Steering')
    .extra('extra', {
      wtype: 'textarea', order: 1, group: 'qvoice', zone: 'mods',
      tooltip: 'JSON knobs over the embedding\'s principal components, e.g. {"pca_pc1.dir": 0.5} — subtle voice direction without re-designing the persona.',
    }),
})

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerMod({ pack: 'qvoice', families: ['qwen3-tts'], fields: QvoiceFields as never }))
  ctx.effect(() => ctx.comfyui.registerMod({ pack: 'qvoice', families: ['qwen3-tts-base'], fields: QvoiceFields as never }))
}
