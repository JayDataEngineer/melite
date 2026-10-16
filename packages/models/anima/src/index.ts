// @melite/models-anima/src — the anima family declaration
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
  "id": "anima",
  "form": "form_generate",
  "label": "Anima",
  "description": "Anime/illustration text-to-image. Cosmos-Predict2 base with Danbooru-style prompting.",
  "engine": "comfyui",
  "defaults": {
    "width": 1024,
    "height": 1024,
    "steps": 30,
    "sampler": "er_sde",
    "scheduler": "simple",
    "cfg": 4
  },
  "genre": "image",
  // MASK-C (the image-gen region gap — deliberate no-board): no
  // 'mask' — the anime T2I lane takes no region input upstream and
  // no edit lane shares these weights. Serving the mask surface
  // would promise what no lane builds; a stated mask refuses LOUD
  // at admission like every undeclared key. THE LORAS BOARDING
  // (operator 2026-11-06: every family applies LoRAs): boards
  // 'loras' — the pack's fired lane fires on every boarding atom;
  // no first-party rows yet, so user filename rows pass through
  // and unknown ids refuse at compose naming the empty registry.
  "mods": [
    "loras"
  ],
  // THE THREE CHECKPOINTS (operator 2026-10-16: Base v1.0,
  // Turbo v1.1, Aesthetic v1.1 — upstream's own names, one Variant
  // row each). The axes are TOKENS (the qwen 2.1 matrix law,
  // 2026-10-24): Variant = Base/Turbo/Aesthetic, Quant =
  // int8_convrot/bf16. The single f32 "standard" row died here —
  // the convrot tier serves below it (Bedovyy's int8convrot quant:
  // ~2.6GB, 12GB cards welcome per their 3060 speed tables) and
  // BF16 rides beside it (the official split_files, ~4.2GB).
  // The base row keeps route "anima" (existing drafts resolve
  // migration-free); turbo stamps its upstream marriage (CFG 1,
  // 8 steps — the Civitai version card's own prescription).
  "variants": [
    {
      "id": "base",
      "label": "Base v1.0",
      "hint": "Base v1.0 — the pretrained base (maximum flexibility; LoRAs train here). INT8 ConvRot is the served tier (DEFAULT); BF16 beside it.",
      "group": "Variant",
      "route": "anima",
      "order": 0,
      "cells": [
        {
          "quant": "int8_convrot",
          "label": "INT8 ConvRot",
          "route": "anima-int8",
          "vram_peak_gb": 12,
          "lane_inputs": {
            "unet": "anima-base-v1.0-int8convrot.safetensors"
          },
          "artifact": {
            "source_url": "https://huggingface.co/Bedovyy/Anima-INT8/resolve/main/anima-base-v1.0-int8convrot.safetensors",
            "size_bytes": 2649827358,
            "sha256": "1ee1da031d651cea747716afccedd45b1c51317330a3e2393da08f013174fd69",
            "dest_root": "COMFYUI_ROOT",
            "dest_sub": "diffusion_models",
            "size_hint_gb": 2.7
          }
        },
        {
          "quant": "bf16",
          "label": "BF16",
          "route": "anima-bf16",
          "vram_peak_gb": 20,
          "lane_inputs": {
            "unet": "anima-base-v1.0.safetensors"
          }
        }
      ]
    },
    {
      "id": "turbo",
      "label": "Turbo v1.1",
      "hint": "Turbo v1.1 — the distilled weights (fast generations; stamps 8 steps at CFG 1, upstream's own prescription). Same two tiers.",
      "group": "Variant",
      "route": "anima-turbo",
      "order": 1,
      "resolver_defaults": { "steps": 8, "cfg": 1 },
      "cells": [
        {
          "quant": "int8_convrot",
          "label": "INT8 ConvRot",
          "route": "anima-turbo-int8",
          "vram_peak_gb": 12,
          "lane_inputs": {
            "unet": "anima-turbo-v1.1-int8convrot.safetensors"
          },
          "artifact": {
            "source_url": "https://huggingface.co/Bedovyy/Anima-INT8/resolve/main/anima-turbo-v1.1-int8convrot.safetensors",
            "size_bytes": 2649848838,
            "sha256": "c462bea054de87ea03000e83f2b60e6d58fbcb6b925d9f607f8a470eeaad52b4",
            "dest_root": "COMFYUI_ROOT",
            "dest_sub": "diffusion_models",
            "size_hint_gb": 2.7
          }
        },
        {
          "quant": "bf16",
          "label": "BF16",
          "route": "anima-turbo-bf16",
          "vram_peak_gb": 20,
          "lane_inputs": {
            "unet": "anima-turbo-v1.1.safetensors"
          },
          "artifact": {
            "source_url": "https://huggingface.co/circlestone-labs/Anima/resolve/main/split_files/diffusion_models/anima-turbo-v1.1.safetensors",
            "size_bytes": 4182230656,
            "sha256": "fba11953276b57edf59d1dc4f1857ac05aa079c56f982b4d7c20298d57d3f7eb",
            "dest_root": "COMFYUI_ROOT",
            "dest_sub": "diffusion_models",
            "size_hint_gb": 4.2
          }
        }
      ]
    },
    {
      "id": "aesthetic",
      "label": "Aesthetic v1.1",
      "hint": "Aesthetic v1.1 — fine-tuned for consistency and a stronger default style (less diverse than base; quality tags optional). Same two tiers.",
      "group": "Variant",
      "route": "anima-aesthetic",
      "order": 2,
      "cells": [
        {
          "quant": "int8_convrot",
          "label": "INT8 ConvRot",
          "route": "anima-aesthetic-int8",
          "vram_peak_gb": 12,
          "lane_inputs": {
            "unet": "anima-aesthetic-v1.1-int8convrot.safetensors"
          },
          "artifact": {
            "source_url": "https://huggingface.co/Bedovyy/Anima-INT8/resolve/main/anima-aesthetic-v1.1-int8convrot.safetensors",
            "size_bytes": 2649848838,
            "sha256": "3fcddb378b9b2ffab20878ed8fb379ae2c34005ba327f475d2cd3b9e91350cda",
            "dest_root": "COMFYUI_ROOT",
            "dest_sub": "diffusion_models",
            "size_hint_gb": 2.7
          }
        },
        {
          "quant": "bf16",
          "label": "BF16",
          "route": "anima-aesthetic-bf16",
          "vram_peak_gb": 20,
          "lane_inputs": {
            "unet": "anima-aesthetic-v1.1.safetensors"
          },
          "artifact": {
            "source_url": "https://huggingface.co/circlestone-labs/Anima/resolve/main/split_files/diffusion_models/anima-aesthetic-v1.1.safetensors",
            "size_bytes": 4182230656,
            "sha256": "3c1868387a3a1ff504bbb87c33678321965ead381fcf87afbd0264daa600c082",
            "dest_root": "COMFYUI_ROOT",
            "dest_sub": "diffusion_models",
            "size_hint_gb": 4.2
          }
        }
      ]
    },
    {
      "id": "draft",
      "label": "Draft",
      "hint": "Steps 8 — the card schema's own default (fast draft iterations).",
      "group": "Recipe",
      "wire_defaults": { "steps": 8 },
      "cells": [],
    },
    {
      "id": "detailed",
      "label": "Detailed",
      "hint": "Steps 30 — the family DECL's own default (full-quality render; inside the card's 1–100 range).",
      "group": "Recipe",
      "wire_defaults": { "steps": 30 },
      "cells": [],
    },
    {
      "id": "settled-negative",
      "label": "Settled negative",
      "hint": "Stamps the guide's settled negative set. TRIM RULE: the negative stays short — broadening a negative concept degrades quality, so this row is the whole set, never a base to widen.",
      "group": "Recipe",
      "wire_defaults": { "negative_prompt": "worst quality, low quality, score_1, score_2, score_3, artist name" },
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
      "tooltip": "Quantization tier — INT8 ConvRot (Bedovyy's convrot quant, DEFAULT) or BF16 (the official split_files).",
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
    "clip_type": "stable_diffusion",
    "latent_node": "EmptyLatentImage",
    "sampling_shift": 0,
    "text_encoder": "qwen_3_06b_base.safetensors",
    // THE FAMILY DEFAULT VIEW (the krea-2 raw precedent): the
    // atom's lane_inputs spell the first-declared variant's
    // default tier — base × INT8 ConvRot (operator 2026-10-16:
    // the convrot tier serves over fp32).
    "unet": "anima-base-v1.0-int8convrot.safetensors",
    "vae": "qwen_image_vae.safetensors"
  },
  // GHOST DEBT CLEARED (2026-10-12 model audit, fix 4): base from
  // circlestone-labs' official split-files repo; the TE is Qwen3-0.6B
  // Base single-file; the VAE mirrors the qwen families' row.
  "provisions": [
    {
      "name": "anima-base-v1.0.safetensors",
      "url": "https://huggingface.co/circlestone-labs/Anima/resolve/main/split_files/diffusion_models/anima-base-v1.0.safetensors",
      "folder": "diffusion_models",
      "sha256": "bd43b7cffe1ed1153d9c41e7beb2f18cb1273eafbaa3af3edd6a173dc90a006e",
      "size_bytes": 4182218328
    },
    {
      "name": "qwen_3_06b_base.safetensors",
      "url": "https://huggingface.co/Qwen/Qwen3-0.6B-Base/resolve/main/model.safetensors",
      "folder": "text_encoders",
      "sha256": "cd2a512003e2f9f3cd3c32a9c3573f820bb28c940f73c57b1ddaa983d9223eba",
      "size_bytes": 1192135096
    },
    {
      "name": "qwen_image_vae.safetensors",
      "url": "https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/vae/qwen_image_vae.safetensors",
      "folder": "vae",
      "sha256": "a70580f0213e67967ee9c95f05bb400e8fb08307e017a924bf3441223e023d1f",
      "size_bytes": 253806246
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
  name: "family-anima",
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
