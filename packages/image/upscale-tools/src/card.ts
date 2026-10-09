// Tier 3 — the upscale-tools card (the seedvr2_t1 submittable arm).
// Decl + admission + one kit recipe call — the lane body rides @melite/comfyui-card-kit (upscaleLane).
import type { Context } from '@deepseek-ai/cordis'
import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import z from '@deepseek-ai/schemastery'
import { declaredAction, instantiateAction } from '@melite/comfyui-card-kit'
import { resolveLinkedInput, runMediaPrefix } from '@melite/comfyui-cordis/linked'
import type { ComfyUIService } from '@melite/comfyui-cordis/service'
import { bag } from '@melite/contracts/extraKeys'
import { DECL as seedvr2Decl } from '@melite/models-seedvr2_ema'
import type { ModelFacts } from '@melite/comfyui-card-kit/facts'
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph'
import { gatedResolve } from '@melite/comfyui-cordis'

// THE FAMILY BINDINGS (the atom vocabulary, stroke 3): the declared
// action composes; the legacy kit lane stays the declared fallback
// (byte-oracle + unbound-row safety). Keyed by OWNING FAMILY
// (`model.family ?? model.id` at dispatch — a route id keys
// nothing, the derived-row law).
export const ACTION_BINDINGS: Record<string, (p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string) => void> = {
  [seedvr2Decl.id]: (p, model, g, runId) => {
    instantiateAction(declaredAction(seedvr2Decl, 'upscale'), p, model, g, runId)
  },
}

const schema = z.object({
  input_image: z.string().role('path').description("Input image").extra('extra', bag({ order: 0, group: "input", width: 1, tooltip: "The frame to restore. Absolute mount path.", required: true, wtype: 'image', })),
  // ride-the-model keys (ABSENT: no schema default — the
  // compose-door cascade overlays model defaults, then explicit
  // params): resolution/max_resolution/batch_size ride the seedvr2_ema
  // model row (1080/4096/1); seed rides -1 (model row carries 0,
  // explicit wins — an explicit 42 rides the model row). RANGE RULE
  // (2026-09-08 Phase-2): whoever owns the default owns the floor
  // ride-keys carry HINT-ONLY ranges via extra (the served editor
  // floors) so the cascade stays authoritative; only schema-defaulted
  // knobs (seed) get validating min/max.
  resolution: z.number().description("Target short side").min(256).max(2160).step(2).extra('extra', bag({ order: 0, group: "target", columns: 2, width: 1, tooltip: "1080 = FHD rail. SeedVR2 redraws detail at this size.", wtype: 'number' })),
  max_resolution: z.number().description("Max resolution").min(512).max(4096).step(64).extra('extra', bag({ order: 1, group: "target", columns: 2, width: 1, tooltip: "The hard ceiling — inputs already past it pass through.", wtype: 'number' })),
  batch_size: z.number().description("Batch size").min(1).max(16).step(1).extra('extra', bag({ order: 0, group: "run", width: 1, tooltip: "Video frames ride batches; images are batch 1.", wtype: 'number' })),
  seed: z.number().description("Seed").step(1).default(-1).extra('extra', bag({ order: 1, group: "run", width: 1 })),
  // NO dit_model/vae_model (card declares no such knobs — the
  // weights ride lane_inputs.unet/vae; old drafts naming them still
  // parse via the door's non-strict overlay but compose never reads
  // them).
})

/** The schema's callable face — ONE cast serving both seams (the
 *  registration's schema carrier and the compose strict resolve's
 *  judge): schemastery schemas are callable (Schema.resolve) but
 *  carry a typed data parameter, while both card-seam consumers
 *  take unknown. */
const schemaFn = schema as unknown as (v: unknown) => Record<string, unknown>

export const inject = ['comfyui']

// THE IDENTITY RUNG (native 2026-09-10 — migrated from the frozen
// identity ring; the card owns its label/description/genre/icon).
export const identity = {
  label: 'Upscale Image',
  description: 'Diffusion upscale (SeedVR2-3B fp16) — the hidden tool card; also home of the consumed tool fragments (resize, pixel-upscale, rtx-vsr, concat, input)',
  genre: 'image',
  icon: 'maximize',
  principles: [
    'A tool lane boards only with real weight facts — the weightless fragments render as consumed arms, never as phantom submit options',
    'SeedVR2 restores detail (diffusion); plain resize resamples pixels — pick by intent, not by size',
    'resolution is the TARGET short side (1080 = FHD rail); max_resolution is the hard ceiling the lane refuses past',
    'Defaults are shape, not value: filenames and knobs come from the model folder, merged at serve time',
    'rtx-vsr is NVIDIA-SDK-only: the arm is compose-truth, execution needs the RTX stack',
  ],
}

