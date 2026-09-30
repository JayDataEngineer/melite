// families/image/qwen-img-edit-21.ts — the qwen-img-edit-21 family
// declaration (authored 2026-09-21 from the Comfy-Org release + the
// official image_qwen_image_2_1_image_edit template, hand-owned:
// this file IS the family's truth — a change here is a family
// change, nothing else moves).
//
// THE NAMING LAW (operator order 2026-09-21): family ids name the
// MODEL, its VERSION, and — where the registry's one-family-one-card
// law demands it — the LANE. Qwen-Image-2.1 is one base checkpoint
// with two lanes; the registry boards each family on exactly one
// card, so the pair is qwen-img-21 (t2i, image-gen) and
// qwen-img-edit-21 (this family — cached-reference edit, image-edit):
// same physical weights (the Comfy-Org/Qwen-Image-2.1 repo, both
// quants), version-consistent ids, no 2511-style ambiguity in the
// dropdowns or card labels.
//
// THE LANE (the official edit template graph): UNETLoader →
// QwenImage21Cache (the reference-prefix KV cache around the SAME
// base unet — NO separate edit weights exist for 2.1) and
// TextEncodeQwenImage21 conditioned on the anchor images through its
// own image_N autogrow slots (pos+neg from ONE node) →
// EmptyLatentImage at target resolution → KSampler → VAEDecode.
// NOT the 2511 VAEEncode-of-source lane — the kit branches on
// lane_inputs.text_encode_node (the latent_node precedent).
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelsService } from "@melite/comfyui-cordis/models-service";
import type { ModelDecl } from "@melite/comfyui-cordis/model-contract";
import { edit } from "./actions.ts";

