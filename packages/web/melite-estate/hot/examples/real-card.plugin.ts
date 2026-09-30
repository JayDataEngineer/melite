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
// THE BOARDING LAW (ledger #40, the operator's outage: this file
// boarded krea-2 + z-image and the lane served its 2-field
// envelope AS image-gen). One family, one card — registerCard
// refuses a collision LOUD — so a drop-in boards ONLY families no
// packaged card claims. This sketch boards moss (declared,
// offered, unboarded — and formless, so the sketch's generate
// skeleton is the served def's only form voice): the proof
// exercises registration, serving, and retraction through the
// real gates, never a real run.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { declaredAction, instantiateAction } from '@melite/comfyui-card-kit'
import { DECL as krea2Decl } from '@melite/models-krea-2'
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
      boarded: ['moss'],
      tags: ['image', 'generate', 'hot'],
      identity: {
        label: 'Hot Sketch',
        description: 'The hotload proof card — a prompt-first minimal image card authored as a drop-in; boards the unboarded moss family (one family, one card — ledger #40) and rides the card-kit t2i recipe',
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
        instantiateAction(declaredAction(krea2Decl, 't2i'), doc, model, g, runId)
      },
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