/** The estate's own tree for the linked-input rewrite — the
 *  compose call's manifest, first entry (the queue's own root).
 *  A root-relative ref with no manifest refuses LOUD (there is no
 *  cwd guess to fall back on — J12 killed it). */
function estateRoot(estate: { stateRoots: readonly string[] } | undefined): string {
  const first = estate?.stateRoots[0]
  if (first === undefined || first === '') {
    throw new Error("linked input needs the estate state root — compose with the queue seat's roots manifest (a root-relative asset URL cannot be resolved from the cwd; it never guesses)")
  }
  return first
}

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerCard({
    id: 'upscale-tools',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'generate',
    boarded: [seedvr2Decl.id],
    tags: ['image', 'upscale', 'enhance'],
    identity,
    // THE DISCOVERY ROWS (migrated 2026-09-10 from the frozen
    // discovery export — the card owns its sidebar, surface, and
    // flow-stage declarations; the discovery arms derive from here).
    sidebar: { key: 'image', order: 16, hidden: true },
    flowKinds: {
      inputs: { input_image: 'image' },
      outputs: { default: 'image' },
      requiresModel: true,
    },
    requires: ['ComfyUI-SeedVR2_VideoUpscaler', 'ComfyUI-KJNodes', 'Nvidia_RTX_Nodes_ComfyUI'],
    // ADMISSION EXTRAS + SPELLS (the class-attr halves verbatim:
    // admits minus studio writes, and the $spell-eligible file slot
    // for two-card-flow handoff).
    admits: ['filename_prefix'],
    spells: ['input_image'],
    schema: schemaFn,
    compose(p, model, g, runId, estate) {
      // THE SCHEMA GATE (the audio-trio admission precedent — the
      // card's own declaration validates the last hop into the
      // engine): schemastery walk enforces declared types + bounds
      // (resolution 256–2160, max_resolution 512–4096, batch_size 1–16 —
      // an OOB draft refuses LOUD here, never composes), fills the
      // declared seed default (-1), and passes admits keys through
      // verbatim. The composer's reads below are reads of the GATED
      // doc.
      const doc = gatedResolve('upscale-tools', schemaFn, ['filename_prefix', 'model'], p)
      if (!doc.input_image || !(doc.input_image as string).trim()) {
        throw new Error("required param 'input_image' missing or empty on the upscale-tools card (what gets upscaled)")
      }
      // THE ESTATE-FILE CONTRACT (retired compose.py:70-90 verbatim
      // semantics): a file-typed param must EXIST at compose time —
      // absolute mount path expected. A $spell ("$image") names a
      // WIRED STAGE INPUT, never a file: rides verbatim, the runtime
      // rewrites it against the wired input (row 4, the two-card
      // flow's handoff). A linked upstream output arrives as its
      // asset URL (/v1/assets/runs/… — the editor injects it at
      // compile) and rides too — the submit-time uploader fetches
      // and stages it (a dead URL refuses loud there, never here).
      // A linked upstream output arrives as its asset URL in two
      // spellings: absolute URLs ride verbatim (the submit-time
      // uploader fetches them); root-relative URLs rewrite to the
      // runs-root mount path (same estate, verified NOW).
      // Compile-time, never inference-time.
      // J12: a root-relative asset URL resolves against the estate's
      // config-named trees (the compose call's manifest — first tree
      // is the queue's own root); every other spelling rides without
      // a seat read. The retired env seam's cwd guess never returns.
      const raw = String(doc.input_image).trim()
      const ref = runMediaPrefix(raw) === '' ? raw : resolveLinkedInput(raw, estateRoot(estate))
      doc.input_image = ref
      const lower = ref.toLowerCase()
      if (!ref.startsWith('$') && !lower.startsWith('http://') && !lower.startsWith('https://')) {
        const abs = ref.startsWith('/') ? ref : resolve(ref)
        if (!(existsSync(abs) && statSync(abs).isFile())) {
          throw new Error(`input_image '${ref}' is not a file on this estate (absolute mount path expected)`)
        }
      }
      const bound = ACTION_BINDINGS[model.family ?? model.id]
      if (bound) bound(doc, model, g, runId)
      else {
        throw new Error(
          `no declared action for family '${String(model.family ?? model.id)}' on the upscale-tools card — every boarded family (seedvr2_ema) composes its own declared segment; this address owns none`)
      }
    },
  }))
}
