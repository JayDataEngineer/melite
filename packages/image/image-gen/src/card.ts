// card.ts — the image-gen card face (data + its registration).
//
// Ported verbatim from engines/comfyui-cordis/src/cards/image/
// image-gen/card.ts (the package home, M2′): decl, schema, compose
// (the card-kit recipe call), finalize. The card-recipe knob is
// GONE (stroke 34 — the operator's catch: the catalog was
// model-blind, stamping steps/cfg that fight the variant rail);
// one-click presets live in the FAMILY DECL as Recipe rows the
// client stamps as macros.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { declaredAction, instantiateAction } from '@melite/comfyui-card-kit'
import { stripAutofill } from '@melite/comfyui-card-kit/graph'
import type { PromptGraph, StripTable } from '@melite/comfyui-card-kit/graph'
import type { ModelFacts } from '@melite/comfyui-card-kit/facts'
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph'
import { SAMPLERS, SCHEDULERS } from '@melite/comfyui-card-kit/vocab'
import { samplingExtra } from '@melite/comfyui-card-kit/fields'
import type { ComfyUIService } from '@melite/comfyui-cordis/service'
import { gatedResolve } from '@melite/comfyui-cordis'
import { DECL as krea2Decl } from '@melite/models-krea-2'
import { DECL as zImageDecl } from '@melite/models-z-image'
import { DECL as animaDecl } from '@melite/models-anima'
import { DECL as qwenImg21Decl } from '@melite/models-qwen-img-21'
import { bag } from '@melite/contracts/extraKeys'

/** The card's boarding — where the card gets its models: THE AI
 *  MODELS' own plugin declarations (packages/models/*), each
 *  carrying its whole truth — variants, quant cells, HF artifact
 *  links, mods, lane inputs. The id is spelled once, in the model
 *  plugin; a rename breaks at tsc, never silently at the
 *  not-boarded refusal. The model-knob enum, the tool default, and
 *  the registry row all derive from this array. */
export const BOARDED = [krea2Decl.id, zImageDecl.id, animaDecl.id, qwenImg21Decl.id] as const

/** The action bindings (the atom vocabulary, stroke-1 pilot): a
 *  boarded family with a bound action composes through the atom's
 *  own declared segment — the card delegates, never authors nodes.
 *  Keyed by the OWNING FAMILY (model.family, never model.id: six of
 *  ten served addresses are route ids — a route-keyed lookup misses
 *  and silently composes nothing). Every boarded family holds a
 *  bound action; the binding per family is the card's declared
 *  compose contract, never an id switch inside lane code. Exported
 *  for the every-address wall: each served facts row's OWNING
 *  family must hold a row here — a boarded-but-unbound family
 *  refuses loud at the dispatch, never a silent miss. */
// THE IMAGE-GEN STRIP PASS (re-homed from the card kit, 2026-09-30 —
// the kit-arm retirement): this card's finalize owns its own
// serialization law. The t2i templates omit these pin defaults, so
// the engine would auto-fill them at serialization; stripping an
// empty value is what keeps the request byte-stable. The strip lived
// in the kit while the lane moved to the families; a finalize pass
// with no lane beside it is a second home, so it came here.
export const IMAGE_GEN_STRIP: StripTable = {
  CLIPLoader: ['device'],
  KSampler: ['control_after_generate'],
}

/** The card's autofill strip (the t2i family's pin defaults never ride). */
export function finalizeImageGen(graph: PromptGraph): PromptGraph {
  return stripAutofill(graph, IMAGE_GEN_STRIP)
}

export const ACTION_BINDINGS: Record<string, (p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string) => void> = {
  [krea2Decl.id]: (p, model, g, runId) => {
    instantiateAction(declaredAction(krea2Decl, 't2i'), p, model, g, runId)
  },
  [zImageDecl.id]: (p, model, g, runId) => {
    instantiateAction(declaredAction(zImageDecl, 't2i'), p, model, g, runId)
  },
  [animaDecl.id]: (p, model, g, runId) => {
    instantiateAction(declaredAction(animaDecl, 't2i'), p, model, g, runId)
  },
  [qwenImg21Decl.id]: (p, model, g, runId) => {
    instantiateAction(declaredAction(qwenImg21Decl, 't2i'), p, model, g, runId)
  },
}

