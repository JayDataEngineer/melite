import { requireText } from "@melite/comfyui-card-kit/facts";
/** The upscale facts door: the resolved lane_inputs parsed into the
 * closed shape — a missing weight refuses field-named here, never
 * composes with an empty filename.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export function parseUpscaleFacts(raw) {
    const text = (key) => requireText(raw, key, "seedvr2_ema upscale");
    return { unet: text("unet"), vae: text("vae") };
}
/** The upscale action: SeedVR2 — the DiT + VAE loaders from the
 * family's own weights, the upscaler at the stated resolution caps,
 * SaveImage under <run>/gen. */
export const upscale = {
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
        const seed = p.seed;
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
//# sourceMappingURL=actions.js.map
