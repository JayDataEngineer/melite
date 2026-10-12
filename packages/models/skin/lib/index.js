import { coat } from "./actions.js";
export const DECL = {
    "id": "skin",
    "label": "Skin (meld coat)",
    "description": "Deterministic skin detail maps onto a SOMAX body — the apply-skin verb's node family (weightless: no checkpoint loads).",
    // no engine (absent = comfyui, the contract default); no form,
    // unoffered: a verb family serves no bench surface (the
    // weightless-verb precedent) — the flows' family-action stages are
    // its only riders.
    "unoffered": true,
    "genre": "3d",
    // no Recipe `default` variant row: the served siblings carry it
    // because their cards ride quant/recipe lanes; this family has no
    // card, so no lane ever resolves a variant — the standard row
    // exists only to give the DECL a non-empty truth.
    "variants": [
        {
            "id": "standard",
            "label": "Standard",
            "group": "Variant",
            "route": "skin",
            "cells": [
                {
                    "quant": "native",
                    "label": "Native (weightless)",
                    "route": "skin",
                },
            ],
        },
    ],
    "variant_groups": [
        {
            "id": "Variant",
            "label": "Variant",
        },
    ],
    // the coat action the skin-apply flow routes to (the apply-skin
    // verb's backend — family-owned nodes; SubActionMod law).
    "actions": [coat],
};
export const family = {
    name: "family-skin",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
export { coat } from "./actions.js";
//# sourceMappingURL=index.js.map
