import { loadTextPair, decodeSave, stackLoras, statedRegion, regionSegs, genDetailerSave } from "@melite/comfyui-card-kit";
import { fireLoras, refuseIPAdapterFiring } from "@melite/comfyui-card-kit/guard";
import { diffusionParamRows } from "@melite/comfyui-card-kit/paramRows";
import { laneInputsReader, parseDiffusionLaneFacts } from "@melite/comfyui-card-kit/facts";
/** The t2i facts door: the resolved lane_inputs parsed into the
 *  closed shape. An unknown conditioning class refuses here, never
 *  silently routes to a stock lane. Every read rides the typed lane
 *  reader built off the resolved row — a key the DECL never
 *  declared refuses loud.
 *  @param raw the resolved lane_inputs (family ⊕ variant ⊕ cell)
 *  @param model the resolved model row (its lane_inputs ∪ every
 *   variant's own is the DECL's declared key set)
 *  @returns the typed facts the segment factory reads */
export function parseT2IFacts(raw, model) {
    const lane = laneInputsReader(model, raw, "h3-image t2i");
    const f = parseDiffusionLaneFacts(lane, "h3-image t2i", { key: "text_encode_node", node: "MiniMaxH3ImageConditioning" }, false);
    return {
        unet: f.unet,
        text_encoder: f.text_encoder,
        vae: f.vae,
        clip_type: f.clip_type,
        text_encode_node: f.node,
    };
}
/** The text-to-image action: the official H3-Image template — ONE
 *  MiniMaxH3ImageConditioning at the stated canvas (the node's own
 *  area law: ~2048x2048 working area, 32-multiple canvas), the
 *  negative zeroed, KSampler on the conditioning's OWN emitted
 *  latent (its second output — the node sizes the canvas latent
 *  from its own width/height inputs), decode + save under
 *  <run>/gen. Reference pictures ride the EDIT sibling
 *  (h3-image-edit, the image-edit card) — this t2i lane is
 *  prompt-only (the phantom-port law: the image-gen reference
 *  seat fires on qwen-img-21 alone). */
export const t2i = {
    id: "t2i",
    inputs: [],
    outputs: [{ name: "image", kind: "IMAGE" }],
    // THE DECLARED SURFACE (the write plane): types and bounds are
    // the image-gen card schema's own — the family door judges
    // defaults and variant presets against this row; the closed sets
    // resolve from the ONE engine vocabulary, never hand-copied.
    params: [...diffusionParamRows()],
    facts: parseT2IFacts,
    build({ p, facts, model, g, runId }) {
        // NO NEGATIVE SEAT: distilled guidance at cfg 1 zeroes the
        // negative (ConditioningZeroOut, the official template's arm)
        // — a stated non-empty value refuses LOUD, never drops.
        if (typeof p.negative_prompt === "string" && p.negative_prompt.trim() !== "") {
            throw new Error("negative_prompt stated on family 'h3-image' — the lane has no negative seat (distilled cfg-1 guidance; the negative rides ConditioningZeroOut, the official template's own arm). Unstate it");
        }
        let unet = g.node("UNETLoader", { unet_name: facts.unet, weight_dtype: "default" }).out();
        unet = stackLoras(g, unet, fireLoras(model, p));
        // THE IP-ADAPTER FIRING GATE: no t2i segment builds it in this
        // plane — every stated entry refuses LOUD before any node renders.
        refuseIPAdapterFiring(model, p);
        const { clip, vae } = loadTextPair(g, facts);
        // The bare-template graph: the conditioning takes clip, prompt
        // and the canvas alone (no vae key without reference pictures
        // — the node's own optional-input law keeps the graph
        // byte-stable).
        const condInputs = {
            clip,
            prompt: p.prompt,
            width: p.width,
            height: p.height,
        };
        // ONE conditioning node emits the positive (out 0) AND the
        // canvas latent (out 1 — a zero latent at width//16 ×
        // height//16); the negative rides ConditioningZeroOut on the
        // positive (the official template's own arm: distilled
        // guidance at cfg 1 — the lane has NO negative_prompt seat).
        const enc = g.node("MiniMaxH3ImageConditioning", condInputs);
        const negative = g.node("ConditioningZeroOut", { conditioning: enc.out(0) }).out();
        // THE GEN DETAILER (operator 2026-11-09, "ANY model can inpaint,
        // not just krea-2" — the roster's death made every lane a
        // serving lane): a stated region rides the generic
        // DetailerForEach tail over THIS lane's own conditioning. The
        // card's gate and this build branch on the kit's ONE
        // stated-region read, so gate and arm never disagree.
        const region = statedRegion(p);
        // THE PHOTO ARM (the Impact Pack pair, operator 2026-11-15:
        // DetailerForEach takes image + segs): input_image stated = the
        // base to inpaint on is THAT photograph — the detailer reworks
        // its region and NOTHING generates (no KSampler node exists in
        // the graph; the conditioning node rides for its positive
        // output only, its latent seat unused).
        if (region !== null && region.basePath !== "") {
            const photo = g.node("LoadImage", { image: region.basePath }).out();
            const segs = regionSegs(g, region.merged, photo, region.maskPath);
            return genDetailerSave(g, p, region.merged, {
                image: photo, segs, model: unet, clip, vae,
                positive: enc.out(0), negative, seed: p.seed,
            }, runId).out();
        }
        const sampled = g.node("KSampler", {
            seed: p.seed,
            steps: p.steps,
            cfg: p.cfg,
            sampler_name: p.sampler,
            scheduler: p.scheduler,
            denoise: 1.0,
            latent_image: enc.out(1),
            model: unet,
            positive: enc.out(0),
            negative,
        });
        // THE FRESH-GEN ARM: the region reworks the lane's OWN render —
        // decode once, segs over the decoded frame, the same detailer
        // tail (the stitch back touches the seg mask only).
        if (region !== null) {
            const decoded = g.node("VAEDecode", { samples: sampled.out(), vae }).out();
            const segs = regionSegs(g, region.merged, decoded, region.maskPath);
            return genDetailerSave(g, p, region.merged, {
                image: decoded, segs, model: unet, clip, vae,
                positive: enc.out(0), negative, seed: p.seed,
            }, runId).out();
        }
        return decodeSave(g, sampled.out(), vae, `${runId}/gen`).out();
    },
};
//# sourceMappingURL=actions.js.map
