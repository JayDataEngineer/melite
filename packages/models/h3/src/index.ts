// families/video/h3.ts — the h3 family declaration
// (generated 2026-09-08 from the frozen registry + facts, then
// hand-owned: this file IS the family's truth — a change here is a
// family change, nothing else moves).
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelsService } from "@melite/comfyui-cordis/models-service";
import type { ModelDecl } from "@melite/comfyui-cordis/model-contract";

export const DECL: ModelDecl = {
  "id": "h3",
  "form": "form_video_director",
  "label": "MiniMax H3",
  "description": "MiniMax H3 joint video + audio generation. Native AV output — describe both motion and",
  "engine": "comfyui",
  "defaults": {
    "width": 1344,
    "height": 768,
    "length": 124,
    "steps": 30,
    "shift_video": 12,
    "shift_audio": 3,
    "seed": 42
  },
  "genre": "video",
  "variants": [
    {
      "id": "fl2va",
      "label": "FL2VA",
      "hint": "Text-to-video, first/last frame to video. 30-step standard pass — highest quality.",
      "group": "Variant",
      "route": "h3",
      "order": 0,
      "cells": []
    },
    {
      "id": "fl2va-turbo",
      "label": "FL2VA ⚡ Turbo",
      "hint": "FL2VA with the Turbo LoRA + 10-step fast pass. Good for motion- composition iteration before a final",
      "group": "Variant",
      "route": "h3",
      "order": 1,
      "cells": []
    },
    {
      "id": "ref2va",
      "label": "Ref2VA",
      "hint": "Reference-based video (images, videos, audio as refs). 30-step standard pass.",
      "group": "Variant",
      "route": "h3-ref2va",
      "order": 2,
      "cells": []
    },
    {
      "id": "ref2va-turbo",
      "label": "Ref2VA ⚡ Turbo",
      "hint": "Ref2VA with the Turbo LoRA + 10-step fast pass for reference-based video iteration.",
      "group": "Variant",
      "route": "h3-ref2va",
      "order": 3,
      "cells": []
    },
    {
      "id": "timeline",
      "label": "Standard (Hybrid + SLA)",
      "hint": "30-step windows, hybrid FL2VA/Ref2VA model, SLA sparse attention — fastest path.",
      "group": "Variant",
      "route": "h3-timeline",
      "order": 0,
      "cells": []
    },
    {
      "id": "timeline-ref2va",
      "label": "Timeline Ref2VA (Legacy)",
      "hint": "Identity-locked multi-beat — reference images condition every window. Standard variant now handles this automatically.",
      "group": "Variant",
      "route": "h3-timeline-ref",
      "order": 7,
      "cells": []
    },
    {
      "id": "timeline-turbo",
      "label": "⚡ Turbo",
      "hint": "The managed Turbo LoRA + 10-step windows — the fast iteration loop (same LoRA/steps pair as the",
      "group": "Variant",
      "route": "h3-timeline",
      "order": 1,
      "cells": []
    },
    {
      "id": "draft_02mp",
      "label": "Draft 02MP",
      "hint": "Draft geometry — 768×448: inside the card schema's own bounds (width 448–1344, height 448–768) and the card's draft identity (Draft at 768x448x56f). Mirrors the h3-timeline carrier row.",
      "group": "Recipe",
      "wire_defaults": { "width": 768, "height": 448 },
      "cells": [],
    },
    {
      "id": "final_hd",
      "label": "Final HD",
      "hint": "Final geometry — 1344×768: the card schema's own defaults and this family's own defaults. Mirrors the h3-timeline carrier row.",
      "group": "Recipe",
      "wire_defaults": { "width": 1344, "height": 768 },
      "cells": [],
    },
    {
      "id": "fast_10step",
      "label": "Fast 10-Step",
      "hint": "The 10-step fast pass from this family's own turbo variants (FL2VA Turbo / Timeline Turbo) — inside the card schema's steps bounds (4–30). Stamps steps only; the Turbo adapter itself has no flavor catalog row, so no bag rides.",
      "group": "Recipe",
      "wire_defaults": { "steps": 10 },
      "cells": [],
    },
    {
      "id": "standard_30step",
      "label": "Standard 30-Step",
      "hint": "The 30-step standard pass — this family's own default and the card's own standard (12 for draft; 30 standard), inside the card schema's steps bounds (4–30).",
      "group": "Recipe",
      "wire_defaults": { "steps": 30 },
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
      "url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/vae/minimax_h3_video_vae_int8_convrot.safetensors",
      "folder": "vae",
      "sha256": "52a2c8c73583c86e4f41cdcce3a6ad0ea562987bc0bf3d60a0cef5f5c8e60c0e"
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
    }
  ],
  "has_agent": true,
};

export const family: Plugin = {
  name: "family-h3",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
