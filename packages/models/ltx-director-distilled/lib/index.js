export const DECL = {
    "id": "ltx-director-distilled",
    "label": "LTX 2.3",
    "description": "LTX 2.3 text- and image-to-video generation via the Director workflow.",
    "unoffered": true,
    // No defaults: the declared-plane door's catch (2026-10-12) — the
    // family declares no actions, so it declares no write plane, and
    // the transcription keys composed nothing (no card names them for
    // this family; the run router and engine lane own their truths).
    "genre": "video",
    "variants": [
        {
            "id": "dev",
            "label": "Dev FP8",
            "hint": "30+ step, max quality — different checkpoint",
            "group": "Variant",
            "route": "ltx-director-dev",
            "order": 1,
            "cells": []
        },
        {
            "id": "distilled",
            "label": "Distilled",
            "hint": "8-step, ~3s/segment on a 4090 — fast preview tier",
            "group": "Variant",
            "route": "ltx-director-distilled",
            "order": 0,
            "cells": []
        },
        {
            "id": "legacy",
            "label": "LTX-2 (legacy)",
            "hint": "Legacy standard route — same distilled-1.1 checkpoint as the head; folded in from video/ltx2 (2026-08-16 combine), hidden",
            "group": "Variant",
            "route": "ltx2",
            "order": 3,
            "cells": []
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
};
export const family = {
    name: "family-ltx-director-distilled",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
//# sourceMappingURL=index.js.map
