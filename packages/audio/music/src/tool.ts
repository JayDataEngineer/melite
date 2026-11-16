// tool.ts — the music agent tool face (the DSH plane).
//
// The engine face (card.ts) registers the card in the estate
// composition; THIS face registers `music` where a composing host
// provides a tools service — the dsh agent host, which has no
// in-process ComfyUI and rides the estate's ctx seats (EstateCall).
//
// Tool-plane name: music (the DSH plain-name convention — the
// card id, hyphens→underscores, no suffix). Registry-row plane:
// music_card (cardWireName) — two planes, two names, each stated
// once.
//
// THE SKELETON LIVES IN THE BUILDER (roadmap §13, the audio-cards
// DRY audit 2026-09-20): @melite/estate-call/cardTool owns the
// flow-envelope schema, the two-door execute (drafts → start + the
// {model:} lift), the GatewayError mapping, and every presentation
// projection. This face owns ONLY the card's own seams — the
// emitted params spec, the identity prose, and the preview field.
import type { ToolDefinition, ParameterSchemaSpec } from '@deepseek-ai/dsh-tools'
import { defineCardTool } from '@melite/estate-call/cardTool'
import type { EstateCall } from '@melite/estate-call'
import { emitParamsSpec } from '@melite/comfyui-card-kit/params-emit'
import { schema, identity, BOARDED } from './card.ts'
import { boardedModels, primeFamilySeats } from './family-seats.ts'

export const TOOL_NAME = 'music'

/** Async since the L3 cure: the knob derives from the PRESENT
 *  family seats (primeFamilySeats awaits the guarded dynamic
 *  imports; a missing family package costs its own enum row, never
 *  the tool face). The harness seat that builds this tool is
 *  already async (melite-tools' lane seat awaits the builder). */
export const buildMusicTool = async (call: EstateCall): Promise<ToolDefinition> => {
  await primeFamilySeats()
  // The knob: the PRESENT families' ids, falling back to the
  // BOARDED literal when no family package is installed (the enum
  // serves the ids; the run refuses loud at the model seat — the
  // image-gen fallback law).
  const knob = boardedModels().length > 0 ? boardedModels() : [...BOARDED]
  return defineCardTool(call, {
    name: TOOL_NAME,
    flow: 'music',
    label: identity.label,
    description: identity.description,
    // THE MODEL INPUT: the params walk synthesizes the model knob
    // from the boarded list (a CLOSED enum — the wrapper rejects
    // ''/unknown models at the seam); execute resolves the unstated
    // default itself (the DSL plane carries no defaults).
    parameters: emitParamsSpec(schema as never, knob) as ParameterSchemaSpec,
    defaultModel: knob[0]!,
    previewField: 'prompt',
  })
}
