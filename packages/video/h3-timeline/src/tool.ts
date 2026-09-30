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
// params + THIS plane's own `calls` and `audio_clips` JSON nodes (the
// item shapes are documented in the descriptions, the laws are the
// card gate's at execute time), and the shot-count preview. The shared
// builder unwraps both JSON-array params before either estate door.
import type { ToolDefinition, ParameterSchemaSpec } from '@deepseek-ai/dsh-tools'
import { defineCardTool } from '@melite/estate-call/cardTool'
import type { EstateCall } from '@melite/estate-call'
import { emitParamsSpec } from '@melite/comfyui-cordis/params-emit'
import { carrier, identity, BOARDED, VARIANT_ADDRESSES, JSON_ARRAY_PARAMS } from './card.ts'
import { SEAM_OVERLAP_FRAMES } from '@melite/models-h3/timelineContract'

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
        description: `Shots — one per film shot: [{ text, start_frame, end_frame, image?, transition?, refs?, knobs? }] and nothing else (an undeclared per-call key is refused by name). CALLS TILE: every call's start_frame must equal the previous call's end_frame — no gaps, no overlaps. A window renders 22+17k frames, so spans are NOT interchangeable: the FIRST call and any "transition":"cut" call must author a 22+17f span (56, 73, 90, 107, 124 ...), while a carried later call must author a 17f span (17, 34, 51, 68, 119 ...) because its ${SEAM_OVERLAP_FRAMES}-frame seam comes from the generation head rather than the span. An off-grid span is refused with the nearest legal frame, never silently re-framed. Spans are ints (end > start); the seam is automatic (drift-control carry at ${SEAM_OVERLAP_FRAMES} frames); transition "cut" = independent window, nothing carries. There is NO per-call audio — spoken lines ride audio_clips.`,
      },
      audio_clips: {
        type: 'json',
        description: 'Audio layers on the film timeline: [{ id, name, src, start_frame, dur_frames, class?, text? }]. src = an asset URL (e.g. /melite-media/runs/<run>/tts/line.flac) or path; start_frame/dur_frames place it in doc time (call-span coordinates: the card seats each row on the film, reconciling seam trims, so a row always lands on the picture it was written against). class = dialogue | sfx | music (omit for auto: text -> dialogue, else music). text = THE SPOKEN WORDS, exact and unabridged — they ride the owning window prompt as a timed <d> dialogue tag (the lip-sync law: audio refs supply the voice, the words move the mouth). sfx text = the timed event (rides overall_soundscape at its onset — the model hears the blast and times the visual); music text = the description (rides non_diegetic_music). Every class runs the same machinery: stamp -> pin into one of the model 3 audio inputs -> prompt field -> pristine overlay; only the field and the duck relationships differ (music ducks under dialogue+sfx; the generated track ducks under every pin). A clip crossing a window seam stamps BOTH windows (the line continues, never restarts). One lane per CLASS per window — first qualifying clip owns it. THE DOOR GUARD: a music-stamped window carries no bed slice; a dialogue/sfx-stamped window mutes ref audios — pinned windows own their audio conditioning, no accidental overlap. The generated voice ducks -14dB under each conditioned clip. Clips require a FILM (2+ calls).',
      },
    } as ParameterSchemaSpec,
    defaultModel: BOARDED[0],
    jsonArrayParams: JSON_ARRAY_PARAMS,
    previewValue: (a) => `shots=${Array.isArray(a.calls) ? (a.calls as unknown[]).length : 0}`,
  })
