// tool.ts — the image-gen agent tool face (the DSH plane).
//
// The engine face (card.ts) registers the card in the estate
// composition; THIS face registers `image_gen` where a composing
// host provides a tools service — the dsh agent host, which has no
// in-process ComfyUI and rides the estate's ctx seats (EstateCall).
//
// Tool-plane name: image_gen (the DSH plain-name convention — the
// card id, hyphens→underscores, no suffix; owned by wire.ts — the
// registry row and the tool face share one spelling). Registry-row
// plane: image_gen_card (cardWireName) — two planes, two names.
//
// THE RECIPE INPUT: a config ON the card — the enum rides the
// schema (one walk), the key travels inside the stage params, and
// the card's compose consumes it at the one merge point.
//
// THE SKELETON LIVES IN THE BUILDER (roadmap §13, the audio-cards
// DRY audit 2026-09-20): @melite/estate-call/cardTool owns the
// flow-envelope schema, the two-door execute (drafts → start + the
// {model:} lift), the GatewayError mapping, and every presentation
// projection. This face owns ONLY the card's own seams.
import type { ToolDefinition, ParameterSchemaSpec } from '@deepseek-ai/dsh-tools'
import { defineCardTool } from '@melite/estate-call/cardTool'
import type { EstateCall } from '@melite/estate-call'
import { emitParamsSpec } from '@melite/comfyui-card-kit/params-emit'
import { schema, identity, BOARDED } from './card.ts'
import { primeFamilySeats, semanticModels } from './family-seats.ts'
import { resolveSemanticModel } from '@melite/comfyui-card-kit/semanticModelKnob'
import { TOOL_NAME } from './wire.ts'

/** Async since the L3 cure: the knob derives from the PRESENT
 *  family seats (primeFamilySeats awaits the guarded dynamic
 *  imports; a missing family package costs its own entries, never
 *  the tool face). The harness seat that builds this tool is
 *  already async (melite-tools index.ts's lane seat). */
export const buildImageGenTool = async (call: EstateCall): Promise<ToolDefinition> => {
  await primeFamilySeats()
  const models = semanticModels()
  return defineCardTool(call, {
    name: TOOL_NAME,
    flow: 'image-gen',
    label: identity.label,
    description: identity.description,
    // THE MODEL INPUT: the params walk synthesizes the model knob
    // from the served style enum (entries derived from the PRESENT
    // families' variant rows — a CLOSED enum the wrapper rejects
    // ''/unknown values against at the seam); execute resolves the
    // unstated default itself (models[0].value — the same
    // spelling the walk's synthesized default rides; one source).
    parameters: emitParamsSpec(
      schema as never, BOARDED, models,
    ) as ParameterSchemaSpec,
    // the unstated default is the SAME pick the served enum defaults
    // to — the style value itself, folded to its route by the same
    // resolver sent values ride; the envelope echoes the style. An
    // estate with NO family package installed falls to BOARDED[0]
    // (the knob serves the id; the run refuses at the model seat).
    defaultModel: models[0] === undefined
      ? BOARDED[0]
      : models[0].value,
    resolveModel: (v: string): string => resolveSemanticModel([...models], v)?.route ?? v,
    previewField: 'prompt',
  })
}
