import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx.
 *
 * THE LAYER A/B LAW REWORK (2026-09-17): the RUN-LEVEL identity
 * refs panel is GONE — refs are PER-CALL (a call's SourceRow group
 * in CallCard); nothing at run level ever staged them. What remains
 * is the legitimate Layer A NLE concept: the positioned AUDIO CLIPS
 * bed (the Music row). THE DIALOGUE HALF (2026-09-21): a clip that
 * spans a window CONDITIONS that window (the model hears it — the
 * lip-sync lane, one of the 3 audio lanes; a full bus refuses loud
 * at compose), mixes over the final cut at film time (the audible
 * authority), and ducks the generated voice under the real clip.
 * Music-only clips (no window overlap) overlay clean, no lane.
 */
import { Button, Input } from "@deepseek-ai/dsh-client-ui-primitives";
import s from "./studio.module.css";
/** Layer A rail: the audio-clips upload door (3189–3315, refs cut) +
 * THE LANE INSPECTOR (2026-09-22): every clip's lane and words/event
 * text — the authored half of the D-M-E law (the text is what tells
 * the model WHAT the audio is; the pin is the other half). */
export function RunRefsClips({ layerA, updateAudioClip, deleteAudioClip, }) {
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: s.clipsRow, children: [_jsx("span", { className: s.clipsTitle, children: "Clips" }), _jsx("span", { className: s.clipsNote, children: layerA.audio_clips?.length
                            ? `${layerA.audio_clips.length} clip${layerA.audio_clips.length === 1 ? "" : "s"} on the audio lanes — drag to move, × to remove`
                            : "none — add from a lane's ⤴ in the timeline, or drop a file on any lane" }), _jsx("span", { className: s.clipsHint, "data-testid": "tl-clips-lane-hint", children: "pinned windows own their audio: music clip \u21D2 no bed there \u00B7 dialogue/sfx clip \u21D2 ref audios mute there \u2014 no accidental overlap" })] }), (layerA.audio_clips?.length ?? 0) > 0 && (_jsxs("div", { className: s.laneInspector, "data-testid": "tl-lane-inspector", children: [_jsx("span", { className: s.clipsTitle, children: "Lanes \u2014 words & events" }), (layerA.audio_clips).map((c) => {
                        const cls = c.class ?? (c.text ? "dialogue" : "music");
                        return (_jsxs("div", { className: s.laneRow, "data-testid": "tl-lane-row", "data-clip": c.name, "data-lane": cls, children: [_jsx("span", { className: s.laneName, title: c.src, children: c.name }), _jsxs("select", { className: s.laneSelect, "data-testid": "tl-lane-class", value: cls, onChange: (e) => updateAudioClip(c.id, { class: e.target.value }), children: [_jsx("option", { value: "dialogue", children: "Dialogue" }), _jsx("option", { value: "music", children: "Music" }), _jsx("option", { value: "sfx", children: "SFX" })] }), _jsx(Input, { className: s.laneText, "data-testid": "tl-lane-text", type: "text", placeholder: cls === "dialogue"
                                        ? "the exact spoken words (verbatim, unabridged — they move the mouth)"
                                        : cls === "sfx"
                                            ? "the event the soundscape times (e.g. a sudden explosion rocks the room)"
                                            : "music description (rides non_diegetic_music)", value: c.text ?? "", onChange: (e) => updateAudioClip(c.id, { text: e.target.value }) }), _jsx(Button, { variant: "ghost", className: s.laneDelete, "data-testid": "tl-lane-delete", title: "remove the clip", onClick: () => deleteAudioClip(c.id), children: "\u00D7" })] }, c.id));
                    })] }))] }));
}
//# sourceMappingURL=RunRefsClips.js.map
