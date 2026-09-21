// tool.ts — the tts agent tool face (the DSH plane).
//
// The engine face (card.ts) registers the card in the estate
// composition; THIS face registers `tts` where a composing host
// provides a tools service — the dsh agent host, which has no
// in-process ComfyUI and rides the estate's ctx seats (EstateCall).
//
// Tool-plane name: tts (the DSH plain-name convention — the card
// id, hyphens→underscores, no suffix). Registry-row plane: tts_card
// (cardWireName) — two planes, two names, each stated once.
//
// THE SKELETON LIVES IN THE BUILDER (roadmap §13, the audio-cards
// DRY audit 2026-09-20): @melite/estate-call/cardTool owns the
// flow-envelope schema, the two-door execute (drafts → start + the
// {model:} lift), the GatewayError mapping, and every presentation
// projection. This face owns ONLY the card's own seams — the
// emitted params spec, the identity prose, and the preview field
// (text — the card's driving knob; the template's a.prompt was a
// music-card copy this schema never carried, fixed 2026-09-12).
import type { ToolDefinition, ParameterSchemaSpec } from '@deepseek-ai/dsh-tools'
import { defineCardTool } from '@melite/estate-call/cardTool'
import type { EstateCall } from '@melite/estate-call'
import { emitParamsSpec } from '@melite/comfyui-cordis/params-emit'
import { schema, identity, BOARDED, VARIANT_ADDRESSES } from './card.ts'

export const TOOL_NAME = 'tts'

export const buildTtsTool = (call: EstateCall): ToolDefinition =>
  defineCardTool(call, {
    name: TOOL_NAME,
    flow: 'tts',
    label: identity.label,
    description: identity.description,
    // THE MODEL INPUT: the params walk synthesizes the model knob
    // from the boarded array (a CLOSED enum — the wrapper rejects
    // ''/unknown models at the seam); execute resolves the unstated
    // default itself (the DSL plane carries no defaults). Variant
    // routes ride the same enum (agents pick no matrix variant —
    // the Base variant's compose address is how the clone lane is
    // named; the drafts door resolves route mids, krea-2-raw
    // precedent).
    parameters: emitParamsSpec(schema as never, [...BOARDED, ...VARIANT_ADDRESSES]) as ParameterSchemaSpec,
    defaultModel: BOARDED[0],
    previewField: 'text',
  })
