// Tier 3 — the anny card (the anny_t1 renderer port): composite
// character → 8-view turnaround sheet; optional SAM hair/clothing
// sprite ingest.
// Decl + admission + one kit recipe call — the lane body lives in src/kit.ts.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { annyLane, finalizeAnny } from '@melite/comfyui-card-kit'
import type { ComfyUIService } from '@melite/comfyui-cordis/service'
import { vocabulary } from '@melite/comfyui-card-kit/vocab'

const schema = z.object({
  body_glb: z.string().role('path').description("Body GLB").extra('extra', { order: 0, group: "parts", columns: 1, tooltip: "The base body — empty autoloads the Model-declared neutral body (anny-base-body.glb, provisioned); or attach a rigged/static character GLB. (Photo→body estimation is the pilot arc; clothing composite moves to its own card later.)", wtype: 'file' }),
  source_image: z.string().role('path').description("Source photo").extra('extra', { order: 0, group: "ingest", tooltip: "Character photo — SAM segments hair/outfit sprites (feeds the estimator arc).", wtype: 'file' }),
  resolution: z.number().description("View resolution").min(256).max(2048).step(64).default(768).extra('extra', { order: 0, group: "turnaround", width: 1, tooltip: "Pixel size of each turnaround view." }),
  framing: z.number().description("Framing").min(1).max(3).step(0.05).default(1.2).extra('extra', { order: 1, group: "turnaround", width: 1, tooltip: "Camera distance factor — larger frames the whole body looser." }),
  focal_length: z.number().description("Focal length (mm)").min(10).max(400).step(1).default(50).extra('extra', { order: 2, group: "turnaround", width: 1, tooltip: "Lens focal length — lower = wider perspective.", wtype: 'slider' }),
  samples: z.number().description("Samples").min(1).max(4096).step(1).default(64).extra('extra', { order: 3, group: "turnaround", width: 1, tooltip: "Render samples per view — more = cleaner but slower.", wtype: 'number' }),
  // bool or the Select's "true"/"false" wire string (the loose anny
  // law coerces in compose — python step-doc: str(x) != "false")
  transparent: vocabulary(["true", "false"]).description("Background").default("true").extra('extra', { order: 4, group: "turnaround", width: 1, tooltip: "Transparent turnaround background (for compositing into sheets).", wtype: 'select' }),
})

export const inject = ['comfyui']

// THE IDENTITY RUNG (native 2026-09-10 — migrated from the frozen
// identity ring; the card owns its label/description/genre/icon).
export const identity = {
  label: 'Anny',
  description: 'Assemble a character — composite body/hair/outfit GLBs, render the 8-view turnaround, segment a source photo into part sprites.',
  genre: '3d',
  icon: 'person',
}

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerCard({
    id: 'anny',
    // no model families — a pure-tool card (requiresModel: false
    // skips the {model:} demand in cardGate, compose, CLI — the
    // flowKinds row below repeats it for discovery).
    requiresModel: false,
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'anny',
    boarded: ['anny'],
    tags: ['3d', 'character', 'generate'],
    identity,
    // THE DISCOVERY ROWS (migrated 2026-09-10 from the frozen
    // discovery export — the card owns its sidebar, surface, and
    // flow-stage declarations; the discovery arms derive from here).
    sidebar: { key: '3d', order: 14 },
    surface: { layout: 'studio' },
    flowKinds: {
      inputs: { source_image: 'image' },
      outputs: { default: 'mesh' },
      requiresModel: false,
    },
    requires: ['melite-poser-nodes'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, _model, g, _runId) {
      const body = String(p.body_glb ?? '')
      if (!body.trim()) {
        throw new Error("required param 'body_glb' missing or empty on the anny card (the lane assembles FROM a real body GLB — the resolved mount path, never a mannequin)")
      }
      annyLane(p, g)
    },
    finalize: finalizeAnny,
  }))
}
