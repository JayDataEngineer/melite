// recipes.ts — the image-gen recipe catalog.
//
// THE LAW (operator, 2026-09-09): recipes are CONFIGS ON THE CARD —
// named override sets that can carry mod payloads — serializable
// JSON the card consumes. They are NOT model facts and NOT
// variants (variants are the model-build matrix: Variant/Quant
// cells carrying checkpoint routes).
//
// THE RECEIPT (dsh's own default+switching worked example,
// packages/core/agent-default-model, read in full): a Schemastery
// config declares the selection; layered data resolves. The
// cascade order is the settings subsystem's documented one
// (settings.md: "schema defaults, then base, then the user layer")
// with the estate's two middle layers named — the family rail
// feeds through the selected model's facts row, the card recipe
// is the run's own base layer:
//
//     schema defaults < model-folder defaults < family recipe
//       (as model defaults) < card recipe < explicit args
//
// Scalars layer (a stated arg beats everything above it); the lora stack
// CONCATs (recipe stack first, the caller's after — stacking
// semantics). The engine's compose applies this at its one merge
// point; THIS MODULE IS DATA ONLY.
import type { CardRecipe } from '@melite/comfyui-cordis/service'

/** The catalog. The schema's recipe enum derives from these keys —
 *  one spelling (a key the catalog does not carry cannot pass the
 *  schema's enum validation). */
export const RECIPES: Readonly<Record<string, CardRecipe>> = {
  standard: {
    label: 'Standard',
    description: 'The schema defaults as authored — no overlay.',
    params: {},
  },
  fast_draft: {
    label: 'Fast Draft',
    description: 'Quick low-step iteration for composition sketching.',
    params: { steps: 6, cfg: 3.5 },
  },
  cinematic: {
    label: 'Cinematic',
    description: 'High-contrast moody rendering with a deepened negative prompt.',
    params: { steps: 12, cfg: 6, negative_prompt: 'flat lighting, low contrast, snapshot' },
  },
}

/** The enum row for the schema (the Schemastery closed-vocabulary
 *  idiom — z.union of z.const, the SAMPLERS/SCHEDULERS shape). */
export const RECIPE_KEYS: readonly string[] = Object.keys(RECIPES)

/** The composition base (what an unstated recipe resolves to). */
export const DEFAULT_RECIPE = 'standard'
