import { AUDIACORE_TTS_AUTOFILL, loadAudiocore, saveAudio, } from "@melite/comfyui-card-kit";
import { requireText } from "@melite/comfyui-card-kit/facts";
/** The sfx facts door: the resolved lane_inputs parsed into the
 * closed shape — a missing model_path refuses field-named here,
 * never composes a LoadAudiocoreModel on an empty directory.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export function parseSfxFacts(raw) {
    return { model_path: requireText(raw, "model_path", "moss-sfx sfx") };
}
/** The sfx action: MOSS-SoundEffect — LoadAudiocoreModel on the
 * family's own path + variant extras, AudiocoreTTS mode tts on the
 * prompt with the autofill pin, SaveAudio under <run>/sfx. */
export const sfx = {
    id: "sfx",
    inputs: [],
    outputs: [{ name: "audio", kind: "AUDIO" }],
    // THE DECLARED SURFACE (the write plane, phase 2): the sfx
    // card schema's own types and bounds — the family door judges
    // defaults and variant presets against this row.
    params: [
        { name: "prompt", type: "string" },
        { name: "duration", type: "number", bounds: [0.5, 300] },
        { name: "guidance_scale", type: "number", bounds: [0, 20] },
        { name: "n_diffusion_steps", type: "number", bounds: [1, 500] },
        { name: "seed", type: "number", rule: "seed-sentinel" },
    ],
    facts: parseSfxFacts,
    build({ p, model, g, runId }) {
        const seed = p.seed;
        const loaded = loadAudiocore(g, model);
        const synth = g.node("AudiocoreTTS", {
            ...AUDIACORE_TTS_AUTOFILL,
            model: loaded,
            prompt: p.prompt.trim(),
            mode: "tts",
            guidance_scale: p.guidance_scale,
            num_inference_steps: p.n_diffusion_steps,
            duration_seconds: p.duration,
            seed,
        });
        return saveAudio(g, synth.out(), `${runId}/sfx`).out();
    },
};
//# sourceMappingURL=actions.js.map
