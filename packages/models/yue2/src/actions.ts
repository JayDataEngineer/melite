// actions.ts — the family's offered actions (the atom vocabulary,
// stroke 3): the compose action the music card binds. The DECL's
// lane_inputs are the ONE facts door (checkpoint — ONE file carries
// model+clip+vae); the segment factory composes the latent class
// itself (EmptyYuE2LatentAudio). The lane IS this file, pinned to
// committed goldens in tests/golden/
// — the wire the port produced while the kit's twin still existed and
// the oracle compared them byte-for-byte. Creation order IS node-id
// order (the recipe law).
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import type { OutputHandle } from "@melite/comfyui-card-kit/graph";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";

/** The closed facts shape the compose segment reads. */
export type Yue2Facts = {
  readonly checkpoint: string;
};

/** The gated params doc the compose segment reads (the card's
 * schema walk validated types and bounds — a same-process typed
 * boundary; the seed arrives minted through the declared
 * seed-sentinel rule, so the ported mint below is a pass-through). */
export type Yue2Params = Record<string, unknown>;

/** The compose facts door: the resolved lane_inputs parsed into the
 * closed shape — a missing checkpoint refuses field-named here,
 * never composes with an empty filename.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export function parseYue2Facts(raw: LaneInputsFacts): Yue2Facts {
  const value = raw.checkpoint;
  if (typeof value !== "string" || value === "") {
    throw new Error(`yue2 compose: lane_inputs.checkpoint = ${JSON.stringify(value)} — a non-empty string is required`);
  }
  return { checkpoint: value };
}

/** The compose action: YuE2-3B — CheckpointLoaderSimple on the
 * family's own file, YuE2GenerateABC planning (mode off composes no
 * planner — the engine's own off mode), YuE2GenerateMusic (its
 * seconds output sizes the latent), KSampler dpm_2/sgm_uniform at
 * cfg 1 (guidance lives on the AR side), VAEDecodeAudio,
 * SaveAudioAdvanced mp3 under <run>/music. */
export const compose: ComfyActionSpec<Yue2Params, Yue2Facts> = {
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
    const seed = p.seed as number;
    const ckpt = g.node("CheckpointLoaderSimple", { ckpt_name: facts.checkpoint });
    const style = p.prompt as string;
    const lyrics = (p.lyrics ?? "") as string;
    const mode = (p.mode ?? "full") as string;
    // THE PLANNING GATE: mode off composes no planner node at all —
    // GenerateMusic rides an empty abc (the engine's own off mode);
    // full/melody ride YuE2GenerateABC with the same style + lyrics.
    let abc: string | OutputHandle = "";
    if (mode !== "off") {
      abc = g.node("YuE2GenerateABC", {
        clip: ckpt.out(1), style, lyrics, seed, mode,
        max_abc_tokens: 8192, temperature: 0.7, top_p: 0.9, top_k: 30,
        repetition_penalty: 1.005, penalty_window: 100,
      }).out(0);
    }
    const music = g.node("YuE2GenerateMusic", {
      clip: ckpt.out(1), style, lyrics, abc, seed, mode,
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
