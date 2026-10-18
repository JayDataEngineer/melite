import { loadTextPair, decodeSave, stackLoras, stackControlNets } from "@melite/comfyui-card-kit";
import { fireLoras, fireControlNets, refuseIPAdapterFiring } from "@melite/comfyui-card-kit/guard";
import { parseDiffusionLaneFacts } from "@melite/comfyui-card-kit/facts";
import { diffusionParamRows } from "@melite/comfyui-card-kit/paramRows";
/** The t2i facts door: the resolved lane_inputs parsed into the
 *  closed shape. A drifted latent class refuses here, never
 *  silently routes to another topology.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export function parseT2IFacts(raw) {
    // The checks + refusal prose live in the kit (J2 consolidation,
    // 2026-10-18); this door projects the parsed core into the
    // family's own typed shape (the self-containment contract, B4).
    const f = parseDiffusionLaneFacts(raw, "z-image t2i", { key: "latent_node", node: "EmptySD3LatentImage" });
    return { unet: f.unet, text_encoder: f.text_encoder, vae: f.vae, clip_type: f.clip_type, latent_node: f.node, sampling_shift: f.sampling_shift };
}
/** The text-to-image action: the stock diffuse topology with the
 *  AuraFlow wrap ON (the resolved row spells shift 3) and the
 *  controlnet stack FIRED — fired picks wrap the LoRA'd model
 *  (ModelPatchLoader → ZImageFunControlnet per entry, array order =
 *  apply order); empty picks build the bare model, byte-stable. */
export const t2i = {
    id: "t2i",
    inputs: [],
    outputs: [{ name: "image", kind: "IMAGE" }],
    // THE DECLARED SURFACE (the write plane, phase 2): the image-gen
    // card schema's own types and bounds — the family door judges
    // defaults and variant presets against this row; the closed sets
    // resolve from the ONE engine vocabulary, never hand-copied.
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
        // The mod plane's stack (advanced-parameter vocabulary, owned
        // there): guard.ts fires + floors the picks, render-kit.ts
        // owns the node pair — this action delegates, never spells.
        unet = stackControlNets(g, unet, vae, fireControlNets(model, p));
        const pos = g.node("CLIPTextEncode", { clip, text: p.prompt });
        const neg = g.node("CLIPTextEncode", { clip, text: p.negative_prompt ?? "" });
        const latent = g.node(facts.latent_node, { batch_size: 1, width: p.width, height: p.height });
        const sampled = g.node("KSampler", {
            seed: p.seed,
            steps: p.steps,
            cfg: p.cfg,
            sampler_name: p.sampler,
            scheduler: p.scheduler,
            denoise: 1.0,
            latent_image: latent.out(),
            model: unet,
            positive: pos.out(),
            negative: neg.out(),
        });
        return decodeSave(g, sampled.out(), vae, `${runId}/gen`).out();
    },
};
//# sourceMappingURL=actions.js.map