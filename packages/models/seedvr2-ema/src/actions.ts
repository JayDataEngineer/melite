// actions.ts — the family's offered actions (the atom vocabulary,
// stroke 3): the upscale action the upscale-tools card binds. The
// DECL's lane_inputs are the ONE facts door (unet + vae — the SeedVR2
// pair); the lane IS this file, pinned to committed goldens in
// tests/golden/ — the wire the port produced while the kit's twin
// still existed and the oracle compared them byte-for-byte. Creation
// order IS node-id order (the recipe law). The lane_inputs keys this segment never reads
// (checkpoint, texture_vae, … the strip shape) ride unvalidated.
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import { requireText, type LaneInputsFacts } from "@melite/comfyui-card-kit/facts";

/** The closed facts shape the upscale segment reads. */
export type UpscaleFacts = {
  readonly unet: string;
  readonly vae: string;
};

/** The gated params doc the upscale segment reads (the card's
 * schema walk validated types and bounds — a same-process typed
 * boundary; the seed arrives minted through the declared
 * seed-sentinel rule). */
export type UpscaleParams = Record<string, unknown>;

/** The upscale facts door: the resolved lane_inputs parsed into the
 * closed shape — a missing weight refuses field-named here, never
 * composes with an empty filename.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export function parseUpscaleFacts(raw: LaneInputsFacts): UpscaleFacts {
  const text = (key: "unet" | "vae"): string => requireText(raw, key, "seedvr2-ema upscale");
  return { unet: text("unet"), vae: text("vae") };
}

/** The upscale action: SeedVR2 — the DiT + VAE loaders from the
 * family's own weights, the upscaler at the stated resolution caps,
 * SaveImage under <run>/gen. */
export const upscale: ComfyActionSpec<UpscaleParams, UpscaleFacts> = {
  id: "upscale",
  inputs: [],
  outputs: [{ name: "image", kind: "IMAGE" }],
  // THE DECLARED SURFACE (the write plane, phase 2): the
  // upscale-tools card schema's own types and bounds — the
  // family door judges defaults and variant presets against this
  // row.
  params: [
    { name: "input_image", type: "string" },
    { name: "resolution", type: "number", bounds: [256, 2160] },
    { name: "max_resolution", type: "number", bounds: [512, 4096] },
    { name: "batch_size", type: "number", bounds: [1, 16] },
    { name: "seed", type: "number", rule: "seed-sentinel" },
  ],
  facts: parseUpscaleFacts,
  build({ p, facts, g, runId }) {
    const seed = p.seed as number;
    // THE SPELLED ANCHOR (the wired-tensor law: a '$name' value
    // names an upstream stage's wired output — the spell IS the
    // tensor and rides the upscaler's slot verbatim; file paths
    // keep the disk handoff).
    const img = typeof p.input_image === "string" && p.input_image.startsWith("$")
      ? p.input_image
      : g.node("LoadImage", { image: p.input_image }).out();
    const dit = g.node("SeedVR2LoadDiTModel", {
      model: facts.unet,
      device: "cuda:0",
    }).out();
    const vae = g.node("SeedVR2LoadVAEModel", {
      model: facts.vae,
      device: "cuda:0",
    }).out();
    const up = g.node("SeedVR2VideoUpscaler", {
      image: img,
      dit,
      vae,
      seed,
      resolution: p.resolution,
      max_resolution: p.max_resolution,
      batch_size: p.batch_size,
      uniform_batch_size: true,
    }).out();
    return g.node("SaveImage", { images: up, filename_prefix: `${runId}/gen` }).out();
  },
};
