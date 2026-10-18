import { requireText } from "@melite/comfyui-card-kit/facts";
/** The compose facts door: the resolved lane_inputs parsed into the
 * closed shape — a missing weight refuses field-named here, never
 * composes with an empty filename.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export function parseMusicFacts(raw) {
    const text = (key) => requireText(raw, key, "music3 compose");
    return { unet: text("unet"), text_encoder: text("text_encoder"), clip_type: text("clip_type"), vae: text("vae") };
}
/** The compose action: MiniMax Music 3 — UNET/CLIP/VAE loaders from
 * the family's own weights, MiniMaxMusic3TextEncode on the caption
 * + lyrics, KSampler euler/simple over the empty music latent,
 * VAEDecodeAudio, SaveAudioAdvanced mp3 under <run>/music. */
export const compose = {
    id: "compose",
    inputs: [],
    outputs: [{ name: "audio", kind: "AUDIO" }],
    // THE DECLARED SURFACE (the write plane, phase 2): the music
    // card schema's own types and bounds — the family door judges
    // defaults and variant presets against this row.
    params: [
        { name: "prompt", type: "string" },
        { name: "lyrics", type: "string" },
        { name: "duration", type: "number", bounds: [5, 360] },
        { name: "guidance_scale", type: "number", bounds: [0.1, 10] },
        { name: "lm_cfg_scale", type: "number", bounds: [0.1, 10] },
        { name: "n_diffusion_steps", type: "number", bounds: [1, 200] },
        { name: "seed", type: "number", rule: "seed-sentinel" },
    ],
    facts: parseMusicFacts,
    build({ p, facts, g, runId }) {
        // THE DEAD-KNOB REFUSAL (value-arm cure, 2026-11-08): mode is the
        // YuE2 ABC-planning vocabulary (card.ts mode tooltip; the YuE2
        // nodes read it) — the MiniMax lane plans no symbolic score and
        // MiniMaxMusic3TextEncode declares no mode input (the engine
        // node's schema: clip, caption, lyrics, seed, max_duration,
        // cfg_scale, top_k). A stated non-default mode used to cross
        // every gate and die unread at compose — the silent drop the
        // value arms pre-registered. Refuse loud in the knob's own
        // voice; "full" rides because the card schema's walk fills it as
        // the stated default (the stated default IS the unstated
        // compose), and an absent mode (direct action callers) rides.
        const mode = p.mode;
        if (mode !== undefined && mode !== "full") {
            throw new Error(`music3 compose: mode '${String(mode)}' fires nothing on this lane — ` +
                "mode is the YuE2 ABC-planning vocabulary (full/melody drive YuE2's symbolic score); " +
                "the MiniMax lane's engine node reads caption+lyrics only, no mode input. " +
                "Drop mode, or switch lane (model=yue2) to plan a score");
        }
        const seed = p.seed;
        const unet = g.node("UNETLoader", { unet_name: facts.unet, weight_dtype: "default" }).out();
        const clip = g.node("CLIPLoader", { clip_name: facts.text_encoder, model_options: "default", type: facts.clip_type }).out();
        const vae = g.node("VAELoader", { vae_name: facts.vae }).out();
        const cond = g.node("MiniMaxMusic3TextEncode", {
            clip,
            caption: p.prompt,
            lyrics: p.lyrics ?? "",
            seed,
            max_duration: p.duration,
            cfg_scale: p.lm_cfg_scale,
            top_k: 50,
        });
        const zeroed = g.node("ConditioningZeroOut", { conditioning: cond.out(0) });
        const latent = g.node("EmptyMiniMaxMusic3LatentAudio", { batch_size: 1, seconds: p.duration });
        const sampled = g.node("KSampler", {
            seed,
            steps: p.n_diffusion_steps,
            cfg: p.guidance_scale,
            sampler_name: "euler",
            scheduler: "simple",
            denoise: 1.0,
            latent_image: latent.out(),
            model: unet,
            positive: cond.out(0),
            negative: zeroed.out(),
        });
        const audio = g.node("VAEDecodeAudio", { samples: sampled.out(), vae });
        return g.node("SaveAudioAdvanced", { audio: audio.out(), filename_prefix: `${runId}/music`, format: "mp3", "format.quality": "V0" }).out();
    },
};
//# sourceMappingURL=actions.js.map
