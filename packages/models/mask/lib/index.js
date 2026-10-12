import { IMPACT_DETECTOR_PROVISIONS } from "@melite/comfyui-card-kit";
import { select } from "./actions.js";
/** THE FAMILY OWNS THE DOWNLOADS (operator order, 2026-10-12:
 * "THEY ARE MODELS — THEY SHOULD DOWNLOAD LIKE ALL OTHER MODELS"):
 * the six weights this family's lanes load are FAMILY provisions —
 * fetched through the ONE download door by the family id
 * (provision_model model=mask-select), hashed and size-pinned like
 * every other family's weights. The card SERVES these rows to its
 * arm-weight gate (it never authors its own — image/mask's
 * card.spec pins the identity); hashes minted by direct download
 * (the supply-chain law: a declared hash is a VERIFIED hash). */
export const PROVISIONS = [
    {
        // THE SAM3 CHECKPOINT (the red-box hunt, 2026-10-08: the pin
        // existed since stroke ~40 but the weight was NEVER fetched —
        // the engine silently dropped the whole mask arm). The official
        // ComfyUI conversion.
        name: "sam3.1_multiplex_fp16.safetensors",
        url: "https://huggingface.co/Comfy-Org/sam3.1/resolve/main/checkpoints/sam3.1_multiplex_fp16.safetensors",
        folder: "checkpoints",
        sha256: "9ba99c92703c2e8b4f47de2d34a539bb8e18923049e238b780d70dbe6368eb03",
        size_bytes: 1745546848,
    },
    {
        name: "rt_detr_v4-x-hgnet_fp32.safetensors",
        url: "https://huggingface.co/Comfy-Org/SDPose/resolve/main/diffusion_models/rt_detr_v4-x-hgnet_fp32.safetensors",
        folder: "diffusion_models",
        sha256: "1ba4a7794c2f8b176327c887ba38fbe0f977049cbef149960288aa923d0239f3",
        size_bytes: 247790660,
    },
    {
        name: "sam2.1_hiera_large.pt",
        url: "https://huggingface.co/facebook/sam2.1-hiera-large/resolve/main/sam2.1_hiera_large.pt",
        folder: "sams",
        sha256: "2647878d5dfa5098f2f8649825738a9345572bae2d4350a2468587ece47dd318",
        size_bytes: 898083611,
    },
    ...IMPACT_DETECTOR_PROVISIONS,
];
/** The detector subset the FAMILY owns for sharing (the class law,
 *  2026-10-12): the image-edit card's crop_stitch arm fetches the
 *  same three Impact detectors — it SERVES this export by identity
 *  (whole array) with `provisionOwner` stamped to the family, so its
 *  rows are the family's rows and the rescue names the family id.
 *  The row objects are the frozen kit constants `PROVISIONS` above
 *  spreads — one truth, two consumers, no card-authored bytes. */
export const DETECTOR_PROVISIONS = [...IMPACT_DETECTOR_PROVISIONS];
// THE TOOL FAMILY (the F1 shape): a selection tool, not a generative
// model — `unoffered: true` registers the atom (the actions admission
// gate runs at boot; the card's declaredAction binding resolves
// against it) while serving no catalog row, so no model dropdown
// gains a selection tool as a pickable base. The family id is
// mask-select, NOT the card's id — the h3 pattern (family h3, card
// h3-timeline): the card's id must keep resolving to the CARD (the
// form-spec door asks the models seat first, and a family key
// shadows the card arm — discovery.spec's mask envelope wall catches
// exactly that), and the bench plane keeps the self-naming strip for
// era rows. The three weights are the family's constants (actions.ts
// MASK_WEIGHTS — the LANE_FILES pattern), so the row carries no
// lane_inputs. ONE variant, ONE address, no cells: the family's id
// is its own route — and its six weights DOWNLOAD through the family
// provisions above, like every other model (no separate
// card-provision behavior).
export const DECL = {
    "id": "mask-select",
    "label": "Mask",
    "description": "The mask studio's selection lane — SAM3 CLIP/RT-DETR detection, the SAM2 impact-pack arm, and paint exports, as one declared action the mask card binds.",
    "genre": "image",
    "unoffered": true,
    "provisions": PROVISIONS,
    "variants": [
        {
            "id": "select",
            "label": "Select",
            "group": "Variant",
            "route": "mask-select",
            "cells": [],
        },
    ],
    // THE FAMILY DOOR (the atom vocabulary, stroke 0): the select
    // action's facts parse runs over the family row and every variant
    // merge AT REGISTRATION — here it closes over the family's own
    // weight constants (an empty row is the family's whole truth).
    "actions": [select],
};
export const family = {
    name: "family-mask",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
// The family's offered actions (the atom vocabulary): the select
// segment the mask card binds. The card imports this beside the DECL
// — the family's whole offer, one face. PROVISIONS rides too: the
// card serves the family's rows to its arm-weight gate (the
// provisions-identity pin, image/mask card.spec).
export { select, parseMaskLaneFacts, MASK_WEIGHTS } from "./actions.js";
//# sourceMappingURL=index.js.map
