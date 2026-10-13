// families/video/h3.ts — the ONE H3 family declaration
// (the one-model law, roadmap §8: the operator's catch — "HOW IS
// MINIMAX H3 AND H3 TIMELINE TWO DIFFERENT MODELS?"). ONE family
// owns the whole surface: the multi-window timeline films, the
// single-shot FL2VA/Ref2VA lanes, and the keyframe lane.
//
// THE SURVIVOR-ID CORRECTION (operator, 2026-09-22: "every folder
// in models IS the upstream model — anima isn't anima-generate"):
// the original fold kept the WRONG survivor id — `h3-timeline`, a
// lane name. A MODEL names a CHECKPOINT; a VARIANT names a LANE
// (the fold law's own first sentence). The family is `h3`; the old
// family address survives as the timeline lane's route
// (`h3-timeline` — drafts, skills, tool enums resolve
// migration-free), and the single-shot lane takes the explicit
// route `h3-fl2va` (the pre-correction route `h3` now names the
// family itself: the ONE deliberate behavior shift — a dead-era
// draft addressing `h3` resolves to the family default, the
// timeline lane; ledgered in CONFORMANCE_LEDGER).
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelsService } from "@melite/comfyui-cordis/models-service";
import type { ModelDecl } from "@melite/comfyui-cordis/model-contract";
import { film } from "./actions.ts";

