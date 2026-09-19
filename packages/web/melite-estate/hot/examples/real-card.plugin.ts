// real-card.plugin.ts — a REAL hot basic card (#39, the ultimate
// test): a full CardDefinition authored as a drop-in, mounted by
// the dsh native patch reload (the profile's cordis.patch.yml
// inserts this file by path; no restart, no rebuild, no bundle).
//
// DRY PROOF: the card rides the SAME seams every packaged card
// rides — the card-kit recipe (imageT2I/finalizeImageGen, one
// spelling of the t2i graph), the mod plane (the boarded families'
// loras serve under the card automatically), and the registerCard
// gates (identity wall, loud compose, the family gate refusing
// unknown boarded ids at runtime). Nothing is reimplemented; the
// only differences from a packaged card are WHERE the registration
// lives (this file, not a package row in cardPackages) and HOW the
// boarded families are spelled (id strings — a packaged card
// imports the family DECL for tsc-time spelling; a drop-in rides
// the runtime family gate instead, trading tsc spelling for the
// drop-in's zero-install authoring).
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { imageT2I, finalizeImageGen } from '@melite/comfyui-card-kit'
import { refreshCardDefs, theService } from '@melite/comfyui-cordis'

const schema = z.object({
  prompt: z.string().description('Prompt').extra('extra', { order: 0, group: 'prompt', columns: 2, width: 1, required: true, zone: 'params', wtype: 'textarea' }),
  seed: z.number().description('Seed').step(1).default(-1).extra('extra', { order: 1, group: 'prompt', width: 1, zone: 'params' }),
})

export function apply(ctx: Context): void {
  console.log('[hot] real-card.plugin.ts LIVE — the hot-sketch card registers')
  ctx.effect(() => {
    const off = theService().registerCard({
      id: 'hot-sketch',
      skeleton: 'generate',
      boarded: ['krea-2', 'z-image'],
      tags: ['image', 'generate', 'hot'],
      identity: {
        label: 'Hot Sketch',
        description: 'The hotload proof card — a prompt-first minimal image card authored as a drop-in; boards krea-2 and z-image and rides the card-kit t2i recipe',
        genre: 'image',
        icon: 'spark',
      },
      sidebar: { key: 'image', order: 5 },
      flowKinds: {
        inputs: { prompt: 'text' },
        outputs: { default: 'image' },
        requiresModel: true,
      },
      schema: schema as unknown as (v: unknown) => Record<string, unknown>,
      compose(p, model, g, runId) {
        const doc = schema(p) as Record<string, unknown>
        if (!doc.prompt || !(doc.prompt as string).trim()) {
          throw new Error("required param 'prompt' missing or empty on the hot-sketch card")
        }
        imageT2I(doc, model, g, runId)
      },
      finalize: finalizeImageGen,
    })
    // THE RE-PROJECTION (#39): the served defs table is a boot
    // snapshot by design; this rebuilds it from the live singleton
    // so the card serves on the next request.
    refreshCardDefs()
    return () => {
      off()
      refreshCardDefs()
      console.log('[hot] real-card.plugin.ts retracted')
    }
  })
}
