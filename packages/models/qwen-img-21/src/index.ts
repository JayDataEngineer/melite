// families/image/qwen-img-21.ts — the qwen-img-21 family declaration
// (authored 2026-09-21 from the Comfy-Org release + the official
// workflow templates, hand-owned: this file IS the family's truth —
// a change here is a family change, nothing else moves).
//
// THE NAMING LAW (operator order 2026-09-21: "the naming convention
// is extremely poor and leads to confusing labels in the models
// for edit and the card labels"): a family id names the MODEL and
// its VERSION — never the operation. The 2511 predecessor baked
// 'edit' into the model id (qwen-img-edit-2511), which read as "the
// edit model" and collided with card naming downstream. Qwen-Image
// 2.1 is ONE base checkpoint that does text-to-image AND reference-
// conditioned edit (the edit rides QwenImage21Cache over the same
// weights) — so the family is qwen-img-21 and the CARD decides the
// operation (image-gen boards it for t2i, image-edit boards it for
// the cached-reference edit). Same physical weights, two lanes.
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelsService } from "@melite/comfyui-cordis/models-service";
import type { ModelDecl } from "@melite/comfyui-cordis/model-contract";
import { t2i } from "./actions.ts";

export const DECL: ModelDecl = {
  "id": "qwen-img-21",
  "form": "form_generate",
  "label": "Qwen Image 2.1",
  "description": "Qwen-Image-2.1 — the unified 2.1 base (text-to-image and reference-cached image edit ride the SAME checkpoint; the edit lane wraps the unet in QwenImage21Cache and conditions on reference images through TextEncodeQwenImage21's own vision path — no separate edit weights). Boards both the image-gen card (t2i) and the image-edit card (cached-reference edit).",
  "engine": "comfyui",
  "defaults": {
    "width": 1024,
    "height": 1024,
    "steps": 25,
    "sampler": "euler",
    "scheduler": "simple",
    "cfg": 1
  },
  "prompt_guide": {
    "title": "Qwen Image 2.1 Prompting Guide",
    "sections": [
      "GuideSection(label='Edit', body='State the change and the anchor: what stays identical. One edit per instruction.', list=[])",
      "GuideSection(label='CFG', body='Flow-matching lane: Guidance stays low (default 1.0).', list=[])",
    ],
    "label": "CFG",
    "body": "Flow-matching lane: keep Guidance low (default 1.0)",
    "list": []
  },
  "genre": "image",
  // mods: ABSENT ≡ boards nothing (the z-image shape) — the 2.1
  // release ships no first-party packs; the loras flavor seed in
  // mods/loras.ts stays unboarded until an adapter exists.
  // THE PROVISION TRUTH (the silent-failure cure, 2511's law):
  // every lane weight carries its provision — the text encoder and
  // vae from the same Comfy-Org/Qwen-Image-2.1 split repo; the unet
  // rides the cell artifacts (the quant owns the download).
  "provisions": [
    {
      "name": "qwen3vl_8b_int8_convrot.safetensors",
      "url": "https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/main/text_encoders/qwen3vl_8b_int8_convrot.safetensors",
      "folder": "text_encoders",
      "sha256": "8bfd0f6e12abf2d2d697ecc888e5e90b0d6741d6708f05799f53afa560452e8f",
      "size_bytes": 9350798360
    },
    {
      "name": "qwen_image_2.1_vae_bf16.safetensors",
      "url": "https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/main/vae/qwen_image_2.1_vae_bf16.safetensors",
      "folder": "vae",
      "sha256": "bb21f7473051e1ac368515dd3f2e15cd44d7a11748ee8823e1ddca3e4876b7c9",
      "size_bytes": 675509688
    }
  ],
  "variants": [
    {
      "id": "int8",
      "label": "INT8 ConvRot",
      "hint": "The official template pick — 7.3GB unet, int8 convrot (DEFAULT)",
      "group": "Variant",
      "route": "qwen-img-21",
      "order": 0,
      "cells": [
        {
          "quant": "int8_convrot",
          "label": "INT8 ConvRot",
          "route": "qwen-img-21-int8",
          "vram_peak_gb": 24,
          "artifact": {
            "source_url": "https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/main/diffusion_models/qwen_image_2.1_int8_convrot.safetensors",
            "size_bytes": 7256783064,
            "sha256": "cb74113cb03faecd79611b01fd7fd642f0aa60d6f0b95086abee214d75eaa57d",
            "dest_root": "COMFYUI_ROOT",
            "dest_sub": "diffusion_models",
            "size_hint_gb": 7.3
          }
        }
      ]
    },
    {
      "id": "bf16",
      "label": "BF16",
      "hint": "Full precision unet + bf16 encoder — 14.2GB unet, highest fidelity, most VRAM",
      "group": "Variant",
      "route": "qwen-img-21-bf16",
      "order": 1,
      "lane_inputs": {
        "unet": "qwen_image_2.1_bf16.safetensors",
        "text_encoder": "qwen3vl_8b_bf16.safetensors"
      },
      "cells": [
        {
          "quant": "bf16",
          "label": "BF16",
          "route": "qwen-img-21-bf16",
          "vram_peak_gb": 48,
          "artifact": {
            "source_url": "https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/main/diffusion_models/qwen_image_2.1_bf16.safetensors",
            "size_bytes": 14230280616,
            "sha256": "89f4158d066cc33906a199fca85634f766892dd78f49b6698dabf187ac86c4bc",
            "dest_root": "COMFYUI_ROOT",
            "dest_sub": "diffusion_models",
            "size_hint_gb": 14.3
          }
        }
      ]
    },
    {
      "id": "upstream_solvers",
      "label": "Upstream Solvers",
      "hint": "Sampler euler + scheduler simple — the official 2.1 templates' own solver truth (this family's DECL defaults, both members of the card's sampler/scheduler vocabularies).",
      "group": "Recipe",
      "wire_defaults": { "sampler": "euler", "scheduler": "simple" },
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
      "tooltip": "Quantization tier of the ONE 2.1 base — INT8 ConvRot (the official template pick) or BF16 (full precision, most VRAM).",
    },
    {
      "id": "Quant",
      "label": "Quant",
      "tooltip": "The download tier — INT8 ConvRot (7.3GB) or BF16 (14.2GB).",
    },
    {
      "id": "Recipe",
      "label": "Recipe",
      "tooltip": "One-click recipes — patch-only rows that stamp picks onto the draft; Default stamps nothing.",
      "default": "default"
    }
  ],
  "has_agent": true,
  "has_inference": true,
  "lane_inputs": {
    "clip_type": "qwen_image",
    "sampling_shift": 0,
    // THE LANE BRANCH KEY (the latent_node precedent — data, never
    // a family-id switch): naming the 2.1 encoder class routes the
    // kit's builders onto the 21 lane (TextEncodeQwenImage21 emits
    // pos+neg+reference-latents from ONE node; the edit arm wraps
    // the unet in QwenImage21Cache and conditions on the anchor
    // images through the encoder's own image_N slots).
    "text_encode_node": "TextEncodeQwenImage21",
    "text_encoder": "qwen3vl_8b_int8_convrot.safetensors",
    "unet": "qwen_image_2.1_int8_convrot.safetensors",
    "vae": "qwen_image_2.1_vae_bf16.safetensors"
  },
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
  // merge AT REGISTRATION — a drifted lane_input (a renamed
  // encoder, a bad variant override) refuses at boot in the door's
  // own voice, never at first compose.
  "actions": [t2i],

};

export const family: Plugin = {
  name: "family-qwen-img-21",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};

// The family's offered actions (the atom vocabulary's stroke-1
// pilot): the t2i segment the image-gen card binds. The card
// imports this beside the DECL — the family's whole offer, one face.
export { t2i, parseT2IFacts, type T2IFacts, type T2IParams } from "./actions.ts";
