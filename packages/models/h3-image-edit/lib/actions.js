import { loadTextPair, decodeSave, stackLoras, orderedInputImages, regionSegs, detailerSave, isSpell, laneSampler, laneScheduler, refuseDeliverableSize, deliverableSizeOf } from "@melite/comfyui-card-kit";
import { fireLoras } from "@melite/comfyui-card-kit/guard";
import { laneInputsReader, parseDiffusionLaneFacts, parseEditCap } from "@melite/comfyui-card-kit/facts";
import { EDIT_DIFFUSION_BOUNDS, diffusionParamRows } from "@melite/comfyui-card-kit/paramRows";
/** The edit facts door: the resolved lane_inputs parsed into the
 *  closed shape. A drifted conditioning class refuses here, never
 *  silently routes to another lane's topology. `max_images` is the
 *  node's own truth (100 autogrow slots, anchor included) and
 *  floors at 1 — a degenerate cap is a DECL bug. Every read rides
 *  the typed lane reader built off the resolved row — a key the
 *  DECL never declared refuses loud.
 *  @param raw the resolved lane_inputs (family ⊕ variant ⊕ cell)
 *  @param model the resolved model row (its lane_inputs ∪ every
 *   variant's own is the DECL's declared key set)
 *  @returns the typed facts the segment factory reads */
export function parseEditFacts(raw, model) {
    const lane = laneInputsReader(model, raw, "h3-image-edit edit");
    const f = parseDiffusionLaneFacts(lane, "h3-image-edit edit", { key: "text_encode_node", node: "MiniMaxH3ImageConditioning" }, false);
    return { unet: f.unet, text_encoder: f.text_encoder, vae: f.vae, clip_type: f.clip_type, text_encode_node: f.node, max_images: parseEditCap(lane, "h3-image-edit edit") };
}
/** The template's own pre-scale (the working-range law): every
 *  stated picture scales to 4 megapixels total (area — the official
 *  template's ResizeImageMaskNode pair: "MiniMax H3 Image doesn't
 *  work well in low resolution", effective band ~4-20MP), then
 *  snaps to the 32-multiple canvas grid (CANVAS_MULTIPLE). The
 *  community identity craft grounds the same law: reference
 *  pictures at 4MP carry the identity (the arthan1011 line). */
function prescale4mp(g, image) {
    const toArea = g.node("ResizeImageMaskNode", {
        input: image,
        "resize_type": "scale total pixels",
        "resize_type.megapixels": 4,
        "scale_method": "area",
    }).out(0);
    return g.node("ResizeImageMaskNode", {
        input: toArea,
        "resize_type": "scale to multiple",
        "resize_type.multiple": 32,
        "scale_method": "area",
    }).out(0);
}
/** The edit action: the official H3-Image template lane — loaders →
 *  lora stack → text pair → per-picture pre-scale (4MP + 32-snap)
 *  → MiniMaxH3ImageConditioning (vae connected: reference latents
 *  anchor identity; the prompt cites <Picture n>) with the canvas
 *  sized by the scaled anchor (GetImageSize) or the stated pair →
 *  ConditioningZeroOut negative → KSampler on the conditioning's
 *  OWN latent → decode + save under <run>/edit. */