export const schema = z.object({
  // CARD-OWNED SURFACE (the 1:1 port, 2026-09-08): declaration
  // order = the field order (frozen form_spec krea-2 referee).
  // loras is NOT here — the krea-2 LoRA knob rides the MOD
  // absorption (mods/loras.ts; the interlock). compose still
  // consumes p.loras (kit.ts stackLoras) — the user bag, however
  // it was filled (a family Recipe macro may have stamped it).
  prompt: z.string().description('Prompt').extra('extra', bag({ order: 0, group: 'prompt', columns: 2, width: 1, required: true, zone: 'params', wtype: 'textarea' })),
  negative_prompt: z.string().description('Negative Prompt').extra('extra', bag({ order: 1, group: 'prompt', width: 1, zone: 'params', wtype: 'textarea' })),
  width: z.number().description('Width').min(256).max(2048).step(16).extra('extra', bag({ order: 0, group: 'resolution', columns: 3, width: 1, zone: 'params', wtype: 'number' })),
  height: z.number().description('Height').min(256).max(2048).step(16).extra('extra', bag({ order: 1, group: 'resolution', width: 1, zone: 'params', wtype: 'number' })),
  seed: z.number().description('Seed').step(1).default(-1).extra('extra', bag({ order: 4, group: 'sampling', width: 1, zone: 'params' })),
  steps: z.number().description('Steps').min(1).max(100).step(1).extra('extra', samplingExtra('steps')),
  cfg: z.number().description('Guidance Scale').min(1).max(20).step(0.1).default(4.5).extra('extra', samplingExtra('cfg', { tooltip: 'How closely the diffusion follows the prompt. Higher = stricter.' })),
  sampler: SAMPLERS.description('Sampler').extra('extra', samplingExtra('sampler')),
  scheduler: SCHEDULERS.description('Scheduler').extra('extra', samplingExtra('scheduler')),
})

export const identity = {
  label: 'Generate Image',
  description: 'Text-to-image generation — the generate_image interface card boarding krea-2, z-image, anima, and qwen-img-21 (the Qwen Image 2.1 base — its 2.1 lane emits the TextEncodeQwenImage21 graph; the edit sibling qwen-img-edit-21 boards the image-edit card); each family declares its mods and the surface scopes itself',
  genre: 'image',
  icon: 'image',
  principles: [
    'prompt is required — an empty/whitespace prompt is rejected loud, never sampled with empty conditioning',
    'ONE param cascade (stroke 34 — the card-recipe layer is dead): schema defaults < model-folder defaults (the family rail resolves the model row) < your explicit values. Presets are FAMILY Recipe rows — one-click macros that stamp declared knobs/bags, never a persisted mode',
    'Sampler and scheduler option lists resolve from the ONE vocabulary (media.comfyui.sampler_vocab) — never hand-copied',
    'A preset fills untouched fields; values you have set win',
    'Mods are model-level declarations: lanpaint rides the families that declare it (anima, z-image) — input_image + lanpaint_mask switch the builder to LanPaintKSampler; loras ride krea-2 (apply on Turbo, train on Raw)',
    'Mask prep (grow/feather/threshold/invert) and outpaint pads are applied host-side before the run — no silent param drops',
  ],
}

/** The schema's callable face — ONE cast serving both seams (the
 *  registration's schema carrier and the compose strict resolve's
 *  judge): schemastery schemas are callable (Schema.resolve) but
 *  carry a typed data parameter, while both card-seam consumers
 *  take unknown. */
const schemaFn = schema as unknown as (v: unknown) => Record<string, unknown>

/** Register the card face into the engine registry. The service
 *  arrives as a parameter (index.ts probed it — comfyui is an
 *  optional dependency, not an injected one). */
export function registerCard(ctx: Context, comfy: ComfyUIService): void {
  ctx.effect(() => comfy.registerCard({
    id: 'image-gen',
    skeleton: 'generate',
    boarded: [...BOARDED],
    tags: ['image', 'generate', 'text-to-image'],
    identity,
    // THE DISCOVERY ROWS (migrated 2026-09-10 from the frozen
    // discovery export — the card owns its sidebar, surface, and
    // flow-stage declarations; the discovery arms derive from here).
    sidebar: { key: 'image', order: 1 },
    flowKinds: {
      // prompt only (2026-09-21, the phantom-port cure): the
      // reference_image port rode here with no schema knob and no
      // compose read — wiring it validated green then dropped
      // silent at compose. A declared port the card cannot consume
      // is a lie; when a reference-guided t2i lane lands, the knob
      // and the read land with it.
      inputs: { prompt: 'text' },
      outputs: { default: 'image' },
      requiresModel: true,
    },
    schema: schemaFn,
    compose(p, model, g, runId) {
      // THE SCHEMA GATE (the audio-trio admission precedent — the
      // card's own declaration validates the last hop into the
      // engine): schemastery walk enforces declared types + bounds (a
      // width=9999 draft refuses LOUD here, never composes), fills
      // defaults, and passes mod-plane keys (loras bags, admits)
      // through verbatim — nothing drops. The composer's reads below
      // are reads of the GATED doc. The T6 strict resolve: every key
      // that is neither a declared knob nor a rider (the loras bag
      // and the model stamp the family defaults carry are this
      // card's riders — no admits, no studio writes on the boarded
      // image families) refuses 'unknown-param', named — a typo'd
      // `promptt` never composes, never renders.
      const doc = gatedResolve('image-gen', schemaFn, ['loras', 'model'], p)
      if (!doc.prompt || !(doc.prompt as string).trim()) {
        throw new Error("required param 'prompt' missing or empty on the image-gen card (what the picture IS)")
      }
      const bound = ACTION_BINDINGS[model.family ?? model.id]
      if (bound) {
        bound(doc, model, g, runId)
        return
      }
      else {
        throw new Error(
          `no declared action for family '${String(model.family ?? model.id)}' on the image-gen card — every boarded family (krea-2, z-image, anima, qwen-img-21) composes its own declared segment; this address owns none`)
      }
    },
    finalize: finalizeImageGen,
  }))
}
