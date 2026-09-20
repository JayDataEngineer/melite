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
import { emitParamsSpec } from '@melite/comfyui-cordis/params-emit'
import { schema, identity, BOARDED } from './card.ts'
import { TOOL_NAME } from './wire.ts'

export const buildImageGenTool = (call: EstateCall): ToolDefinition =>
  defineCardTool(call, {
    name: TOOL_NAME,
    flow: 'image-gen',
    label: identity.label,
    description: identity.description,
    // THE MODEL INPUT: the params walk synthesizes the model knob
    // from the boarded array (a CLOSED enum — the wrapper rejects
    // ''/unknown models at the seam); execute resolves the unstated
    // default itself (boarded[0] — the same law the tool row's
    // model field and the walk's synthesized default ride; one
    // spelling).
    parameters: emitParamsSpec(schema as never, BOARDED) as ParameterSchemaSpec,
    defaultModel: BOARDED[0],
    previewField: 'prompt',
  })
