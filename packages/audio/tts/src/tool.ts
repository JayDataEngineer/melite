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
import { emitParamsSpec } from '@melite/comfyui-card-kit/params-emit'
import { schema, identity, BOARDED } from './card.ts'
import { largeRoute, offeredRoutes, primeFamilySeats } from './family-seats.ts'

export const TOOL_NAME = 'tts'

/** Async since the L3 cure: the knob derives from the PRESENT
 *  family seat (primeFamilySeats awaits the guarded dynamic import;
 *  a missing family package costs its route rows, never the tool
 *  face). The harness seat that builds this tool is already async
 *  (melite-tools' lane seat awaits the builder). */
export const buildTtsTool = async (call: EstateCall): Promise<ToolDefinition> => {
  await primeFamilySeats()
  // THE MODEL INPUT: the atom id plus the LIVE seat's own
  // variant/cell route values (offeredRoutes reads the DECL at
  // serve time — the plugin law's knob derivation); an absent
  // family package contributes no routes and the knob serves the
  // boarded atom alone (a CLOSED enum — the wrapper rejects
  // ''/unknown models at the seam). The unstated default composes
  // the 1.7B CustomVoice — the live large cell's route, falling to
  // the boarded atom id when the seat never filled (never
  // BOARDED[0] itself while the family serves: the head id is the
  // SMALL cell's retained route, and the large-default law says
  // ALWAYS the big model).
  const knob = [...BOARDED, ...offeredRoutes()]
  return defineCardTool(call, {
    name: TOOL_NAME,
    flow: 'tts',
    label: identity.label,
    description: identity.description,
    // Variant routes ride the same enum (agents pick no matrix
    // variant — the Base variant's compose address is how the clone
    // lane is named; the drafts door resolves route mids,
    // krea-2-raw precedent).
    parameters: emitParamsSpec(schema as never, knob) as ParameterSchemaSpec,
    defaultModel: largeRoute() ?? BOARDED[0]!,
    previewField: 'text',
  })
}
