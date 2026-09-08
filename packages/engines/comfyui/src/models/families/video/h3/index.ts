// families/video/h3.ts — the h3 family declaration
// (generated 2026-09-08 from the frozen registry + facts, then
// hand-owned: this file IS the family's truth — a change here is a
// family change, nothing else moves).
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelDecl } from "../../../contract.ts";

export const DECL: ModelDecl = {
  "id": "h3",
  "label": "MiniMax H3",
  "description": "MiniMax H3 joint video + audio generation. Native AV output — describe both motion and",
  "engine": "comfyui",
  "form": "form_video_director",
  "card": "h3-timeline",
  "unoffered": false,
  "defaults": {
    "width": 1344,
    "height": 768,
    "length": 124,
    "steps": 30,
    "shift_video": 12,
    "shift_audio": 3,
    "seed": 42
  },
  "base_body": "",
  "genre": "video",
  "mods": [],
  "variants": [
    {
      "id": "fl2va",
      "label": "FL2VA",
      "hint": "Text-to-video, first/last frame to video. 30-step standard pass — highest quality.",
      "group": "Variant",
      "route": "h3",
      "engine": "",
      "order": 0,
      "resolver_defaults": {},
      "cells": []
    },
    {
      "id": "fl2va-turbo",
      "label": "FL2VA ⚡ Turbo",
      "hint": "FL2VA with the Turbo LoRA + 10-step fast pass. Good for motion- composition iteration before a final",
      "group": "Variant",
      "route": "h3",
      "engine": "",
      "order": 1,
      "resolver_defaults": {},
      "cells": []
    },
    {
      "id": "ref2va",
      "label": "Ref2VA",
      "hint": "Reference-based video (images, videos, audio as refs). 30-step standard pass.",
      "group": "Variant",
      "route": "h3-ref2va",
      "engine": "",
      "order": 2,
      "resolver_defaults": {},
      "cells": []
    },
    {
      "id": "ref2va-turbo",
      "label": "Ref2VA ⚡ Turbo",
      "hint": "Ref2VA with the Turbo LoRA + 10-step fast pass for reference-based video iteration.",
      "group": "Variant",
      "route": "h3-ref2va",
      "engine": "",
      "order": 3,
      "resolver_defaults": {},
      "cells": []
    },
    {
      "id": "timeline",
      "label": "Standard (Hybrid + SLA)",
      "hint": "30-step windows, hybrid FL2VA/Ref2VA model, SLA sparse attention — fastest path.",
      "group": "Variant",
      "route": "h3-timeline",
      "engine": "",
      "order": 0,
      "resolver_defaults": {},
      "cells": []
    },
    {
      "id": "timeline-ref2va",
      "label": "Timeline Ref2VA (Legacy)",
      "hint": "Identity-locked multi-beat — reference images condition every window. Standard variant now handles this automatically.",
      "group": "Variant",
      "route": "h3-timeline-ref",
      "engine": "",
      "order": 7,
      "resolver_defaults": {},
      "cells": []
    },
    {
      "id": "timeline-turbo",
      "label": "⚡ Turbo",
      "hint": "The managed Turbo LoRA + 10-step windows — the fast iteration loop (same LoRA/steps pair as the",
      "group": "Variant",
      "route": "h3-timeline",
      "engine": "",
      "order": 1,
      "resolver_defaults": {},
      "cells": []
    },
    {
      "id": "default",
      "label": "Default",
      "hint": "The family default — no extra stamps; a fresh card lands here.",
      "group": "Recipe",
      "route": "",
      "engine": "",
      "resolver_defaults": {},
      "cells": [],
      "wire_defaults": {}
    }
  ],
  "variant_groups": [
    {
      "id": "Variant",
      "label": "Variant",
      "tooltip": "",
      "default": ""
    },
    {
      "id": "Quant",
      "label": "Quant",
      "tooltip": "",
      "default": ""
    },
    {
      "id": "Recipe",
      "label": "Recipe",
      "tooltip": "One-click recipes — patch-only rows that stamp picks onto the draft; Default stamps nothing.",
      "default": "default"
    }
  ],
  "provisions": [
    {
      "name": "minimax_h3_fl2va_pruned_int8_convrot.safetensors",
      "url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/diffusion_models/minimax_h3_fl2va_pruned_int8_convrot.safetensors",
      "folder": "diffusion_models",
      "sha256": "e889202c41dafb67b10d67b97f0d8541508036a6090af23425a5c2615d03c47a"
    },
    {
      "name": "minimax_h3_ref2va_pruned_int8_convrot.safetensors",
      "url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/diffusion_models/minimax_h3_ref2va_pruned_int8_convrot.safetensors",
      "folder": "diffusion_models",
      "sha256": "9255f52b6677845ad238f20dfaafa94727053694127ab7f255c048f0f9365779"
    },
    {
      "name": "qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors",
      "url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/text_encoders/qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors",
      "folder": "text_encoders",
      "sha256": "35a88d51044231fe332301d7a62aa81e3f2cba62febeb446e2c1e3e0ef76f2c6"
    },
    {
      "name": "qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
      "url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/text_encoders/qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
      "folder": "text_encoders",
      "sha256": "bc2ced0fbea64757fa9acddccfc0b3f4819d1dcf1da6c124d690d368be283923"
    },
    {
      "name": "minimax_h3_video_vae_int8_convrot.safetensors",
      "url": "https://huggingface.co/Kijai/MiniMax-H3-experimental/resolve/main/minimax_h3_video_vae_int8_convrot.safetensors",
      "folder": "vae",
      "sha256": "9bb2d96f218c76babd85e0611b85ca8fb330a90546c01a0005e8a58a59593410"
    },
    {
      "name": "minimax_h3_video_vae_fp16.safetensors",
      "url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/vae/minimax_h3_video_vae_fp16.safetensors",
      "folder": "vae",
      "sha256": "7c1f131492e7eddacaac9069a61b81bdd39de5cc96561e677c5eab1cdce5e522"
    },
    {
      "name": "minimax_h3_audio_vae_fp32.safetensors",
      "url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/vae/minimax_h3_audio_vae_fp32.safetensors",
      "folder": "vae",
      "sha256": "8e505d95dd1561d47abd43d4238fd40d9bb1ae9e147ed0a4cba778d76ae4db48"
    },
    {
      "name": "minimax_h3_turbo_v4_step600_ema_pruned_comfyui.safetensors",
      "url": "https://huggingface.co/silveroxides/MiniMax-H3_tests/resolve/main/minimax_h3_turbo_v4_step600_ema_pruned_comfyui.safetensors",
      "folder": "loras/h3",
      "sha256": "7098acf3ee75028fd9fcd948f50fcc8d995057fabb76f86bd3ca2c0ffc58e409"
    }
  ],
  "accepts": [],
  "canvas_default": false,
  "has_agent": true,
  "has_inference": false,
  "has_rubric": false,
  "lane_inputs": {}
} as unknown as ModelDecl;

export const family: Plugin = {
  name: "family-h3",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
