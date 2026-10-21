// @melite/models-z-image/src — the z-image family declaration
// (generated 2026-09-08 from the frozen registry + facts, then
// hand-owned: this file IS the family's truth — a change here is a
// family change, nothing else moves).
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
// the ctx.models augmentation rides the models service module
// (same seam as ctx.comfyui through ./service):
import { ModelsServiceFace } from '@melite/comfyui-card-kit/service-faces'
import type { ModelDecl } from '@melite/comfyui-card-kit/model-contract'
import { t2i } from "./actions.ts";

export const DECL: ModelDecl = {
  "id": "z-image",
  "form": "form_generate",
  "label": "Z-Image",
  "description": "Fast Z-Image / Z-Image Turbo text-to-image generation.",
  "engine": "comfyui",
  "defaults": {
    "scheduler": "simple",
    "width": 1024,
    "height": 1024,
    "steps": 8,
    "sampler": "res_multistep",
    "cfg": 1,
    "negative_prompt": null
  },
  "genre": "image",
  // THE REQUIRED DEFAULTS (operator contract 2026-11-07): every
  // variant row declares its own steps+cfg in resolver_defaults —
  // the family defaults can never substitute for a variant's face
  // (the turbo 8/1 is the family's DEFAULT, never a recipe row's
  // silent ride). prompt is the user-provided seat.
  "required_defaults": [
    { "name": "steps", "class": "variant" },
    { "name": "cfg", "class": "variant" },
    { "name": "prompt", "class": "user" }
  ],
  "mods": ["mask", "loras", "controlnet", "ip_adapter"],
  // THE MASK BOARDING (operator order 2026-11-07: the MASK mod
  // serves on EVERY img-gen model — the MASK-C no-board is
  // superseded): boards 'mask' as the bare flavor (mods/mask.ts,
  // composed in cordis cardDefs) — the region vocabulary is
  // DECLARED surface on the card (the bag + fields ride admission,
  // MASK_RIDERS); no gen lane builds a region arm yet, so a STATED
  // region refuses LOUD at the firing gate (E2-11: never
  // 'unknown-param' — it is a mod — and never a silent plain run;
  // the voice teaches the image-edit lane, where regions compose).
  "variants": [
    {
      "id": "turbo",
      "label": "Turbo",
      "hint": "8-step distilled — fast (DEFAULT). Official truth: res_multistep + simple, shift 3, cfg 1 (cfg 1 is NOT an official base mode — the distillation IS the mode).",
      "group": "Variant",
      "route": "z-image",
      "order": 0,
      // The turbo face declared, never inherited (the variant-sampler-defaults
      // law): 8 / 1 — the official turbo template's own pair.
      // THE ENVELOPE DECLARATION LAW (CONTRACTS §4 debt 27, the E2-8
      // cure's drain): the distilled domain — the official turbo
      // template's 8/1 rides; the base lane's 25/4 refuses on BOTH
      // knobs (the distilled convention shared with krea-turbo and
      // flux-distilled: steps [4, 8], cfg [1, 2]).
      "sampler_envelope": { "steps": [4, 8], "cfg": [1, 2] },
      "resolver_defaults": { "steps": 8, "cfg": 1 },
      "cells": [
        {
          "quant": "int8",
          "label": "INT8 ConvRot",
          "route": "z-image-int8",
          "vram_peak_gb": 14,
        }
      ]
    },
    {
      "id": "base",
      "label": "Base",
      "hint": "The full base model - no distillation; more steps, top quality. Official truth: 25 steps, cfg 4 (card range 3.0–5.0; real negative path — cfg 1 is turbo-only).",
      "group": "Variant",
      "route": "z-image-base",
      "order": 1,
      // The base face declared, never inherited (the variant-sampler-defaults
      // law): 25 / 4 — the official base template's own pair, NOT the
      // family turbo mirror.
      // THE ENVELOPE DECLARATION LAW (CONTRACTS §4 debt 27): the base
      // domain — cfg [3, 5] IS the hint's stated card range
      // (3.0–5.0); steps [20, 30] centers the official 25-step
      // template (the kroma-base [25, 35]-around-28 shape). The
      // turbo pair 8/1 refuses on BOTH knobs (cfg 1 is turbo-only —
      // the hint says so verbatim).
      "sampler_envelope": { "steps": [20, 30], "cfg": [3, 5] },
      "resolver_defaults": { "steps": 25, "cfg": 4 },
      "cells": [
        {
          "quant": "int8",
          "label": "INT8",
          "route": "z-image-base-int8",
          "vram_peak_gb": 14,
        }
      ]
    },
    {
      "id": "default",
      "label": "Default",
      "hint": "The family default — no extra stamps; a fresh card lands here.",
      "group": "Recipe",
      "cells": [],
    },
    // RULE A — THE RECIPE LAW (2026-09-18): the FUNCTIONAL presets
    // (photorealism, restoration) stamp the bag at the flavor's own
    // declared strength; style rows stay Modifiers-menu picks.
    {
      "id": "realism",
      "label": "Realism",
      "hint": "The photorealism adapter at its declared 0.7.",
      "group": "Recipe",
      "wire_defaults": {
        "loras": [{ "id": "zimage_realism", "strength": 0.7 }],
      },
      "cells": [],
    },
    {
      "id": "dejpeg",
      "label": "DeJPEG",
      "hint": "Restoration at its declared 1.0 — for recompressed source images.",
      "group": "Recipe",
      "wire_defaults": {
        "loras": [{ "id": "zimage_dejpeg", "strength": 1.0 }],
      },
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
  // THE LANE SURFACE (the edit-2511 precedent): exactly the knobs the
  // create card serves — no reference seat (operator ruling,
  // 2026-10-11); the face-lane unity wall judges the face against it.
  "params": [
    "prompt",
    "negative_prompt",
    "width",
    "height",
    "seed",
    "steps",
    "cfg",
    "sampler",
    "scheduler",
  ],
  "lane_inputs": {
    "clip_type": "lumina2",
    "latent_node": "EmptySD3LatentImage",
    "sampling_shift": 3,
    "text_encoder": "qwen_3_4b.safetensors",
    "unet": "z_image_turbo_int8_convrot.safetensors",
    "vae": "ae.safetensors"
  },
  // GHOST DEBT CLEARED (2026-10-12 model audit, fix 4): the lane's
  // three weights are provisioned from Comfy-Org's split-files repo.
  "provisions": [
    {
      "name": "z_image_turbo_int8_convrot.safetensors",
      "url": "https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/diffusion_models/z_image_turbo_int8_convrot.safetensors",
      "folder": "diffusion_models",
      "sha256": "be517ebd47c912a5626a588e1aeea43e6be4a43c0cdcd2b48a2a780d9f358635",
      "size_bytes": 6201001296
    },
    {
      "name": "qwen_3_4b.safetensors",
      "url": "https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/text_encoders/qwen_3_4b.safetensors",
      "folder": "text_encoders",
      "sha256": "6c671498573ac2f7a5501502ccce8d2b08ea6ca2f661c458e708f36b36edfc5a",
      "size_bytes": 8044982048
    },
    {
      "name": "ae.safetensors",
      "url": "https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/vae/ae.safetensors",
      "folder": "vae",
      "sha256": "afc8e28272cd15db3919bacdb6918ce9c1ed22e96cb12c4d5ed0fba823529e38",
      "size_bytes": 335304388
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
        "cure": "every image lane states WHAT the picture is — write the prompt",
      },
    ],
  },
  // THE FAMILY DOOR (the atom vocabulary, stroke 0): the t2i
  // action's facts parse runs over this row and every variant
  // merge AT REGISTRATION — a drifted lane_input (a renamed latent
  // class, a bad variant override) refuses at boot in the door's
  // own voice, never at first compose.
  "actions": [t2i],

};

export const family: Plugin = {
  name: "family-z-image",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};

// The family's offered actions (the atom vocabulary): the t2i
// segment the image-gen card binds. The card imports this beside
// the DECL — the family's whole offer, one face.
export { t2i, parseT2IFacts, type T2IFacts, type T2IParams } from "./actions.ts";

// The Loader-row face: DSH loads plugin rows by bare specifier and
// unwraps `exports.default ?? exports` (vendor/cordis_plugins/loader
// unwrapExports) — the default export IS the row-loadable plugin. The
// named `family` stays the library face (engine loadFamilies).
export { family as default };
