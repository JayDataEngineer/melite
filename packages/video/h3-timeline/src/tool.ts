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
import { emitParamsSpec } from '@melite/comfyui-card-kit/params-emit'
import { identity, BOARDED, VARIANT_ADDRESSES } from './card.ts'
import { primeFamilySeats, requireSeat } from './family-seats.ts'

export const TOOL_NAME = 'h3_timeline'

/** Build the h3_timeline agent tool over an estate call: the card
 *  carrier's declared params plus this plane's calls/audio_clips JSON
 *  nodes, wrapped by the shared card-tool builder (the drafts door,
 *  the {model:} lift, and the presentation projections it owns).
 *  THE PARAM SURFACE IS FAMILY VOCABULARY (the plugin law,
 *  2026-11-16): the carrier, the JSON-array list, and the seam-law
 *  prose ride the family seat — the builder primes and requires it,
 *  so an absent @melite/models-h3 refuses loud naming the package
 *  (the tool has no param surface of its own to degrade to).
 * @param call the estate call seat the tool's doors ride
 * @returns the tool definition a tools service registers */
export const buildH3TimelineTool = async (call: EstateCall): Promise<ToolDefinition> => {
  await primeFamilySeats()
  // `carrier` IS the family paramSchema (one object, two names on
  // the family's schema face) — the seat serves it once.
  const seat = requireSeat('h3-timeline', 'agent tool param surface')
  const seam = seat.seamOverlapFrames
  return defineCardTool(call, {
    name: TOOL_NAME,
    flow: 'h3-timeline',
    label: identity.label,
    description: identity.description,
    // THE MODEL INPUT: the params walk synthesizes the model knob
    // from the boarded array (a CLOSED enum — the wrapper rejects
    // ''/unknown models at the seam); execute resolves the unstated
    // default itself (the DSL plane carries no defaults). Variant
    // routes ride the same enum (the TTS fold pattern): agents pick
    // no matrix variant — the lane's own compose address (h3,
    // h3-timeline) stays agent-reachable; the folded single-shot and
    // keyframe routes retired 2026-11-02 with the recipe rework
    // (one lane, three recipes: draft / standard / final).
    parameters: {
      ...emitParamsSpec(seat.paramSchema as never, [...BOARDED, ...VARIANT_ADDRESSES]),
      calls: {
        type: 'json',
        required: true,
        description: `Shots — one per film shot: [{ text, start_frame, end_frame, image?, transition?, refs?, knobs?, resolution? }] and nothing else (an undeclared per-call key is refused by name). CALLS TILE: every call's start_frame must equal the previous call's end_frame — no gaps, no overlaps. A window renders 22+17k frames, so spans are NOT interchangeable: the FIRST call authors a 22+17f span (56, 73, 90, 107, 124 ...), while a carried later call authors a 17f span (17, 34, 51, 68, 119 ...) because its ${seam}-frame seam comes from the generation head rather than the span. SNAP ADMISSION: a legal span admits verbatim; an off-grid span of 24 frames or more snaps its END UP to the next legal rung (a 39f tail after 124 renders 124→175 — the run's status warns with both numbers, never a silent re-frame); under 24 frames or past 362 refuses with the nearest legal span. Optional per-call resolution = 480p | 576p | 720p | 1080p (default: the doc's own tier; a draft pin without one renders 480p — cheap authoring passes, the film law unchanged). A SINGLE call plus audio_clips still renders THE FILM CHAIN — the card promotes it with a silent 51-frame tail window, so the strip and the film agree; the promotion warns on run status. Spans are ints (end > start). THE SEAM LAW: context carry is THE DEFAULT (omit transition) — the latent tail continues across the seam at ${seam} frames; transition 'carry+keyframe' = the carry PLUS the previous window's final frame pinned as this window's first frame (a gen-side image anchor for more consistent shots). NEVER author transition 'cut' — H3 hard-cuts on its own when a shot must start fresh; stock is the operator's manual escape hatch in the strip, never a parameter. There is NO per-call audio — spoken lines ride audio_clips.`,
      },
      speech_language: {
        type: 'string',
        description: 'The language tag spoken <d> lines carry (default "English"). Stamps the dialogue tag as <d>[English …</d> so the lip-sync hears the right phonology; the filmAdmissionNotices map names it back when a silent window trips the speech law. Any tag ≤24 chars ("English", "German", "Mandarin") — the words themselves stay verbatim in audio_clips text.',
      },
      draft: {
        type: 'boolean',
        description: 'The authoring pin: true renders every call with no per-call resolution at 480p (draft:true→480p is the compose\'s own pin law). Pair with dry_run to iterate a whole shot list cheap, then one final press unpinned for the real tiers.',
      },
      dry_run: {
        type: 'boolean',
        description: 'Press WITHOUT paying: the body rides the validate arm — the FULL compose ladder (schema walk, prompt gate, band judges, span admission) runs, the graph drops at the far end. Zero GPU, zero mint: no draft lands on the bench. Green answers {status: "validated"}; a refusal answers its string verbatim (same voice a real press would refuse with). Author whole shot lists dry first; the span snaps and the silent-tail promotion warn here too (run status carries them after a real press).',
      },
      audio_clips: {
        type: 'json',
        description: 'Audio layers on the film timeline: [{ id, name, src, start_frame, dur_frames, class?, text? }]. src = an asset URL (e.g. /melite-media/runs/<run>/tts/line.flac), a path, OR a $spell naming a wired stage input — the spelled soundtrack rides the graph in every run form (overlay-only clips seat on the film mix\'s wired_audio_1..4; a clip that conditions a window slices through MeliteAudioTensorSlice; on the bench the wire needs the row\'s hand-written expected kind, e.g. {"line1": "audio"}). start_frame/dur_frames place it in doc time (call-span coordinates: the card seats each row on the film, reconciling seam trims, so a row always lands on the picture it was written against). Optional in_frames = the SOURCE in-point (where in the file the clip starts, doc frames; omit/0 = play from the head — the conditioning slice AND the pristine overlay both start there, so one long TTS take can contribute its middle: two rows, same src, different in_frames). class = dialogue | sfx | music (omit for auto: text -> dialogue, else music). text = THE SPOKEN WORDS, exact and unabridged — they ride the owning window prompt as a timed <d> dialogue tag (the lip-sync law: audio refs supply the voice, the words move the mouth). sfx text = the timed event (rides overall_soundscape at its onset — the model hears the blast and times the visual); music text = the description (rides non_diegetic_music). Every class runs the same machinery: stamp -> pin into one of the model 3 audio inputs -> prompt field -> pristine overlay; only the field and the duck relationships differ (music ducks under dialogue+sfx; the generated track ducks under every pin). A clip crossing a window seam stamps BOTH windows (the line continues, never restarts) — but it YIELDS to a clip that starts inside that window. One lane per CLASS per window, owned by POSITION: the clip that STARTS inside the window wins its class lane; a crosser keeps the lane only when no same-class clip starts there; two same-class clips starting inside one window refuse loud (end the first inside the window, merge the rows, or move the seam). THE DOOR GUARD: a music-stamped window carries no bed slice; a dialogue/sfx-stamped window mutes ref audios — pinned windows own their audio conditioning, no accidental overlap. The generated voice ducks -14dB under each conditioned clip. Clips require a FILM (2+ calls).',
      },
      prompt_waivers: {
        type: 'json',
        description: 'Prompt-gate waivers: ["RULE-ID"] — the refused-by-default rules this press names to pass (the gate at compose/press refuses caption-grade call text by rule id with the dictionary\'s message; see the prompt-writing skill). A named waiver passes the press AND is recorded on the run receipt with the rule id and the message it overrode — never silent. Read the card:h3-timeline:prompt-writing skill before waiving: the rules are the craft (density floor 90 words, the four elements, the closed camera list, rows-not-prose dialogue), and a waiver is an operator decision, never a default.',
      },
    } as ParameterSchemaSpec,
    defaultModel: BOARDED[0],
    jsonArrayParams: seat.jsonArrayParams,
    previewValue: (a) => `shots=${Array.isArray(a.calls) ? (a.calls as unknown[]).length : 0}`,
  })
}
