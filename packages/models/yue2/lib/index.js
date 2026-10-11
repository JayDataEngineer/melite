import { compose } from "./actions.js";
export const DECL = {
    "id": "yue2",
    "form": "form_music",
    "label": "YuE2",
    "description": "YuE2-3B music generation — style + lyrics with ABC planning",
    "engine": "comfyui",
    "source": {
        "type": "huggingface",
        "repo_id": "Comfy-Org/YuE2",
        "note": "The official Comfy-Org release (template audio_yue2_text2music); int8 convrot is the template's own quant pick. The bf16 cell and the SheetSage2 cover encoder stay unboarded until a cover lane exists."
    },
    "genre": "audio",
    "variants": [
        {
            "id": "standard",
            "label": "Standard",
            "group": "Variant",
            "route": "yue2",
            "cells": [
                {
                    // The stale source died (2026-10-13): the lane loads the
                    // Comfy-Org checkpoint the provisions row carries.
                    "quant": "int8",
                    "label": "INT8 ConvRot",
                    "route": "yue2",
                    "vram_peak_gb": 8,
                }
            ]
        },
        {
            "id": "short_sting",
            "label": "Short Sting",
            "hint": "Duration 5s — the card schema's own floor (a sting or loop).",
            "group": "Recipe",
            "wire_defaults": { "duration": 5 },
            "cells": [],
        },
        {
            "id": "full_length",
            "label": "Full Length",
            "hint": "Duration 360s — the card schema's own ceiling (full-song length).",
            "group": "Recipe",
            "wire_defaults": { "duration": 360 },
            "cells": [],
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
            "id": "Recipe",
            "label": "Recipe",
            "tooltip": "One-click recipes — patch-only rows that stamp picks onto the draft; Default stamps nothing.",
            "default": "default"
        }
    ],
    "has_inference": true,
    "lane_inputs": {
        "checkpoint": "yue2_3b_int8_convrot.safetensors"
    },
    "provisions": [
        {
            "name": "yue2_3b_int8_convrot.safetensors",
            "url": "https://huggingface.co/Comfy-Org/YuE2/resolve/main/checkpoints/yue2_3b_int8_convrot.safetensors",
            "folder": "checkpoints",
            "sha256": "96fe199377309001ed8cd26a944baeee8cc31a20ba7c36d1d3c0a7e1f4149db6",
            "size_bytes": 3960938800
        }
    ],
    // THE REQUIRED WORD, STATED (2026-10-10, the DECL audit's gap 4 —
    // the GAP-7 shape on the legacy lanes): the card's compose seat has
    // refused this field since the merge, imperatively, while the bench
    // admitted the same draft — a state the form could build and the run
    // refused. Stated as the law, the bench-write door refuses it first,
    // in the field's voice (the tts precedent: this is the one relation
    // word that deliberately overrides the blank tolerance, and this
    // field is exactly the one where "still being typed" composes
    // nothing).
    "relations": {
        "required": [
            {
                "fields": ["prompt"],
                "cure": "every music lane states WHAT the song is — write the caption",
            },
        ],
    },
    // THE DECLARED ACTIONS (the atom vocabulary, stroke 3):
    // the compose action the music card binds (the YuE2-3B lane).
    // The admission gate runs the facts parse at registration.
    "actions": [compose],
};
export const family = {
    name: "family-yue2",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
export { compose, parseYue2Facts } from "./actions.js";
//# sourceMappingURL=index.js.map
