// families/video/h3-timeline.ts — the h3-timeline family declaration
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
  "id": "h3-timeline",
  "form": "form_video_director",
  "label": "H3 Timeline (multi-window)",
  "description": ">-",
  "engine": "comfyui",
  "defaults": {
    "seed": 42
  },
  "studio": {
    "tenant": "video/h3-timeline",
    "owns_params": true,
    "writes": [
      "calls",
      "keyframes",
      "preset",
      "fps",
      "seed",
      "width",
      "height",
      "length",
      "steps",
      "denoise",
      "sampler_name",
      "sched_name",
      "shift_video",
      "shift_audio",
      "sla_sparsity",
      "sla_block_size",
      "sla_dense_last_steps",
      "sla_dense_steps",
      "sla_dense_backend",
      "sla_reference_protection",
      "sla_protect_audio",
      "sla_stabilize_motion",
      "sla_disable_fp16_accum",
      "sharpen_enabled",
      "sharpen_method",
      "sharpen_strength",
      "sharpen_radius",
      "sharpen_threshold",
      "sharpen_iterations",
      "interpolate_enabled",
      "interp_model",
      "interp_multiplier",
      "sr_switch",
      "sr_model",
      "sr_resolution",
      "audio_clips",
      "audio_stem",
      "loras",
      "document"
    ],
    "kind": "custom",
    "size": "huge",
    "layout": "studio"
  },
  "mods": ["loras"],
  "genre": "video",
  "variants": [
    {
      "id": "h3",
      "label": "Standard",
      "group": "Variant",
      "route": "h3-timeline",
      "cells": [
        {
          "quant": "int8",
          "label": "INT8 ConvRot",
          "route": "h3-timeline",
          "vram_peak_gb": 30,
        }
      ]
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
      "name": "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
      "url": "https://huggingface.co/smhfacct/Minimax-H3-fl2va-ref2va-hybrid-models/resolve/main/minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
      "folder": "diffusion_models",
      "sha256": "64f57f77ed85df04f7c0989ab84a5c3c110fb43a40dbc9badfe8ab2d5baafbca"
    },
    {
      "name": "minimax_h3_hybrid_fl2va_ref2va_b25-49-int8.safetensors",
      "url": "https://huggingface.co/smhfacct/Minimax-H3-fl2va-ref2va-hybrid-models/resolve/main/minimax_h3_hybrid_fl2va_ref2va_b25-49-int8.safetensors",
      "folder": "diffusion_models",
      "sha256": "a629cfea8d89a071b140c6e1935dc9a23e72de6badc18975a2bb9e6d1423d76d"
    },
    {
      "name": "minimax_h3_fl2v_lightx2v_v0.1_dareties_v4_step600_comfy_fro.safetensors",
      "url": "https://huggingface.co/silveroxides/MiniMax-H3_tests/resolve/main/minimax_h3_fl2v_lightx2v_v0.1_dareties_v4_step600_comfy_fro.safetensors",
      "folder": "loras/h3",
      "sha256": "ffc5386a1b97aa1bc112b56378f37ef3c1cc69d55d5282281e8c6c728811e710"
    },
    {
      "name": "minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.safetensors",
      "url": "https://huggingface.co/silveroxides/MiniMax-H3_tests/resolve/main/experimental/minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.safetensors",
      "folder": "loras/h3",
      "sha256": "e14c9e78834f5fac9195cb022baf2bc83372140da5142a8c999a1f568cb4915d"
    },
    {
      "name": "h3_silu_temb_grid.safetensors",
      "url": "https://huggingface.co/deAPI-ai/minimax-h3-33b-int8/resolve/main/loras/h3_silu_temb_grid.safetensors",
      "folder": "h3_adaln",
      "sha256": "30eb3c2cc7fb6b470d9717ff840d359313ac27cd64b705e32da1baa10f72d6a8"
    },
    {
      "name": "minimax_h3_latent_upscaler_3d_bf16.safetensors",
      "url": "https://huggingface.co/LBH-123-AI/Minimax_h3_latent_Upscaler/resolve/main/minimax_h3_latent_upscaler_3d_bf16.safetensors",
      "folder": "diffusion_models",
      "sha256": "4f57821f5837f32f7142b67d815606dbd7550f194e5c769f7d6c3f83b146a5e6"
    },
    {
      "name": "film_net_fp16.safetensors",
      "url": "https://huggingface.co/Comfy-Org/frame_interpolation/resolve/main/frame_interpolation/film_net_fp16.safetensors",
      "folder": "frame_interpolation",
      "sha256": "f226e51375dc839d4b40e5c3d63da560dd1ea1c962364ec78f5adf2d05db05c0"
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
      "name": "minimax_h3_audio_vae_fp32.safetensors",
      "url": "https://huggingface.co/deAPI-ai/minimax-h3-33b-int8/resolve/main/vae/minimax_h3_audio_vae_fp32.safetensors",
      "folder": "vae",
      "sha256": "8e505d95dd1561d47abd43d4238fd40d9bb1ae9e147ed0a4cba778d76ae4db48"
    }
  ],
  "has_agent": true,
  "has_inference": true,
};

export const family: Plugin = {
  name: "family-h3-timeline",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
