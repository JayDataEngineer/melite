import { loadTextPair, decodeSave, stackLoras, orderedInputImages, regionSegs, detailerSave, isSpell, laneSampler, laneScheduler, deliverableSizeOf, refuseDeliverableSize } from "@melite/comfyui-card-kit";
import { fireLoras } from "@melite/comfyui-card-kit/guard";
import { parseDiffusionLaneFacts, parseEditCap } from "@melite/comfyui-card-kit/facts";
import { EDIT_DIFFUSION_BOUNDS, diffusionParamRows } from "@melite/comfyui-card-kit/paramRows";
/** The edit facts door: the resolved lane_inputs parsed into the
 *  closed shape. A drifted encoder class refuses here, never
 *  silently routes to another lane's topology. `max_images` is the
 *  node's own truth (16 total, anchor included) and floors at 1 —
 *  a degenerate cap is a DECL bug.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export function parseEditFacts(raw) {
    // The checks + refusal prose live in the kit (J3 consolidation,
    // 2026-10-18); this door projects the parsed core + the edit cap
    // into the family's own typed shape (B4).
    const f = parseDiffusionLaneFacts(raw, "qwen-img-edit-21 edit", { key: "text_encode_node", node: "TextEncodeQwenImage21" }, false);
    return { unet: f.unet, text_encoder: f.text_encoder, vae: f.vae, clip_type: f.clip_type, text_encode_node: f.node, max_images: parseEditCap(raw, "qwen-img-edit-21 edit") };
}
/** The edit action: the cached-reference lane — loaders → lora
 *  stack → text pair → per-slot LoadImage anchors →
 *  QwenImage21Cache + TextEncodeQwenImage21 (pos+neg from one node,
 *  refs on the images.image_N autogrow slots) → EITHER the region
 *  detailer tail (mask_mode crop_stitch) OR KSampler on the
 *  encoder's own anchor-sized latent → decode + save under
 *  <run>/edit. */
