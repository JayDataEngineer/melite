// tool.ts — the image-edit agent tool face (the DSH plane).
//
// The engine face (card.ts) registers the card in the estate
// composition; THIS face registers `image_edit` where a composing
// host provides a tools service — the dsh agent host, which has no
// in-process ComfyUI and rides the estate's ctx seats (EstateCall).
//
// Tool-plane name: image_edit (the DSH plain-name convention — the
// card id, hyphens→underscores, no suffix). Registry-row plane:
// image_edit_card (cardWireName) — two planes, two names, each
// stated once.
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
import { primeFamilySeats } from './family-seats.ts'

export const TOOL_NAME = 'image_edit'

/** The builder awaits the family-seat prime (the plugin law's tool
 *  face — the L3 cure, 2026-11-16): the model knob's closed enum
 *  rides BOARDED (the literal), but the compose door behind the
 *  execute hop reads the seats — an absent family package costs its
 *  own seat and refuses loud at the door, never here. Async is the
 *  executor battery's accepted makeTool shape (the harness awaits
 *  it). */
export const buildImageEditTool = async (call: EstateCall): Promise<ToolDefinition> => {
  await primeFamilySeats()
  return defineCardTool(call, {
    name: TOOL_NAME,
    flow: 'image-edit',
    label: identity.label,
    description: identity.description,
    // THE MODEL INPUT: the params walk synthesizes the model knob
    // from the boarded array (a CLOSED enum — the wrapper rejects
    // ''/unknown models at the seam); execute resolves the unstated
    // default itself (the DSL plane carries no defaults).
    parameters: emitParamsSpec(schema as never, BOARDED) as ParameterSchemaSpec,
    defaultModel: BOARDED[0],
    previewField: 'prompt',
  })
}