export const edit = {
    id: "edit",
    inputs: [],
    outputs: [{ name: "image", kind: "IMAGE" }],
    // THE DECLARED SURFACE (the write plane): the image-edit card
    // schema's own types and bounds — the family door judges defaults
    // and variant presets against this row. NO negative_prompt row:
    // the lane zeroes the negative by design (the template's
    // ConditioningZeroOut arm) — a stated negative has no seat and
    // refuses field-named at the card.
    params: [
        { name: "input_images", type: "image_list" },
        { name: "image1", type: "string" },
        { name: "image2", type: "string" },
        { name: "image3", type: "string" },
        { name: "reference_images", type: "image_list" },
        ...diffusionParamRows(EDIT_DIFFUSION_BOUNDS),
        { name: "match_input_resolution", type: "boolean" },
    ],
    facts: parseEditFacts,
    build({ p, facts, model, g, runId }) {
        // THE SIZE DOOR (the shared refusal — one law, four cells):
        // match ON + a stated pair refuses with the flip in the voice;
        // match OFF demands both integer axes ≥ 16. The stated pair
        // sizes THE CANVAS itself (the conditioning node's own
        // width/height — the node's area law), never a post-decode
        // resize: the sampler renders at the stated canvas.
        refuseDeliverableSize(p);
        const seed = p.seed;
        let unet = g.node("UNETLoader", { unet_name: facts.unet, weight_dtype: "default" }).out();
        unet = stackLoras(g, unet, fireLoras(model, p));
        const { clip, vae } = loadTextPair(g, facts);
        // THE ONE LIST (the merge): orderedInputImages refuses mixed
        // vocabularies loud; the anchor is position 0, the references
        // are the rest. THE SHARED CEILING counts the WHOLE list
        // against the DECL cap (the node's own autogrow max) before any
        // image loads — never drops quiet. The card's anchor gate pins
        // the empty list; this re-pin covers direct action callers.
        const list = orderedInputImages(p);
        if (list.length === 0) {
            throw new Error(`required param 'input_images' missing on the image-edit card (the first image is the one being edited — the list cannot be empty; legacy drafts may state image1 alone instead)`);
        }
        const cap = facts.max_images;
        if (list.length > cap) {
            throw new Error(`'input_images' fires on the image-edit card (this lane takes ${cap} input images total — the first is the one being edited, ${cap - 1} references — but the list counts ${list.length}; drop ${list.length - cap}) — the TS plane maps every stated image to a slot, never drops one quietly`);
        }
        // THE PRE-SCALE ARM: every stated picture — anchor AND
        // references, the template's own multi-image law ("add extra
        // Load Image nodes, plug the output to ... MiniMax H3 Image
        // Conditioning") — rides the 4MP + 32-snap chain; a spell rides
        // the chain too (the resize composes over the wired tensor,
        // same as any file's decode).
        const scaled = list.map((s) => {
            const loaded = isSpell(s)
                ? s
                : g.node("LoadImage", { image: s }).out(0);
            return prescale4mp(g, loaded);
        });
        // THE CANVAS (the geometry law): a stated pair (match OFF)
        // sizes the conditioning canvas directly; otherwise the scaled
        // anchor's own size (GetImageSize — the template's exact
        // wiring) IS the canvas: the render works at the anchor's 4MP
        // frame, no post-decode resize anywhere.
        const stated = deliverablePair(p);
        const anchorSize = stated ? null : g.node("GetImageSize", { image: scaled[0] });
        const canvasW = stated ? stated.width : anchorSize.out(0);
        const canvasH = stated ? stated.height : anchorSize.out(1);
        // ONE conditioning node: vae ALWAYS rides the edit lane (the
        // pictures anchor as reference latents — the node's own tooltip
        // law), the prompt cites pictures as <Picture 1>, <Picture 2>,
        // ..., and the slots ride DOTTED 'images.image_N' keys (the
        // executor's dynamic-path split; a bare 'image_1' kwarg dies).
        // Creation order rides contiguously — no gaps.
        const condInputs = {
            clip,
            vae,
            prompt: p.prompt,
            width: canvasW,
            height: canvasH,
        };
        scaled.forEach((img, i) => {
            condInputs[`images.image_${1 + i}`] = img;
        });
        const enc = g.node("MiniMaxH3ImageConditioning", condInputs);
        // THE NEGATIVE (the template's own arm): the positive zeroed —
        // distilled guidance at cfg 1; the lane has NO negative_prompt
        // seat.
        const negative = g.node("ConditioningZeroOut", { conditioning: enc.out(0) }).out();
        // THE REGION DETAILER (the generic crop_stitch tail, riding
        // THIS lane's own conditioning): the bag merges UNDER flat
        // params (the gate's own merge twin), mask_mode crop_stitch
        // replaces the whole generate — regionSegs over the SCALED
        // anchor (the 4MP frame the conditioning itself would see),
        // DetailerForEach reworks each crop against the lane's own
        // positive/zeroed negative, save under <run>/edit. No latent is
        // sampled on this path (the detailer encodes and sizes each
        // crop itself).
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
        if (cropStitch) {
            const segs = regionSegs(g, merged, scaled[0], maskPath);
            return detailerSave(g, p, merged, {
                image: scaled[0], segs, model: unet, clip, vae,
                positive: enc.out(0), negative, seed,
            }, runId, deliverableSizeOf(p)).out();
        }
        const sampled = g.node("KSampler", {
            seed,
            steps: p.steps,
            cfg: p.cfg,
            sampler_name: laneSampler(p),
            scheduler: laneScheduler(p),
            denoise: 1.0,
            latent_image: enc.out(1),
            model: unet,
            positive: enc.out(0),
            negative,
        });
        return decodeSave(g, sampled.out(), vae, `${runId}/edit`).out();
    },
};
/** The stated canvas pair (match_input_resolution OFF + both axes
 *  ≥ 16 — refuseDeliverableSize already judged the law); undefined
 *  when the canvas derives from the scaled anchor. */
function deliverablePair(p) {
    if (p.match_input_resolution !== false)
        return undefined;
    const width = p.width;
    const height = p.height;
    if (typeof width !== "number" || typeof height !== "number")
        return undefined;
    return { width, height };
}
//# sourceMappingURL=actions.js.map
