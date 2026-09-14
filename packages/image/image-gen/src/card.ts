// card.ts — the image-gen card face (data + its registration).
//
// Ported verbatim from engines/comfyui-cordis/src/cards/image/
// image-gen/card.ts (the package home, M2′): decl, schema, compose
// (the card-kit recipe call), finalize. ONE addition — the recipe
// knob (the operator's law, this stroke): recipes are configs on
// the card, cataloged in ./recipes.ts, resolved by the engine's
// compose at its one merge point.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { imageT2I, finalizeImageGen } from '@melite/comfyui-card-kit'
import { SAMPLERS, SCHEDULERS } from '@melite/comfyui-card-kit/vocab'
import { samplingExtra } from '@melite/comfyui-card-kit/fields'
import type { ComfyUIService } from '@melite/comfyui-cordis/service'
import { DECL as krea2Decl } from '@melite/models-krea-2'
import { DECL as zImageDecl } from '@melite/models-z-image'
import { DECL as animaDecl } from '@melite/models-anima'
import { RECIPES, RECIPE_KEYS, DEFAULT_RECIPE } from './recipes.ts'

/** The card's boarding — where the card gets its models: THE AI
 *  MODELS' own plugin declarations (packages/models/*), each
 *  carrying its whole truth — variants, quant cells, HF artifact
 *  links, mods, lane inputs. The id is spelled once, in the model
 *  plugin; a rename breaks at tsc, never silently at the
 *  not-boarded refusal. The model-knob enum, the tool default, and
 *  the registry row all derive from this array. */
export const BOARDED = [krea2Decl.id, zImageDecl.id, animaDecl.id] as const

export const schema = z.object({
  // CARD-OWNED SURFACE (the 1:1 port, 2026-09-08): declaration
  // order = the py field order (frozen form_spec krea-2 referee).
  // loras is NOT here — the krea-2 LoRA knob rides the MOD
  // absorption (mods/loras.ts; the py interlock). compose still
  // consumes p.loras (kit.ts stackLoras); a recipe may stack its
  // own loras ahead of the caller's (recipes.ts).
  prompt: z.string().description('Prompt').extra('extra', { order: 0, group: 'prompt', columns: 2, width: 1, required: true, zone: 'params', wtype: 'textarea' }),
  negative_prompt: z.string().description('Negative Prompt').extra('extra', { order: 1, group: 'prompt', width: 1, zone: 'params', wtype: 'textarea' }),
  width: z.number().description('Width').min(256).max(2048).step(16).default(1024).extra('extra', { order: 0, group: 'resolution', columns: 3, width: 1, zone: 'params', wtype: 'number' }),
  height: z.number().description('Height').min(256).max(2048).step(16).default(1024).extra('extra', { order: 1, group: 'resolution', width: 1, zone: 'params', wtype: 'number' }),
  seed: z.number().description('Seed').step(1).default(-1).extra('extra', { order: 4, group: 'resolution', width: 1, zone: 'params' }),
  steps: z.number().description('Steps').min(1).max(100).step(1).default(8).extra('extra', samplingExtra('steps')),
  cfg: z.number().description('Guidance Scale').min(1).max(20).step(0.1).default(4.5).extra('extra', samplingExtra('cfg', { tooltip: 'How closely the diffusion follows the prompt. Higher = stricter.' })),
  sampler: SAMPLERS.description('Sampler').extra('extra', samplingExtra('sampler')),
  scheduler: SCHEDULERS.description('Scheduler').extra('extra', samplingExtra('scheduler')),
  // THE RECIPE KNOB (this stroke): a config ON the card. The enum
  // derives from the catalog (one spelling); the engine consumes
  // the key at compose — it never reaches the kit recipe. Declared
  // LAST: the ported field order above stays frozen.
  recipe: z.union(RECIPE_KEYS.map((k) => z.const(k))).description('Recipe').default(DEFAULT_RECIPE).extra('extra', { order: 5, group: 'sampling', width: 1, zone: 'params', wtype: 'select', tooltip: 'Named run config — overlays the schema + model-folder defaults and yields to your explicit values. The family rail above selects the MODEL (its recipe arrives as that model\u2019s defaults, under this one).' }),
})

export const identity = {
  label: 'Image',
  description: 'Text-to-image generation — the generate_image interface card boarding krea-2; the family declares its mods (loras) and the surface scopes itself',
  genre: 'image',
  icon: 'image',
  principles: [
    'prompt is required — an empty/whitespace prompt is rejected loud, never sampled with empty conditioning',
    'ONE param cascade, five layers (closest-to-explicit wins): schema defaults < model-folder defaults < family-rail recipe (arrives as the selected model facts row) < card recipe < your explicit values. The schema defaults are the form base; a model folder MAY carry per-model defaults (empty today — no boarded model does); scalars layer, lora stacks concat (recipe first, yours after)',
    'Sampler and scheduler option lists resolve from the ONE vocabulary (media.comfyui.sampler_vocab) — never hand-copied',
    'A preset fills untouched fields; values you have set win',
    'Mods are model-level declarations: lanpaint rides the families that declare it (anima, z-image) — input_image + lanpaint_mask switch the builder to LanPaintKSampler; loras ride krea-2 (apply on Turbo, train on Raw)',
    'Mask prep (grow/feather/threshold/invert) and outpaint pads are applied host-side before the run — no silent param drops',
  ],
}

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
      inputs: { prompt: 'text', reference_image: 'image' },
      outputs: { default: 'image' },
      requiresModel: true,
    },
    recipes: RECIPES,
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, model, g, runId) {
      if (!p.prompt || !(p.prompt as string).trim()) {
        throw new Error("required param 'prompt' missing or empty on the image-gen card (what the picture IS)")
      }
      imageT2I(p, model, g, runId)
    },
    finalize: finalizeImageGen,
  }))
}