export const DECL: ModelDecl = {
  "id": "qwen-img-edit-21",
  "form": "form_edit",
  "label": "Qwen Image Edit 2.1",
  "description": "Instruction-driven image editing on the Qwen-Image-2.1 base — the reference-cached lane: the SAME 2.1 checkpoint as text-to-image (no separate edit weights), wrapped in QwenImage21Cache with the anchor images spliced through TextEncodeQwenImage21's own vision path, sampled at target resolution. The sibling family qwen-img-21 serves the t2i lane on the image-gen card.",
  "engine": "comfyui",
  "defaults": {
    "steps": 25,
    "sampler": "euler",
    "scheduler": "simple",
    "cfg": 1,
    // THE TARGET RESOLUTION (the 2026-10-09 empty-form fix): the 2.1
    // edit lane samples an EmptyLatentImage at target size — the
    // values ARE the model's (the RANGE RULE: whoever owns the
    // default owns the floor). Until now the DECL stated none and
    // the LANE hardcoded `?? 1024` silently (lanes-image.ts) — the
    // form showed empty Width/Height because the cascade had
    // nothing to overlay. Declared here, the card's resolution
    // group fills from the cascade; the lane's fallback arm now
    // covers only direct (non-card) lane callers.
    "width": 1024,
    "height": 1024
  },
  "prompt_guide": {
    "title": "Qwen Image 2.1 Edit Prompting Guide",
    "sections": [
      "GuideSection(label='Edit', body='State the change and the anchor: what stays identical. One edit per instruction.', list=[])",
      "GuideSection(label='CFG', body='Flow-matching lane: Guidance stays low (default 1.0).', list=[])",
    ],
    "label": "CFG",
    "body": "Flow-matching lane: keep Guidance low (default 1.0)",
    "list": []
  },
  "genre": "image",
  // THE LANE SURFACE (fix shapes 1+2 — the model is the author of
  // what it accepts; the card's visible_when guard list dies). The
  // base params EVERY lane of this family accepts: the visible
  // surface (input_images, prompt, negative_prompt, the sampling
  // block) plus the card's VALIDATION-ONLY aliases (image1/2/3,
  // reference_images, input_mask — hidden carriers, but a wire key
  // the lane admits, so the surface owns them) and THIS lane's
  // target resolution pair — the 2.1 edit lane samples an
  // EmptyLatentImage at stated size, so width/height are 2.1's.
  // use_stock_nodes/double_reference are 2511's edit-tuning pair
  // and are NOT here: with a declared surface the bench-write door
  // refuses them on this family in the field's voice.
  "params": [
    "input_images",
    "image1",
    "image2",
    "image3",
    "reference_images",
    "input_mask",
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
  // THE RESOLUTION PAIR RIDES TOGETHER: an EmptyLatentImage takes a
  // width AND a height — a lone axis is half a size (the card's old
  // tooltip said "target resolution"; the law says both or neither,
  // never one). Judged at bench-write and rendered inline in the
  // form, in the field's voice.
  "relations": {
    "together": [
      {
        "fields": ["width", "height"],
        "cure": "an EmptyLatentImage takes both axes — state width and height together, or neither (the lane's own 1024s)",
      },
    ],
    // THE COMPOSE LAW, STATED (2026-10-10, the DECL audit's row 2 —
    // the GAP-7 shape one card over): compose has refused a
    // prompt-less edit since the merge, imperatively, while the
    // bench admitted the same draft — a state the form could build
    // and the run refused. Stated as the required word (the tts
    // precedent: the word the form already refused), the
    // bench-write door refuses it first, in the field's voice.
    // THE ANCHOR LAW, LEGACY-AWARE: the merge takes input_images
    // verbatim, else the legacy keys — one anchor vocabulary
    // suffices. any_of is the one-of anchor: refused only when NONE
    // of the alternatives is stated (either_or keeps the blank
    // tolerance by law, so it cannot say this).
    "required": [
      {
        "fields": ["prompt"],
        "cure": "an edit states WHAT to change — write the prompt (the instruction, not a description of the image)",
      },
      {
        "fields": ["input_images", "image1", "image2", "image3", "reference_images"],
        "any_of": true,
        "cure": "an edit needs the image being edited — the ordered input_images list, or a legacy image1/image2/image3/reference_images anchor",
      },
    ],
  },
  // THE RANGE RULE MADE LAW (the width burn, 2026-10-10): whoever
  // owns the default owns the floor — this family owns the edit
  // resolution (1024s declared above), and until now the domain
  // lived NOWHERE: the card schema states no min/max for the pair,
  // so width -50 admitted at every door and the engine produced
  // garbage. Declared here, judged at bench-write in the same
  // voice as the relation words (the declaration, not the form).
  // 256–1536: the practical domain of the 2.1 checkpoint (the
  // official edit templates sample 1024/1328; a 4-megapixel edit
  // is outside the trained envelope).
  "bounds": {
    "width": { "min": 256, "max": 1536 },
    "height": { "min": 256, "max": 1536 },
  },
  // THE MASK BOARDING (2026-09-22, the operator's lane call: "2511
  // is the legacy model… 2.1 is the new Qwen edit model"): the mask
  // pack's region contract absorbs onto THIS lane — crop_stitch (the
  // generic region detailer) rides the cache-wrapped model + encoder
  // conditioning; auto+mask still refuses field-named (lanpaint is
  // 2511's flavor — that sampler does not board here).
  "mods": [
    "mask"
  ],
  // THE PROVISION TRUTH (the silent-failure cure, 2511's law): the
  // text encoder and vae carry provisions from the same
  // Comfy-Org/Qwen-Image-2.1 repo; the unet rides the cell artifacts
  // (the quant owns the download — same files as the t2i sibling;
  // the engine's downloader dedups by content).
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
      "route": "qwen-img-edit-21",
      "order": 0,
      "cells": [
        {
          "quant": "int8_convrot",
          "label": "INT8 ConvRot",
          "route": "qwen-img-edit-21-int8",
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
      "route": "qwen-img-edit-21-bf16",
      "order": 1,
      "lane_inputs": {
        "unet": "qwen_image_2.1_bf16.safetensors",
        "text_encoder": "qwen3vl_8b_bf16.safetensors"
      },
      "cells": [
        {
          "quant": "bf16",
          "label": "BF16",
          "route": "qwen-img-edit-21-bf16",
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
      "id": "remove_background",
      "label": "Remove Background",
      "hint": "The official one-click — the Comfy-Org background-removal template's canned prompt verbatim (the 2.1 base renders the subject on transparency; solver/cfg/steps ride the family defaults, which are the template's own values).",
      "group": "Recipe",
      "wire_defaults": { "prompt": "Remove the background, and output a PNG image" },
      "cells": [],
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
  "actions": [edit],
  "lane_inputs": {
    "clip_type": "qwen_image",
    // THE LANE BRANCH KEY (the latent_node precedent — data, never
    // a family-id switch): names the 2.1 encoder class; the kit's
    // imageEdit builder routes onto the cached-reference lane.
    "text_encode_node": "TextEncodeQwenImage21",
    // THE IMAGE CAPACITY (the node's own truth — the card and the
    // lane RIDE this, never a hardcoded count): TextEncodeQwenImage21
    // opens image inputs as filled, up to 16 total (anchor +
    // references). The kit caps the unified reference order at
    // max_images - 1; the card caps its stack face at the roomiest
    // boarded lane's max_images - 1.
    "max_images": 16,
    "text_encoder": "qwen3vl_8b_int8_convrot.safetensors",
    "unet": "qwen_image_2.1_int8_convrot.safetensors",
    "vae": "qwen_image_2.1_vae_bf16.safetensors"
  }
};

export const family: Plugin = {
  name: "family-qwen-img-edit-21",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};

// The family's offered actions (the atom vocabulary): the edit
// action the image-edit card binds.
export { edit, parseEditFacts, type EditFacts, type EditParams } from "./actions.ts";
