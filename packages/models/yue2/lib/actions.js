import { requireText } from "@melite/comfyui-card-kit/facts";
/** The compose facts door: the resolved lane_inputs parsed into the
 * closed shape — a missing checkpoint refuses field-named here,
 * never composes with an empty filename.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export function parseYue2Facts(raw) {
    return { checkpoint: requireText(raw, "checkpoint", "yue2 compose") };
}
/** The compose action: YuE2-3B — CheckpointLoaderSimple on the
 * family's own file, YuE2GenerateABC planning (mode off composes no
 * planner — the engine's own off mode), YuE2GenerateMusic (its
 * seconds output sizes the latent), KSampler dpm_2/sgm_uniform at
 * cfg 1 (guidance lives on the AR side), VAEDecodeAudio,
 * SaveAudioAdvanced mp3 under <run>/music. */
export const compose = {
    id: "compose",
    inputs: [],
    outputs: [{ name: "audio", kind: "AUDIO" }],
    // THE DECLARED SURFACE (the write plane, phase 2): the music
    // card schema's own types and bounds — the family door judges
    // defaults and variant presets against this row. The mode enum is
    // the card's ABC-planning vocabulary.
    params: [
        { name: "prompt", type: "string" },
        { name: "lyrics", type: "string" },
        { name: "mode", type: "enum", options: ["full", "melody", "off"] },
        { name: "duration", type: "number", bounds: [5, 360] },
        { name: "n_diffusion_steps", type: "number", bounds: [1, 200] },
        { name: "seed", type: "number", rule: "seed-sentinel" },
    ],
    facts: parseYue2Facts,
    build({ p, facts, g, runId }) {
        // THE DEAD-KNOB REFUSAL (value-arm cure, 2026-11-08 — the music3
        // mode precedent, music3/actions.ts: the DECL surface drops the
        // knob, the build refuses the legacy draft). guidance_scale +
        // lm_cfg_scale are the MiniMax lane's vocabulary (KSampler cfg +
        // MiniMaxMusic3TextEncode cfg_scale) — the yue2 DECL serves
        // neither (index.ts params), YuE2GenerateABC/YuE2GenerateMusic
        // declare no such input, and KSampler cfg is the lane's fixed 1.
        // A stated non-default used to cross every gate and die unread
        // at compose — the SD-1 wedge (authored-on-music3, switched to
        // yue2). Refuse loud in the knob's own voice; the schema
        // default 1.7 rides (the stated default IS the unstated
        // compose), and an absent knob (direct action callers) rides.
        for (const [knob, lane] of [["guidance_scale", "KSampler cfg"], ["lm_cfg_scale", "the lyric-encoder guidance"]]) {
            const v = p[knob];
            if (v !== undefined && v !== 1.7) {
                throw new Error(`yue2 compose: ${knob} '${String(v)}' fires nothing on this lane — ` +
                    `${knob} is the MiniMax lane's vocabulary (${lane}); ` +
                    "the YuE2 nodes read style+lyrics+mode only, KSampler cfg is the lane's fixed 1. " +
                    "Drop it, or switch lane (model=music3) to steer the MiniMax guidance");
            }
        }
        const seed = p.seed;
        const ckpt = g.node("CheckpointLoaderSimple", { ckpt_name: facts.checkpoint });
        const style = p.prompt;
        const lyrics = (p.lyrics ?? "");
        const mode = (p.mode ?? "full");
        // THE PLANNING GATE: mode off composes no planner node at all —
        // GenerateMusic rides an empty abc (the engine's own off mode);
        // full/melody ride YuE2GenerateABC with the same style + lyrics.
        let abc = "";
        // Off is CARD vocabulary the node enum cannot spell (full|melody)
        // and mode is engine-REQUIRED — the off arm wires the engine's
        // own default 'full' over the EMPTY abc (the off semantics live
        // in the missing conditioning, never in a mode literal the enum
        // refuses).
        const nodeMode = mode === "off" ? "full" : mode;
        if (mode !== "off") {
            abc = g.node("YuE2GenerateABC", {
                clip: ckpt.out(1), style, lyrics, seed, mode,
                max_abc_tokens: 8192, temperature: 0.7, top_p: 0.9, top_k: 30,
                repetition_penalty: 1.005, penalty_window: 100,
            }).out(0);
        }
        const music = g.node("YuE2GenerateMusic", {
            clip: ckpt.out(1), style, lyrics, abc, seed, mode: nodeMode,
            max_duration: p.duration, temperature: 1.0, top_p: 0.95, top_k: 100,
            repetition_penalty: 1.2,
        });
        const zeroed = g.node("ConditioningZeroOut", { conditioning: music.out(0) });
        const latent = g.node("EmptyYuE2LatentAudio", { batch_size: 1, seconds: music.out(1) });
        const sampled = g.node("KSampler", {
            seed,
            steps: p.n_diffusion_steps,
            cfg: 1,
            sampler_name: "dpm_2",
            scheduler: "sgm_uniform",
            denoise: 1.0,
            latent_image: latent.out(),
            model: ckpt.out(0),
            positive: music.out(0),
            negative: zeroed.out(),
        });
        const audio = g.node("VAEDecodeAudio", { samples: sampled.out(), vae: ckpt.out(2) });
        return g.node("SaveAudioAdvanced", { audio: audio.out(), filename_prefix: `${runId}/music`, format: "mp3", "format.quality": "V0" }).out();
    },
};
//# sourceMappingURL=actions.js.map
