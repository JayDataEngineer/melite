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
import { skinLane, finalizeSkin } from '@melite/comfyui-card-kit'
import type { ComfyUIService } from '@melite/comfyui-cordis/service'
import { vocabulary } from '@melite/comfyui-card-kit/vocab'

const schema = z.object({
  body_glb: z.string().role('path').description("Body GLB").extra('extra', { order: 0, group: "parts", required: true, wtype: 'file', }),
  kind: vocabulary(["keeper", "villager", "villager_elder", "ash_nomad", "caravan_trader", "arena_factor", "amf_warden", "marrow_raider", "dune_hound", "sand_skimmer", "ridge_lizard", "moss_elk", "gloom_tortoise", "emberwing", "bone_crane", "husk_stalker", "ironvein_construct", "cherusci_scrivener", "amalgam_horror", "meld_creature"]).description("Kind").default("keeper").extra('extra', { order: 0, group: "skin", wtype: 'select' }),
  // the Select sends wire strings ("512") — coerced at the closed
  // vocabulary in compose, never silently rescaled
  map_size: vocabulary(['256', '512', '1024', '2048']).description("Map size").default(512 as unknown as string).extra('extra', { order: 1, group: "skin", wtype: 'select' }),
  // seed sentinel LAW outranks the retired py floor (served min:0 was
  // py-authored; -1=random is the cross-card agent contract — the
  // emitter regenerates served bytes from TS meta, so the floor rides
  // the law, not the py golden; 20260906 default = deterministic pin)
  seed: z.number().description("Seed").min(0).max(2147483647).step(1).default(20260906).extra('extra', { order: 2, group: "skin", wtype: 'number' }),
  resolution: z.number().description("View resolution").min(256).max(2048).step(64).default(768).extra('extra', { order: 0, group: "turnaround" }),
  framing: z.number().description("Framing").min(1).max(3).step(0.05).default(1.2).extra('extra', { order: 1, group: "turnaround" }),
  focal_length: z.number().description("Focal length").min(18).max(135).step(1).default(50).extra('extra', { order: 2, group: "turnaround", wtype: 'slider' }),
  samples: z.number().description("Samples").min(8).max(256).step(8).default(64).extra('extra', { order: 3, group: "turnaround" }),
  transparent: vocabulary(["true", "false"]).description("Transparent").default("true").extra('extra', { order: 4, group: "turnaround", wtype: 'select' }),
})

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerCard({
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
  }))
}
