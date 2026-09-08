// Tier 3 — the skin card (the skin_t1 renderer port): SkinPack
// deterministic detail maps + the kind sidecar, SkinApply bytes
// surgery, 8-view proof sheet.
// Decl + admission + one kit recipe call — the lane body (including
// the card-owned skin spec port) lives in src/kit.ts.
//
// The SIDECAR is derived, never wire: kind/map_size/seed are the
// card knobs (the Model's card_knobs rows).
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { skinLane, finalizeSkin } from '../kit.ts'

const schema = z.object({
  body_glb: z.string().role('path').description('Body GLB'),
  kind: z.union([
    z.const('keeper'), z.const('villager'), z.const('villager_elder'),
    z.const('ash_nomad'), z.const('caravan_trader'), z.const('arena_factor'),
    z.const('amf_warden'), z.const('marrow_raider'), z.const('dune_hound'),
    z.const('sand_skimmer'), z.const('ridge_lizard'), z.const('moss_elk'),
    z.const('gloom_tortoise'), z.const('emberwing'), z.const('bone_crane'),
    z.const('husk_stalker'), z.const('ironvein_construct'),
    z.const('cherusci_scrivener'), z.const('amalgam_horror'),
    z.const('meld_creature'),
  ]).default('keeper').description('Kind'),
  // the Select sends wire strings ("512") — coerced at the closed
  // vocabulary in compose, never silently rescaled
  map_size: z.union([z.number(), z.string()]).default(512).description('Map size')
    .extra('extra', { options: [256, 512, 1024, 2048] }),
  // seed sentinel LAW outranks the retired py floor (served min:0 was
  // py-authored; -1=random is the cross-card agent contract — the
  // emitter regenerates served bytes from TS meta, so the floor rides
  // the law, not the py golden; 20260906 default = deterministic pin)
  seed: z.number().min(-1).max(2147483647).step(1).default(20260906).description('Seed'),
  resolution: z.number().min(256).max(2048).default(768).description('View resolution'),
  framing: z.number().min(1.0).max(3.0).default(1.2).description('Framing'),
  focal_length: z.number().min(18).max(135).default(50).description('Focal length'),
  samples: z.number().min(8).max(256).default(64).description('Samples'),
  transparent: z.union([z.boolean(), z.string()]).default(true).description('Transparent'),
})

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.comfyui.registerCard({
    id: 'skin',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'skin',
    boarded: ['skin'],
    requires: ['melite-poser-nodes'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, _model, g, runId) {
      const body = String(p.body_glb ?? '')
      if (!body.trim()) {
        throw new Error("required param 'body_glb' missing or empty on the skin lane")
      }
      skinLane(p, g, runId)
    },
    finalize: finalizeSkin,
  })
}
