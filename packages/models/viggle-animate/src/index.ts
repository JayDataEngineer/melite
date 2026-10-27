// families/video/viggle-animate.ts — the ONE Viggle-Animate family
// declaration: Openjutsu, the character/subject swap in video. The
// checkpoint is the community Viggle-Animate fine-tune of MiniMax H3
// (Ref2VA lineage, DMD2-distilled, INT8 ConvRot pruned) — the
// driving clip supplies motion/camera/background, the still supplies
// identity, and the frozen 362-token text embed replaces the text
// encoder entirely (the lane's whole text surface is the embed file).
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import { ModelsServiceFace } from '@melite/comfyui-card-kit/service-faces'
import type { ModelDecl } from '@melite/comfyui-card-kit/model-contract'
import { animate } from "./actions.ts";

export const DECL: ModelDecl = {
  "id": "viggle-animate",
  "form": "form_video_openjutsu",
  "label": "Viggle Animate (Openjutsu)",
  "description": "Openjutsu — swap a character into a driving video: one still sets identity, the clip sets motion; DMD2-distilled Ref2VA Viggle fine-tune of MiniMax H3, 3-4 Euler updates",
  "engine": "comfyui",
  "defaults": {
    "length": 124,
    "width": 0,
    "height": 0,
    "steps": 3,
    "shift_video": 3,
    "shift_audio": 3,
  },
  "genre": "video",
  // THE LICENCE ROW (audit 004/C6 — the licence is ONE named row,
  // never a free-text hint): the checkpoint is a Model Derivative of
  // MiniMax H3 — the MiniMax H3 Community License Agreement applies
  // to it and to EVERY adapter below (the DMD accelerator, the
  // akatz character-swap lora, the Fun ControlNet Union 2.0 patch;
  // drbaph's repo frontmatter names license_name
  // minimax-h3-community-license). Worldwide use EXCLUDING the
  // EU/UK/KR/US — excluded territories license through
  // api@minimax.io. commercial_use: true within the permitted
  // territories, per the upstream README's own reading.
  "licence": {
    "id": "MiniMax H3 Community License Agreement",
    "commercial_use": true
  },
  // THE REQUIRED DEFAULTS (operator contract 2026-11-07): both
  // media seats are user-provided — a swap without its driving clip
  // or its identity still composes nothing. No variant-class rows:
  // the DMD 3-update envelope is THE family default (one schedule
  // everywhere), never a per-variant face.
  "required_defaults": [
    { "name": "clip", "class": "user" },
    { "name": "ref_image", "class": "user" }
  ],
  // THE MARRIAGE DECLARATION (the h3 precedent): the DMD accelerator
  // carries its designed step count 3 — while a counting bag row
  // rides, STEPS is theirs (stated on the entry first, else the
  // catalog column by filename, Math.max across the bag).
  "mods": [{ "pack": "loras", "marries": { "steps": "max" } }],
  "variants": [
    {
      // THE BODY ROW: one checkpoint, one cell — the INT8 ConvRot
      // pruned dit is the lane's whole body (the family default
      // view; the VAE + the text embed + the DMD lora ride the
      // family lane_inputs below, shared across every variant).
      "id": "ref2va",
      "label": "Ref2VA Viggle INT8 (pruned, convrot)",
      "hint": "The Viggle-Animate fine-tune (Ref2VA lineage, DMD2-distilled) — the VRAM-friendly pruned INT8 ConvRot build (~20 GB).",
      "group": "Variant",
      "route": "viggle-animate",
      "lane_inputs": {
        "unet": "minimax_h3_ref2va_viggle_pruned_int8_convrot.safetensors",
      },
      "cells": [
        {
          "quant": "int8_convrot_pruned",
          "label": "INT8 ConvRot Pruned",
          "route": "viggle-animate",
          "lane_inputs": {
            "unet": "minimax_h3_ref2va_viggle_pruned_int8_convrot.safetensors",
          },
        }
      ]
    },
    {
      // THE BIRTH RECIPE (first-declared law): the DMD accelerator
      // stamps onto every fresh card — the lane composes nothing
      // honest without it (the upstream sampling baseline names it
      // at strength 1.0 with the four-point schedule).
      "id": "standard",
      "label": "Standard",
      "hint": "The default — the DMD accelerator on, three Euler updates (the four-point sigma schedule).",
      "group": "Recipe",
      "wire_defaults": {
        "loras": [{ "id": "viggle_dmd_r64" }],
      },
      "cells": [],
    },
    {
      "id": "four-step",
      "label": "Four Updates",
      "hint": "The five-point schedule — four Euler updates for harder motion. The DMD row's own ceiling.",
      "group": "Recipe",
      "wire_defaults": {
        "steps": 4,
        "loras": [{ "id": "viggle_dmd_r64" }],
      },
      "cells": [],
    },
    {
      // THE DRIFT CURE: the akatz character-swap adapter over the
      // DMD bag — arm it when the swapped subject loses likeness on
      // long drives.
      "id": "identity-lock",
      "label": "Identity Lock",
      "hint": "The character-swap adapter (akatz v1.5) stacked over the DMD bag — the identity-drift cure.",
      "group": "Recipe",
      "wire_defaults": {
        "loras": [{ "id": "viggle_dmd_r64" }, { "id": "viggle_char_swap_v15" }],
      },
      "cells": [],
    },
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
      "tooltip": "One-click recipes — patch-only rows that stamp picks onto the draft: Standard (the DMD default), Four Updates, Identity Lock (the drift cure).",
      "default": "standard"
    }
  ],
  // THE LANE'S OWN FILES: the unet rides the variant row; the VAE is
  // the base H3 video VAE (h3-owned file, re-declared here so the
  // lane's weights stay this family's downloads); the
  // text embed is the lane's WHOLE text surface (frozen 362-token
  // Qwen3-VL embed, provisioned from the pack repo — the run gate
  // still probes the text_cond home and refuses loud with the
  // fetch hint when the channel is unfulfilled); the
  // default bag's file rides bare (the gate probes the provision
  // row's own folder loras/h3 as its last leg).
  "lane_inputs": {
    "unet": "minimax_h3_ref2va_viggle_pruned_int8_convrot.safetensors",
    "vae": "minimax_h3_video_vae_int8_convrot.safetensors",
    "text_cond": "fixed_embed_fwd_anyframe.safetensors",
    "loras": "viggle_animate_dmd_lora_r64.safetensors",
  },
  // THE STORE HOMES the run gate probes at press: the text embed's
  // folder (absent file → the fetch hint, never a silent run);
  // the auxiliary patches' folders ride their provision rows.
  "lane_homes": {
    "text_cond": "text_cond",
  },
  // THE REQUIRED WORD, STATED (the seedvr2 precedent): both media
  // seats refuse at the bench-write door first, in the field's
  // voice.
  "relations": {
    "required": [
      {
        "fields": ["clip"],
        "cure": "a swap needs its driving clip — the video whose motion the subject follows",
      },
      {
        "fields": ["ref_image"],
        "cure": "a swap needs its identity still — one image of the character to place",
      },
    ],
  },
  // THE LANE SURFACE: exactly the knobs the openjutsu card serves.
  // No prompt seat — the frozen text embed IS the lane's text
  // surface (ViggleTextCondLoader takes a file, not text). No
  // sampler seat — the DMD schedule assumes euler (the node is
  // fixed in the segment). No cfg — BasicGuider is CFG-free.
  "params": [
    "clip", "ref_image",
    "length", "width", "height",
    "steps", "shift_video", "shift_audio", "seed",
  ],
  // THE PROVISION TRUTH (the silent-failure cure): the download
  // + serve surface. The INT8 body, the DMD accelerator (the
  // upstream baseline REQUIRES it — digests computed from the live
  // engine store, sha256sum + stat; the DMD r64 read verbatim from
  // the HF tree API's lfs oid), the identity-drift adapter, the
  // estate-native Fun ControlNet patch (the SECONDARY pose/depth
  // path the skill teaches on the h3-timeline card), and the
  // Video-Depth-Anything depth model (the CameraReference3D
  // camera-path lane's depth feed). Sizes and sha256s: the store
  // digests re-verified against the HF tree API byte-for-byte.
  "provisions": [
    {
      "name": "minimax_h3_ref2va_viggle_pruned_int8_convrot.safetensors",
      "url": "https://huggingface.co/drbaph/Viggle-Animate-ComfyUI/resolve/main/diffusion_models/minimax_h3_ref2va_viggle_pruned_int8_convrot.safetensors",
      "folder": "diffusion_models",
      "sha256": "c16db9a453461261b7270ed6fd9e435dde0524234ba4184253ba3876bc3d3540",
      "size_bytes": 21033720080
    },
    {
      "name": "viggle_animate_dmd_lora_r64.safetensors",
      "url": "https://huggingface.co/drbaph/Viggle-Animate-ComfyUI/resolve/main/loras/viggle_animate_dmd_lora_r64.safetensors",
      "folder": "loras/h3",
      "sha256": "8dc50f293c50c9466ac0ae907fd9f904a9a56ceb81f727fb3df02fbadec54446",
      "size_bytes": 941893032
    },
    {
      "name": "h3_character_swap_v1.5.safetensors",
      "url": "https://huggingface.co/akatz-ai/MiniMax-H3-Character-Swap-LoRA/resolve/main/h3_character_swap_v1.5.safetensors",
      "folder": "loras/h3",
      "sha256": "8f2c3c3eba161df8d0c6099598b4730f641f5ce01e04cd16d2427cff8a35218f",
      "size_bytes": 155110792
    },
    {
      "name": "minimax_h3_fun_controlnet_union_2.0_pruned_bf16.safetensors",
      "url": "https://huggingface.co/Kijai/MiniMax-H3-experimental/resolve/main/model_patches/minimax_h3_fun_controlnet_union_2.0_pruned_bf16.safetensors",
      "folder": "controlnet/h3-fun-controlnet",
      "sha256": "cd48bdc11b1f1a3b934746c898d25123754b335c13d37d5c421f8373079282b4",
      "size_bytes": 8382288792
    },
    {
      "name": "video_depth_anything_vits.pth",
      "url": "https://huggingface.co/depth-anything/Video-Depth-Anything-Small/resolve/main/video_depth_anything_vits.pth",
      "folder": "checkpoints",
      "sha256": "13379300b739e659f076a59d52e9801bd8d38c541a7e71f73bbca4dcfb013609",
      "size_bytes": 116440756
    },
    {
      "name": "minimax_h3_video_vae_int8_convrot.safetensors",
      "url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/vae/minimax_h3_video_vae_int8_convrot.safetensors",
      "folder": "vae",
      "sha256": "52a2c8c73583c86e4f41cdcce3a6ad0ea562987bc0bf3d60a0cef5f5c8e60c0e",
      "size_bytes": 2811065184
    },
    {
      "name": "fixed_embed_fwd_anyframe.safetensors",
      "url": "https://huggingface.co/drbaph/Viggle-Animate-ComfyUI/resolve/main/text_cond/fixed_embed_fwd_anyframe.safetensors",
      "folder": "text_cond",
      "sha256": "86ae5987dda844cb80fa4d35d04dddc959f463d04259fbe727b41e80a07e0fde",
      "size_bytes": 3713456
    }
  ],
  "has_agent": true,
  "has_inference": true,
  // the animate action the openjutsu card binds (the single-shot
  // swap lane; the chunked multi-window lanes stay unboarded until
  // a lane needs them).
  "actions": [animate],
};

export const family: Plugin = {
  name: "family-viggle-animate",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};

export { animate, dmd2Sigmas, marriedSteps, parseViggleFacts, type ViggleFacts, type ViggleParams } from "./actions.ts";

// The Loader-row face: DSH loads plugin rows by bare specifier and
// unwraps `exports.default ?? exports` (vendor/cordis_plugins/loader
// unwrapExports) — the default export IS the row-loadable plugin. The
// named `family` stays the library face (engine loadFamilies).
export { family as default };
