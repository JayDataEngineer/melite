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
  saveAudio,
} from "@melite/comfyui-card-kit";
import { requireText, type LaneInputsFacts } from "@melite/comfyui-card-kit/facts";

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
  return { model_path: requireText(raw, "model_path", "moss-sfx sfx") };
}

/** The sfx action: MOSS-SoundEffect — LoadAudiocoreModel on the
 * family's own path + variant extras, AudiocoreTTS mode tts on the
 * prompt with the autofill pin, SaveAudio under <run>/sfx. */
export const sfx: ComfyActionSpec<SfxParams, SfxFacts> = {
  id: "sfx",
  inputs: [],
  outputs: [{ name: "audio", kind: "AUDIO" }],
  // THE DECLARED SURFACE (the write plane, phase 2): the sfx
  // card schema's own types and bounds — the family door judges
  // defaults and variant presets against this row.
  params: [
    { name: "prompt", type: "string" },
    // The engine ceiling (audit S2, 2026-11-10): the pipeline refuses
    // seconds > max_inference_seconds=30 — the bound equals the
    // pipeline's own max (the pipeline-truth wall parses it).
    { name: "duration", type: "number", bounds: [0.5, 30] },
    { name: "guidance_scale", type: "number", bounds: [0, 20] },
    { name: "n_diffusion_steps", type: "number", bounds: [1, 500] },
    { name: "seed", type: "number", rule: "seed-sentinel" },
  ],
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
    return saveAudio(g, synth.out(), `${runId}/sfx`).out();
  },
};
