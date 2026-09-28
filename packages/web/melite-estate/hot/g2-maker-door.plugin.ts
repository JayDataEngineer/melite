// g2-maker-door.plugin.ts — THE G2 ARM (ROADMAP "THE HOT DOOR, ARMED
// ON THE MAKER PROFILE", 2026-09-28 → landed 2026-10-11): the one
// `- insert:` row the maker profile was missing. The door, the
// seams (`refreshCardDefs`, the served-defs boot snapshot), and the
// walls all existed; only the row was absent — "the capability is
// disarmed on the one profile the charge was about."
//
// THE BOARDING LAW (ledger #40, the krea-2 outage): a drop-in boards
// ONLY families no packaged card claims. This file boards `moss` —
// declared, offered, unboarded (verified against the cardPackages
// table before this file was authored; the hot-door wall re-verifies
// at every run) — and no packaged card claims it. The family id is
// spelled as an ID STRING, never an imported DECL: that spelling is
// the drop-in's whole trade (zero-install authoring, runtime family
// gate) and the thing G2 exists to prove on the maker profile.
//
// Receipt path (the ROADMAP's gates, taken live, NO restart):
//   serves    → GET  /v1/forms            (the card's def row)
//   specs     → GET  /v1/form-spec        (the moss envelope)
//   validates → POST /v1/flows/validate   (a real draft through the card)
//   retracts  → remove the row; the fiber disposal un-serves it
//
// hot/README.md keeps its sentence: this is an experiment surface,
// not a replacement for a stable card/model package.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { imageT2I, finalizeImageGen } from '@melite/comfyui-card-kit'
import { loadCardDefs, refreshCardDefs, theService } from '@melite/comfyui-cordis'

const schema = z.object({
  prompt: z.string().description('Prompt').extra('extra', { order: 0, group: 'prompt', columns: 2, width: 1, required: true, zone: 'params', wtype: 'textarea' }),
  seed: z.number().description('Seed').step(1).default(-1).extra('extra', { order: 1, group: 'prompt', width: 1, zone: 'params' }),
})

// COLD-BOOT SAFE (the lane crash the first armed row taught): the
// insert row rides the profile PATCH, so it mounts at EVERY boot —
// and at a cold boot this fiber can run BEFORE the estate bundle's
// card boot, where theService() throws "card defs not booted". The
// live-mount path (patch save after boot) resolves instantly; the
// cold path awaits the same boot every other card consumer awaits.
// Sync apply here crash-looped the lane (Restart=always, 5 restarts).
export async function apply(ctx: Context): Promise<void> {
  await loadCardDefs()
  console.log('[hot-g2-maker-door] LIVE — the G2 row is armed; the moss id-string card registers')
  ctx.effect(() => {
    const off = theService().registerCard({
      id: 'hot-g2-door',
      skeleton: 'generate',
      boarded: ['moss'],
      tags: ['image', 'generate', 'hot'],
      identity: {
        label: 'Hot G2 Door',
        description: 'The G2 receipt card — the armed hot door on the maker profile; boards the unboarded moss family by id string (one family, one card — ledger #40) and rides the card-kit t2i recipe',
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
          throw new Error("required param 'prompt' missing or empty on the hot-g2-door card")
        }
        imageT2I(doc, model, g, runId)
      },
      finalize: finalizeImageGen,
    })
    // THE RE-PROJECTION (#39): the served defs table is a boot
    // snapshot by design; this rebuilds it from the live singleton
    // so the card serves on the next request — no restart.
    refreshCardDefs()
    return () => {
      off()
      refreshCardDefs()
      console.log('[hot-g2-maker-door] retracted — removing the row un-serves the card with the fiber')
    }
  })
}