export const DECL: ModelDecl = {
  "id": "h3",
  "form": "form_video_director",
  "label": "MiniMax H3",
  "description": "MiniMax H3 joint video + audio — one model, three lanes: multi-window timeline films, single-shot FL2VA/Ref2VA clips, and keyframe-anchored beats",
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
  // THE MARRIAGE DECLARATION (#36, the recipes rework): the loras
  // pack's distill adapters carry married step counts — while a
  // counting bag row rides, STEPS is theirs (compose card.ts:
  // call knobs > lora steps > the steps row, Math.max across the
  // bag). Served on the form-spec kind so every client face
  // mirrors compose — one truth per value: the catalog row owns
  // strength + steps; recipes reference ids ONLY.
  "mods": [{ "pack": "loras", "marries": { "steps": "max" } }],
  "genre": "video",
  "variants": [
    {
      "id": "timeline",
      "label": "Standard",
      "hint": "The multi-window timeline — hybrid FL2VA/Ref2VA windows, SLA sparse attention, the film path.",
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
    // THE FOLDED LANES (roadmap §8 — the dead h3 family's variants,
    // reborn here): single-shot clips in one pass. The
    // resolver_defaults carry the dead family's default stamps
    // VERBATIM — the derived views for routes h3-fl2va/h3-ref2va are
    // byte-identical to the dead family's facts rows.
    {
      "id": "fl2va",
      "label": "Single-Shot FL2VA",
      "hint": "Text-to-video, first/last frame to video — one 124-frame pass, 30 steps. The single-shot lane's explicit address (the family id is h3).",
      "group": "Variant",
      "route": "h3-fl2va",
      "order": 2,
      "resolver_defaults": {
        "width": 1344,
        "height": 768,
        "length": 124,
        "steps": 30,
        "shift_video": 12,
        "shift_audio": 3
      },
      "cells": []
    },
    {
      "id": "fl2va-turbo",
      "label": "Single-Shot FL2VA ⚡ Turbo",
      "hint": "FL2VA with the Turbo LoRA + 10-step fast pass — motion composition iteration before a final.",
      "group": "Variant",
      "route": "h3-fl2va",
      "order": 3,
      "resolver_defaults": {
        "width": 1344,
        "height": 768,
        "length": 124,
        "steps": 30,
        "shift_video": 12,
        "shift_audio": 3
      },
      "cells": []
    },
    {
      "id": "ref2va",
      "label": "Single-Shot Ref2VA",
      "hint": "Reference-based video (images, videos, audio as refs) — one pass, 30 steps.",
      "group": "Variant",
      "route": "h3-ref2va",
      "order": 4,
      "resolver_defaults": {
        "width": 1344,
        "height": 768,
        "length": 124,
        "steps": 30,
        "shift_video": 12,
        "shift_audio": 3
      },
      "cells": []
    },
    {
      "id": "ref2va-turbo",
      "label": "Single-Shot Ref2VA ⚡ Turbo",
      "hint": "Ref2VA with the Turbo LoRA + 10-step fast pass for reference-based iteration.",
      "group": "Variant",
      "route": "h3-ref2va",
      "order": 5,
      "resolver_defaults": {
        "width": 1344,
        "height": 768,
        "length": 124,
        "steps": 30,
        "shift_video": 12,
        "shift_audio": 3
      },
      "cells": []
    },
    // THE FOLDED KEYFRAME LANE (the dead h3-keyframe family's
    // variant): draft-geometry beats anchored on a first frame.
    {
      "id": "keyframe",
      "label": "Keyframe",
      "hint": "Keyframe-to-video — a beat anchored on its first-frame image at draft geometry (768×448, 12 steps).",
      "group": "Variant",
      "route": "h3-keyframe",
      "order": 6,
      "resolver_defaults": {
        "width": 768,
        "height": 448,
        "length": 56,
        "steps": 12
      },
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "h3-keyframe",
        }
      ]
    },
    {
      "id": "timeline-ref2va",
      "label": "Timeline Ref2VA (Legacy)",
      "hint": "Identity-locked multi-beat — reference images condition every window. Standard variant now handles this automatically.",
      "group": "Variant",
      "route": "h3-timeline-ref",
      "order": 7,
      "resolver_defaults": {
        "width": 1344,
        "height": 768,
        "length": 124,
        "steps": 30,
        "shift_video": 12,
        "shift_audio": 3
      },
      "cells": []
    },
    // THE BYTEDANCE DEFAULT (operator, 2026-10-11: "get the one from
    // bytedance" — the DMAD 4-step distill, ByteDance/TAMU, the
    // catalog's h3_dmad_4step row; "Default needs to be a 4 step
    // LORA"). FIRST in the Recipe group ON PURPOSE: the birth stamp
    // takes the first composing Recipe row (card-base
    // seedRecipeStamp — the catalog's first-declared law; the Recipe
    // axis itself YIELDS, never seeds a key), so every fresh
    // h3-timeline card is born carrying this bag — the ByteDance
    // lora ALWAYS shows up on the default card. The payload mirrors
    // a hand pick exactly (declared keys only): SELECTION ONLY (#36),
    // the catalog row owns strength 1 and the married 4-step count —
    // compose resolves ids against the flavor catalog (unknown ids
    // refuse LOUD). STEPS IS UNSTATED BY DESIGN — the row owns its
    // married 4; stamping steps would hard-pin what the bag
    // resolves. The file's door is the lane gate (lane_inputs loras +
    // the provision row below): absent on disk, the run refuses with
    // the fetch hint — the web popup's install button and the agent
    // seat both ride that one refusal.
    {
      "id": "dmad_draft",
      "label": "DMAD Draft",
      "hint": "The fast default — the ByteDance DMAD 4-step distill at draft geometry (768×448). Steps derive from the lora marriage (4).",
      "group": "Recipe",
      "wire_defaults": {
        "loras": [{ "id": "h3_dmad_4step" }],
        "width": 768,
        "height": 448
      },
      "cells": [],
    },
    {
      "id": "default",
      "label": "Default",
      "hint": "The family default — no extra stamps. (Fresh cards are born stamped with DMAD Draft; this pill adds nothing.)",
      "group": "Recipe",
      // THE FAMILY SELF-ADDRESS (survivor-id correction, 2026-09-22):
      // the checkpoint id `h3` resolves through THIS row — the family
      // default claims the address (a variant route, the catalog's
      // owning-atom vocabulary). Pre-correction, `h3` named the dead
      // single-shot family; those drafts now land the family default.
      "route": "h3",
      "cells": [],
    },
    // RULE A — THE RECIPE LAW (operator, 2026-09-18: "All Cards must
    // have Recipies… This *includes* LORAs being setup this way, which
    // you haven't done"): the family's preset macros, payloads 1:1
    // with the card's declared keys — the distill presets stamp the
    // LORA BAG ({id, strength, steps} rows the mod plane resolves
    // against this family's flavor catalog in mods/loras.ts), the
    // geometry rows stamp the window keys. Migrated out of the card's
    // hand-authored preset select (the drift the law outlaws).
    //
    // ONE-TO-ONE WITH PLAGUEKIND (operator, 2026-09-20: "the
    // plaguekind recipe is wrong — it uses TWO loras and not one"):
    // plaguekind's turbo setup runs the 768p turbo SOLO at 0.6 (the
    // fro row drops — presets.yaml turbo-768; his V9 runs effectively
    // solo too). The V7-era two-stack (dareties 0.4 + turbo 0.6,
    // formerly the `gold_pair` row) is RETIRED — deleted, never kept
    // as a fallback. Solo turbo IS `turbo_lightx2v`; a second pill
    // stamping the same payload would be two names for one truth.
    {
      "id": "turbo_lightx2v",
      "label": "Turbo LightX2V",
      "hint": "The 4-to-8-step distill at 0.6 — the bag row carries its married 8-step count.",
      "group": "Recipe",
      "wire_defaults": {
        // SELECTION ONLY (#36): the catalog row owns strength 0.6
        // and the married 8-step count — compose resolves ids
        // against the flavor catalog (unknown ids refuse LOUD) and
        // the face mirrors the served marriage. A recipe NEVER
        // duplicates a catalog value (one value, one owner).
        "loras": [{ "id": "h3_lightx2v_turbo" }],
      },
      "cells": [],
    },
    {
      "id": "dareties_lightx2v",
      "label": "Dareties LightX2V",
      "hint": "The v4 distill at 0.8 — married to 4 steps.",
      "group": "Recipe",
      "wire_defaults": {
        "loras": [{ "id": "h3_lightx2v_dareties" }],
      },
      "cells": [],
    },
    {
      "id": "draft_02mp",
      "label": "Draft 02MP",
      "hint": "TIER 1 — the promotion stroke: draft geometry 768×448 at 8 steps (a turbo row's marriage still overrides steps). The user's lora bag rides UNTOUCHED — tiers never stamp loras.",
      "group": "Recipe",
      "wire_defaults": { "width": 768, "height": 448, "steps": 8 },
      "cells": [],
    },
    {
      "id": "final_hd",
      "label": "Final HD",
      "hint": "TIER 2 — the promotion stroke: finish geometry 1344×768 at 30 steps. Same calls, lora bag untouched; windows whose cache key changed simply re-render.",
      "group": "Recipe",
      "wire_defaults": { "width": 1344, "height": 768, "steps": 30 },
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
  // THE LANE'S OWN FILES (2026-10-10, the card-plane audit's H3):
  // h3 was the ONE lane whose loader filenames lived in the card as
  // constants while its DECL declared no lane_inputs — so a new
  // quant or a renamed artifact left the card on stale weights with
  // every wall green. The unet rides the row (the one file quants
  // and hybrids vary); the encoder + the two VAEs ride the package
  // const beside the parser (stroke 1 — invariants are not row
  // members), and the card still reads none of them directly.
  "lane_inputs": {
    "unet": "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
    // THE DEFAULT BAG'S FILE (operator, 2026-10-11: the ByteDance
    // lora is the default, and a run without the file refuses through
    // the lane gate — the web popup's install button and the agent
    // seat both key on that one refusal; "that is how it works").
    // BARE NAME: the gate probes the provision row's own folder
    // (loras/h3) as its last leg; the row below is the fetch truth.
    "loras": "dmad_minimax_h3_4step_lora_critic_comfyui.safetensors",
  },
  // THE LANE SURFACE (the z-image precedent): exactly the knobs the
  // h3-timeline card serves — the window inputs, the shared render
  // tail, and each lane switch's refinement group.
  "params": [
    "prompt",
    "image", "last_frame",
    "ref_images", "ref_videos", "ref_video_trims", "ref_audios", "ref_mods",
    "duck_depth_db",
    "seed", "width", "height", "length", "steps", "denoise",
    "second_pass_enabled",
    "sharpen_enabled", "sharpen_method", "sharpen_radius", "sharpen_strength",
    "sharpen_threshold", "sharpen_iterations", "sharpen_switch",
    "interpolate_enabled", "interp_model", "interp_multiplier", "interp_switch",
    "sampler_name", "sched_name", "k", "noise_seed", "fps_seconds",
    "refine_lora", "refine_strength", "refine_steps",
    "attention_backend",
    "sr_switch", "sr_resolution", "sr_model",
    "ref_image_size",
    "shift_video", "shift_audio",
    "sla_enabled", "sla_sparsity", "sla_block_size", "sla_min_seq_len",
    "sla_dense_last_steps", "sla_dense_steps", "sla_dense_backend",
    "sla_reference_protection", "sla_protect_audio", "sla_stabilize_motion",
    "sla_disable_fp16_accum", "sla_switch",
    "image_name",
  ],
  "provisions": [
    {
      "name": "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
      "url": "https://huggingface.co/smhfacct/Minimax-H3-fl2va-ref2va-hybrid-models/resolve/main/minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
      "folder": "diffusion_models",
      "sha256": "64f57f77ed85df04f7c0989ab84a5c3c110fb43a40dbc9badfe8ab2d5baafbca",
      "size_bytes": 20970379632
    },
    {
      "name": "minimax_h3_hybrid_fl2va_ref2va_b25-49-int8.safetensors",
      "url": "https://huggingface.co/smhfacct/Minimax-H3-fl2va-ref2va-hybrid-models/resolve/main/minimax_h3_hybrid_fl2va_ref2va_b25-49-int8.safetensors",
      "folder": "diffusion_models",
      "sha256": "a629cfea8d89a071b140c6e1935dc9a23e72de6badc18975a2bb9e6d1423d76d",
      "size_bytes": 20970379632
    },
    // THE FOLDED SINGLE-SHOT WEIGHTS (roadmap §8 — inherited from
    // the dead h3 family verbatim: the fl2va/ref2va lanes load
    // their own UNETs; the nvfp4 encoder + fp16 VAE are their
    // alternates)
    {
      "name": "minimax_h3_fl2va_pruned_int8_convrot.safetensors",
      "url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/diffusion_models/minimax_h3_fl2va_pruned_int8_convrot.safetensors",
      "folder": "diffusion_models",
      "sha256": "e889202c41dafb67b10d67b97f0d8541508036a6090af23425a5c2615d03c47a",
      "size_bytes": 20970379616
    },
    {
      "name": "minimax_h3_ref2va_pruned_int8_convrot.safetensors",
      "url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/diffusion_models/minimax_h3_ref2va_pruned_int8_convrot.safetensors",
      "folder": "diffusion_models",
      "sha256": "9255f52b6677845ad238f20dfaafa94727053694127ab7f255c048f0f9365779",
      "size_bytes": 20970379616
    },
    {
      "name": "qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors",
      "url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/text_encoders/qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors",
      "folder": "text_encoders",
      "sha256": "35a88d51044231fe332301d7a62aa81e3f2cba62febeb446e2c1e3e0ef76f2c6",
      "size_bytes": 15687142551
    },
    {
      "name": "minimax_h3_video_vae_fp16.safetensors",
      "url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/vae/minimax_h3_video_vae_fp16.safetensors",
      "folder": "vae",
      "sha256": "7c1f131492e7eddacaac9069a61b81bdd39de5cc96561e677c5eab1cdce5e522",
      "size_bytes": 5207808496
    },
    {
      "name": "minimax_h3_fl2v_lightx2v_v0.1_dareties_v4_step600_comfy_fro.safetensors",
      "url": "https://huggingface.co/silveroxides/MiniMax-H3_tests/resolve/main/minimax_h3_fl2v_lightx2v_v0.1_dareties_v4_step600_comfy_fro.safetensors",
      "folder": "loras/h3",
      "sha256": "ffc5386a1b97aa1bc112b56378f37ef3c1cc69d55d5282281e8c6c728811e710",
      "size_bytes": 867067150
    },
    {
      "name": "minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.safetensors",
      "url": "https://huggingface.co/silveroxides/MiniMax-H3_tests/resolve/main/experimental/minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.safetensors",
      "folder": "loras/h3",
      "sha256": "e14c9e78834f5fac9195cb022baf2bc83372140da5142a8c999a1f568cb4915d",
      "size_bytes": 2116726792
    },
    {
      "name": "minimax_h3_fl2v_turbo_4step_v1.0_768p_comfyui_bf16.safetensors",
      "url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/loras/minimax_h3_fl2v_turbo_4step_v1.0_768p_comfyui_bf16.safetensors",
      "folder": "loras/h3",
      "sha256": "c396a9a06f58399e9df9754b18299818d84a2ddd371724ba48fe4a41221437dc",
      "size_bytes": 1956192992
    },
    {
      "name": "minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors",
      "url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/loras/minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors",
      "folder": "loras/h3",
      "sha256": "2339acdf19bfe123f46b971ea35d367a84adb85de43627e1eceafa5a5b2b111e",
      "size_bytes": 1956193000
    },
    {
      "name": "minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors",
      "url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/loras/minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors",
      "folder": "loras/h3",
      "sha256": "5b9ab5ade15d0775676d01a907268a69a1468dc6033b3b0d3ded5502f3ebb84c",
      "size_bytes": 1956193000
    },
    {
      "name": "MiniMax-H3-FL2VA-Acc-8Step_pruned_comfy.safetensors",
      "url": "https://huggingface.co/Kijai/MiniMax-H3-experimental/resolve/main/loras/MiniMax-H3-FL2VA-Acc-8Step_pruned_comfy.safetensors",
      "folder": "loras/h3",
      "sha256": "e97b813a6f857b9dab310f31ec30a8334f63a3e7dcb5d07c0c91933d3447a897",
      "size_bytes": 1725921392
    },
    {
      "name": "MiniMax-H3-Ref2VA-Acc-8Step_pruned_comfy.safetensors",
      "url": "https://huggingface.co/Kijai/MiniMax-H3-experimental/resolve/main/loras/MiniMax-H3-Ref2VA-Acc-8Step_pruned_comfy.safetensors",
      "folder": "loras/h3",
      "sha256": "6f18e1c2eccb14b37322607730f26b16bf1169b56cd098ea006cffaec43d1e39",
      "size_bytes": 1725921392
    },
    {
      "name": "minimax_h3_turbo_v4_step600_ema.safetensors",
      "url": "https://huggingface.co/larryvrh/MiniMax-H3-Turbo-Lora/resolve/main/minimax_h3_turbo_v4_step600_ema.safetensors",
      "folder": "loras/h3",
      "sha256": "5f3a626cd72c93a8b9318d6760c510bc5092d2ab13aaba1f932c5bab07a416d3",
      "size_bytes": 779849816
    },
    {
      "name": "H3-PK-Parasyte-Turbo.safetensors",
      "url": "https://huggingface.co/Plaguekind/H3-Lora/resolve/main/H3-PK-Parasyte-Turbo.safetensors",
      "folder": "loras/h3",
      "sha256": "dbf74bfb490b9322bd455edff95ce222b3553bb3472e4743134755db1edfe044",
      "size_bytes": 2115774558
    },
    {
      "name": "dmad_minimax_h3_4step_lora_critic_comfyui.safetensors",
      "url": "https://huggingface.co/ZhengmingYu/DMAD/resolve/main/minimax_h3/dmad_minimax_h3_4step_lora_critic_comfyui.safetensors",
      "folder": "loras/h3",
      "sha256": "a4f54d9eb4eed9102be1adea8376e8e933cc2805f4017b95c14586290395b3a7",
      "size_bytes": 1956195960
    },
    {
      "name": "minimax_h3_taomate_3step_lora_avg_rank_19_bf16.safetensors",
      "url": "https://huggingface.co/Kijai/MiniMax-H3_comfy/resolve/main/loras/minimax_h3_taomate_3step_lora_avg_rank_19_bf16.safetensors",
      "folder": "loras/h3",
      "sha256": "de9663d974a884b477556748239c6f28239f7ca1825be270f98f023ff5dab6a7",
      "size_bytes": 181697688
    },
    {
      "name": "h3_silu_temb_grid.safetensors",
      "url": "https://huggingface.co/deAPI-ai/minimax-h3-33b-int8/resolve/main/loras/h3_silu_temb_grid.safetensors",
      "folder": "h3_adaln",
      "sha256": "30eb3c2cc7fb6b470d9717ff840d359313ac27cd64b705e32da1baa10f72d6a8",
      "size_bytes": 5510600
    },
    {
      "name": "minimax_h3_latent_upscaler_3d_bf16.safetensors",
      "url": "https://huggingface.co/LBH-123-AI/Minimax_h3_latent_Upscaler/resolve/main/minimax_h3_latent_upscaler_3d_conv_v1/minimax_h3_latent_upscaler_3d_conv_v1_bf16.safetensors",
      "folder": "diffusion_models",
      "size_bytes": 690592992,
      "sha256": "4f57821f5837f32f7142b67d815606dbd7550f194e5c769f7d6c3f83b146a5e6"
    },
    {
      "name": "film_net_fp16.safetensors",
      "url": "https://huggingface.co/Comfy-Org/frame_interpolation/resolve/main/frame_interpolation/film_net_fp16.safetensors",
      "folder": "frame_interpolation",
      "sha256": "f226e51375dc839d4b40e5c3d63da560dd1ea1c962364ec78f5adf2d05db05c0",
      "size_bytes": 68882302
    },
    {
      "name": "qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
      "url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/text_encoders/qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
      "folder": "text_encoders",
      "sha256": "bc2ced0fbea64757fa9acddccfc0b3f4819d1dcf1da6c124d690d368be283923",
      "size_bytes": 27141342152
    },
    {
      "name": "minimax_h3_video_vae_int8_convrot.safetensors",
      "url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/vae/minimax_h3_video_vae_int8_convrot.safetensors",
      "folder": "vae",
      "sha256": "52a2c8c73583c86e4f41cdcce3a6ad0ea562987bc0bf3d60a0cef5f5c8e60c0e",
      "size_bytes": 2811065184
    },
    {
      "name": "minimax_h3_audio_vae_fp32.safetensors",
      "url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/vae/minimax_h3_audio_vae_fp32.safetensors",
      "folder": "vae",
      "sha256": "8e505d95dd1561d47abd43d4238fd40d9bb1ae9e147ed0a4cba778d76ae4db48",
      "size_bytes": 605254808
    }
  ],
  "has_agent": true,
  "has_inference": true,
  // the film action the h3-timeline card binds (the whole video
  // lane: multi-window films, single windows, clips mixing).
  "actions": [film],
};

export const family: Plugin = {
  name: "family-h3",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};

export { finalizeH3, H3_T4_STRIP } from "./finalize.ts"
export { assertOverlayGated } from "./actions.ts"

// The Loader-row face: DSH loads plugin rows by bare specifier and
// unwraps `exports.default ?? exports` (vendor/cordis_plugins/loader
// unwrapExports) — the default export IS the row-loadable plugin. The
// named `family` stays the library face (engine loadFamilies).
export { family as default };
