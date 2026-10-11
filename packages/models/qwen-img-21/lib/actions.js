import { loadTextPair, decodeSave, stackLoras } from "@melite/comfyui-card-kit";
import { fireLoras, refuseIPAdapterFiring } from "@melite/comfyui-card-kit/guard";
import { diffusionParamRows } from "@melite/comfyui-card-kit/paramRows";
import { parseDiffusionLaneFacts } from "@melite/comfyui-card-kit/facts";
/** The t2i facts door: the resolved lane_inputs parsed into the
 *  closed shape. An unknown encoder class refuses here, never
 *  silently routes to a stock lane.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export function parseT2IFacts(raw) {
    // The checks + refusal prose live in the kit (J2 consolidation,
    // 2026-10-18); this door projects the parsed core into the
    // family's own typed shape (the self-containment contract, B4).
    const f = parseDiffusionLaneFacts(raw, "qwen-img-21 t2i", { key: "text_encode_node", node: "TextEncodeQwenImage21" });
    return {
        unet: f.unet,
        text_encoder: f.text_encoder,
        vae: f.vae,
        clip_type: f.clip_type,
        text_encode_node: f.node,
        sampling_shift: f.sampling_shift,
    };
}
/** The text-to-image action: the official 2.1 template — ONE
 *  TextEncodeQwenImage21 emitting positive (out 0) and negative
 *  (out 1), EmptyLatentImage at card resolution, KSampler, decode +
 *  save under <run>/gen. Creation order IS node-id order (the recipe
 *  law) and matches the legacy lane arm exactly. No reference arm:
 *  the create card takes no reference inputs (operator ruling,
 *  2026-10-11) — a stated reference_images key refuses at the card's
 *  gated resolve as an unknown param. */
export const t2i = {
    id: "t2i",
    inputs: [],
    outputs: [{ name: "image", kind: "IMAGE" }],
    // THE DECLARED SURFACE (the write plane, phase 2): types and
    // bounds are the image-gen card schema's own — the family door
    // judges defaults and variant presets against this row; the
    // sampler/scheduler closed sets resolve from the ONE engine
    // vocabulary, never hand-copied.
    params: [...diffusionParamRows()],
    facts: parseT2IFacts,
    build({ p, facts, model, g, runId }) {
        let unet = g.node("UNETLoader", { unet_name: facts.unet, weight_dtype: "default" }).out();
        if (facts.sampling_shift) {
            unet = g.node("ModelSamplingAuraFlow", { model: unet, shift: facts.sampling_shift }).out();
        }
        unet = stackLoras(g, unet, fireLoras(model, p));
        // THE IP-ADAPTER FIRING GATE: no t2i segment builds it in this
        // plane — every stated entry refuses LOUD before any node renders.
        refuseIPAdapterFiring(model, p);
        const { clip, vae } = loadTextPair(g, facts);
        const encInputs = {
            clip,
            prompt: p.prompt,
            negative_prompt: p.negative_prompt ?? "",
            resolution: 1024,
        };
        // ONE encoder node emits positive AND negative (outputs
        // [CONDITIONING, CONDITIONING, LATENT] — the negative rides out
        // index 1).
        const enc = g.node("TextEncodeQwenImage21", encInputs);
        const latent = g.node("EmptyLatentImage", { batch_size: 1, width: p.width, height: p.height });
        const sampled = g.node("KSampler", {
            seed: p.seed,
            steps: p.steps,
            cfg: p.cfg,
            sampler_name: p.sampler,
            scheduler: p.scheduler,
            denoise: 1.0,
            latent_image: latent.out(),
            model: unet,
            positive: enc.out(0),
            negative: enc.out(1),
        });
        return decodeSave(g, sampled.out(), vae, `${runId}/gen`).out();
    },
};
//# sourceMappingURL=actions.js.map
