// actions.ts — the family's offered actions (the atom vocabulary,
// stroke 3): the sfx action the sfx card binds. The DECL's
// lane_inputs are the ONE facts door (model_path — the audiocore
// load key); the lane IS this file on the kit's OWN calibrated pins
// and loaders (one owner), pinned to committed goldens in
// tests/golden/ — recorded while the kit's twin existed and the oracle
// compared them byte-for-byte.
// Creation order IS node-id order (the recipe law). Keys the
// segment never reads (checkpoint, vae, … the strip shape) ride
// unvalidated.
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import {
  AUDIACORE_TTS_AUTOFILL,
  loadAudiocore,
} from "@melite/comfyui-card-kit";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";

/** The closed facts shape the sfx segment reads. */
export type SfxFacts = {
  readonly model_path: string;
};

/** The gated params doc the sfx segment reads (the card's schema
 * walk validated types and bounds — a same-process typed boundary;
 * the seed arrives minted through the declared seed-sentinel rule,
 * so the ported mint below is a pass-through). */
export type SfxParams = Record<string, unknown>;

/** The sfx facts door: the resolved lane_inputs parsed into the
 * closed shape — a missing model_path refuses field-named here,
 * never composes a LoadAudiocoreModel on an empty directory.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export function parseSfxFacts(raw: LaneInputsFacts): SfxFacts {
  const value = raw.model_path;
  if (typeof value !== "string" || value === "") {
    throw new Error(`moss-sfx sfx: lane_inputs.model_path = ${JSON.stringify(value)} — a non-empty string is required`);
  }
  return { model_path: value };
}

/** The sfx action: MOSS-SoundEffect — LoadAudiocoreModel on the
 * family's own path + variant extras, AudiocoreTTS mode tts on the
 * prompt with the autofill pin, SaveAudio under <run>/sfx. */
export const sfx: ComfyActionSpec<SfxParams, SfxFacts> = {
  id: "sfx",
  outputs: [{ name: "audio", kind: "AUDIO" }],
  params: [{ name: "seed", rule: "seed-sentinel" }],
  facts: parseSfxFacts,
  build({ p, model, g, runId }) {
    const seed = p.seed as number;
    const loaded = loadAudiocore(g, model);
    const synth = g.node("AudiocoreTTS", {
      ...AUDIACORE_TTS_AUTOFILL,
      model: loaded,
      prompt: (p.prompt as string).trim(),
      mode: "tts",
      guidance_scale: p.guidance_scale,
      num_inference_steps: p.n_diffusion_steps,
      duration_seconds: p.duration,
      seed,
    });
    return g.node("SaveAudio", { audio: synth.out(), filename_prefix: `${runId}/sfx` }).out();
  },
};
