import { isSpell, saveAudio } from "@melite/comfyui-card-kit";
/** The audio seat: a spelled upstream output ('$name') rides its
 *  slot verbatim (the producer's AUDIO tensor); a path keeps the
 *  LoadAudio disk handoff (the upload walk stages the file into
 *  the engine input dir and the node resolves the staged leaf).
 *  @param src the stated source or reference value
 *  @param g the shared builder
 *  @returns the AUDIO handle feeding SeedVCRun's slot */
function audioSeat(src, g) {
    const s = typeof src === "string" ? src : "";
    return isSpell(s) ? s : g.node("LoadAudio", { audio: s }).out();
}
/** The convert action: SeedVCRun — the source's content re-voiced
 *  into the reference's timbre, saved under <run>/vc. */
export const convert = {
    id: "convert",
    inputs: [],
    outputs: [{ name: "audio", kind: "AUDIO" }],
    // THE DECLARED SURFACE (the write plane): the voice-change card
    // schema's own types and bounds — the family door judges defaults
    // and variant presets against this row.
    params: [
        { name: "source_audio", type: "string" },
        { name: "ref_audio", type: "string" },
        { name: "steps", type: "number", bounds: [1, 200] },
        { name: "speed", type: "number", bounds: [0.5, 2] },
        { name: "inference_cfg_rate", type: "number", bounds: [0, 1] },
        { name: "f0_condition", type: "boolean" },
        { name: "auto_f0_adjust", type: "boolean" },
        { name: "pitch_shift", type: "number", bounds: [-24, 24] },
        { name: "unload_model", type: "boolean" },
    ],
    facts: () => ({}),
    build({ p, g, runId }) {
        const converted = g.node("SeedVCRun", {
            source_audio: audioSeat(p.source_audio, g),
            ref_audio: audioSeat(p.ref_audio, g),
            steps: p.steps,
            speed: p.speed,
            inference_cfg_rate: p.inference_cfg_rate,
            f0_condition: p.f0_condition,
            auto_f0_adjust: p.auto_f0_adjust,
            pitch_shift: p.pitch_shift,
            unload_model: p.unload_model,
        }).out();
        // The audio-lane tail: SaveAudio under the run prefix (the
        // shared block owns the spelling).
        return saveAudio(g, converted, `${runId}/vc`).out();
    },
};
//# sourceMappingURL=actions.js.map
