// tool.ts — the h3-timeline agent tool face (the DSH plane).
//
// The engine face (card.ts) registers the card in the estate
// composition; THIS face registers `h3_timeline` where a composing
// host provides a tools service — the dsh agent host, which has no
// in-process ComfyUI and rides the estate's ctx seats (EstateCall).
//
// Tool-plane name: h3_timeline (the DSH plain-name convention — the
// card id, hyphens→underscores, no suffix). Registry-row plane:
// h3_timeline_card (cardWireName) — two planes, two names.
//
// THE SKELETON LIVES IN THE BUILDER (roadmap §13, the audio-cards
// DRY audit 2026-09-20): @melite/estate-call/cardTool owns the
// flow-envelope schema, the two-door execute (drafts → start + the
// {model:} lift), the GatewayError mapping, and every presentation
// projection. This face owns ONLY the card's own seams: the carrier
// params + THIS plane's own `calls` SHOTS node (the DSL's lossless
// json node — the item shape is documented in the description, the
// laws are the card gate's at execute time), and the shot-COUNT
// preview (calls may be the array OR its serialized JSON string —
// the annotation-only json param accepts both).
import type { ToolDefinition, ParameterSchemaSpec } from '@deepseek-ai/dsh-tools'
import { defineCardTool } from '@melite/estate-call/cardTool'
import type { EstateCall } from '@melite/estate-call'
import { emitParamsSpec } from '@melite/comfyui-cordis/params-emit'
import { carrier, identity, BOARDED, VARIANT_ADDRESSES } from './card.ts'

export const TOOL_NAME = 'h3_timeline'

export const buildH3TimelineTool = (call: EstateCall): ToolDefinition =>
  defineCardTool(call, {
    name: TOOL_NAME,
    flow: 'h3-timeline',
    label: identity.label,
    description: identity.description,
    // THE MODEL INPUT: the params walk synthesizes the model knob
    // from the boarded array (a CLOSED enum — the wrapper rejects
    // ''/unknown models at the seam); execute resolves the unstated
    // default itself (the DSL plane carries no defaults). Variant
    // routes ride the same enum (the TTS fold pattern): agents pick
    // no matrix variant — the folded lanes' compose addresses (h3,
    // h3-ref2va, h3-timeline-ref, h3-keyframe) keep the single-shot
    // + keyframe lanes agent-reachable; the drafts door resolves
    // route mids through the facts rows.
    parameters: {
      ...emitParamsSpec(carrier as never, [...BOARDED, ...VARIANT_ADDRESSES]),
      calls: {
        type: 'json',
        required: true,
        description: 'Shots — one per film shot: [{ text, start_frame, end_frame, image?, transition?, refs?, audio? }]. Spans are ints (end > start); the seam is automatic (drift-control carry at 22 frames); transition "cut" = independent window, nothing carries.',
      },
    } as ParameterSchemaSpec,
    defaultModel: BOARDED[0],
    previewValue: (a) => `shots=${Array.isArray(a.calls) ? (a.calls as unknown[]).length : 0}`,
    // JSON-TYPED params arrive as the RAW STRING (DSH tool law) and
    // the card gate wants the ARRAY (card.ts — a string calls reads
    // as "no calls to compose"). Normalize the shots both ways:
    // native array senders pass through, string senders (the LLM
    // serializer's default) unwrap here. Live-lane receipt
    // 2026-09-12: a legal chat call refused on exactly this seam.
    prepare(params) {
      if (typeof params['calls'] === 'string') {
        try {
          const parsed: unknown = JSON.parse(params['calls'] as string)
          if (Array.isArray(parsed)) params['calls'] = parsed
        } catch {
          // a malformed string rides on — the card gate refuses with
          // its own named error.
        }
      }
    },
  })
