import { seat } from "./actions.js";
export const DECL = {
    "id": "fit",
    "label": "Fit (meld seat)",
    "description": "Analytic bone-scale fitting — the fit-seat verb's node family (weightless: no checkpoint loads).",
    // no engine (absent = comfyui, the contract default); no form,
    // unoffered: a verb family serves no bench surface (the
    // basic_resize precedent) — the flows' family-action stages are
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
            "route": "fit",
            "cells": [
                {
                    "quant": "native",
                    "label": "Native (weightless)",
                    "route": "fit",
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
    // the seat action the fit-seat flow routes to (the fit-seat
    // verb's backend — family-owned nodes; SubActionMod law).
    "actions": [seat],
};
export const family = {
    name: "family-fit",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
export { seat } from "./actions.js";
//# sourceMappingURL=index.js.map
