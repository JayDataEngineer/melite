export const DECL = {
    "id": "skintokens",
    "form": "form_auto_rig",
    "label": "SkinTokens",
    "description": "Static mesh GLB → generated skeleton + learned skin weights → rigged GLB (TokenRig on GGML, CPU)",
    "engine": "skintokens",
    // No defaults: the declared-plane door's catch (2026-10-12) — the
    // family declares no actions, so it declares no write plane, and
    // device/postprocess had no reader on the estate plane (the
    // engine lane owns its own device choice).
    "genre": "3d",
    "variants": [
        {
            "id": "standard",
            "label": "Standard",
            "group": "Variant",
            "route": "skintokens",
            "cells": [
                {
                    "quant": "native",
                    "label": "Native",
                    "route": "skintokens",
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
};
export const family = {
    name: "family-skintokens",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
//# sourceMappingURL=index.js.map
