import { defineCardTool } from '@melite/estate-call/cardTool';
import { emitParamsSpec } from '@melite/comfyui-card-kit/params-emit';
import { carrier, identity, BOARDED, VARIANT_ADDRESSES, JSON_ARRAY_PARAMS } from "./card.js";
import { SEAM_OVERLAP_FRAMES } from '@melite/models-h3/timelineContract';
export const TOOL_NAME = 'h3_timeline';
/** Build the h3_timeline agent tool over an estate call: the card
 *  carrier's declared params plus this plane's calls/audio_clips JSON
 *  nodes, wrapped by the shared card-tool builder (the drafts door,
 *  the {model:} lift, and the presentation projections it owns).
 * @param call the estate call seat the tool's doors ride
 * @returns the tool definition a tools service registers */
export const buildH3TimelineTool = (call) => defineCardTool(call, {
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
        ...emitParamsSpec(carrier, [...BOARDED, ...VARIANT_ADDRESSES]),
        calls: {
            type: 'json',
            required: true,
            description: `Shots — one per film shot: [{ text, start_frame, end_frame, image?, transition?, refs?, knobs? }] and nothing else (an undeclared per-call key is refused by name). CALLS TILE: every call's start_frame must equal the previous call's end_frame — no gaps, no overlaps. A window renders 22+17k frames, so spans are NOT interchangeable: the FIRST call authors a 22+17f span (56, 73, 90, 107, 124 ...), while a carried later call authors a 17f span (17, 34, 51, 68, 119 ...) because its ${SEAM_OVERLAP_FRAMES}-frame seam comes from the generation head rather than the span. An off-grid span is refused with the nearest legal frame, never silently re-framed. Spans are ints (end > start). THE SEAM LAW: context carry is THE DEFAULT (omit transition) — the latent tail continues across the seam at ${SEAM_OVERLAP_FRAMES} frames; transition 'carry+keyframe' = the carry PLUS the previous window's final frame pinned as this window's first frame (a gen-side image anchor for more consistent shots). NEVER author transition 'cut' — H3 hard-cuts on its own when a shot must start fresh; stock is the operator's manual escape hatch in the strip, never a parameter. There is NO per-call audio — spoken lines ride audio_clips.`,
        },
        audio_clips: {
            type: 'json',
            description: 'Audio layers on the film timeline: [{ id, name, src, start_frame, dur_frames, class?, text? }]. src = an asset URL (e.g. /melite-media/runs/<run>/tts/line.flac), a path, OR a $spell naming a wired stage input — the spelled soundtrack rides the graph in every run form (overlay-only clips seat on the film mix\'s wired_audio_1..4; a clip that conditions a window slices through MeliteAudioTensorSlice; on the bench the wire needs the row\'s hand-written expected kind, e.g. {"line1": "audio"}). start_frame/dur_frames place it in doc time (call-span coordinates: the card seats each row on the film, reconciling seam trims, so a row always lands on the picture it was written against). Optional in_frames = the SOURCE in-point (where in the file the clip starts, doc frames; omit/0 = play from the head — the conditioning slice AND the pristine overlay both start there, so one long TTS take can contribute its middle: two rows, same src, different in_frames). class = dialogue | sfx | music (omit for auto: text -> dialogue, else music). text = THE SPOKEN WORDS, exact and unabridged — they ride the owning window prompt as a timed <d> dialogue tag (the lip-sync law: audio refs supply the voice, the words move the mouth). sfx text = the timed event (rides overall_soundscape at its onset — the model hears the blast and times the visual); music text = the description (rides non_diegetic_music). Every class runs the same machinery: stamp -> pin into one of the model 3 audio inputs -> prompt field -> pristine overlay; only the field and the duck relationships differ (music ducks under dialogue+sfx; the generated track ducks under every pin). A clip crossing a window seam stamps BOTH windows (the line continues, never restarts) — but it YIELDS to a clip that starts inside that window. One lane per CLASS per window, owned by POSITION: the clip that STARTS inside the window wins its class lane; a crosser keeps the lane only when no same-class clip starts there; two same-class clips starting inside one window refuse loud (end the first inside the window, merge the rows, or move the seam). THE DOOR GUARD: a music-stamped window carries no bed slice; a dialogue/sfx-stamped window mutes ref audios — pinned windows own their audio conditioning, no accidental overlap. The generated voice ducks -14dB under each conditioned clip. Clips require a FILM (2+ calls).',
        },
    },
    defaultModel: BOARDED[0],
    jsonArrayParams: JSON_ARRAY_PARAMS,
    previewValue: (a) => `shots=${Array.isArray(a.calls) ? a.calls.length : 0}`,
});
//# sourceMappingURL=tool.js.map