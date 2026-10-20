import { loadTextPair, decodeSave, stackLoras, isSpell, statedRegion, regionSegs, genDetailerSave } from "@melite/comfyui-card-kit";
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
 *  save under <run>/gen. Creation order IS node-id order (the
 *  recipe law) and matches the legacy lane arm exactly. THE
 *  REFERENCE SEAT (audit 004/C4, 2026-10-22 — supersedes the
 *  2026-10-11 no-seat ruling): stated reference_images ride
 *  per-slot LoadImage anchors into the encoder's images.image_N
 *  autogrow slots (the edit lane's proven wiring) with vae on the
 *  encoder for the reference-latent splice; unstated keeps the
 *  bare-template graph byte-identical. */
export const t2i = {
    id: "t2i",
    inputs: [],
    outputs: [{ name: "image", kind: "IMAGE" }],
    // THE DECLARED SURFACE (the write plane, phase 2): types and
    // bounds are the image-gen card schema's own — the family door
    // judges defaults and variant presets against this row; the
    // sampler/scheduler closed sets resolve from the ONE engine
    // vocabulary, never hand-copied.
    // + the family's own tail row (audit 004/C4): the reference seat
    // rides AFTER the shared block — the edit families' own head/tail
    // rows are the precedent.
    params: [...diffusionParamRows(), { name: "reference_images", type: "image_list" }],
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
        // THE REFERENCE ARM (audit 004/C4): per-slot LoadImage anchors
        // onto the encoder's dotted images.image_N autogrow keys (the
        // executor's dynamic-path split nests them into the images
        // dict — a bare image_1 kwarg dies), vae on the encoder for the
        // splice. Creation order rides contiguous, no gaps.
        const refs = (p.reference_images ?? []).filter((r) => typeof r === "string" && r.trim() !== "");
        if (refs.length > 0) {
            encInputs.vae = vae;
            refs.forEach((ref, i) => {
                const loaded = isSpell(ref)
                    ? ref
                    : g.node("LoadImage", { image: ref }).out(0);
                encInputs[`images.image_${1 + i}`] = loaded;
            });
        }
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
        // THE GEN DETAILER (the gen detailer serve, operator 2026-11-07,
        // the mod SERVES): a stated region rides the crop_stitch arm —
        // the SAME generic DetailerForEach tail as the edit lanes, over
        // this lane's own conditioning — instead of the plain decode.
        // The card's gate already taught mode-without-region and
        // region-without-crop_stitch; the build branches on the kit's
        // ONE stated-region read, so gate and arm never disagree.
        const region = statedRegion(p);
        if (region !== null) {
            const decoded = g.node("VAEDecode", { samples: sampled.out(), vae }).out();
            const segs = regionSegs(g, region.merged, decoded, region.maskPath);
            return genDetailerSave(g, p, region.merged, {
                image: decoded, segs, model: unet, clip, vae,
                positive: enc.out(0), negative: enc.out(1), seed: p.seed,
            }, runId).out();
        }
        return decodeSave(g, sampled.out(), vae, `${runId}/gen`).out();
    },
};
//# sourceMappingURL=actions.js.map
