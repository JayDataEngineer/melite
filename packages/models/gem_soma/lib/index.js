import { rig } from "./actions.js";
export const DECL = {
    "id": "gem_soma",
    "form": "form_edit",
    "label": "SOMA",
    "description": "GEM-X SOMA pose estimation and retargeting.",
    "engine": "comfyui",
    "unoffered": true,
    // No defaults: the declared-plane door's catch (2026-10-12) — the
    // t2i transcription block (scheduler/width/height/steps/sampler/cfg)
    // composed nothing on this mesh family; the SOMA lane owns its own
    // sampler truth.
    "source": {
        "type": "",
        "repo_id": "nvidia/soma-x",
        "note": ""
    },
    "genre": "other",
    "variants": [
        {
            "id": "standard",
            "label": "Standard",
            "group": "Variant",
            "route": "gem_soma",
            "cells": [
                {
                    "quant": "native",
                    "label": "Native (weightless)",
                    "route": "gem_soma",
                }
            ]
        },
        {
            "id": "default",
            "label": "Default",
            "hint": "The family default — no extra stamps; a fresh card lands here.",
            "group": "Recipe",
            "cells": [],
        }
    ],
    "variant_groups": [
        {
            "id": "Variant",
            "label": "Variant",
        },
        {
            "id": "Quant",
            "label": "Quant",
        },
        {
            "id": "Recipe",
            "label": "Recipe",
            "tooltip": "One-click recipes — patch-only rows that stamp picks onto the draft; Default stamps nothing.",
            "default": "default"
        }
    ],
    // the rig action the rig card binds for its `auto` mode (the
    // SOMA-77 weight transfer — the weights ship in the autorig pack).
    "actions": [rig],
};
export const family = {
    name: "family-gem_soma",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
export { rig } from "./actions.js";
//# sourceMappingURL=index.js.map
