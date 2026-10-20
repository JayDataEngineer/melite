// families/image/seedvr2-ema.ts — the seedvr2-ema family declaration
// (generated 2026-09-08 from the frozen registry + facts, then
// hand-owned: this file IS the family's truth — a change here is a
// family change, nothing else moves).
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import { ModelsServiceFace } from '@melite/comfyui-card-kit/service-faces'
import type { ModelDecl } from '@melite/comfyui-card-kit/model-contract'
import { upscale } from "./actions.ts";

export const DECL: ModelDecl = {
  "id": "seedvr2-ema",
  "form": "form_upscale",
  "label": "SeedVR2 Upscaler",
  "description": "SeedVR2 diffusion-based super-resolution (3B EMA FP16 default, 7B EMA FP8",
  "engine": "comfyui",
  "defaults": {
    "batch_size": 1,
    "max_resolution": 4096,
    "resolution": 1080
  },
  "genre": "image",
  // THE REQUIRED DEFAULTS (operator contract 2026-11-07): the
  // user-provided seat(s) — the compose caller provides them. No
  // variant-class rows: this family's served face exposes no
  // steps+cfg pair (the census's surface-derived carve).
  "required_defaults": [
    { "name": "input_image", "class": "user" }
  ],
  "variants": [
    {
      // THE QUANT AXIS CONTRACT (E2-4, the operator's burn: "THE
      // MODEL / VARIANT / RECIPE LAYOUT IS MISSING QUANT! … WHERE IS
      // THE SHARED VOCAB HERE AS A CONTRACT?"): the tiers are CELLS
      // on the Quant axis — one per real provisioned body, each
      // naming its own route and its own weights file (CellRow's
      // lane stamps, merged base ← variant ← cell) — never faces
      // stuffed into the variant label until the row spills over
      // the Model beside it. The krea-2 pattern verbatim.
      "id": "3b",
      "label": "3B",
      "hint": "3B EMA — fast, ~7 GB VRAM at FP16 (DEFAULT). Precision is the Quant axis.",
      "group": "Variant",
      "route": "seedvr2-ema",
      "order": 0,
      "cells": [
        {
          "quant": "fp16",
          "label": "FP16",
          "route": "seedvr2-ema",
          "lane_inputs": {
            "unet": "seedvr2_ema_3b_fp16.safetensors"
          }
        },
        {
          "quant": "fp8",
          "label": "FP8 (~3.4 GB)",
          "route": "seedvr2-ema-fp8",
          "lane_inputs": {
            "unet": "seedvr2_ema_3b_fp8_e4m3fn.safetensors"
          }
        },
      ]
    },
    {
      "id": "7b",
      "label": "7B",
      "hint": "7B EMA fp8_e4m3fn (mixed block-35 fp16) — beefier fine detail, ~3× slower. One precision body; no tier choice.",
      "group": "Variant",
      "route": "seedvr2-ema-7b",
      "order": 1,
      "cells": []
    },
    {
      "id": "vae-fp16",
      "label": "VAE FP16",
      "hint": "EMA VAE helper weights — hidden (folded in 2026-08-16)",
      "group": "Variant",
      "route": "seedvr2-ema-vae-fp16",
      "order": 4,
      "cells": []
    },
    {
      "id": "preview-256",
      "label": "Preview 256",
      "hint": "Resolution 256 — the card schema's own floor (256–2160): a fast preview upscale.",
      "group": "Recipe",
      "wire_defaults": { "resolution": 256 },
      "cells": [],
    },
    {
      "id": "fhd-1080",
      "label": "FHD 1080",
      "hint": "Resolution 1080 — this family's own default and the card's FHD rail (1080 = FHD rail), inside the card schema's bounds (256–2160).",
      "group": "Recipe",
      "wire_defaults": { "resolution": 1080 },
      "cells": [],
    },
    {
      "id": "uhd-2160",
      "label": "UHD 2160",
      "hint": "Resolution 2160 — the card schema's own ceiling (256–2160): maximum-detail upscale.",
      "group": "Recipe",
      "wire_defaults": { "resolution": 2160 },
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
  "lane_inputs": {
    "unet": "seedvr2_ema_3b_fp16.safetensors",
    "vae": "ema_vae_fp16.safetensors"
  },
  // GHOST DEBT CLEARED (2026-10-12 model audit, fix 4): the fp16
  // conversion pair from numz' comfy repack; SEEDVR2 folder maps via
  // the endpoint's extra_model_folders (the pack registers the type).
  // The fp8 3B row (bytes audit, 2026-10-13): the pack's DEFAULT_DIT
  // IS this file — the loader resolves it out of the box, so the DECL
  // declares it or the door cannot provision the default the engine
  // would otherwise name. sha256 + size from the pack's own model
  // registry (the pack's own model registry) and the hub's x-linked-size.
  "provisions": [
    {
      "name": "seedvr2_ema_3b_fp16.safetensors",
      "url": "https://huggingface.co/numz/SeedVR2_comfyUI/resolve/main/seedvr2_ema_3b_fp16.safetensors",
      "folder": "SEEDVR2",
      "sha256": "2fd0e03a3dad24e07086750360727ca437de4ecd456f769856e960ae93e2b304",
      "size_bytes": 6783018808
    },
    {
      "name": "seedvr2_ema_3b_fp8_e4m3fn.safetensors",
      "url": "https://huggingface.co/numz/SeedVR2_comfyUI/resolve/main/seedvr2_ema_3b_fp8_e4m3fn.safetensors",
      "folder": "SEEDVR2",
      "sha256": "3bf1e43ebedd570e7e7a0b1b60d6a02e105978f505c8128a241cde99a8240cff",
      "size_bytes": 3391544696
    },
    {
      "name": "ema_vae_fp16.safetensors",
      "url": "https://huggingface.co/numz/SeedVR2_comfyUI/resolve/main/ema_vae_fp16.safetensors",
      "folder": "SEEDVR2",
      "sha256": "20678548f420d98d26f11442d3528f8b8c94e57ee046ef93dbb7633da8612ca1",
      "size_bytes": 501324814
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
        "fields": ["input_image"],
        "cure": "an upscale needs its source — state the image to upscale",
      },
    ],
  },

  // THE LANE SURFACE (the z-image precedent): exactly the knobs the
  // upscale-tools card serves.
  "params": [
    "input_image",
    "resolution", "max_resolution", "batch_size", "seed",
  ],

  // THE FAMILY'S DECLARED ACTIONS (the atom vocabulary, stroke 3):
  // the upscale-tools card binds this segment through ACTION_BINDINGS —
  // the admission gate runs the facts parse at registration.
  "actions": [upscale],

};



export const family: Plugin = {
  name: "family-seedvr2-ema",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};

export { upscale, parseUpscaleFacts, type UpscaleFacts, type UpscaleParams } from "./actions.ts";

// The Loader-row face: DSH loads plugin rows by bare specifier and
// unwraps `exports.default ?? exports` (vendor/cordis_plugins/loader
// unwrapExports) — the default export IS the row-loadable plugin. The
// named `family` stays the library face (engine loadFamilies).
export { family as default };
