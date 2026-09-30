// actions.ts — the family's offered actions (the atom vocabulary,
// stroke 3): the compose action the music card binds. The DECL's
// lane_inputs are the ONE facts door (unet + text_encoder +
// clip_type + vae — the MiniMax trio rail); the segment factory is
// the legacy musicT1 verbatim — byte-identical graphs on the same
// doc (proven in tests/action.spec.ts). Creation order IS node-id
// order (the recipe law). Keys the segment never reads (checkpoint,
// texture_vae, … the strip shape) ride unvalidated.
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";

/** The closed facts shape the compose segment reads. */
export type MusicFacts = {
  readonly unet: string;
  readonly text_encoder: string;
  readonly clip_type: string;
  readonly vae: string;
};

/** The gated params doc the compose segment reads (the card's
 * schema walk validated types and bounds — a same-process typed
 * boundary; the seed arrives minted through the declared
 * seed-sentinel rule, so the ported mint below is a pass-through). */
export type MusicParams = Record<string, unknown>;

/** The compose facts door: the resolved lane_inputs parsed into the
 * closed shape — a missing weight refuses field-named here, never
 * composes with an empty filename.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export function parseMusicFacts(raw: LaneInputsFacts): MusicFacts {
  const text = (key: keyof MusicFacts): string => {
    const value = raw[key];
    if (typeof value !== "string" || value === "") {
      throw new Error(`music3 compose: lane_inputs.${key} = ${JSON.stringify(value)} — a non-empty string is required`);
    }
    return value;
  };
  return { unet: text("unet"), text_encoder: text("text_encoder"), clip_type: text("clip_type"), vae: text("vae") };
}

/** The compose action: MiniMax Music 3 — UNET/CLIP/VAE loaders from
 * the family's own weights, MiniMaxMusic3TextEncode on the caption
 * + lyrics, KSampler euler/simple over the empty music latent,
 * VAEDecodeAudio, SaveAudioAdvanced mp3 under <run>/music. */
export const compose: ComfyActionSpec<MusicParams, MusicFacts> = {
  id: "compose",
  outputs: [{ name: "audio", kind: "AUDIO" }],
  params: [{ name: "seed", rule: "seed-sentinel" }],
  facts: parseMusicFacts,
  build({ p, facts, g, runId }) {
    const seed = p.seed as number;
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
