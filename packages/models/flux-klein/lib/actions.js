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
    // shift=false: this lane declares no sampling_shift (the scheduler
    // node owns the empirical shift), so the door skips its check.
    const f = parseDiffusionLaneFacts(raw, "flux-klein t2i", { key: "text_encode_node", node: "CLIPTextEncode" }, false);
    return {
        unet: f.unet,
        text_encoder: f.text_encoder,
        vae: f.vae,
        clip_type: f.clip_type,
        text_encode_node: f.node,
    };
}
/** The text-to-image action: the official FLUX.2 Klein 4B template —
 * UNETLoader + CLIPLoader(flux2) + VAELoader, ONE CLIPTextEncode for
 * the prompt, EmptyFlux2LatentImage at card resolution, and the
 * advanced sampling stack (Flux2Scheduler → KSamplerSelect,
 * RandomNoise, CFGGuider, SamplerCustomAdvanced) the FLUX.2 sigmas
 * require. Creation order IS node-id order (the recipe law).
 *
 * THE NEGATIVE ARM (the distilled template's own law): a BLANK
 * negative_prompt composes ConditioningZeroOut over the positive —
 * the true unconditional the 4-step distilled checkpoint was trained
 * against (encoding an empty string through the 8GB tokenizer buys
 * nothing); a STATED negative_prompt encodes through CLIPTextEncode —
 * a stated negative is never dropped.
 *
 * No reference arm: the create card takes no reference inputs
 * (operator ruling, 2026-10-11) — a stated reference_images key
 * refuses at the card's gated resolve as an unknown param. */
export const t2i = {
    id: "t2i",
    inputs: [],
    outputs: [{ name: "image", kind: "IMAGE" }],
    // THE DECLARED SURFACE (the write plane): types and bounds are the
    // image-gen card schema's own — the family door judges defaults and
    // variant presets against this row; the sampler/scheduler closed
    // sets resolve from the ONE engine vocabulary, never hand-copied.
    // + the shared tail row (surface parity with qwen-img-21, the
    // wall's pin for this adopter). flux-klein's own graph takes no
    // references — its default workflow conditions through
    // ReferenceLatent only when an edit arms it — so a stated list
    // refuses at the card's phantom-port gate before this action
    // ever sees one.
    params: [...diffusionParamRows(), { name: "reference_images", type: "image_list" }],
    facts: parseT2IFacts,
    build({ p, facts, model, g, runId }) {
        let unet = g.node("UNETLoader", { unet_name: facts.unet, weight_dtype: "default" }).out();
        unet = stackLoras(g, unet, fireLoras(model, p));
        // THE IP-ADAPTER FIRING GATE: no t2i segment builds it in this
        // plane — every stated entry refuses LOUD before any node renders.
        refuseIPAdapterFiring(model, p);
        const { clip, vae } = loadTextPair(g, facts);
        const positive = g.node("CLIPTextEncode", { text: p.prompt, clip }).out();
        const negativeText = p.negative_prompt ?? "";
        const negative = negativeText.trim() === ""
            ? g.node("ConditioningZeroOut", { conditioning: positive }).out()
            : g.node("CLIPTextEncode", { text: negativeText, clip }).out();
        // THE CANVAS LAW (audit 2026-10-20 F2, the shadowed finding): an
        // agent-side minimal doc may state no canvas — the walk passes,
        // but the engine declares EmptyFlux2LatentImage.height/width (and
        // the sampling stack's steps/sampler/seed/cfg) REQUIRED and
        // refuses the prompt live. The stated value wins; unstated falls
        // to the family's OWN DECL defaults (facts.defaults — the
        // official distilled template: 1024², 4 steps, cfg 1, euler); a
        // family that declares neither refuses loud here, never ships an
        // undefined input the engine would reject at run time.
        const canvas = (stated, knob) => {
            if (typeof stated === "number")
                return stated;
            const d = model.defaults[knob];
            if (typeof d === "number")
                return d;
            throw new Error(`flux-klein t2i: ${knob} is stated neither in the doc nor the family defaults — the canvas never composes blind (the engine declares it required)`);
        };
        const word = (stated, knob) => {
            if (typeof stated === "string" && stated !== "")
                return stated;
            const d = model.defaults[knob];
            if (typeof d === "string" && d !== "")
                return d;
            throw new Error(`flux-klein t2i: ${knob} is stated neither in the doc nor the family defaults — the sampler never composes blind (the engine declares it required)`);
        };
        const width = canvas(p.width, "width");
        const height = canvas(p.height, "height");
        const latent = g.node("EmptyFlux2LatentImage", { width, height, batch_size: 1 }).out();
        // THE FLUX.2 SAMPLING STACK (the official template's own): the
        // scheduler computes the empirical time-SNR shift from steps and
        // the canvas; the stock scheduler knob declares the card domain
        // but wires nothing on this lane.
        const sigmas = g.node("Flux2Scheduler", { steps: canvas(p.steps, "steps"), width, height }).out();
        const sampler = g.node("KSamplerSelect", { sampler_name: word(p.sampler, "sampler") }).out();
        const noise = g.node("RandomNoise", { noise_seed: canvas(p.seed, "seed") }).out();
        const guider = g.node("CFGGuider", { cfg: canvas(p.cfg, "cfg"), model: unet, positive, negative }).out();
        // (burn, 2026-10-20: the empty latent composed above was never
        // wired — the engine declares latent_image required and refused
        // the prompt; the canvas rides here, never dangling.)
        const sampled = g.node("SamplerCustomAdvanced", { noise, guider, sampler, sigmas, latent_image: latent });
        return decodeSave(g, sampled.out(0), vae, `${runId}/gen`).out();
    },
};
//# sourceMappingURL=actions.js.map