export const edit = {
    id: "edit",
    inputs: [],
    outputs: [{ name: "image", kind: "IMAGE" }],
    // THE DECLARED SURFACE (the write plane, phase 2): the
    // image-edit card schema's own types and bounds — the family
    // door judges defaults and variant presets against this row;
    // the closed sets resolve from the ONE engine vocabulary. The
    // region knobs are mod-owned (the advanced tier) and ride the
    // mod plane, not this surface.
    params: [
        { name: "input_images", type: "image_list" },
        { name: "image1", type: "string" },
        { name: "image2", type: "string" },
        { name: "image3", type: "string" },
        { name: "reference_images", type: "image_list" },
        ...diffusionParamRows(EDIT_DIFFUSION_BOUNDS),
        { name: "match_input_resolution", type: "boolean" },
        { name: "use_stock_nodes", type: "boolean" },
        { name: "double_reference", type: "boolean" },
    ],
    facts: parseEditFacts,
    build({ p, facts, model, g, runId }) {
        // THE SIZE DOOR (the resize order, operator 2026-11-12): the
        // shared deliverable-size refusal — the same law the firing gate
        // owns (match ON + stated refuses with the flip in the voice;
        // match OFF demands both integer axes ≥ 16). The engine path and
        // the compose path judge one law: the NEVER-LIE GUARD's blanket
        // refusal died here (it threw on ANY stated pair, before the
        // deliverable tail below ever ran — Match-OFF resizes refused at
        // the engine while compose approved them).
        refuseDeliverableSize(p);
        const seed = p.seed;
        let unet = g.node("UNETLoader", { unet_name: facts.unet, weight_dtype: "default" }).out();
        unet = stackLoras(g, unet, fireLoras(model, p));
        const { clip, vae } = loadTextPair(g, facts);
        // THE ONE LIST (the merge): orderedInputImages refuses mixed
        // vocabularies loud; the anchor is position 0, the references
        // are the rest. THE SHARED CEILING (the max_images law — ONE
        // check) counts the WHOLE list (anchor included) against the
        // DECL cap before any image loads — never drops quiet, never
        // orphans LoadImages. The card's anchor gate pins the empty
        // list; this re-pin covers direct action callers.
        const list = orderedInputImages(p);
        if (list.length === 0) {
            throw new Error(`required param 'input_images' missing on the image-edit card (the first image is the one being edited — the list cannot be empty; legacy drafts may state image1 alone instead)`);
        }
        const cap = facts.max_images;
        if (list.length > cap) {
            throw new Error(`'input_images' fires on the image-edit card (this lane takes ${cap} input images total — the first is the one being edited, ${cap - 1} references — but the list counts ${list.length}; drop ${list.length - cap}) — the TS plane maps every stated image to a slot, never drops one quietly`);
        }
        // THE SPELL ARM rides the anchor verbatim (the wired-tensor
        // law: a $name names a wired stage input, never a file);
        // files/URLs/estate paths keep the LoadImage handoff.
        const anchor = list[0];
        const refs = list.slice(1);
        const image = isSpell(anchor)
            ? anchor
            : g.node("LoadImage", { image: anchor }).out(0);
        // Each stated ref loads ahead of the encodes (creation order IS
        // node-id order); blank refs contribute no input at all. A
        // spelled ref rides verbatim — same wired-tensor law as the
        // anchor; a file keeps its LoadImage.
        const loaded = refs.map((s) => isSpell(s) ? s : g.node("LoadImage", { image: s }).out(0));
        // THE REGION ROW (one merge — the gate's own merge twin): the
        // bag merges UNDER flat params (explicit flat keys win). One
        // region per run; the region arm below reads this row.
        const bag = Array.isArray(p.mask) ? p.mask : [];
        const merged = { ...p };
        const bagObj = bag.length === 1 && typeof bag[0] === "object" && bag[0] !== null ? bag[0] : null;
        if (bagObj) {
            for (const [k, v] of Object.entries(bagObj)) {
                if (merged[k] === undefined)
                    merged[k] = v;
            }
        }
        const maskPath = (merged.input_mask ?? "").trim();
        const mode = (merged.mask_mode ?? "auto");
        const cropStitch = (mode === "full_frame" ? "auto" : mode) === "crop_stitch";
        // THE 2.1 BASE has NO separate edit weights: the edit rides
        // QwenImage21Cache (the reference-prefix KV cache wrapped
        // around the SAME unet) + TextEncodeQwenImage21 conditioned on
        // the anchor images through its own image_N autogrow slots.
        // vae rides the encoder's optional input (reference latents
        // splice); one encoder node emits pos+neg.
        const cached = g.node("QwenImage21Cache", { model: unet, device: "auto", dtype: "default" }).out();
        // THE AUTOGROW KEYS (the live v0.37 law, proven on the engine:
        // execute(clip, prompt, negative_prompt, vae, resolution,
        // images) — the slots ride DOTTED 'images.image_N' node-input
        // keys, the executor's dynamic-path split nests them into the
        // images dict; a bare 'image_1' reaches execute() as a kwarg
        // and dies).
        const images21 = { "images.image_1": image };
        // THE ORDER RIDES CONTIGUOUSLY: refs map onto images.image_2+
        // in order — no gaps, no second concept (the ceiling above
        // already enforced the DECL cap).
        loaded.forEach((ref, i) => {
            images21[`images.image_${2 + i}`] = ref;
        });
        // THE REFERENCE BUDGET (resolution 0): "keeps each reference at
        // its own size, rounded to a multiple of 32" (the node's own
        // object_info tooltip). The official template ships the 1024
        // pixel-budget default; this lane edits the anchor's native
        // frame — the budget's rescale would shrink large sources
        // silently, and the DECL carries no override knob by design.
        const enc21 = g.node("TextEncodeQwenImage21", {
            clip, vae, prompt: p.prompt, negative_prompt: p.negative_prompt ?? "", resolution: 0,
            ...images21,
        });
        // THE REGION DETAILER: the SAME generic arm as the 2511 tail,
        // riding THIS lane's own model and conditioning (the
        // reference vision tokens live in the conditioning — each crop
        // edits against the anchor, the plain arm's contract). No
        // EmptyLatentImage on this path: DetailerForEach encodes and
        // sizes each crop itself (width/height would wire to nothing —
        // the card's gate refuses them field-named).
        if (cropStitch) {
            const segs = regionSegs(g, merged, image, maskPath);
            return detailerSave(g, p, merged, {
                image, segs, model: cached, clip, vae,
                positive: enc21.out(0), negative: enc21.out(1), seed,
            }, runId, deliverableSizeOf(p)).out();
        }
        // THE ENCODER'S LATENT (the latent law, 2026-11-08): KSampler
        // samples enc21's own third output — "Empty latent on the first
        // reference image's size, to match with sampling as any other
        // size shifts the edit" (the node's object_info law; the
        // official template wires the same arm as its switch default).
        // The retired EmptyLatentImage-at-target-size sampled a FOREIGN
        // geometry: the probe pinned the anchor's exact size while the
        // encoder processed references at its resolution budget — the
        // mismatch IS the zoom/shift class this removes. There is no
        // stated size anymore: the output IS the anchor's frame.
        const sampled21 = g.node("KSampler", {
            seed,
            steps: p.steps,
            cfg: p.cfg,
            sampler_name: laneSampler(p),
            scheduler: laneScheduler(p),
            denoise: 1.0,
            latent_image: enc21.out(2),
            model: cached,
            positive: enc21.out(0),
            negative: enc21.out(1),
        });
        // THE ALPHA TAIL (why nothing sits between decode and save):
        // the 2.1 VAE decodes RGBA ("Qwen Image 2.1 VAE … RGBA",
        // engine sd.py VAE detection) and SaveImage's fromarray keeps a
        // 4-channel tensor RGBA on disk — the transparent PNG lands
        // whole, verified on this engine's own outputs. The official
        // background-removal template saves the plain decode too; no
        // SplitImageWithAlpha belongs here.
        return decodeSave(g, sampled21.out(), vae, `${runId}/edit`, deliverableSizeOf(p)).out();
    },
};
//# sourceMappingURL=actions.js.map