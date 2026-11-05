import { loadTextPair, decodeSave, stackLoras } from "@melite/comfyui-card-kit";
import { fireLoras, refuseIPAdapterFiring } from "@melite/comfyui-card-kit/guard";
import { diffusionParamRows } from "@melite/comfyui-card-kit/paramRows";
import { parseDiffusionLaneFacts } from "@melite/comfyui-card-kit/facts";
/** The Comfy-Org template's exposed negative-box default (verbatim,
 *  the 2026-11-04 artifact burn): the lane encodes a REAL negative on
 *  every compose — the template never zero-outs, and a zeroed
 *  unconditional (score = cfg·cond, no uncond cancellation) fed the
 *  16/32px patch-grid lattice beside the over-armed SLG. */
const TEMPLATE_NEGATIVE = "nsfw, worst quality, bad anatomy, watermark, jpeg artifact";
/** The t2i facts door: the resolved lane_inputs parsed into the
 *  closed shape. An unknown encoder class refuses here, never
 *  silently routes to a stock lane.
 *  @param raw the resolved lane_inputs (family ⊕ variant ⊕ cell)
 *  @returns the typed facts the segment factory reads */
export function parseT2IFacts(raw) {
    // shift defaults true: this lane DECLARES its sampling_shift
    // (5.0), and a non-numeric drift refuses at the door.
    const f = parseDiffusionLaneFacts(raw, "moss-image t2i", { key: "text_encode_node", node: "CLIPTextEncode" });
    return {
        unet: f.unet,
        text_encoder: f.text_encoder,
        vae: f.vae,
        clip_type: f.clip_type,
        sampling_shift: f.sampling_shift,
        text_encode_node: f.node,
    };
}
/** The text-to-image action: the official MOSS-Image template — the
 *  UNETLoader + the declared shift wrap + CLIPLoader (moss_image) +
 *  VAELoader, the CLIPTextEncode pair, EmptyFlux2LatentImage at card
 *  resolution, SLG DISARMED (the template's own default — the
 *  bypass, never the patch node), and the template's plain KSampler
 *  (sampler/scheduler ride the card's knobs, family defaults
 *  er_sde/simple). Creation order IS node-id order (the recipe law).
 *
 * THE NEGATIVE ARM: MOSS's SFT lane runs live guidance (CFG 3), so a
 * STATED negative_prompt encodes through CLIPTextEncode and bites; a
 * BLANK negative encodes the template's own reference default
 * ("nsfw, worst quality, bad anatomy, watermark, jpeg artifact") —
 * the template never composes a zeroed unconditional (a zeroed
 * negative fed the 2026-11-04 patch-grid artifact burn).
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
    params: [...diffusionParamRows()],
    facts: parseT2IFacts,
    build({ p, facts, model, g, runId }) {
        let unet = g.node("UNETLoader", { unet_name: facts.unet, weight_dtype: "default" }).out();
        // THE DECLARED SHIFT (the krea-2 arm, truthiness-gated): the
        // moss lane pins 5.0, so the sampling model wraps here — the
        // inert 0 spelling would skip the arm.
        if (facts.sampling_shift) {
            unet = g.node("ModelSamplingAuraFlow", { model: unet, shift: facts.sampling_shift }).out();
        }
        unet = stackLoras(g, unet, fireLoras(model, p));
        // THE IP-ADAPTER FIRING GATE: no t2i segment builds it in this
        // plane — every stated entry refuses LOUD before any node renders.
        refuseIPAdapterFiring(model, p);
        const { clip, vae } = loadTextPair(g, facts);
        const positive = g.node("CLIPTextEncode", { text: p.prompt, clip }).out();
        // THE OFFICIAL NEGATIVE (the 2026-11-04 artifact burn): blank
        // encodes the template's own reference default; stated encodes
        // the stated text. Never ConditioningZeroOut.
        const negativeText = (p.negative_prompt ?? "").trim() === "" ? TEMPLATE_NEGATIVE : p.negative_prompt;
        const negative = g.node("CLIPTextEncode", { text: negativeText, clip }).out();
        const latent = g.node("EmptyFlux2LatentImage", { width: p.width, height: p.height, batch_size: 1 }).out();
        // THE TEMPLATE SAMPLER (the 2026-10-20 weave burn; re-seated by
        // the 2026-11-04 artifact burn): a plain KSampler over the
        // shift-wrapped model (er_sde/simple) — and SLG DISARMED. The
        // Comfy-Org template carries SkipLayerGuidanceDiTSimple but ships
        // its switch_1 ("SLG") false, the switch routing the sampler off
        // the raw wrapped model; stamping it ON (single layer 22, first
        // half of the schedule) replaces the uncond prediction with a
        // layer-skipped pass, so cfg·(cond − uncond_skipped) amplifies
        // the 2×2 DiT patch-grid bias — the measured 16/32px lattice.
        // Melite emits the bypass directly: no SLG node, the sampler
        // samples through the wrap. The seed is already concrete here
        // (the interpreter mints the -1 sentinel).
        const sampled = g.node("KSampler", { model: unet, positive, negative, latent_image: latent, seed: p.seed, steps: p.steps, cfg: p.cfg, sampler_name: p.sampler, scheduler: p.scheduler, denoise: 1 });
        return decodeSave(g, sampled.out(0), vae, `${runId}/gen`).out();
    },
};
//# sourceMappingURL=actions.js.map
