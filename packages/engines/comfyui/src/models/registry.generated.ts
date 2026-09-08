// models/registry.generated.ts — THE FROZEN MODEL REGISTRY.
//
// RESURRECTION (2026-09-08): every model.py unit at git 034e1f97
// (the last living state — 47 comfyui families), imported and dumped
// by the melite_models metaclasses themselves: every row validated at
// construction (pydantic twin of the cards DSL). This file is FROZEN
// DATA (P36 data-stays-data): edits belong in a regeneration, never
// inline. card_knobs rows are NOT restated: the compose plane's
// model-facts.json already carries that frozen truth (one copy).
// The dump tool never lands in the tree (git archaeology,
// NO-ESTATE-PYTHON); the provenance is this header.

import type { ModelDecl } from "./contract.ts";

export const MODEL_REGISTRY: Readonly<Record<string, ModelDecl>> = {
 "wan-vace": {
  "id": "wan-vace",
  "label": "Wan2.2 VACE",
  "description": "Wan2.2 VACE video generation with reference-frame and mask control.",
  "engine": "comfyui",
  "form": "form_video_director",
  "card": "video-gen",
  "unoffered": false,
  "defaults": {
   "width": 832,
   "height": 480,
   "length": 49,
   "fps": 24,
   "steps": 4,
   "cfg": 1.0,
   "sampler": "euler",
   "scheduler": "simple",
   "seed": 42
  },
  "base_body": "",
  "genre": "Genre.VIDEO",
  "mods": [],
  "variants": [
   {
    "id": "base",
    "label": "Base",
    "hint": "DEFAULT — 25-step HIGH fp8 checkpoint, director-quality",
    "group": "Variant",
    "route": "wan-vace",
    "engine": "",
    "order": 0,
    "resolver_defaults": {},
    "cells": []
   },
   {
    "id": "custom_fast",
    "label": "Custom Fast",
    "hint": "6-step + lightx2v distill LoRA on the base HIGH model",
    "group": "Variant",
    "route": "wan-vace",
    "engine": "",
    "order": 2,
    "resolver_defaults": {},
    "cells": []
   },
   {
    "id": "custom_quality",
    "label": "Custom Quality",
    "hint": "30-step HIGH expert — maximum detail",
    "group": "Variant",
    "route": "wan-vace",
    "engine": "",
    "order": 1,
    "resolver_defaults": {},
    "cells": []
   },
   {
    "id": "lightning",
    "label": "Lightning",
    "hint": "4-step + Wan Lightning LoRA on the base HIGH model (~6× faster)",
    "group": "Variant",
    "route": "wan-vace",
    "engine": "",
    "order": 3,
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "lane_inputs": {
   "background_removal": "",
   "checkpoint": "",
   "clip_type": "wan",
   "clip_vision": "",
   "construct": "<bound method BaseModel.construct of <class 'melite_models.grammar.LaneInputs'>>",
   "copy": "<bound method BaseModel.copy of LaneInputs(unet='Wan2_2_VACE_A14B_HIGH_fp8_e4m3fn_scaled_KJ_merged.safetensors', unet_variant='', unet_quant='', text_encoder='umt5_xxl_fp8_e4m3fn_converted.safetensors', clip_type=<ClipType.WAN: 'wan'>, vae='Wan2_1_VAE_bf16.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "dict": "<bound method BaseModel.dict of LaneInputs(unet='Wan2_2_VACE_A14B_HIGH_fp8_e4m3fn_scaled_KJ_merged.safetensors', unet_variant='', unet_quant='', text_encoder='umt5_xxl_fp8_e4m3fn_converted.safetensors', clip_type=<ClipType.WAN: 'wan'>, vae='Wan2_1_VAE_bf16.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "family": "",
   "from_orm": "<bound method BaseModel.from_orm of <class 'melite_models.grammar.LaneInputs'>>",
   "json": "<bound method BaseModel.json of LaneInputs(unet='Wan2_2_VACE_A14B_HIGH_fp8_e4m3fn_scaled_KJ_merged.safetensors', unet_variant='', unet_quant='', text_encoder='umt5_xxl_fp8_e4m3fn_converted.safetensors', clip_type=<ClipType.WAN: 'wan'>, vae='Wan2_1_VAE_bf16.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "latent_node": "EmptySD3LatentImage",
   "model_computed_fields": {},
   "model_config": {
    "extra": "forbid",
    "frozen": true
   },
   "model_construct": "<bound method BaseModel.model_construct of <class 'melite_models.grammar.LaneInputs'>>",
   "model_copy": "<bound method BaseModel.model_copy of LaneInputs(unet='Wan2_2_VACE_A14B_HIGH_fp8_e4m3fn_scaled_KJ_merged.safetensors', unet_variant='', unet_quant='', text_encoder='umt5_xxl_fp8_e4m3fn_converted.safetensors', clip_type=<ClipType.WAN: 'wan'>, vae='Wan2_1_VAE_bf16.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump": "<bound method BaseModel.model_dump of LaneInputs(unet='Wan2_2_VACE_A14B_HIGH_fp8_e4m3fn_scaled_KJ_merged.safetensors', unet_variant='', unet_quant='', text_encoder='umt5_xxl_fp8_e4m3fn_converted.safetensors', clip_type=<ClipType.WAN: 'wan'>, vae='Wan2_1_VAE_bf16.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump_json": "<bound method BaseModel.model_dump_json of LaneInputs(unet='Wan2_2_VACE_A14B_HIGH_fp8_e4m3fn_scaled_KJ_merged.safetensors', unet_variant='', unet_quant='', text_encoder='umt5_xxl_fp8_e4m3fn_converted.safetensors', clip_type=<ClipType.WAN: 'wan'>, vae='Wan2_1_VAE_bf16.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_fields": {
    "unet": "annotation=str required=False default=''",
    "unet_variant": "annotation=str required=False default=''",
    "unet_quant": "annotation=str required=False default=''",
    "text_encoder": "annotation=str required=False default=''",
    "clip_type": "annotation=Union[ClipType, NoneType] required=False default=None",
    "vae": "annotation=str required=False default=''",
    "family": "annotation=str required=False default=''",
    "model_path": "annotation=str required=False default=''",
    "checkpoint": "annotation=str required=False default=''",
    "texture_vae": "annotation=str required=False default=''",
    "clip_vision": "annotation=str required=False default=''",
    "background_removal": "annotation=str required=False default=''",
    "sampling_shift": "annotation=float required=False default=0.0",
    "latent_node": "annotation=LatentNode required=False default=<LatentNode.SD3: 'EmptySD3LatentImage'>",
    "unet_unconditional": "annotation=str required=False default=''",
    "weightless": "annotation=bool required=False default=False"
   },
   "model_fields_set": "{'vae', 'clip_type', 'unet', 'text_encoder'}",
   "model_json_schema": "<bound method BaseModel.model_json_schema of <class 'melite_models.grammar.LaneInputs'>>",
   "model_parametrized_name": "<bound method BaseModel.model_parametrized_name of <class 'melite_models.grammar.LaneInputs'>>",
   "model_path": "",
   "model_post_init": "<bound method BaseModel.model_post_init of LaneInputs(unet='Wan2_2_VACE_A14B_HIGH_fp8_e4m3fn_scaled_KJ_merged.safetensors', unet_variant='', unet_quant='', text_encoder='umt5_xxl_fp8_e4m3fn_converted.safetensors', clip_type=<ClipType.WAN: 'wan'>, vae='Wan2_1_VAE_bf16.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_rebuild": "<bound method BaseModel.model_rebuild of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate": "<bound method BaseModel.model_validate of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_json": "<bound method BaseModel.model_validate_json of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_strings": "<bound method BaseModel.model_validate_strings of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_file": "<bound method BaseModel.parse_file of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_obj": "<bound method BaseModel.parse_obj of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_raw": "<bound method BaseModel.parse_raw of <class 'melite_models.grammar.LaneInputs'>>",
   "sampling_shift": 0.0,
   "schema": "<bound method BaseModel.schema of <class 'melite_models.grammar.LaneInputs'>>",
   "schema_json": "<bound method BaseModel.schema_json of <class 'melite_models.grammar.LaneInputs'>>",
   "text_encoder": "umt5_xxl_fp8_e4m3fn_converted.safetensors",
   "texture_vae": "",
   "unet": "Wan2_2_VACE_A14B_HIGH_fp8_e4m3fn_scaled_KJ_merged.safetensors",
   "unet_quant": "",
   "unet_unconditional": "",
   "unet_variant": "",
   "update_forward_refs": "<bound method BaseModel.update_forward_refs of <class 'melite_models.grammar.LaneInputs'>>",
   "vae": "Wan2_1_VAE_bf16.safetensors",
   "validate": "<bound method BaseModel.validate of <class 'melite_models.grammar.LaneInputs'>>",
   "weightless": false
  },
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "scail2-animate": {
  "id": "scail2-animate",
  "label": "SCAIL-2",
  "description": "SCAIL-2 character animation — drives a reference character from a video and colored mask.",
  "engine": "comfyui",
  "form": "form_video_director",
  "card": "video-gen",
  "unoffered": false,
  "defaults": {
   "width": 480,
   "height": 480,
   "length": 25,
   "fps": 24,
   "steps": 12,
   "cfg": 5.0,
   "pose_strength": 1.0,
   "sampler": "euler",
   "scheduler": "simple",
   "seed": 42
  },
  "base_body": "",
  "genre": "Genre.VIDEO",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "scail2-animate",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "fp8",
      "label": "FP8",
      "route": "scail2-animate",
      "engine": "",
      "vram_peak_gb": 24.0,
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "lane_inputs": {
   "background_removal": "",
   "checkpoint": "",
   "clip_type": "wan",
   "clip_vision": "",
   "construct": "<bound method BaseModel.construct of <class 'melite_models.grammar.LaneInputs'>>",
   "copy": "<bound method BaseModel.copy of LaneInputs(unet='scail2_14B_fp8_scaled.safetensors', unet_variant='', unet_quant='', text_encoder='umt5_xxl_fp8_e4m3fn_converted.safetensors', clip_type=<ClipType.WAN: 'wan'>, vae='Wan2_1_VAE_bf16.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "dict": "<bound method BaseModel.dict of LaneInputs(unet='scail2_14B_fp8_scaled.safetensors', unet_variant='', unet_quant='', text_encoder='umt5_xxl_fp8_e4m3fn_converted.safetensors', clip_type=<ClipType.WAN: 'wan'>, vae='Wan2_1_VAE_bf16.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "family": "",
   "from_orm": "<bound method BaseModel.from_orm of <class 'melite_models.grammar.LaneInputs'>>",
   "json": "<bound method BaseModel.json of LaneInputs(unet='scail2_14B_fp8_scaled.safetensors', unet_variant='', unet_quant='', text_encoder='umt5_xxl_fp8_e4m3fn_converted.safetensors', clip_type=<ClipType.WAN: 'wan'>, vae='Wan2_1_VAE_bf16.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "latent_node": "EmptySD3LatentImage",
   "model_computed_fields": {},
   "model_config": {
    "extra": "forbid",
    "frozen": true
   },
   "model_construct": "<bound method BaseModel.model_construct of <class 'melite_models.grammar.LaneInputs'>>",
   "model_copy": "<bound method BaseModel.model_copy of LaneInputs(unet='scail2_14B_fp8_scaled.safetensors', unet_variant='', unet_quant='', text_encoder='umt5_xxl_fp8_e4m3fn_converted.safetensors', clip_type=<ClipType.WAN: 'wan'>, vae='Wan2_1_VAE_bf16.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump": "<bound method BaseModel.model_dump of LaneInputs(unet='scail2_14B_fp8_scaled.safetensors', unet_variant='', unet_quant='', text_encoder='umt5_xxl_fp8_e4m3fn_converted.safetensors', clip_type=<ClipType.WAN: 'wan'>, vae='Wan2_1_VAE_bf16.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump_json": "<bound method BaseModel.model_dump_json of LaneInputs(unet='scail2_14B_fp8_scaled.safetensors', unet_variant='', unet_quant='', text_encoder='umt5_xxl_fp8_e4m3fn_converted.safetensors', clip_type=<ClipType.WAN: 'wan'>, vae='Wan2_1_VAE_bf16.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_fields": {
    "unet": "annotation=str required=False default=''",
    "unet_variant": "annotation=str required=False default=''",
    "unet_quant": "annotation=str required=False default=''",
    "text_encoder": "annotation=str required=False default=''",
    "clip_type": "annotation=Union[ClipType, NoneType] required=False default=None",
    "vae": "annotation=str required=False default=''",
    "family": "annotation=str required=False default=''",
    "model_path": "annotation=str required=False default=''",
    "checkpoint": "annotation=str required=False default=''",
    "texture_vae": "annotation=str required=False default=''",
    "clip_vision": "annotation=str required=False default=''",
    "background_removal": "annotation=str required=False default=''",
    "sampling_shift": "annotation=float required=False default=0.0",
    "latent_node": "annotation=LatentNode required=False default=<LatentNode.SD3: 'EmptySD3LatentImage'>",
    "unet_unconditional": "annotation=str required=False default=''",
    "weightless": "annotation=bool required=False default=False"
   },
   "model_fields_set": "{'vae', 'clip_type', 'unet', 'text_encoder'}",
   "model_json_schema": "<bound method BaseModel.model_json_schema of <class 'melite_models.grammar.LaneInputs'>>",
   "model_parametrized_name": "<bound method BaseModel.model_parametrized_name of <class 'melite_models.grammar.LaneInputs'>>",
   "model_path": "",
   "model_post_init": "<bound method BaseModel.model_post_init of LaneInputs(unet='scail2_14B_fp8_scaled.safetensors', unet_variant='', unet_quant='', text_encoder='umt5_xxl_fp8_e4m3fn_converted.safetensors', clip_type=<ClipType.WAN: 'wan'>, vae='Wan2_1_VAE_bf16.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_rebuild": "<bound method BaseModel.model_rebuild of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate": "<bound method BaseModel.model_validate of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_json": "<bound method BaseModel.model_validate_json of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_strings": "<bound method BaseModel.model_validate_strings of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_file": "<bound method BaseModel.parse_file of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_obj": "<bound method BaseModel.parse_obj of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_raw": "<bound method BaseModel.parse_raw of <class 'melite_models.grammar.LaneInputs'>>",
   "sampling_shift": 0.0,
   "schema": "<bound method BaseModel.schema of <class 'melite_models.grammar.LaneInputs'>>",
   "schema_json": "<bound method BaseModel.schema_json of <class 'melite_models.grammar.LaneInputs'>>",
   "text_encoder": "umt5_xxl_fp8_e4m3fn_converted.safetensors",
   "texture_vae": "",
   "unet": "scail2_14B_fp8_scaled.safetensors",
   "unet_quant": "",
   "unet_unconditional": "",
   "unet_variant": "",
   "update_forward_refs": "<bound method BaseModel.update_forward_refs of <class 'melite_models.grammar.LaneInputs'>>",
   "vae": "Wan2_1_VAE_bf16.safetensors",
   "validate": "<bound method BaseModel.validate of <class 'melite_models.grammar.LaneInputs'>>",
   "weightless": false
  },
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "rtx-vsr": {
  "id": "rtx-vsr",
  "label": "Video Upscale",
  "description": ">-",
  "engine": "",
  "form": "form_video_upscale",
  "card": "",
  "unoffered": false,
  "defaults": {
   "batch_size": 5,
   "cfg": 4.0,
   "color_match_enabled": true,
   "denoise": 0.3,
   "dit_model": "seedvr2_ema_3b_fp16.safetensors",
   "filename_prefix": "upscaled_video",
   "fps": 24,
   "seed": 0,
   "steps": 20,
   "upscaler_model": "4xNomos2_hq_dat2.pth",
   "vae_model": "ema_vae_fp16.safetensors",
   "mode": "rtx_vsr",
   "rtx_two_pass": true,
   "rtx_mode": "vsr",
   "target_resolution": 1080,
   "rtx_strength": 0.6
  },
  "base_body": "",
  "genre": "Genre.VIDEO",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "rtx-vsr",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "native",
      "label": "Native",
      "route": "rtx-vsr",
      "engine": "",
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "ltx-director-distilled": {
  "id": "ltx-director-distilled",
  "label": "LTX 2.3",
  "description": "LTX 2.3 text- and image-to-video generation via the Director workflow.",
  "engine": "",
  "card": "",
  "unoffered": true,
  "defaults": {
   "anchor_strength": 0.7,
   "audio_mode": "none",
   "auto_snap_ic_grid": true,
   "base_denoise": 1.0,
   "crop": "center",
   "director_guide_enabled": false,
   "divisible_by": 32,
   "force_retake_mode": false,
   "guide_strength": 3.0,
   "ic_lora_name": "None",
   "ic_lora_strength": 1.0,
   "image_attention_strength": 1.0,
   "img_compression": 18,
   "inpaint_audio": false,
   "lipsync_strength": 3.0,
   "ltx_chunk_feedforward": false,
   "ltx_context_length": 145,
   "ltx_context_overlap": 40,
   "ltx_context_windows": false,
   "ltx_ff_chunks": 2,
   "ltx_sage_attention": false,
   "ltx_sage_triton": true,
   "output_format": "mp4",
   "override_audio": false,
   "relay_epsilon": 0.001,
   "resize_method": "maintain aspect ratio",
   "retake_apply_global": false,
   "retake_enabled": false,
   "retake_start_frame": 0,
   "retake_strength": 1.0,
   "scale_by": 1.0,
   "start_frame": 0,
   "tile_overlap": 64,
   "tile_size": 256,
   "torch_compile": false,
   "upscale_cfg": 1.0,
   "upscale_denoise": 0.3,
   "upscale_enabled": false,
   "upscale_method": "bicubic",
   "upscale_steps": 10,
   "use_custom_motion": true,
   "use_tiled_encode": false,
   "width": 1280,
   "height": 720,
   "sampling_steps": 8,
   "sampler": "euler",
   "guide_scale": 3.0,
   "frames": 97,
   "fps": 24,
   "scheduler": "beta"
  },
  "base_body": "",
  "genre": "Genre.VIDEO",
  "mods": [],
  "variants": [
   {
    "id": "dev",
    "label": "Dev FP8",
    "hint": "30+ step, max quality — different checkpoint",
    "group": "Variant",
    "route": "ltx-director-dev",
    "engine": "",
    "order": 1,
    "resolver_defaults": {},
    "cells": []
   },
   {
    "id": "distilled",
    "label": "Distilled",
    "hint": "8-step, ~3s/segment on a 4090 — fast preview tier",
    "group": "Variant",
    "route": "ltx-director-distilled",
    "engine": "",
    "order": 0,
    "resolver_defaults": {},
    "cells": []
   },
   {
    "id": "legacy",
    "label": "LTX-2 (legacy)",
    "hint": "Legacy standard route — same distilled-1.1 checkpoint as the head; folded in from video/ltx2 (2026-08-16 combine), hidden",
    "group": "Variant",
    "route": "ltx2",
    "engine": "",
    "order": 3,
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "ltx-2-3": {
  "id": "ltx-2-3",
  "label": "LTX 2.3",
  "description": ">-",
  "engine": "",
  "card": "",
  "unoffered": true,
  "defaults": {
   "width": 1280,
   "height": 720,
   "frames": 97,
   "fps": 24,
   "steps": 30,
   "sampler": "euler",
   "scheduler": "simple",
   "cfg": 3.0,
   "seed": 42
  },
  "base_body": "",
  "genre": "Genre.VIDEO",
  "mods": [],
  "variants": [
   {
    "id": "dev",
    "label": "Dev",
    "hint": "30-step base — highest quality, supports LoRA",
    "group": "Variant",
    "route": "ltx-2-3-dev",
    "engine": "",
    "order": 0,
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "int8",
      "label": "INT8 ConvRot",
      "route": "ltx-2-3",
      "engine": "",
      "vram_peak_gb": 22.0,
      "resolver_defaults": {},
      "hide_from_dropdown": false
     },
     {
      "quant": "fp8",
      "label": "FP8 Scaled",
      "route": "ltx-2-3-dev-fp8",
      "engine": "",
      "vram_peak_gb": 25.0,
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
   },
   {
    "id": "distilled",
    "label": "Distilled",
    "hint": "8-step distilled — fast, CFG=1",
    "group": "Variant",
    "route": "ltx-2-3-distilled",
    "engine": "",
    "order": 1,
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "int8",
      "label": "INT8 ConvRot",
      "route": "ltx-2-3-distilled",
      "engine": "",
      "vram_peak_gb": 22.0,
      "resolver_defaults": {},
      "hide_from_dropdown": false
     },
     {
      "quant": "fp8",
      "label": "FP8 Scaled",
      "route": "ltx-2-3-distilled-fp8",
      "engine": "",
      "vram_peak_gb": 25.0,
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "h3": {
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
   "shift_video": 12.0,
   "shift_audio": 3.0,
   "seed": 42
  },
  "base_body": "",
  "genre": "Genre.VIDEO",
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
  "loras": [],
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
  "character_presets": [],
  "canvas_default": false,
  "has_agent": true,
  "has_inference": false,
  "has_rubric": false
 },
 "h3-timeline": {
  "id": "h3-timeline",
  "label": "H3 Timeline (multi-window)",
  "description": ">-",
  "engine": "comfyui",
  "form": "form_video_director",
  "card": "h3-timeline",
  "unoffered": false,
  "defaults": {
   "seed": 42
  },
  "studio": {
   "tenant": "video/h3-timeline",
   "owns_params": true,
   "writes": "('calls', 'keyframes', 'preset', 'fps', 'seed', 'audio_mode', 'continuity', 'shift_video', 'shift_audio', 'sampler', 'scheduler', 'sampling_steps', 'width', 'height', 'h3_attention', 'h3_sage_attention', 'h3_fp16_accumulation', 'h3_torch_compile', 'sharpen_enabled', 'sharpen_strength', 'interpolate_enabled', 'interpolate_multiplier', 'audio_stem', 'lora_name', 'lora_strength', 'seam_carry', 'document')"
  },
  "base_body": "",
  "genre": "Genre.VIDEO",
  "mods": [],
  "variants": [
   {
    "id": "h3",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "h3-timeline",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "int8",
      "label": "INT8 ConvRot",
      "route": "h3-timeline",
      "engine": "",
      "vram_peak_gb": 30.0,
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
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
  "accepts": [],
  "character_presets": [],
  "canvas_default": false,
  "has_agent": true,
  "has_inference": false,
  "has_rubric": false
 },
 "h3-keyframe": {
  "id": "h3-keyframe",
  "label": "MiniMax H3 keyframe-to-video",
  "description": "",
  "engine": "comfyui",
  "form": "form_video_director",
  "card": "h3-timeline",
  "unoffered": false,
  "defaults": {
   "width": 768,
   "height": 448,
   "length": 56,
   "steps": 12
  },
  "base_body": "",
  "genre": "Genre.VIDEO",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "h3-keyframe",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "native",
      "label": "Native",
      "route": "h3-keyframe",
      "engine": "",
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "canvas_default": false,
  "has_agent": true,
  "has_inference": false,
  "has_rubric": false
 },
 "concat": {
  "id": "concat",
  "label": "Media Merge",
  "description": ">-",
  "engine": "",
  "form": "form_media_merge",
  "card": "",
  "unoffered": false,
  "defaults": {
   "operation": "concat",
   "output_artifact": "video"
  },
  "base_body": "",
  "genre": "Genre.VIDEO",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "concat",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "native",
      "label": "Native (weightless)",
      "route": "concat",
      "engine": "",
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "stretchy-rig": {
  "id": "stretchy-rig",
  "label": "Stretchy Rig",
  "description": "Stretchy Studio auto-rig — DWPose TensorRT whole-body keypoints for 2D character animation.",
  "engine": "",
  "form": "form_image_stretchy_rig",
  "card": "",
  "unoffered": false,
  "defaults": {
   "yolox_precision": "fp16",
   "dwpose_precision": "fp32"
  },
  "base_body": "",
  "genre": "Genre.OTHER",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "stretchy-rig",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "native",
      "label": "Native (weightless)",
      "route": "stretchy-rig",
      "engine": "",
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "see-through": {
  "id": "see-through",
  "label": "See-Through",
  "description": "See-Through anime layer decomposition — splits an image into character, clothing, and background layers.",
  "engine": "",
  "form": "form_image_seethrough",
  "card": "",
  "unoffered": false,
  "defaults": {
   "resolution": 1280,
   "resolution_depth": 768,
   "inference_steps": 30,
   "tblr_split": false,
   "seed": 42
  },
  "source": {
   "repo_id": "layerdifforg/seethroughv0.0.2_layerdiff3d"
  },
  "base_body": "",
  "genre": "Genre.OTHER",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "see-through",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "native",
      "label": "Native (weightless)",
      "route": "see-through",
      "engine": "",
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "latentsync": {
  "id": "latentsync",
  "label": "LatentSync",
  "description": "LatentSync — local-only lip-sync that aligns mouth shapes to audio in a video.",
  "engine": "comfyui",
  "form": "form_edit",
  "card": "",
  "unoffered": false,
  "defaults": {
   "scheduler": "simple",
   "width": 1024,
   "height": 1024,
   "steps": 25,
   "sampler": "euler",
   "cfg": 1.0
  },
  "base_body": "",
  "genre": "Genre.OTHER",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "latentsync",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "native",
      "label": "Native (weightless)",
      "route": "latentsync",
      "engine": "",
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "gem_soma": {
  "id": "gem_soma",
  "label": "SOMA",
  "description": "GEM-X SOMA pose estimation and retargeting.",
  "engine": "comfyui",
  "form": "form_edit",
  "card": "",
  "unoffered": false,
  "defaults": {
   "scheduler": "simple",
   "width": 1024,
   "height": 1024,
   "steps": 25,
   "sampler": "euler",
   "cfg": 7.0
  },
  "source": {
   "repo_id": "nvidia/soma-x"
  },
  "base_body": "",
  "genre": "Genre.OTHER",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "gem_soma",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "native",
      "label": "Native (weightless)",
      "route": "gem_soma",
      "engine": "",
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "dwpose": {
  "id": "dwpose",
  "label": "DWPose",
  "description": "DWPose whole-body pose detection (preprocessor for pose-guided generation).",
  "engine": "comfyui",
  "form": "form_edit",
  "card": "",
  "unoffered": false,
  "defaults": {
   "cfg": 1.0,
   "scheduler": "simple",
   "width": 1024,
   "height": 1024,
   "steps": 1,
   "sampler": "euler"
  },
  "base_body": "",
  "genre": "Genre.OTHER",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "dwpose",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "native",
      "label": "Native (weightless)",
      "route": "dwpose",
      "engine": "",
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "kimodo": {
  "id": "kimodo",
  "label": "Kimodo (text → motion)",
  "description": "Kinematic motion diffusion (NVIDIA Kimodo-SOMA): text → SOMA-77 pose NPZ, chainable, skinnable onto rigged GLBs.",
  "engine": "comfyui",
  "form": "form_motion_kimodo",
  "card": "motion",
  "unoffered": false,
  "defaults": {
   "cfg_type": "separated",
   "cfg_weight_a": 2.5,
   "cfg_weight_b": 5.0,
   "duration_sec": 5.0,
   "diffusion_steps": 25,
   "num_samples": 1,
   "num_transition_frames": 10,
   "seed": 42
  },
  "source": {
   "repo_id": "nvidia/Kimodo-SOMA-RP-v1.1"
  },
  "studio": {
   "tenant": "motion/motion-studio",
   "owns_params": false
  },
  "base_body": "",
  "genre": "Genre.MOTION",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "kimodo",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "native",
      "label": "Native",
      "route": "kimodo",
      "engine": "",
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [
   {
    "name": "skin_standard.npz",
    "url": "https://raw.githubusercontent.com/nv-tlabs/kimodo/main/kimodo/assets/skeletons/somaskel77/skin_standard.npz",
    "folder": "somaskel77",
    "sha256": "90ee2cdf50f168382a7dd7e9c88b118298aba0aca4b72022080c89c4bab0ceb2",
    "size_bytes": 531434
   }
  ],
  "accepts": [],
  "character_presets": [],
  "lane_inputs": {
   "background_removal": "",
   "checkpoint": "",
   "clip_vision": "",
   "construct": "<bound method BaseModel.construct of <class 'melite_models.grammar.LaneInputs'>>",
   "copy": "<bound method BaseModel.copy of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='kimodo', model_path='Kimodo-SOMA-RP-v1.1', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "dict": "<bound method BaseModel.dict of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='kimodo', model_path='Kimodo-SOMA-RP-v1.1', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "family": "kimodo",
   "from_orm": "<bound method BaseModel.from_orm of <class 'melite_models.grammar.LaneInputs'>>",
   "json": "<bound method BaseModel.json of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='kimodo', model_path='Kimodo-SOMA-RP-v1.1', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "latent_node": "EmptySD3LatentImage",
   "model_computed_fields": {},
   "model_config": {
    "extra": "forbid",
    "frozen": true
   },
   "model_construct": "<bound method BaseModel.model_construct of <class 'melite_models.grammar.LaneInputs'>>",
   "model_copy": "<bound method BaseModel.model_copy of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='kimodo', model_path='Kimodo-SOMA-RP-v1.1', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump": "<bound method BaseModel.model_dump of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='kimodo', model_path='Kimodo-SOMA-RP-v1.1', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump_json": "<bound method BaseModel.model_dump_json of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='kimodo', model_path='Kimodo-SOMA-RP-v1.1', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_fields": {
    "unet": "annotation=str required=False default=''",
    "unet_variant": "annotation=str required=False default=''",
    "unet_quant": "annotation=str required=False default=''",
    "text_encoder": "annotation=str required=False default=''",
    "clip_type": "annotation=Union[ClipType, NoneType] required=False default=None",
    "vae": "annotation=str required=False default=''",
    "family": "annotation=str required=False default=''",
    "model_path": "annotation=str required=False default=''",
    "checkpoint": "annotation=str required=False default=''",
    "texture_vae": "annotation=str required=False default=''",
    "clip_vision": "annotation=str required=False default=''",
    "background_removal": "annotation=str required=False default=''",
    "sampling_shift": "annotation=float required=False default=0.0",
    "latent_node": "annotation=LatentNode required=False default=<LatentNode.SD3: 'EmptySD3LatentImage'>",
    "unet_unconditional": "annotation=str required=False default=''",
    "weightless": "annotation=bool required=False default=False"
   },
   "model_fields_set": "{'model_path', 'family'}",
   "model_json_schema": "<bound method BaseModel.model_json_schema of <class 'melite_models.grammar.LaneInputs'>>",
   "model_parametrized_name": "<bound method BaseModel.model_parametrized_name of <class 'melite_models.grammar.LaneInputs'>>",
   "model_path": "Kimodo-SOMA-RP-v1.1",
   "model_post_init": "<bound method BaseModel.model_post_init of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='kimodo', model_path='Kimodo-SOMA-RP-v1.1', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_rebuild": "<bound method BaseModel.model_rebuild of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate": "<bound method BaseModel.model_validate of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_json": "<bound method BaseModel.model_validate_json of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_strings": "<bound method BaseModel.model_validate_strings of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_file": "<bound method BaseModel.parse_file of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_obj": "<bound method BaseModel.parse_obj of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_raw": "<bound method BaseModel.parse_raw of <class 'melite_models.grammar.LaneInputs'>>",
   "sampling_shift": 0.0,
   "schema": "<bound method BaseModel.schema of <class 'melite_models.grammar.LaneInputs'>>",
   "schema_json": "<bound method BaseModel.schema_json of <class 'melite_models.grammar.LaneInputs'>>",
   "text_encoder": "",
   "texture_vae": "",
   "unet": "",
   "unet_quant": "",
   "unet_unconditional": "",
   "unet_variant": "",
   "update_forward_refs": "<bound method BaseModel.update_forward_refs of <class 'melite_models.grammar.LaneInputs'>>",
   "vae": "",
   "validate": "<bound method BaseModel.validate of <class 'melite_models.grammar.LaneInputs'>>",
   "weightless": false
  },
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "z-image": {
  "id": "z-image",
  "label": "Z-Image",
  "description": "Fast Z-Image / Z-Image Turbo text-to-image generation.",
  "engine": "comfyui",
  "form": "form_generate",
  "card": "image-gen",
  "unoffered": false,
  "defaults": {
   "scheduler": "simple",
   "width": 1024,
   "height": 1024,
   "steps": 8,
   "sampler": "res_multistep",
   "cfg": 1.0
  },
  "base_body": "",
  "genre": "Genre.IMAGE",
  "mods": [],
  "variants": [
   {
    "id": "turbo",
    "label": "Turbo",
    "hint": "8-step distilled — fast (DEFAULT)",
    "group": "Variant",
    "route": "z-image",
    "engine": "",
    "order": 0,
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "int8",
      "label": "INT8 ConvRot",
      "route": "z-image-int8",
      "engine": "",
      "vram_peak_gb": 14.0,
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "lane_inputs": {
   "background_removal": "",
   "checkpoint": "",
   "clip_type": "lumina2",
   "clip_vision": "",
   "construct": "<bound method BaseModel.construct of <class 'melite_models.grammar.LaneInputs'>>",
   "copy": "<bound method BaseModel.copy of LaneInputs(unet='z_image_turbo_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='qwen_3_4b.safetensors', clip_type=<ClipType.LUMINA2: 'lumina2'>, vae='ae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=3.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "dict": "<bound method BaseModel.dict of LaneInputs(unet='z_image_turbo_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='qwen_3_4b.safetensors', clip_type=<ClipType.LUMINA2: 'lumina2'>, vae='ae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=3.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "family": "",
   "from_orm": "<bound method BaseModel.from_orm of <class 'melite_models.grammar.LaneInputs'>>",
   "json": "<bound method BaseModel.json of LaneInputs(unet='z_image_turbo_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='qwen_3_4b.safetensors', clip_type=<ClipType.LUMINA2: 'lumina2'>, vae='ae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=3.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "latent_node": "EmptySD3LatentImage",
   "model_computed_fields": {},
   "model_config": {
    "extra": "forbid",
    "frozen": true
   },
   "model_construct": "<bound method BaseModel.model_construct of <class 'melite_models.grammar.LaneInputs'>>",
   "model_copy": "<bound method BaseModel.model_copy of LaneInputs(unet='z_image_turbo_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='qwen_3_4b.safetensors', clip_type=<ClipType.LUMINA2: 'lumina2'>, vae='ae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=3.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump": "<bound method BaseModel.model_dump of LaneInputs(unet='z_image_turbo_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='qwen_3_4b.safetensors', clip_type=<ClipType.LUMINA2: 'lumina2'>, vae='ae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=3.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump_json": "<bound method BaseModel.model_dump_json of LaneInputs(unet='z_image_turbo_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='qwen_3_4b.safetensors', clip_type=<ClipType.LUMINA2: 'lumina2'>, vae='ae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=3.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_fields": {
    "unet": "annotation=str required=False default=''",
    "unet_variant": "annotation=str required=False default=''",
    "unet_quant": "annotation=str required=False default=''",
    "text_encoder": "annotation=str required=False default=''",
    "clip_type": "annotation=Union[ClipType, NoneType] required=False default=None",
    "vae": "annotation=str required=False default=''",
    "family": "annotation=str required=False default=''",
    "model_path": "annotation=str required=False default=''",
    "checkpoint": "annotation=str required=False default=''",
    "texture_vae": "annotation=str required=False default=''",
    "clip_vision": "annotation=str required=False default=''",
    "background_removal": "annotation=str required=False default=''",
    "sampling_shift": "annotation=float required=False default=0.0",
    "latent_node": "annotation=LatentNode required=False default=<LatentNode.SD3: 'EmptySD3LatentImage'>",
    "unet_unconditional": "annotation=str required=False default=''",
    "weightless": "annotation=bool required=False default=False"
   },
   "model_fields_set": "{'latent_node', 'clip_type', 'vae', 'text_encoder', 'sampling_shift', 'unet'}",
   "model_json_schema": "<bound method BaseModel.model_json_schema of <class 'melite_models.grammar.LaneInputs'>>",
   "model_parametrized_name": "<bound method BaseModel.model_parametrized_name of <class 'melite_models.grammar.LaneInputs'>>",
   "model_path": "",
   "model_post_init": "<bound method BaseModel.model_post_init of LaneInputs(unet='z_image_turbo_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='qwen_3_4b.safetensors', clip_type=<ClipType.LUMINA2: 'lumina2'>, vae='ae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=3.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_rebuild": "<bound method BaseModel.model_rebuild of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate": "<bound method BaseModel.model_validate of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_json": "<bound method BaseModel.model_validate_json of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_strings": "<bound method BaseModel.model_validate_strings of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_file": "<bound method BaseModel.parse_file of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_obj": "<bound method BaseModel.parse_obj of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_raw": "<bound method BaseModel.parse_raw of <class 'melite_models.grammar.LaneInputs'>>",
   "sampling_shift": 3.0,
   "schema": "<bound method BaseModel.schema of <class 'melite_models.grammar.LaneInputs'>>",
   "schema_json": "<bound method BaseModel.schema_json of <class 'melite_models.grammar.LaneInputs'>>",
   "text_encoder": "qwen_3_4b.safetensors",
   "texture_vae": "",
   "unet": "z_image_turbo_int8_convrot.safetensors",
   "unet_quant": "",
   "unet_unconditional": "",
   "unet_variant": "",
   "update_forward_refs": "<bound method BaseModel.update_forward_refs of <class 'melite_models.grammar.LaneInputs'>>",
   "vae": "ae.safetensors",
   "validate": "<bound method BaseModel.validate of <class 'melite_models.grammar.LaneInputs'>>",
   "weightless": false
  },
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "wd14": {
  "id": "wd14",
  "label": "WD14 Tagger",
  "description": "Booru keyword tagger (WaifuDiffusion v3 lineage) — comma-separated Danbooru tags for NovelAI / Pony / Illustrious recreation. Light ONNX lane, first run downloads weights.",
  "engine": "comfyui",
  "form": "form_tagger",
  "card": "tagger",
  "unoffered": false,
  "defaults": {
   "checkpoint": "wd-v1-4-moat-tagger-v2",
   "threshold": 0.35,
   "character_threshold": 0.85,
   "exclude_tags": "",
   "replace_underscore": false,
   "trailing_comma": false
  },
  "base_body": "",
  "genre": "Genre.IMAGE",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "wd14",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "f32",
      "label": "F32",
      "route": "wd14",
      "engine": "",
      "vram_peak_gb": 4.0,
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "seedvr2_ema": {
  "id": "seedvr2_ema",
  "label": "SeedVR2 Upscaler",
  "description": "SeedVR2 diffusion-based super-resolution (3B EMA FP16 default, 7B EMA FP8",
  "engine": "comfyui",
  "form": "form_upscale",
  "card": "upscale-tools",
  "unoffered": false,
  "defaults": {
   "batch_size": 1,
   "max_resolution": 4096,
   "resolution": 1080,
   "seed": 0
  },
  "base_body": "",
  "genre": "Genre.IMAGE",
  "mods": [],
  "variants": [
   {
    "id": "3b",
    "label": "3B FP16",
    "hint": "3B EMA fp16 — fast, ~7 GB VRAM (DEFAULT). Precision ships with this body.",
    "group": "Variant",
    "route": "seedvr2_ema",
    "engine": "",
    "order": 0,
    "resolver_defaults": {},
    "cells": []
   },
   {
    "id": "7b",
    "label": "7B FP8",
    "hint": "7B EMA fp8_e4m3fn (mixed block-35 fp16) — beefier fine detail, ~3× slower.",
    "group": "Variant",
    "route": "seedvr2_ema_7b",
    "engine": "",
    "order": 1,
    "resolver_defaults": {},
    "cells": []
   },
   {
    "id": "vae-fp16",
    "label": "VAE FP16",
    "hint": "EMA VAE helper weights — hidden (folded in 2026-08-16)",
    "group": "Variant",
    "route": "seedvr2_ema_vae_fp16",
    "engine": "",
    "order": 4,
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "lane_inputs": {
   "background_removal": "",
   "checkpoint": "",
   "clip_vision": "",
   "construct": "<bound method BaseModel.construct of <class 'melite_models.grammar.LaneInputs'>>",
   "copy": "<bound method BaseModel.copy of LaneInputs(unet='seedvr2_ema_3b_fp16.safetensors', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='ema_vae_fp16.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "dict": "<bound method BaseModel.dict of LaneInputs(unet='seedvr2_ema_3b_fp16.safetensors', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='ema_vae_fp16.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "family": "",
   "from_orm": "<bound method BaseModel.from_orm of <class 'melite_models.grammar.LaneInputs'>>",
   "json": "<bound method BaseModel.json of LaneInputs(unet='seedvr2_ema_3b_fp16.safetensors', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='ema_vae_fp16.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "latent_node": "EmptySD3LatentImage",
   "model_computed_fields": {},
   "model_config": {
    "extra": "forbid",
    "frozen": true
   },
   "model_construct": "<bound method BaseModel.model_construct of <class 'melite_models.grammar.LaneInputs'>>",
   "model_copy": "<bound method BaseModel.model_copy of LaneInputs(unet='seedvr2_ema_3b_fp16.safetensors', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='ema_vae_fp16.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump": "<bound method BaseModel.model_dump of LaneInputs(unet='seedvr2_ema_3b_fp16.safetensors', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='ema_vae_fp16.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump_json": "<bound method BaseModel.model_dump_json of LaneInputs(unet='seedvr2_ema_3b_fp16.safetensors', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='ema_vae_fp16.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_fields": {
    "unet": "annotation=str required=False default=''",
    "unet_variant": "annotation=str required=False default=''",
    "unet_quant": "annotation=str required=False default=''",
    "text_encoder": "annotation=str required=False default=''",
    "clip_type": "annotation=Union[ClipType, NoneType] required=False default=None",
    "vae": "annotation=str required=False default=''",
    "family": "annotation=str required=False default=''",
    "model_path": "annotation=str required=False default=''",
    "checkpoint": "annotation=str required=False default=''",
    "texture_vae": "annotation=str required=False default=''",
    "clip_vision": "annotation=str required=False default=''",
    "background_removal": "annotation=str required=False default=''",
    "sampling_shift": "annotation=float required=False default=0.0",
    "latent_node": "annotation=LatentNode required=False default=<LatentNode.SD3: 'EmptySD3LatentImage'>",
    "unet_unconditional": "annotation=str required=False default=''",
    "weightless": "annotation=bool required=False default=False"
   },
   "model_fields_set": "{'vae', 'unet'}",
   "model_json_schema": "<bound method BaseModel.model_json_schema of <class 'melite_models.grammar.LaneInputs'>>",
   "model_parametrized_name": "<bound method BaseModel.model_parametrized_name of <class 'melite_models.grammar.LaneInputs'>>",
   "model_path": "",
   "model_post_init": "<bound method BaseModel.model_post_init of LaneInputs(unet='seedvr2_ema_3b_fp16.safetensors', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='ema_vae_fp16.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_rebuild": "<bound method BaseModel.model_rebuild of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate": "<bound method BaseModel.model_validate of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_json": "<bound method BaseModel.model_validate_json of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_strings": "<bound method BaseModel.model_validate_strings of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_file": "<bound method BaseModel.parse_file of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_obj": "<bound method BaseModel.parse_obj of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_raw": "<bound method BaseModel.parse_raw of <class 'melite_models.grammar.LaneInputs'>>",
   "sampling_shift": 0.0,
   "schema": "<bound method BaseModel.schema of <class 'melite_models.grammar.LaneInputs'>>",
   "schema_json": "<bound method BaseModel.schema_json of <class 'melite_models.grammar.LaneInputs'>>",
   "text_encoder": "",
   "texture_vae": "",
   "unet": "seedvr2_ema_3b_fp16.safetensors",
   "unet_quant": "",
   "unet_unconditional": "",
   "unet_variant": "",
   "update_forward_refs": "<bound method BaseModel.update_forward_refs of <class 'melite_models.grammar.LaneInputs'>>",
   "vae": "ema_vae_fp16.safetensors",
   "validate": "<bound method BaseModel.validate of <class 'melite_models.grammar.LaneInputs'>>",
   "weightless": false
  },
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "qwen-img-edit-2511": {
  "id": "qwen-img-edit-2511",
  "label": "Image Edit",
  "description": "Instruction-driven image editing and manipulation — the Qwen-Image-Edit 2511 lane (the image-edit card arms this family; the pre-flip img-edit head is retired, same physical lane, its assets merged here 2026-09-05).",
  "engine": "comfyui",
  "form": "form_edit",
  "card": "image-edit",
  "unoffered": false,
  "defaults": {
   "use_stock_nodes": false,
   "steps": 4,
   "sampler": "euler",
   "scheduler": "simple",
   "cfg": 1.0,
   "double_reference": false
  },
  "prompt_guide": null,
  "base_body": "",
  "genre": "Genre.IMAGE",
  "mods": [
   "lanpaint",
   "loras",
   "mask"
  ],
  "variants": [
   {
    "id": "lightning",
    "label": "Lightning",
    "hint": "4-step distilled checkpoint (lightx2v Lightning) — fast (DEFAULT)",
    "group": "Variant",
    "route": "qwen-img-edit-2511-lightning4",
    "engine": "",
    "order": 0,
    "resolver_defaults": {
     "steps": 4
    },
    "cells": [
     {
      "quant": "lightning4",
      "label": "FP8 Lightning",
      "route": "qwen-img-edit-2511-lightning4",
      "engine": "",
      "vram_peak_gb": 20.0,
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
   },
   {
    "id": "standard",
    "label": "Standard",
    "hint": "20 steps, cfg 2.5 — highest quality path, the INT8 ConvRot merge.",
    "group": "Variant",
    "route": "qwen-img-edit-2511",
    "engine": "",
    "order": 1,
    "resolver_defaults": {
     "steps": 20,
     "cfg": 2.5
    },
    "cells": [
     {
      "quant": "int8",
      "label": "INT8 ConvRot",
      "route": "qwen-img-edit-2511-int8",
      "engine": "",
      "vram_peak_gb": 20.0,
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
    "tooltip": "Base checkpoint — Lightning (4-step distilled, fast default) or Standard (20-step reference, highest quality).",
    "default": ""
   },
   {
    "id": "Quant",
    "label": "Quant",
    "tooltip": "Quantization tier — FP8 Lightning (the distilled checkpoint) or INT8 ConvRot (the reference merge).",
    "default": ""
   },
   {
    "id": "Recipe",
    "label": "Recipe",
    "tooltip": "One-click recipes — patch-only rows that stamp picks onto the draft; Default stamps nothing.",
    "default": "default"
   }
  ],
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "lane_inputs": {
   "background_removal": "",
   "checkpoint": "",
   "clip_type": "qwen_image",
   "clip_vision": "",
   "construct": "<bound method BaseModel.construct of <class 'melite_models.grammar.LaneInputs'>>",
   "copy": "<bound method BaseModel.copy of LaneInputs(unet='qwen_image_edit_2511_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='qwen_2.5_vl_7b_fp8_scaled.safetensors', clip_type=<ClipType.QWEN_IMAGE: 'qwen_image'>, vae='qwen_image_vae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "dict": "<bound method BaseModel.dict of LaneInputs(unet='qwen_image_edit_2511_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='qwen_2.5_vl_7b_fp8_scaled.safetensors', clip_type=<ClipType.QWEN_IMAGE: 'qwen_image'>, vae='qwen_image_vae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "family": "",
   "from_orm": "<bound method BaseModel.from_orm of <class 'melite_models.grammar.LaneInputs'>>",
   "json": "<bound method BaseModel.json of LaneInputs(unet='qwen_image_edit_2511_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='qwen_2.5_vl_7b_fp8_scaled.safetensors', clip_type=<ClipType.QWEN_IMAGE: 'qwen_image'>, vae='qwen_image_vae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "latent_node": "EmptySD3LatentImage",
   "model_computed_fields": {},
   "model_config": {
    "extra": "forbid",
    "frozen": true
   },
   "model_construct": "<bound method BaseModel.model_construct of <class 'melite_models.grammar.LaneInputs'>>",
   "model_copy": "<bound method BaseModel.model_copy of LaneInputs(unet='qwen_image_edit_2511_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='qwen_2.5_vl_7b_fp8_scaled.safetensors', clip_type=<ClipType.QWEN_IMAGE: 'qwen_image'>, vae='qwen_image_vae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump": "<bound method BaseModel.model_dump of LaneInputs(unet='qwen_image_edit_2511_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='qwen_2.5_vl_7b_fp8_scaled.safetensors', clip_type=<ClipType.QWEN_IMAGE: 'qwen_image'>, vae='qwen_image_vae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump_json": "<bound method BaseModel.model_dump_json of LaneInputs(unet='qwen_image_edit_2511_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='qwen_2.5_vl_7b_fp8_scaled.safetensors', clip_type=<ClipType.QWEN_IMAGE: 'qwen_image'>, vae='qwen_image_vae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_fields": {
    "unet": "annotation=str required=False default=''",
    "unet_variant": "annotation=str required=False default=''",
    "unet_quant": "annotation=str required=False default=''",
    "text_encoder": "annotation=str required=False default=''",
    "clip_type": "annotation=Union[ClipType, NoneType] required=False default=None",
    "vae": "annotation=str required=False default=''",
    "family": "annotation=str required=False default=''",
    "model_path": "annotation=str required=False default=''",
    "checkpoint": "annotation=str required=False default=''",
    "texture_vae": "annotation=str required=False default=''",
    "clip_vision": "annotation=str required=False default=''",
    "background_removal": "annotation=str required=False default=''",
    "sampling_shift": "annotation=float required=False default=0.0",
    "latent_node": "annotation=LatentNode required=False default=<LatentNode.SD3: 'EmptySD3LatentImage'>",
    "unet_unconditional": "annotation=str required=False default=''",
    "weightless": "annotation=bool required=False default=False"
   },
   "model_fields_set": "{'vae', 'clip_type', 'unet', 'text_encoder'}",
   "model_json_schema": "<bound method BaseModel.model_json_schema of <class 'melite_models.grammar.LaneInputs'>>",
   "model_parametrized_name": "<bound method BaseModel.model_parametrized_name of <class 'melite_models.grammar.LaneInputs'>>",
   "model_path": "",
   "model_post_init": "<bound method BaseModel.model_post_init of LaneInputs(unet='qwen_image_edit_2511_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='qwen_2.5_vl_7b_fp8_scaled.safetensors', clip_type=<ClipType.QWEN_IMAGE: 'qwen_image'>, vae='qwen_image_vae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_rebuild": "<bound method BaseModel.model_rebuild of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate": "<bound method BaseModel.model_validate of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_json": "<bound method BaseModel.model_validate_json of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_strings": "<bound method BaseModel.model_validate_strings of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_file": "<bound method BaseModel.parse_file of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_obj": "<bound method BaseModel.parse_obj of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_raw": "<bound method BaseModel.parse_raw of <class 'melite_models.grammar.LaneInputs'>>",
   "sampling_shift": 0.0,
   "schema": "<bound method BaseModel.schema of <class 'melite_models.grammar.LaneInputs'>>",
   "schema_json": "<bound method BaseModel.schema_json of <class 'melite_models.grammar.LaneInputs'>>",
   "text_encoder": "qwen_2.5_vl_7b_fp8_scaled.safetensors",
   "texture_vae": "",
   "unet": "qwen_image_edit_2511_int8_convrot.safetensors",
   "unet_quant": "",
   "unet_unconditional": "",
   "unet_variant": "",
   "update_forward_refs": "<bound method BaseModel.update_forward_refs of <class 'melite_models.grammar.LaneInputs'>>",
   "vae": "qwen_image_vae.safetensors",
   "validate": "<bound method BaseModel.validate of <class 'melite_models.grammar.LaneInputs'>>",
   "weightless": false
  },
  "canvas_default": false,
  "has_agent": true,
  "has_inference": false,
  "has_rubric": false
 },
 "pixel_upscale": {
  "id": "pixel_upscale",
  "label": "Pixel Upscaler",
  "description": ">-",
  "engine": "",
  "card": "",
  "unoffered": true,
  "defaults": {
   "batch_size": 5,
   "cfg": 7.5,
   "denoise": 0.4,
   "detection_threshold": 0.35,
   "downscale_first": 1.0,
   "filename_prefix": "upscaled",
   "guide_size": 512,
   "inpaint_region": "free",
   "max_size": 1024,
   "resolution": 2048,
   "seed": 0,
   "steps": 50,
   "target_scale": 4.0,
   "mode": "upscale"
  },
  "base_body": "",
  "genre": "Genre.IMAGE",
  "mods": [],
  "variants": [
   {
    "id": "grl",
    "label": "",
    "hint": "",
    "group": "Variant",
    "route": "pixel_apisr_grl",
    "engine": "",
    "resolver_defaults": {},
    "cells": []
   },
   {
    "id": "rrdb",
    "label": "",
    "hint": "",
    "group": "Variant",
    "route": "pixel_apisr_rrdb",
    "engine": "",
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "mask-studio": {
  "id": "mask-studio",
  "label": "Mask",
  "description": "Selection-only mask card: RT-DETR proposes, SAM3 refines → named class masks for inpaint flows.",
  "engine": "comfyui",
  "form": "form_mask_studio",
  "card": "mask-studio",
  "unoffered": false,
  "defaults": {
   "output_mode": "segm",
   "detect_mode": "body",
   "detection_threshold": 0.35,
   "sam_threshold": 0.93,
   "sam_dilation": 0,
   "export_face": false,
   "export_hands": false,
   "export_body": false,
   "export_paint": false,
   "export_boxes": true,
   "instance_filter": "all",
   "max_instances": 0,
   "outputs": "[]"
  },
  "source": {
   "repo_id": "facebook/sam-vit-base"
  },
  "studio": {
   "tenant": "image/mask_studio",
   "owns_params": true,
   "writes": "('input_image', 'detect_mode', 'detection_threshold', 'sam_threshold', 'sam_dilation', 'output_mode', 'sam3_prompt', 'export_boxes', 'export_face', 'export_hands', 'export_body', 'export_paint', 'paint_mask', 'instance_filter', 'max_instances', 'outputs', 'roi')"
  },
  "base_body": "",
  "genre": "Genre.IMAGE",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "mask-studio",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "f32",
      "label": "F32",
      "route": "mask-studio",
      "engine": "",
      "vram_peak_gb": 12.0,
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [
   {
    "name": "rt_detr_v4-x-hgnet_fp32.safetensors",
    "url": "https://huggingface.co/Comfy-Org/SDPose/resolve/main/diffusion_models/rt_detr_v4-x-hgnet_fp32.safetensors",
    "folder": "diffusion_models",
    "sha256": "1ba4a7794c2f8b176327c887ba38fbe0f977049cbef149960288aa923d0239f3"
   }
  ],
  "accepts": [],
  "character_presets": [],
  "lane_inputs": {
   "background_removal": "",
   "checkpoint": "sam3.1_multiplex_fp16.safetensors",
   "clip_vision": "",
   "construct": "<bound method BaseModel.construct of <class 'melite_models.grammar.LaneInputs'>>",
   "copy": "<bound method BaseModel.copy of LaneInputs(unet='rt_detr_v4-x-hgnet_fp32.safetensors', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='', model_path='', checkpoint='sam3.1_multiplex_fp16.safetensors', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "dict": "<bound method BaseModel.dict of LaneInputs(unet='rt_detr_v4-x-hgnet_fp32.safetensors', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='', model_path='', checkpoint='sam3.1_multiplex_fp16.safetensors', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "family": "",
   "from_orm": "<bound method BaseModel.from_orm of <class 'melite_models.grammar.LaneInputs'>>",
   "json": "<bound method BaseModel.json of LaneInputs(unet='rt_detr_v4-x-hgnet_fp32.safetensors', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='', model_path='', checkpoint='sam3.1_multiplex_fp16.safetensors', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "latent_node": "EmptySD3LatentImage",
   "model_computed_fields": {},
   "model_config": {
    "extra": "forbid",
    "frozen": true
   },
   "model_construct": "<bound method BaseModel.model_construct of <class 'melite_models.grammar.LaneInputs'>>",
   "model_copy": "<bound method BaseModel.model_copy of LaneInputs(unet='rt_detr_v4-x-hgnet_fp32.safetensors', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='', model_path='', checkpoint='sam3.1_multiplex_fp16.safetensors', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump": "<bound method BaseModel.model_dump of LaneInputs(unet='rt_detr_v4-x-hgnet_fp32.safetensors', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='', model_path='', checkpoint='sam3.1_multiplex_fp16.safetensors', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump_json": "<bound method BaseModel.model_dump_json of LaneInputs(unet='rt_detr_v4-x-hgnet_fp32.safetensors', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='', model_path='', checkpoint='sam3.1_multiplex_fp16.safetensors', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_fields": {
    "unet": "annotation=str required=False default=''",
    "unet_variant": "annotation=str required=False default=''",
    "unet_quant": "annotation=str required=False default=''",
    "text_encoder": "annotation=str required=False default=''",
    "clip_type": "annotation=Union[ClipType, NoneType] required=False default=None",
    "vae": "annotation=str required=False default=''",
    "family": "annotation=str required=False default=''",
    "model_path": "annotation=str required=False default=''",
    "checkpoint": "annotation=str required=False default=''",
    "texture_vae": "annotation=str required=False default=''",
    "clip_vision": "annotation=str required=False default=''",
    "background_removal": "annotation=str required=False default=''",
    "sampling_shift": "annotation=float required=False default=0.0",
    "latent_node": "annotation=LatentNode required=False default=<LatentNode.SD3: 'EmptySD3LatentImage'>",
    "unet_unconditional": "annotation=str required=False default=''",
    "weightless": "annotation=bool required=False default=False"
   },
   "model_fields_set": "{'unet', 'checkpoint'}",
   "model_json_schema": "<bound method BaseModel.model_json_schema of <class 'melite_models.grammar.LaneInputs'>>",
   "model_parametrized_name": "<bound method BaseModel.model_parametrized_name of <class 'melite_models.grammar.LaneInputs'>>",
   "model_path": "",
   "model_post_init": "<bound method BaseModel.model_post_init of LaneInputs(unet='rt_detr_v4-x-hgnet_fp32.safetensors', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='', model_path='', checkpoint='sam3.1_multiplex_fp16.safetensors', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_rebuild": "<bound method BaseModel.model_rebuild of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate": "<bound method BaseModel.model_validate of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_json": "<bound method BaseModel.model_validate_json of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_strings": "<bound method BaseModel.model_validate_strings of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_file": "<bound method BaseModel.parse_file of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_obj": "<bound method BaseModel.parse_obj of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_raw": "<bound method BaseModel.parse_raw of <class 'melite_models.grammar.LaneInputs'>>",
   "sampling_shift": 0.0,
   "schema": "<bound method BaseModel.schema of <class 'melite_models.grammar.LaneInputs'>>",
   "schema_json": "<bound method BaseModel.schema_json of <class 'melite_models.grammar.LaneInputs'>>",
   "text_encoder": "",
   "texture_vae": "",
   "unet": "rt_detr_v4-x-hgnet_fp32.safetensors",
   "unet_quant": "",
   "unet_unconditional": "",
   "unet_variant": "",
   "update_forward_refs": "<bound method BaseModel.update_forward_refs of <class 'melite_models.grammar.LaneInputs'>>",
   "vae": "",
   "validate": "<bound method BaseModel.validate of <class 'melite_models.grammar.LaneInputs'>>",
   "weightless": false
  },
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "krea-2": {
  "id": "krea-2",
  "label": "Krea 2",
  "description": "High-quality general text-to-image generation.",
  "engine": "comfyui",
  "form": "form_generate",
  "card": "image-gen",
  "unoffered": false,
  "defaults": {
   "scheduler": "normal",
   "width": 1024,
   "height": 1024,
   "steps": 8,
   "sampler": "euler",
   "cfg": 1.0
  },
  "prompt_guide": null,
  "base_body": "",
  "genre": "Genre.IMAGE",
  "mods": [
   "loras"
  ],
  "variants": [
   {
    "id": "turbo",
    "label": "Turbo",
    "hint": "8-step distilled — fast, photorealistic (DEFAULT)",
    "group": "Variant",
    "route": "krea-2",
    "engine": "",
    "order": 0,
    "resolver_defaults": {
     "model": "krea-2"
    },
    "cells": [
     {
      "quant": "int8",
      "label": "INT8 ConvRot",
      "route": "krea-2",
      "engine": "",
      "resolver_defaults": {},
      "hide_from_dropdown": false,
      "artifact": {
       "source_url": "https://huggingface.co/Comfy-Org/Krea-2/resolve/main/diffusion_models/krea2_turbo_int8_convrot.safetensors",
       "size_bytes": 13492686496,
       "sha256": "8e4eeda70dd5037ab1ba2bef6b417f9f901e26093117cf397f741fc1fdaaf3f1",
       "dest_root": "COMFYUI_ROOT",
       "dest_sub": "diffusion_models",
       "size_hint_gb": 13.5
      }
     }
    ]
   },
   {
    "id": "raw",
    "label": "Raw",
    "hint": "52-step base checkpoint — the variant the loras train on (DEFAULT here)",
    "group": "Variant",
    "route": "krea-2-raw",
    "engine": "",
    "order": 1,
    "resolver_defaults": {
     "model": "krea-2-raw",
     "steps": 52,
     "cfg": 3.5
    },
    "cells": [
     {
      "quant": "int8",
      "label": "INT8 ConvRot",
      "route": "krea-2-raw",
      "engine": "",
      "vram_peak_gb": 22.0,
      "resolver_defaults": {},
      "hide_from_dropdown": false,
      "artifact": {
       "source_url": "https://huggingface.co/Comfy-Org/Krea-2/resolve/main/diffusion_models/krea2_raw_int8_convrot.safetensors",
       "size_bytes": 13492686496,
       "sha256": "5585a4a38c4bcfb6fde2d480a4aa6edf7f665721ebde56d30662c35a45f5fa5c",
       "dest_root": "COMFYUI_ROOT",
       "dest_sub": "diffusion_models",
       "size_hint_gb": 13.5
      }
     }
    ]
   },
   {
    "id": "realism",
    "label": "Realism",
    "hint": "The realism recipe — krea2_realism_lora at the catalog row's default strength (0.7)",
    "group": "Recipe",
    "route": "",
    "engine": "",
    "order": 0,
    "resolver_defaults": {},
    "cells": [],
    "wire_defaults": {
     "loras": [
      {
       "id": "krea2_realism_lora"
      }
     ]
    }
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
    "tooltip": "Base checkpoint — Turbo (8-step distilled, fast/photorealistic) or Raw (52-step base, for LoRA training).",
    "default": ""
   },
   {
    "id": "Quant",
    "label": "Quant",
    "tooltip": "Quantization tier — INT8 ConvRot (the official Comfy-Org convrot artifact, DEFAULT).",
    "default": ""
   },
   {
    "id": "Recipe",
    "label": "Recipe",
    "tooltip": "One-click recipes — patch-only rows that stamp picks onto the draft; Default stamps nothing.",
    "default": "default"
   }
  ],
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "lane_inputs": {
   "background_removal": "",
   "checkpoint": "",
   "clip_type": "krea2",
   "clip_vision": "",
   "construct": "<bound method BaseModel.construct of <class 'melite_models.grammar.LaneInputs'>>",
   "copy": "<bound method BaseModel.copy of LaneInputs(unet='', unet_variant='turbo', unet_quant='int8', text_encoder='qwen3vl_4b_fp8_scaled.safetensors', clip_type=<ClipType.KREA2: 'krea2'>, vae='qwen_image_vae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "dict": "<bound method BaseModel.dict of LaneInputs(unet='', unet_variant='turbo', unet_quant='int8', text_encoder='qwen3vl_4b_fp8_scaled.safetensors', clip_type=<ClipType.KREA2: 'krea2'>, vae='qwen_image_vae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "family": "",
   "from_orm": "<bound method BaseModel.from_orm of <class 'melite_models.grammar.LaneInputs'>>",
   "json": "<bound method BaseModel.json of LaneInputs(unet='', unet_variant='turbo', unet_quant='int8', text_encoder='qwen3vl_4b_fp8_scaled.safetensors', clip_type=<ClipType.KREA2: 'krea2'>, vae='qwen_image_vae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "latent_node": "EmptySD3LatentImage",
   "model_computed_fields": {},
   "model_config": {
    "extra": "forbid",
    "frozen": true
   },
   "model_construct": "<bound method BaseModel.model_construct of <class 'melite_models.grammar.LaneInputs'>>",
   "model_copy": "<bound method BaseModel.model_copy of LaneInputs(unet='', unet_variant='turbo', unet_quant='int8', text_encoder='qwen3vl_4b_fp8_scaled.safetensors', clip_type=<ClipType.KREA2: 'krea2'>, vae='qwen_image_vae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump": "<bound method BaseModel.model_dump of LaneInputs(unet='', unet_variant='turbo', unet_quant='int8', text_encoder='qwen3vl_4b_fp8_scaled.safetensors', clip_type=<ClipType.KREA2: 'krea2'>, vae='qwen_image_vae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump_json": "<bound method BaseModel.model_dump_json of LaneInputs(unet='', unet_variant='turbo', unet_quant='int8', text_encoder='qwen3vl_4b_fp8_scaled.safetensors', clip_type=<ClipType.KREA2: 'krea2'>, vae='qwen_image_vae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_fields": {
    "unet": "annotation=str required=False default=''",
    "unet_variant": "annotation=str required=False default=''",
    "unet_quant": "annotation=str required=False default=''",
    "text_encoder": "annotation=str required=False default=''",
    "clip_type": "annotation=Union[ClipType, NoneType] required=False default=None",
    "vae": "annotation=str required=False default=''",
    "family": "annotation=str required=False default=''",
    "model_path": "annotation=str required=False default=''",
    "checkpoint": "annotation=str required=False default=''",
    "texture_vae": "annotation=str required=False default=''",
    "clip_vision": "annotation=str required=False default=''",
    "background_removal": "annotation=str required=False default=''",
    "sampling_shift": "annotation=float required=False default=0.0",
    "latent_node": "annotation=LatentNode required=False default=<LatentNode.SD3: 'EmptySD3LatentImage'>",
    "unet_unconditional": "annotation=str required=False default=''",
    "weightless": "annotation=bool required=False default=False"
   },
   "model_fields_set": "{'unet_variant', 'clip_type', 'vae', 'text_encoder', 'unet_quant'}",
   "model_json_schema": "<bound method BaseModel.model_json_schema of <class 'melite_models.grammar.LaneInputs'>>",
   "model_parametrized_name": "<bound method BaseModel.model_parametrized_name of <class 'melite_models.grammar.LaneInputs'>>",
   "model_path": "",
   "model_post_init": "<bound method BaseModel.model_post_init of LaneInputs(unet='', unet_variant='turbo', unet_quant='int8', text_encoder='qwen3vl_4b_fp8_scaled.safetensors', clip_type=<ClipType.KREA2: 'krea2'>, vae='qwen_image_vae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_rebuild": "<bound method BaseModel.model_rebuild of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate": "<bound method BaseModel.model_validate of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_json": "<bound method BaseModel.model_validate_json of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_strings": "<bound method BaseModel.model_validate_strings of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_file": "<bound method BaseModel.parse_file of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_obj": "<bound method BaseModel.parse_obj of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_raw": "<bound method BaseModel.parse_raw of <class 'melite_models.grammar.LaneInputs'>>",
   "sampling_shift": 0.0,
   "schema": "<bound method BaseModel.schema of <class 'melite_models.grammar.LaneInputs'>>",
   "schema_json": "<bound method BaseModel.schema_json of <class 'melite_models.grammar.LaneInputs'>>",
   "text_encoder": "qwen3vl_4b_fp8_scaled.safetensors",
   "texture_vae": "",
   "unet": "",
   "unet_quant": "int8",
   "unet_unconditional": "",
   "unet_variant": "turbo",
   "update_forward_refs": "<bound method BaseModel.update_forward_refs of <class 'melite_models.grammar.LaneInputs'>>",
   "vae": "qwen_image_vae.safetensors",
   "validate": "<bound method BaseModel.validate of <class 'melite_models.grammar.LaneInputs'>>",
   "weightless": false
  },
  "timeout_floor": 300,
  "canvas_default": true,
  "has_agent": true,
  "has_inference": false,
  "has_rubric": false
 },
 "joytag": {
  "id": "joytag",
  "label": "JoyTag",
  "description": "Booru keyword tagger (JoyTag lineage) — thresholded Danbooru tags with add/remove lists for recreation workflows. Torch lane, node-local checkpoint.",
  "engine": "comfyui",
  "form": "form_tagger",
  "card": "tagger",
  "unoffered": false,
  "defaults": {
   "threshold": 0.2,
   "add_tag": "",
   "remove_tag": ""
  },
  "base_body": "",
  "genre": "Genre.IMAGE",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "joytag",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "f32",
      "label": "F32",
      "route": "joytag",
      "engine": "",
      "vram_peak_gb": 4.0,
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "joycaption": {
  "id": "joycaption",
  "label": "JoyCaption",
  "description": "Stylized natural-language image captioning (JoyCaption beta-one, 8B VLM) — descriptive / SD-prompt / MJ / booru-list templates for recreating images in FLUX / Ideogram / image-edit.",
  "engine": "comfyui",
  "form": "form_tagger",
  "card": "tagger",
  "unoffered": false,
  "defaults": {
   "checkpoint": "fancyfeast/llama-joycaption-beta-one-hf-llava",
   "caption_type": "Descriptive",
   "caption_length": "long",
   "extra_option": ""
  },
  "base_body": "",
  "genre": "Genre.IMAGE",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "joycaption",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "f32",
      "label": "F32",
      "route": "joycaption",
      "engine": "",
      "vram_peak_gb": 20.0,
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "input": {
  "id": "input",
  "label": "Input Prep",
  "description": "Source intake: attach an image or audio file (upload, asset drop, prior run) — staged, optionally transformed, emitted as a media artifact for downstream cards to wire.",
  "engine": "comfyui",
  "form": "form_input",
  "card": "input-prep",
  "unoffered": false,
  "defaults": {},
  "base_body": "",
  "genre": "Genre.IMAGE",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "input",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "native",
      "label": "Native (weightless)",
      "route": "input",
      "engine": "",
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [
   "image",
   "audio"
  ],
  "character_presets": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "ideogram": {
  "id": "ideogram",
  "label": "Ideogram",
  "description": "Typography-aware text-to-image with clean, legible text rendering.",
  "engine": "comfyui",
  "form": "form_generate",
  "card": "ideogram4",
  "unoffered": false,
  "defaults": {
   "mu": 0.5,
   "std": 1.75,
   "width": 1024,
   "height": 1024,
   "steps": 20,
   "sampler": "euler",
   "cfg": 7.0
  },
  "studio": {
   "tenant": "image/canvas-ideogram",
   "owns_params": false
  },
  "base_body": "",
  "genre": "Genre.IMAGE",
  "mods": [],
  "variants": [
   {
    "id": "nf4",
    "label": "NF4",
    "hint": "nvfp4 mixed-precision — DEFAULT",
    "group": "Variant",
    "route": "ideogram",
    "engine": "",
    "order": 0,
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "lane_inputs": {
   "background_removal": "",
   "checkpoint": "",
   "clip_type": "ideogram4",
   "clip_vision": "",
   "construct": "<bound method BaseModel.construct of <class 'melite_models.grammar.LaneInputs'>>",
   "copy": "<bound method BaseModel.copy of LaneInputs(unet='ideogram4_nvfp4_mixed.safetensors', unet_variant='', unet_quant='', text_encoder='qwen3vl_8b_nvfp4.safetensors', clip_type=<ClipType.IDEOGRAM4: 'ideogram4'>, vae='flux2-vae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.FLUX2: 'EmptyFlux2LatentImage'>, unet_unconditional='ideogram4_unconditional_nvfp4_mixed.safetensors', weightless=False)>",
   "dict": "<bound method BaseModel.dict of LaneInputs(unet='ideogram4_nvfp4_mixed.safetensors', unet_variant='', unet_quant='', text_encoder='qwen3vl_8b_nvfp4.safetensors', clip_type=<ClipType.IDEOGRAM4: 'ideogram4'>, vae='flux2-vae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.FLUX2: 'EmptyFlux2LatentImage'>, unet_unconditional='ideogram4_unconditional_nvfp4_mixed.safetensors', weightless=False)>",
   "family": "",
   "from_orm": "<bound method BaseModel.from_orm of <class 'melite_models.grammar.LaneInputs'>>",
   "json": "<bound method BaseModel.json of LaneInputs(unet='ideogram4_nvfp4_mixed.safetensors', unet_variant='', unet_quant='', text_encoder='qwen3vl_8b_nvfp4.safetensors', clip_type=<ClipType.IDEOGRAM4: 'ideogram4'>, vae='flux2-vae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.FLUX2: 'EmptyFlux2LatentImage'>, unet_unconditional='ideogram4_unconditional_nvfp4_mixed.safetensors', weightless=False)>",
   "latent_node": "EmptyFlux2LatentImage",
   "model_computed_fields": {},
   "model_config": {
    "extra": "forbid",
    "frozen": true
   },
   "model_construct": "<bound method BaseModel.model_construct of <class 'melite_models.grammar.LaneInputs'>>",
   "model_copy": "<bound method BaseModel.model_copy of LaneInputs(unet='ideogram4_nvfp4_mixed.safetensors', unet_variant='', unet_quant='', text_encoder='qwen3vl_8b_nvfp4.safetensors', clip_type=<ClipType.IDEOGRAM4: 'ideogram4'>, vae='flux2-vae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.FLUX2: 'EmptyFlux2LatentImage'>, unet_unconditional='ideogram4_unconditional_nvfp4_mixed.safetensors', weightless=False)>",
   "model_dump": "<bound method BaseModel.model_dump of LaneInputs(unet='ideogram4_nvfp4_mixed.safetensors', unet_variant='', unet_quant='', text_encoder='qwen3vl_8b_nvfp4.safetensors', clip_type=<ClipType.IDEOGRAM4: 'ideogram4'>, vae='flux2-vae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.FLUX2: 'EmptyFlux2LatentImage'>, unet_unconditional='ideogram4_unconditional_nvfp4_mixed.safetensors', weightless=False)>",
   "model_dump_json": "<bound method BaseModel.model_dump_json of LaneInputs(unet='ideogram4_nvfp4_mixed.safetensors', unet_variant='', unet_quant='', text_encoder='qwen3vl_8b_nvfp4.safetensors', clip_type=<ClipType.IDEOGRAM4: 'ideogram4'>, vae='flux2-vae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.FLUX2: 'EmptyFlux2LatentImage'>, unet_unconditional='ideogram4_unconditional_nvfp4_mixed.safetensors', weightless=False)>",
   "model_fields": {
    "unet": "annotation=str required=False default=''",
    "unet_variant": "annotation=str required=False default=''",
    "unet_quant": "annotation=str required=False default=''",
    "text_encoder": "annotation=str required=False default=''",
    "clip_type": "annotation=Union[ClipType, NoneType] required=False default=None",
    "vae": "annotation=str required=False default=''",
    "family": "annotation=str required=False default=''",
    "model_path": "annotation=str required=False default=''",
    "checkpoint": "annotation=str required=False default=''",
    "texture_vae": "annotation=str required=False default=''",
    "clip_vision": "annotation=str required=False default=''",
    "background_removal": "annotation=str required=False default=''",
    "sampling_shift": "annotation=float required=False default=0.0",
    "latent_node": "annotation=LatentNode required=False default=<LatentNode.SD3: 'EmptySD3LatentImage'>",
    "unet_unconditional": "annotation=str required=False default=''",
    "weightless": "annotation=bool required=False default=False"
   },
   "model_fields_set": "{'latent_node', 'unet_unconditional', 'clip_type', 'vae', 'text_encoder', 'unet'}",
   "model_json_schema": "<bound method BaseModel.model_json_schema of <class 'melite_models.grammar.LaneInputs'>>",
   "model_parametrized_name": "<bound method BaseModel.model_parametrized_name of <class 'melite_models.grammar.LaneInputs'>>",
   "model_path": "",
   "model_post_init": "<bound method BaseModel.model_post_init of LaneInputs(unet='ideogram4_nvfp4_mixed.safetensors', unet_variant='', unet_quant='', text_encoder='qwen3vl_8b_nvfp4.safetensors', clip_type=<ClipType.IDEOGRAM4: 'ideogram4'>, vae='flux2-vae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.FLUX2: 'EmptyFlux2LatentImage'>, unet_unconditional='ideogram4_unconditional_nvfp4_mixed.safetensors', weightless=False)>",
   "model_rebuild": "<bound method BaseModel.model_rebuild of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate": "<bound method BaseModel.model_validate of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_json": "<bound method BaseModel.model_validate_json of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_strings": "<bound method BaseModel.model_validate_strings of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_file": "<bound method BaseModel.parse_file of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_obj": "<bound method BaseModel.parse_obj of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_raw": "<bound method BaseModel.parse_raw of <class 'melite_models.grammar.LaneInputs'>>",
   "sampling_shift": 0.0,
   "schema": "<bound method BaseModel.schema of <class 'melite_models.grammar.LaneInputs'>>",
   "schema_json": "<bound method BaseModel.schema_json of <class 'melite_models.grammar.LaneInputs'>>",
   "text_encoder": "qwen3vl_8b_nvfp4.safetensors",
   "texture_vae": "",
   "unet": "ideogram4_nvfp4_mixed.safetensors",
   "unet_quant": "",
   "unet_unconditional": "ideogram4_unconditional_nvfp4_mixed.safetensors",
   "unet_variant": "",
   "update_forward_refs": "<bound method BaseModel.update_forward_refs of <class 'melite_models.grammar.LaneInputs'>>",
   "vae": "flux2-vae.safetensors",
   "validate": "<bound method BaseModel.validate of <class 'melite_models.grammar.LaneInputs'>>",
   "weightless": false
  },
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "flux-fill-dev": {
  "id": "flux-fill-dev",
  "label": "Inpaint",
  "description": "Dual-engine masked region inpainting — FLUX.1-Fill (dedicated fill arch) or LanPaint on any base model.",
  "engine": "",
  "form": "form_inpaint",
  "card": "",
  "unoffered": false,
  "defaults": {
   "inpaint_context_pad": 64,
   "inpaint_detail": "crop+stitch",
   "inpaint_edge_extend": 0,
   "inpaint_target_size": 1024,
   "outpaint_bottom": 0,
   "outpaint_left": 0,
   "outpaint_overlap": 16,
   "outpaint_right": 0,
   "outpaint_top": 0,
   "refine_denoise": 0.4,
   "mode": "replace",
   "steps": 20,
   "cfg": 1.0,
   "guidance": 30.0,
   "sampler": "euler",
   "scheduler": "normal",
   "seed": 42,
   "mask_grow": 8,
   "mask_feather": 8,
   "mask_threshold": 0.0,
   "mask_invert": false
  },
  "base_body": "",
  "genre": "Genre.IMAGE",
  "mods": [],
  "variants": [
   {
    "id": "onereward",
    "label": "OneReward",
    "hint": "SOTA true-CFG RLHF fine-tune (non-commercial license)",
    "group": "Variant",
    "route": "flux-fill-onereward",
    "engine": "",
    "order": 0,
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "florence2": {
  "id": "florence2",
  "label": "Florence-2",
  "description": "Natural-language image captioning (Florence-2 large, PromptGen-tuned) — dense descriptive prompts for recreating images in FLUX / Ideogram / image-edit.",
  "engine": "comfyui",
  "form": "form_tagger",
  "card": "tagger",
  "unoffered": false,
  "defaults": {
   "checkpoint": "MiaoshouAI/Florence-2-large-PromptGen-v2.0",
   "caption_task": "more_detailed_caption"
  },
  "base_body": "",
  "genre": "Genre.IMAGE",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "florence2",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "f32",
      "label": "F32",
      "route": "florence2",
      "engine": "",
      "vram_peak_gb": 6.0,
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "basic_resize": {
  "id": "basic_resize",
  "label": "Basic Resize",
  "description": ">-",
  "engine": "",
  "card": "",
  "unoffered": true,
  "defaults": {
   "resize_method": "lanczos",
   "resize_scale": 0.5,
   "filename_prefix": "scaled"
  },
  "base_body": "",
  "genre": "Genre.IMAGE",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "basic_resize",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "native",
      "label": "Native (weightless)",
      "route": "basic_resize",
      "engine": "",
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "auto-detect": {
  "id": "auto-detect",
  "label": "Auto Detect",
  "description": "Auto Detect — automatically selects the best model and conditioning for a given input.",
  "engine": "",
  "form": "form_detect",
  "card": "",
  "unoffered": false,
  "defaults": {
   "output_mode": "segm",
   "detect_mode": "face",
   "detection_threshold": 0.35,
   "sam_dilation": 0,
   "sam_threshold": 0.93
  },
  "base_body": "",
  "genre": "Genre.IMAGE",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "auto-detect",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "native",
      "label": "Native (weightless)",
      "route": "auto-detect",
      "engine": "",
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "anima": {
  "id": "anima",
  "label": "Anima",
  "description": "Anime/illustration text-to-image. Cosmos-Predict2 base with Danbooru-style prompting.",
  "engine": "comfyui",
  "form": "form_generate",
  "card": "image-gen",
  "unoffered": false,
  "defaults": {
   "width": 1024,
   "height": 1024,
   "steps": 30,
   "sampler": "er_sde",
   "scheduler": "simple",
   "cfg": 4.0
  },
  "base_body": "",
  "genre": "Genre.IMAGE",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "anima",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "f32",
      "label": "F32",
      "route": "anima",
      "engine": "",
      "vram_peak_gb": 20.0,
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "lane_inputs": {
   "background_removal": "",
   "checkpoint": "",
   "clip_type": "stable_diffusion",
   "clip_vision": "",
   "construct": "<bound method BaseModel.construct of <class 'melite_models.grammar.LaneInputs'>>",
   "copy": "<bound method BaseModel.copy of LaneInputs(unet='anima-base-v1.0.safetensors', unet_variant='', unet_quant='', text_encoder='qwen_3_06b_base.safetensors', clip_type=<ClipType.STABLE_DIFFUSION: 'stable_diffusion'>, vae='qwen_image_vae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.PLAIN: 'EmptyLatentImage'>, unet_unconditional='', weightless=False)>",
   "dict": "<bound method BaseModel.dict of LaneInputs(unet='anima-base-v1.0.safetensors', unet_variant='', unet_quant='', text_encoder='qwen_3_06b_base.safetensors', clip_type=<ClipType.STABLE_DIFFUSION: 'stable_diffusion'>, vae='qwen_image_vae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.PLAIN: 'EmptyLatentImage'>, unet_unconditional='', weightless=False)>",
   "family": "",
   "from_orm": "<bound method BaseModel.from_orm of <class 'melite_models.grammar.LaneInputs'>>",
   "json": "<bound method BaseModel.json of LaneInputs(unet='anima-base-v1.0.safetensors', unet_variant='', unet_quant='', text_encoder='qwen_3_06b_base.safetensors', clip_type=<ClipType.STABLE_DIFFUSION: 'stable_diffusion'>, vae='qwen_image_vae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.PLAIN: 'EmptyLatentImage'>, unet_unconditional='', weightless=False)>",
   "latent_node": "EmptyLatentImage",
   "model_computed_fields": {},
   "model_config": {
    "extra": "forbid",
    "frozen": true
   },
   "model_construct": "<bound method BaseModel.model_construct of <class 'melite_models.grammar.LaneInputs'>>",
   "model_copy": "<bound method BaseModel.model_copy of LaneInputs(unet='anima-base-v1.0.safetensors', unet_variant='', unet_quant='', text_encoder='qwen_3_06b_base.safetensors', clip_type=<ClipType.STABLE_DIFFUSION: 'stable_diffusion'>, vae='qwen_image_vae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.PLAIN: 'EmptyLatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump": "<bound method BaseModel.model_dump of LaneInputs(unet='anima-base-v1.0.safetensors', unet_variant='', unet_quant='', text_encoder='qwen_3_06b_base.safetensors', clip_type=<ClipType.STABLE_DIFFUSION: 'stable_diffusion'>, vae='qwen_image_vae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.PLAIN: 'EmptyLatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump_json": "<bound method BaseModel.model_dump_json of LaneInputs(unet='anima-base-v1.0.safetensors', unet_variant='', unet_quant='', text_encoder='qwen_3_06b_base.safetensors', clip_type=<ClipType.STABLE_DIFFUSION: 'stable_diffusion'>, vae='qwen_image_vae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.PLAIN: 'EmptyLatentImage'>, unet_unconditional='', weightless=False)>",
   "model_fields": {
    "unet": "annotation=str required=False default=''",
    "unet_variant": "annotation=str required=False default=''",
    "unet_quant": "annotation=str required=False default=''",
    "text_encoder": "annotation=str required=False default=''",
    "clip_type": "annotation=Union[ClipType, NoneType] required=False default=None",
    "vae": "annotation=str required=False default=''",
    "family": "annotation=str required=False default=''",
    "model_path": "annotation=str required=False default=''",
    "checkpoint": "annotation=str required=False default=''",
    "texture_vae": "annotation=str required=False default=''",
    "clip_vision": "annotation=str required=False default=''",
    "background_removal": "annotation=str required=False default=''",
    "sampling_shift": "annotation=float required=False default=0.0",
    "latent_node": "annotation=LatentNode required=False default=<LatentNode.SD3: 'EmptySD3LatentImage'>",
    "unet_unconditional": "annotation=str required=False default=''",
    "weightless": "annotation=bool required=False default=False"
   },
   "model_fields_set": "{'latent_node', 'clip_type', 'vae', 'text_encoder', 'unet'}",
   "model_json_schema": "<bound method BaseModel.model_json_schema of <class 'melite_models.grammar.LaneInputs'>>",
   "model_parametrized_name": "<bound method BaseModel.model_parametrized_name of <class 'melite_models.grammar.LaneInputs'>>",
   "model_path": "",
   "model_post_init": "<bound method BaseModel.model_post_init of LaneInputs(unet='anima-base-v1.0.safetensors', unet_variant='', unet_quant='', text_encoder='qwen_3_06b_base.safetensors', clip_type=<ClipType.STABLE_DIFFUSION: 'stable_diffusion'>, vae='qwen_image_vae.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.PLAIN: 'EmptyLatentImage'>, unet_unconditional='', weightless=False)>",
   "model_rebuild": "<bound method BaseModel.model_rebuild of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate": "<bound method BaseModel.model_validate of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_json": "<bound method BaseModel.model_validate_json of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_strings": "<bound method BaseModel.model_validate_strings of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_file": "<bound method BaseModel.parse_file of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_obj": "<bound method BaseModel.parse_obj of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_raw": "<bound method BaseModel.parse_raw of <class 'melite_models.grammar.LaneInputs'>>",
   "sampling_shift": 0.0,
   "schema": "<bound method BaseModel.schema of <class 'melite_models.grammar.LaneInputs'>>",
   "schema_json": "<bound method BaseModel.schema_json of <class 'melite_models.grammar.LaneInputs'>>",
   "text_encoder": "qwen_3_06b_base.safetensors",
   "texture_vae": "",
   "unet": "anima-base-v1.0.safetensors",
   "unet_quant": "",
   "unet_unconditional": "",
   "unet_variant": "",
   "update_forward_refs": "<bound method BaseModel.update_forward_refs of <class 'melite_models.grammar.LaneInputs'>>",
   "vae": "qwen_image_vae.safetensors",
   "validate": "<bound method BaseModel.validate of <class 'melite_models.grammar.LaneInputs'>>",
   "weightless": false
  },
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "qwen3-tts": {
  "id": "qwen3-tts",
  "label": "Qwen3-TTS CustomVoice 0.6B",
  "description": "Qwen3-TTS 12Hz CustomVoice 0.6B — preset personas and instruct-text emotion control",
  "engine": "comfyui",
  "form": "form_tts",
  "card": "tts",
  "unoffered": false,
  "defaults": {
   "mode": "tts",
   "voice": "vivian"
  },
  "base_body": "",
  "genre": "Genre.AUDIO",
  "mods": [
   "qvoice"
  ],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "qwen3-tts",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "native",
      "label": "Native",
      "route": "qwen3-tts",
      "engine": "",
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "lane_inputs": {
   "background_removal": "",
   "checkpoint": "",
   "clip_vision": "",
   "construct": "<bound method BaseModel.construct of <class 'melite_models.grammar.LaneInputs'>>",
   "copy": "<bound method BaseModel.copy of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='qwen3_tts', model_path='Qwen3-TTS-12Hz-0.6B-CustomVoice-merged', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "dict": "<bound method BaseModel.dict of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='qwen3_tts', model_path='Qwen3-TTS-12Hz-0.6B-CustomVoice-merged', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "family": "qwen3_tts",
   "from_orm": "<bound method BaseModel.from_orm of <class 'melite_models.grammar.LaneInputs'>>",
   "json": "<bound method BaseModel.json of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='qwen3_tts', model_path='Qwen3-TTS-12Hz-0.6B-CustomVoice-merged', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "latent_node": "EmptySD3LatentImage",
   "model_computed_fields": {},
   "model_config": {
    "extra": "forbid",
    "frozen": true
   },
   "model_construct": "<bound method BaseModel.model_construct of <class 'melite_models.grammar.LaneInputs'>>",
   "model_copy": "<bound method BaseModel.model_copy of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='qwen3_tts', model_path='Qwen3-TTS-12Hz-0.6B-CustomVoice-merged', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump": "<bound method BaseModel.model_dump of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='qwen3_tts', model_path='Qwen3-TTS-12Hz-0.6B-CustomVoice-merged', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump_json": "<bound method BaseModel.model_dump_json of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='qwen3_tts', model_path='Qwen3-TTS-12Hz-0.6B-CustomVoice-merged', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_fields": {
    "unet": "annotation=str required=False default=''",
    "unet_variant": "annotation=str required=False default=''",
    "unet_quant": "annotation=str required=False default=''",
    "text_encoder": "annotation=str required=False default=''",
    "clip_type": "annotation=Union[ClipType, NoneType] required=False default=None",
    "vae": "annotation=str required=False default=''",
    "family": "annotation=str required=False default=''",
    "model_path": "annotation=str required=False default=''",
    "checkpoint": "annotation=str required=False default=''",
    "texture_vae": "annotation=str required=False default=''",
    "clip_vision": "annotation=str required=False default=''",
    "background_removal": "annotation=str required=False default=''",
    "sampling_shift": "annotation=float required=False default=0.0",
    "latent_node": "annotation=LatentNode required=False default=<LatentNode.SD3: 'EmptySD3LatentImage'>",
    "unet_unconditional": "annotation=str required=False default=''",
    "weightless": "annotation=bool required=False default=False"
   },
   "model_fields_set": "{'model_path', 'family'}",
   "model_json_schema": "<bound method BaseModel.model_json_schema of <class 'melite_models.grammar.LaneInputs'>>",
   "model_parametrized_name": "<bound method BaseModel.model_parametrized_name of <class 'melite_models.grammar.LaneInputs'>>",
   "model_path": "Qwen3-TTS-12Hz-0.6B-CustomVoice-merged",
   "model_post_init": "<bound method BaseModel.model_post_init of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='qwen3_tts', model_path='Qwen3-TTS-12Hz-0.6B-CustomVoice-merged', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_rebuild": "<bound method BaseModel.model_rebuild of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate": "<bound method BaseModel.model_validate of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_json": "<bound method BaseModel.model_validate_json of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_strings": "<bound method BaseModel.model_validate_strings of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_file": "<bound method BaseModel.parse_file of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_obj": "<bound method BaseModel.parse_obj of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_raw": "<bound method BaseModel.parse_raw of <class 'melite_models.grammar.LaneInputs'>>",
   "sampling_shift": 0.0,
   "schema": "<bound method BaseModel.schema of <class 'melite_models.grammar.LaneInputs'>>",
   "schema_json": "<bound method BaseModel.schema_json of <class 'melite_models.grammar.LaneInputs'>>",
   "text_encoder": "",
   "texture_vae": "",
   "unet": "",
   "unet_quant": "",
   "unet_unconditional": "",
   "unet_variant": "",
   "update_forward_refs": "<bound method BaseModel.update_forward_refs of <class 'melite_models.grammar.LaneInputs'>>",
   "vae": "",
   "validate": "<bound method BaseModel.validate of <class 'melite_models.grammar.LaneInputs'>>",
   "weightless": false
  },
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "qwen3-tts-voicedesign": {
  "id": "qwen3-tts-voicedesign",
  "label": "Qwen3-TTS VoiceDesign 1.7B",
  "description": "Qwen3-TTS 12Hz VoiceDesign 1.7B — instruction-following voice design; the voice-lock lane",
  "engine": "comfyui",
  "form": "form_tts",
  "card": "voice-lock",
  "unoffered": false,
  "defaults": {
   "mode": "design",
   "variant": "voicedesign"
  },
  "base_body": "",
  "genre": "Genre.AUDIO",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "qwen3-tts-voicedesign",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "native",
      "label": "Native",
      "route": "qwen3-tts-voicedesign",
      "engine": "",
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "lane_inputs": {
   "background_removal": "",
   "checkpoint": "",
   "clip_vision": "",
   "construct": "<bound method BaseModel.construct of <class 'melite_models.grammar.LaneInputs'>>",
   "copy": "<bound method BaseModel.copy of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='qwen3_tts', model_path='Qwen3-TTS-12Hz-0.6B-CustomVoice-merged', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "dict": "<bound method BaseModel.dict of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='qwen3_tts', model_path='Qwen3-TTS-12Hz-0.6B-CustomVoice-merged', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "family": "qwen3_tts",
   "from_orm": "<bound method BaseModel.from_orm of <class 'melite_models.grammar.LaneInputs'>>",
   "json": "<bound method BaseModel.json of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='qwen3_tts', model_path='Qwen3-TTS-12Hz-0.6B-CustomVoice-merged', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "latent_node": "EmptySD3LatentImage",
   "model_computed_fields": {},
   "model_config": {
    "extra": "forbid",
    "frozen": true
   },
   "model_construct": "<bound method BaseModel.model_construct of <class 'melite_models.grammar.LaneInputs'>>",
   "model_copy": "<bound method BaseModel.model_copy of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='qwen3_tts', model_path='Qwen3-TTS-12Hz-0.6B-CustomVoice-merged', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump": "<bound method BaseModel.model_dump of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='qwen3_tts', model_path='Qwen3-TTS-12Hz-0.6B-CustomVoice-merged', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump_json": "<bound method BaseModel.model_dump_json of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='qwen3_tts', model_path='Qwen3-TTS-12Hz-0.6B-CustomVoice-merged', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_fields": {
    "unet": "annotation=str required=False default=''",
    "unet_variant": "annotation=str required=False default=''",
    "unet_quant": "annotation=str required=False default=''",
    "text_encoder": "annotation=str required=False default=''",
    "clip_type": "annotation=Union[ClipType, NoneType] required=False default=None",
    "vae": "annotation=str required=False default=''",
    "family": "annotation=str required=False default=''",
    "model_path": "annotation=str required=False default=''",
    "checkpoint": "annotation=str required=False default=''",
    "texture_vae": "annotation=str required=False default=''",
    "clip_vision": "annotation=str required=False default=''",
    "background_removal": "annotation=str required=False default=''",
    "sampling_shift": "annotation=float required=False default=0.0",
    "latent_node": "annotation=LatentNode required=False default=<LatentNode.SD3: 'EmptySD3LatentImage'>",
    "unet_unconditional": "annotation=str required=False default=''",
    "weightless": "annotation=bool required=False default=False"
   },
   "model_fields_set": "{'model_path', 'family'}",
   "model_json_schema": "<bound method BaseModel.model_json_schema of <class 'melite_models.grammar.LaneInputs'>>",
   "model_parametrized_name": "<bound method BaseModel.model_parametrized_name of <class 'melite_models.grammar.LaneInputs'>>",
   "model_path": "Qwen3-TTS-12Hz-0.6B-CustomVoice-merged",
   "model_post_init": "<bound method BaseModel.model_post_init of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='qwen3_tts', model_path='Qwen3-TTS-12Hz-0.6B-CustomVoice-merged', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_rebuild": "<bound method BaseModel.model_rebuild of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate": "<bound method BaseModel.model_validate of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_json": "<bound method BaseModel.model_validate_json of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_strings": "<bound method BaseModel.model_validate_strings of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_file": "<bound method BaseModel.parse_file of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_obj": "<bound method BaseModel.parse_obj of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_raw": "<bound method BaseModel.parse_raw of <class 'melite_models.grammar.LaneInputs'>>",
   "sampling_shift": 0.0,
   "schema": "<bound method BaseModel.schema of <class 'melite_models.grammar.LaneInputs'>>",
   "schema_json": "<bound method BaseModel.schema_json of <class 'melite_models.grammar.LaneInputs'>>",
   "text_encoder": "",
   "texture_vae": "",
   "unet": "",
   "unet_quant": "",
   "unet_unconditional": "",
   "unet_variant": "",
   "update_forward_refs": "<bound method BaseModel.update_forward_refs of <class 'melite_models.grammar.LaneInputs'>>",
   "vae": "",
   "validate": "<bound method BaseModel.validate of <class 'melite_models.grammar.LaneInputs'>>",
   "weightless": false
  },
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "qwen3-tts-base": {
  "id": "qwen3-tts-base",
  "label": "Qwen3-TTS Base 0.6B",
  "description": "Qwen3-TTS 12Hz Base 0.6B — plain text-to-speech, no persona",
  "engine": "comfyui",
  "form": "form_tts",
  "card": "tts",
  "unoffered": false,
  "defaults": {
   "mode": "tts",
   "variant": "base"
  },
  "base_body": "",
  "genre": "Genre.AUDIO",
  "mods": [
   "qvoice"
  ],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "qwen3-tts-base",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "native",
      "label": "Native",
      "route": "qwen3-tts-base",
      "engine": "",
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "lane_inputs": {
   "background_removal": "",
   "checkpoint": "",
   "clip_vision": "",
   "construct": "<bound method BaseModel.construct of <class 'melite_models.grammar.LaneInputs'>>",
   "copy": "<bound method BaseModel.copy of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='qwen3_tts', model_path='qwen3-tts', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "dict": "<bound method BaseModel.dict of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='qwen3_tts', model_path='qwen3-tts', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "family": "qwen3_tts",
   "from_orm": "<bound method BaseModel.from_orm of <class 'melite_models.grammar.LaneInputs'>>",
   "json": "<bound method BaseModel.json of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='qwen3_tts', model_path='qwen3-tts', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "latent_node": "EmptySD3LatentImage",
   "model_computed_fields": {},
   "model_config": {
    "extra": "forbid",
    "frozen": true
   },
   "model_construct": "<bound method BaseModel.model_construct of <class 'melite_models.grammar.LaneInputs'>>",
   "model_copy": "<bound method BaseModel.model_copy of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='qwen3_tts', model_path='qwen3-tts', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump": "<bound method BaseModel.model_dump of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='qwen3_tts', model_path='qwen3-tts', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump_json": "<bound method BaseModel.model_dump_json of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='qwen3_tts', model_path='qwen3-tts', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_fields": {
    "unet": "annotation=str required=False default=''",
    "unet_variant": "annotation=str required=False default=''",
    "unet_quant": "annotation=str required=False default=''",
    "text_encoder": "annotation=str required=False default=''",
    "clip_type": "annotation=Union[ClipType, NoneType] required=False default=None",
    "vae": "annotation=str required=False default=''",
    "family": "annotation=str required=False default=''",
    "model_path": "annotation=str required=False default=''",
    "checkpoint": "annotation=str required=False default=''",
    "texture_vae": "annotation=str required=False default=''",
    "clip_vision": "annotation=str required=False default=''",
    "background_removal": "annotation=str required=False default=''",
    "sampling_shift": "annotation=float required=False default=0.0",
    "latent_node": "annotation=LatentNode required=False default=<LatentNode.SD3: 'EmptySD3LatentImage'>",
    "unet_unconditional": "annotation=str required=False default=''",
    "weightless": "annotation=bool required=False default=False"
   },
   "model_fields_set": "{'model_path', 'family'}",
   "model_json_schema": "<bound method BaseModel.model_json_schema of <class 'melite_models.grammar.LaneInputs'>>",
   "model_parametrized_name": "<bound method BaseModel.model_parametrized_name of <class 'melite_models.grammar.LaneInputs'>>",
   "model_path": "qwen3-tts",
   "model_post_init": "<bound method BaseModel.model_post_init of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='qwen3_tts', model_path='qwen3-tts', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_rebuild": "<bound method BaseModel.model_rebuild of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate": "<bound method BaseModel.model_validate of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_json": "<bound method BaseModel.model_validate_json of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_strings": "<bound method BaseModel.model_validate_strings of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_file": "<bound method BaseModel.parse_file of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_obj": "<bound method BaseModel.parse_obj of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_raw": "<bound method BaseModel.parse_raw of <class 'melite_models.grammar.LaneInputs'>>",
   "sampling_shift": 0.0,
   "schema": "<bound method BaseModel.schema of <class 'melite_models.grammar.LaneInputs'>>",
   "schema_json": "<bound method BaseModel.schema_json of <class 'melite_models.grammar.LaneInputs'>>",
   "text_encoder": "",
   "texture_vae": "",
   "unet": "",
   "unet_quant": "",
   "unet_unconditional": "",
   "unet_variant": "",
   "update_forward_refs": "<bound method BaseModel.update_forward_refs of <class 'melite_models.grammar.LaneInputs'>>",
   "vae": "",
   "validate": "<bound method BaseModel.validate of <class 'melite_models.grammar.LaneInputs'>>",
   "weightless": false
  },
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "music3": {
  "id": "music3",
  "label": "MiniMax Music 3",
  "description": "MiniMax Music 3 text-to-music with lyrics",
  "engine": "comfyui",
  "form": "form_music",
  "card": "music",
  "unoffered": false,
  "defaults": {},
  "source": {
   "type": "huggingface",
   "repo_id": "audio-cpp/MiniMax-Music3-GGUF",
   "filename": "MiniMax-Music3-GGUF"
  },
  "base_body": "",
  "genre": "Genre.AUDIO",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "music3",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "int8",
      "label": "INT8 ConvRot",
      "route": "music3",
      "engine": "",
      "vram_peak_gb": 20.0,
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "lane_inputs": {
   "background_removal": "",
   "checkpoint": "",
   "clip_type": "minimax",
   "clip_vision": "",
   "construct": "<bound method BaseModel.construct of <class 'melite_models.grammar.LaneInputs'>>",
   "copy": "<bound method BaseModel.copy of LaneInputs(unet='minimax_music3_dit_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='minimax_music3_text_encoder_pruned_int8_convrot.safetensors', clip_type=<ClipType.MINIMAX: 'minimax'>, vae='minimax_music3_dav.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "dict": "<bound method BaseModel.dict of LaneInputs(unet='minimax_music3_dit_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='minimax_music3_text_encoder_pruned_int8_convrot.safetensors', clip_type=<ClipType.MINIMAX: 'minimax'>, vae='minimax_music3_dav.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "family": "",
   "from_orm": "<bound method BaseModel.from_orm of <class 'melite_models.grammar.LaneInputs'>>",
   "json": "<bound method BaseModel.json of LaneInputs(unet='minimax_music3_dit_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='minimax_music3_text_encoder_pruned_int8_convrot.safetensors', clip_type=<ClipType.MINIMAX: 'minimax'>, vae='minimax_music3_dav.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "latent_node": "EmptySD3LatentImage",
   "model_computed_fields": {},
   "model_config": {
    "extra": "forbid",
    "frozen": true
   },
   "model_construct": "<bound method BaseModel.model_construct of <class 'melite_models.grammar.LaneInputs'>>",
   "model_copy": "<bound method BaseModel.model_copy of LaneInputs(unet='minimax_music3_dit_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='minimax_music3_text_encoder_pruned_int8_convrot.safetensors', clip_type=<ClipType.MINIMAX: 'minimax'>, vae='minimax_music3_dav.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump": "<bound method BaseModel.model_dump of LaneInputs(unet='minimax_music3_dit_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='minimax_music3_text_encoder_pruned_int8_convrot.safetensors', clip_type=<ClipType.MINIMAX: 'minimax'>, vae='minimax_music3_dav.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump_json": "<bound method BaseModel.model_dump_json of LaneInputs(unet='minimax_music3_dit_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='minimax_music3_text_encoder_pruned_int8_convrot.safetensors', clip_type=<ClipType.MINIMAX: 'minimax'>, vae='minimax_music3_dav.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_fields": {
    "unet": "annotation=str required=False default=''",
    "unet_variant": "annotation=str required=False default=''",
    "unet_quant": "annotation=str required=False default=''",
    "text_encoder": "annotation=str required=False default=''",
    "clip_type": "annotation=Union[ClipType, NoneType] required=False default=None",
    "vae": "annotation=str required=False default=''",
    "family": "annotation=str required=False default=''",
    "model_path": "annotation=str required=False default=''",
    "checkpoint": "annotation=str required=False default=''",
    "texture_vae": "annotation=str required=False default=''",
    "clip_vision": "annotation=str required=False default=''",
    "background_removal": "annotation=str required=False default=''",
    "sampling_shift": "annotation=float required=False default=0.0",
    "latent_node": "annotation=LatentNode required=False default=<LatentNode.SD3: 'EmptySD3LatentImage'>",
    "unet_unconditional": "annotation=str required=False default=''",
    "weightless": "annotation=bool required=False default=False"
   },
   "model_fields_set": "{'vae', 'clip_type', 'unet', 'text_encoder'}",
   "model_json_schema": "<bound method BaseModel.model_json_schema of <class 'melite_models.grammar.LaneInputs'>>",
   "model_parametrized_name": "<bound method BaseModel.model_parametrized_name of <class 'melite_models.grammar.LaneInputs'>>",
   "model_path": "",
   "model_post_init": "<bound method BaseModel.model_post_init of LaneInputs(unet='minimax_music3_dit_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='minimax_music3_text_encoder_pruned_int8_convrot.safetensors', clip_type=<ClipType.MINIMAX: 'minimax'>, vae='minimax_music3_dav.safetensors', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_rebuild": "<bound method BaseModel.model_rebuild of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate": "<bound method BaseModel.model_validate of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_json": "<bound method BaseModel.model_validate_json of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_strings": "<bound method BaseModel.model_validate_strings of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_file": "<bound method BaseModel.parse_file of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_obj": "<bound method BaseModel.parse_obj of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_raw": "<bound method BaseModel.parse_raw of <class 'melite_models.grammar.LaneInputs'>>",
   "sampling_shift": 0.0,
   "schema": "<bound method BaseModel.schema of <class 'melite_models.grammar.LaneInputs'>>",
   "schema_json": "<bound method BaseModel.schema_json of <class 'melite_models.grammar.LaneInputs'>>",
   "text_encoder": "minimax_music3_text_encoder_pruned_int8_convrot.safetensors",
   "texture_vae": "",
   "unet": "minimax_music3_dit_int8_convrot.safetensors",
   "unet_quant": "",
   "unet_unconditional": "",
   "unet_variant": "",
   "update_forward_refs": "<bound method BaseModel.update_forward_refs of <class 'melite_models.grammar.LaneInputs'>>",
   "vae": "minimax_music3_dav.safetensors",
   "validate": "<bound method BaseModel.validate of <class 'melite_models.grammar.LaneInputs'>>",
   "weightless": false
  },
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "moss-sfx": {
  "id": "moss-sfx",
  "label": "MOSS-SFX v2",
  "description": "MOSS-SFX v2 sound-effect generation — describe the SOUND not the scene",
  "engine": "comfyui",
  "form": "form_sound",
  "card": "sfx",
  "unoffered": false,
  "base_body": "",
  "genre": "Genre.AUDIO",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "moss-sfx",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "native",
      "label": "Native",
      "route": "moss-sfx",
      "engine": "",
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "lane_inputs": {
   "background_removal": "",
   "checkpoint": "",
   "clip_vision": "",
   "construct": "<bound method BaseModel.construct of <class 'melite_models.grammar.LaneInputs'>>",
   "copy": "<bound method BaseModel.copy of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='moss_sfx_v2', model_path='MOSS-SoundEffect-v2.0-src', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "dict": "<bound method BaseModel.dict of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='moss_sfx_v2', model_path='MOSS-SoundEffect-v2.0-src', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "family": "moss_sfx_v2",
   "from_orm": "<bound method BaseModel.from_orm of <class 'melite_models.grammar.LaneInputs'>>",
   "json": "<bound method BaseModel.json of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='moss_sfx_v2', model_path='MOSS-SoundEffect-v2.0-src', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "latent_node": "EmptySD3LatentImage",
   "model_computed_fields": {},
   "model_config": {
    "extra": "forbid",
    "frozen": true
   },
   "model_construct": "<bound method BaseModel.model_construct of <class 'melite_models.grammar.LaneInputs'>>",
   "model_copy": "<bound method BaseModel.model_copy of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='moss_sfx_v2', model_path='MOSS-SoundEffect-v2.0-src', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump": "<bound method BaseModel.model_dump of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='moss_sfx_v2', model_path='MOSS-SoundEffect-v2.0-src', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump_json": "<bound method BaseModel.model_dump_json of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='moss_sfx_v2', model_path='MOSS-SoundEffect-v2.0-src', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_fields": {
    "unet": "annotation=str required=False default=''",
    "unet_variant": "annotation=str required=False default=''",
    "unet_quant": "annotation=str required=False default=''",
    "text_encoder": "annotation=str required=False default=''",
    "clip_type": "annotation=Union[ClipType, NoneType] required=False default=None",
    "vae": "annotation=str required=False default=''",
    "family": "annotation=str required=False default=''",
    "model_path": "annotation=str required=False default=''",
    "checkpoint": "annotation=str required=False default=''",
    "texture_vae": "annotation=str required=False default=''",
    "clip_vision": "annotation=str required=False default=''",
    "background_removal": "annotation=str required=False default=''",
    "sampling_shift": "annotation=float required=False default=0.0",
    "latent_node": "annotation=LatentNode required=False default=<LatentNode.SD3: 'EmptySD3LatentImage'>",
    "unet_unconditional": "annotation=str required=False default=''",
    "weightless": "annotation=bool required=False default=False"
   },
   "model_fields_set": "{'model_path', 'family'}",
   "model_json_schema": "<bound method BaseModel.model_json_schema of <class 'melite_models.grammar.LaneInputs'>>",
   "model_parametrized_name": "<bound method BaseModel.model_parametrized_name of <class 'melite_models.grammar.LaneInputs'>>",
   "model_path": "MOSS-SoundEffect-v2.0-src",
   "model_post_init": "<bound method BaseModel.model_post_init of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='moss_sfx_v2', model_path='MOSS-SoundEffect-v2.0-src', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_rebuild": "<bound method BaseModel.model_rebuild of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate": "<bound method BaseModel.model_validate of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_json": "<bound method BaseModel.model_validate_json of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_strings": "<bound method BaseModel.model_validate_strings of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_file": "<bound method BaseModel.parse_file of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_obj": "<bound method BaseModel.parse_obj of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_raw": "<bound method BaseModel.parse_raw of <class 'melite_models.grammar.LaneInputs'>>",
   "sampling_shift": 0.0,
   "schema": "<bound method BaseModel.schema of <class 'melite_models.grammar.LaneInputs'>>",
   "schema_json": "<bound method BaseModel.schema_json of <class 'melite_models.grammar.LaneInputs'>>",
   "text_encoder": "",
   "texture_vae": "",
   "unet": "",
   "unet_quant": "",
   "unet_unconditional": "",
   "unet_variant": "",
   "update_forward_refs": "<bound method BaseModel.update_forward_refs of <class 'melite_models.grammar.LaneInputs'>>",
   "vae": "",
   "validate": "<bound method BaseModel.validate of <class 'melite_models.grammar.LaneInputs'>>",
   "weightless": false
  },
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "trellis_native": {
  "id": "trellis_native",
  "label": "Trellis (Native)",
  "description": "Native trellis.cpp GGML engine — image to UV-textured GLB with the reference-parity C++ postprocess (weld, fill, DC remesh, CuMesh QEM, xatlas, trilinear PBR bake). 50s per asset on the 4090; no confetti.",
  "engine": "",
  "form": "form_3d_trellis_native",
  "card": "",
  "unoffered": false,
  "defaults": {
   "resolution": 1024,
   "quant": "q8",
   "bg_removal": "auto",
   "band": 0,
   "texture_size": 2048,
   "webp_quality": 90,
   "filename_prefix": "trelliscpp",
   "seed": 42
  },
  "source": {
   "repo_id": "ilintar/trellis2-gguf"
  },
  "base_body": "",
  "genre": "Genre.THREED",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "trellis_native",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "native",
      "label": "Native",
      "route": "trellis_native",
      "engine": "",
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "trellis2-native": {
  "id": "trellis2-native",
  "label": "TRELLIS.2 Native",
  "description": "Image to textured 3D mesh (native ComfyUI TRELLIS.2): background-removed conditioning → voxel structure → shape latent → texture atlas, saved as a .glb.",
  "engine": "comfyui",
  "form": "form_img_to_mesh",
  "card": "img-to-mesh",
  "unoffered": false,
  "defaults": {
   "resolution": 1024,
   "bg_removal": "auto",
   "steps": 12,
   "cfg": 7.5,
   "shape_steps": 20,
   "shape_cfg": 7.5,
   "tex1_steps": 12,
   "tex1_cfg": 7.5,
   "tex2_steps": 12,
   "tex2_cfg": 1.0,
   "remesh_resolution": 768,
   "decimate_faces": 700000,
   "smooth_angle": 180,
   "atlas_size": 4096,
   "ao_size": 1024,
   "normal_size": 2048,
   "struct_sampler": "euler",
   "struct_scheduler": "normal",
   "shape_sampler": "euler",
   "shape_scheduler": "normal",
   "tex1_sampler": "euler",
   "tex1_scheduler": "simple",
   "tex2_sampler": "euler",
   "tex2_scheduler": "normal",
   "sd3_shift": 5.0,
   "rescale_struct": 0.7,
   "rescale_shape": 0.5,
   "override_struct": 0.667,
   "override_shape": 0.769,
   "seed": 42
  },
  "studio": {
   "tenant": "3d/img_to_mesh",
   "owns_params": false,
   "writes": "('input_image', 'rigged_glb', 'target_glb')"
  },
  "base_body": "",
  "genre": "Genre.THREED",
  "mods": [],
  "variants": [
   {
    "id": "1024",
    "label": "1024",
    "hint": "Standard resolution — DEFAULT",
    "group": "Variant",
    "route": "trellis2-native",
    "engine": "",
    "order": 0,
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "bf16",
      "label": "BF16",
      "route": "trellis2-native-bf16",
      "engine": "",
      "vram_peak_gb": 12.0,
      "resolver_defaults": {},
      "hide_from_dropdown": false
     },
     {
      "quant": "int8",
      "label": "INT8 ConvRot",
      "route": "trellis2-native-int8",
      "engine": "",
      "vram_peak_gb": 8.0,
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
   },
   {
    "id": "1536",
    "label": "1536",
    "hint": "Quality resolution — hero assets, final production",
    "group": "Variant",
    "route": "trellis2-native-1536",
    "engine": "",
    "order": 2,
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "bf16",
      "label": "BF16",
      "route": "trellis2-native-1536-bf16",
      "engine": "",
      "vram_peak_gb": 16.0,
      "resolver_defaults": {},
      "hide_from_dropdown": false
     },
     {
      "quant": "int8",
      "label": "INT8 ConvRot",
      "route": "trellis2-native-1536-int8",
      "engine": "",
      "vram_peak_gb": 10.0,
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
   },
   {
    "id": "512",
    "label": "512",
    "hint": "Fast resolution — props, thumbnails, iteration",
    "group": "Variant",
    "route": "trellis2-native-512",
    "engine": "",
    "order": 1,
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "bf16",
      "label": "BF16",
      "route": "trellis2-native-512-bf16",
      "engine": "",
      "vram_peak_gb": 8.0,
      "resolver_defaults": {},
      "hide_from_dropdown": false
     },
     {
      "quant": "int8",
      "label": "INT8 ConvRot",
      "route": "trellis2-native-512-int8",
      "engine": "",
      "vram_peak_gb": 5.0,
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [
   {
    "name": "trellis_2_int8_convrot.safetensors",
    "url": "https://huggingface.co/Comfy-Org/TRELLIS.2/resolve/main/diffusion_models/trellis_2_int8_convrot.safetensors",
    "folder": "diffusion_models",
    "sha256": "d01952ad137213f6a868f86b6b877026276f84af5eec23069217475a0bad3a31",
    "size_bytes": 5253048192
   },
   {
    "name": "trellis_2_shape_vae_bf16.safetensors",
    "url": "https://huggingface.co/Comfy-Org/TRELLIS.2/resolve/main/vae/trellis_2_shape_vae_bf16.safetensors",
    "folder": "vae",
    "sha256": "de0cb4949a76c59ee5c091a995a69bcc8c51d5aeda939f0c641a50d2a72341f4",
    "size_bytes": 1095844024
   },
   {
    "name": "trellis_2_texture_vae_bf16.safetensors",
    "url": "https://huggingface.co/Comfy-Org/TRELLIS.2/resolve/main/vae/trellis_2_texture_vae_bf16.safetensors",
    "folder": "vae",
    "sha256": "714e5ebf094a610e12a8e3b5175c18a62f37f6ea4218acb6073644456b73ab0e",
    "size_bytes": 948461364
   },
   {
    "name": "dino_v3_L_naf_fp32.safetensors",
    "url": "https://huggingface.co/Comfy-Org/Pixal3D/resolve/main/clip_vision/dino_v3_L_naf_fp32.safetensors",
    "folder": "clip_vision",
    "sha256": "4ad2ec4e0879a5b5b04cd97325cc37da954a7b6edca5170b86510f17f2b2290f",
    "size_bytes": 1215214176
   },
   {
    "name": "birefnet.safetensors",
    "url": "https://huggingface.co/Comfy-Org/BiRefNet/resolve/main/background_removal/birefnet.safetensors",
    "folder": "background_removal",
    "sha256": "9ab37426bf4de0567af6b5d21b16151357149139362e6e8992021b8ce356a154",
    "size_bytes": 444473596
   }
  ],
  "accepts": [],
  "character_presets": [],
  "lane_inputs": {
   "background_removal": "birefnet.safetensors",
   "checkpoint": "",
   "clip_vision": "dino_v3_L_naf_fp32.safetensors",
   "construct": "<bound method BaseModel.construct of <class 'melite_models.grammar.LaneInputs'>>",
   "copy": "<bound method BaseModel.copy of LaneInputs(unet='trellis_2_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='trellis_2_shape_vae_bf16.safetensors', family='', model_path='', checkpoint='', texture_vae='trellis_2_texture_vae_bf16.safetensors', clip_vision='dino_v3_L_naf_fp32.safetensors', background_removal='birefnet.safetensors', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "dict": "<bound method BaseModel.dict of LaneInputs(unet='trellis_2_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='trellis_2_shape_vae_bf16.safetensors', family='', model_path='', checkpoint='', texture_vae='trellis_2_texture_vae_bf16.safetensors', clip_vision='dino_v3_L_naf_fp32.safetensors', background_removal='birefnet.safetensors', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "family": "",
   "from_orm": "<bound method BaseModel.from_orm of <class 'melite_models.grammar.LaneInputs'>>",
   "json": "<bound method BaseModel.json of LaneInputs(unet='trellis_2_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='trellis_2_shape_vae_bf16.safetensors', family='', model_path='', checkpoint='', texture_vae='trellis_2_texture_vae_bf16.safetensors', clip_vision='dino_v3_L_naf_fp32.safetensors', background_removal='birefnet.safetensors', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "latent_node": "EmptySD3LatentImage",
   "model_computed_fields": {},
   "model_config": {
    "extra": "forbid",
    "frozen": true
   },
   "model_construct": "<bound method BaseModel.model_construct of <class 'melite_models.grammar.LaneInputs'>>",
   "model_copy": "<bound method BaseModel.model_copy of LaneInputs(unet='trellis_2_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='trellis_2_shape_vae_bf16.safetensors', family='', model_path='', checkpoint='', texture_vae='trellis_2_texture_vae_bf16.safetensors', clip_vision='dino_v3_L_naf_fp32.safetensors', background_removal='birefnet.safetensors', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump": "<bound method BaseModel.model_dump of LaneInputs(unet='trellis_2_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='trellis_2_shape_vae_bf16.safetensors', family='', model_path='', checkpoint='', texture_vae='trellis_2_texture_vae_bf16.safetensors', clip_vision='dino_v3_L_naf_fp32.safetensors', background_removal='birefnet.safetensors', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump_json": "<bound method BaseModel.model_dump_json of LaneInputs(unet='trellis_2_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='trellis_2_shape_vae_bf16.safetensors', family='', model_path='', checkpoint='', texture_vae='trellis_2_texture_vae_bf16.safetensors', clip_vision='dino_v3_L_naf_fp32.safetensors', background_removal='birefnet.safetensors', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_fields": {
    "unet": "annotation=str required=False default=''",
    "unet_variant": "annotation=str required=False default=''",
    "unet_quant": "annotation=str required=False default=''",
    "text_encoder": "annotation=str required=False default=''",
    "clip_type": "annotation=Union[ClipType, NoneType] required=False default=None",
    "vae": "annotation=str required=False default=''",
    "family": "annotation=str required=False default=''",
    "model_path": "annotation=str required=False default=''",
    "checkpoint": "annotation=str required=False default=''",
    "texture_vae": "annotation=str required=False default=''",
    "clip_vision": "annotation=str required=False default=''",
    "background_removal": "annotation=str required=False default=''",
    "sampling_shift": "annotation=float required=False default=0.0",
    "latent_node": "annotation=LatentNode required=False default=<LatentNode.SD3: 'EmptySD3LatentImage'>",
    "unet_unconditional": "annotation=str required=False default=''",
    "weightless": "annotation=bool required=False default=False"
   },
   "model_fields_set": "{'texture_vae', 'vae', 'background_removal', 'unet', 'clip_vision'}",
   "model_json_schema": "<bound method BaseModel.model_json_schema of <class 'melite_models.grammar.LaneInputs'>>",
   "model_parametrized_name": "<bound method BaseModel.model_parametrized_name of <class 'melite_models.grammar.LaneInputs'>>",
   "model_path": "",
   "model_post_init": "<bound method BaseModel.model_post_init of LaneInputs(unet='trellis_2_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='trellis_2_shape_vae_bf16.safetensors', family='', model_path='', checkpoint='', texture_vae='trellis_2_texture_vae_bf16.safetensors', clip_vision='dino_v3_L_naf_fp32.safetensors', background_removal='birefnet.safetensors', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_rebuild": "<bound method BaseModel.model_rebuild of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate": "<bound method BaseModel.model_validate of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_json": "<bound method BaseModel.model_validate_json of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_strings": "<bound method BaseModel.model_validate_strings of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_file": "<bound method BaseModel.parse_file of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_obj": "<bound method BaseModel.parse_obj of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_raw": "<bound method BaseModel.parse_raw of <class 'melite_models.grammar.LaneInputs'>>",
   "sampling_shift": 0.0,
   "schema": "<bound method BaseModel.schema of <class 'melite_models.grammar.LaneInputs'>>",
   "schema_json": "<bound method BaseModel.schema_json of <class 'melite_models.grammar.LaneInputs'>>",
   "text_encoder": "",
   "texture_vae": "trellis_2_texture_vae_bf16.safetensors",
   "unet": "trellis_2_int8_convrot.safetensors",
   "unet_quant": "",
   "unet_unconditional": "",
   "unet_variant": "",
   "update_forward_refs": "<bound method BaseModel.update_forward_refs of <class 'melite_models.grammar.LaneInputs'>>",
   "vae": "trellis_2_shape_vae_bf16.safetensors",
   "validate": "<bound method BaseModel.validate of <class 'melite_models.grammar.LaneInputs'>>",
   "weightless": false
  },
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "transfer_rig": {
  "id": "transfer_rig",
  "label": "Transfer Rig",
  "description": "Copy rig from source GLB onto target GLB via GPU KNN.",
  "engine": "comfyui",
  "form": "form_img_to_mesh",
  "card": "img-to-mesh",
  "unoffered": false,
  "base_body": "",
  "genre": "Genre.THREED",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "transfer_rig",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "native",
      "label": "Native",
      "route": "transfer_rig",
      "engine": "",
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "lane_inputs": {
   "background_removal": "",
   "checkpoint": "",
   "clip_vision": "",
   "construct": "<bound method BaseModel.construct of <class 'melite_models.grammar.LaneInputs'>>",
   "copy": "<bound method BaseModel.copy of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='transfer_rig', model_path='somaskel77/skin_standard.npz', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "dict": "<bound method BaseModel.dict of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='transfer_rig', model_path='somaskel77/skin_standard.npz', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "family": "transfer_rig",
   "from_orm": "<bound method BaseModel.from_orm of <class 'melite_models.grammar.LaneInputs'>>",
   "json": "<bound method BaseModel.json of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='transfer_rig', model_path='somaskel77/skin_standard.npz', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "latent_node": "EmptySD3LatentImage",
   "model_computed_fields": {},
   "model_config": {
    "extra": "forbid",
    "frozen": true
   },
   "model_construct": "<bound method BaseModel.model_construct of <class 'melite_models.grammar.LaneInputs'>>",
   "model_copy": "<bound method BaseModel.model_copy of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='transfer_rig', model_path='somaskel77/skin_standard.npz', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump": "<bound method BaseModel.model_dump of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='transfer_rig', model_path='somaskel77/skin_standard.npz', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump_json": "<bound method BaseModel.model_dump_json of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='transfer_rig', model_path='somaskel77/skin_standard.npz', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_fields": {
    "unet": "annotation=str required=False default=''",
    "unet_variant": "annotation=str required=False default=''",
    "unet_quant": "annotation=str required=False default=''",
    "text_encoder": "annotation=str required=False default=''",
    "clip_type": "annotation=Union[ClipType, NoneType] required=False default=None",
    "vae": "annotation=str required=False default=''",
    "family": "annotation=str required=False default=''",
    "model_path": "annotation=str required=False default=''",
    "checkpoint": "annotation=str required=False default=''",
    "texture_vae": "annotation=str required=False default=''",
    "clip_vision": "annotation=str required=False default=''",
    "background_removal": "annotation=str required=False default=''",
    "sampling_shift": "annotation=float required=False default=0.0",
    "latent_node": "annotation=LatentNode required=False default=<LatentNode.SD3: 'EmptySD3LatentImage'>",
    "unet_unconditional": "annotation=str required=False default=''",
    "weightless": "annotation=bool required=False default=False"
   },
   "model_fields_set": "{'model_path', 'family'}",
   "model_json_schema": "<bound method BaseModel.model_json_schema of <class 'melite_models.grammar.LaneInputs'>>",
   "model_parametrized_name": "<bound method BaseModel.model_parametrized_name of <class 'melite_models.grammar.LaneInputs'>>",
   "model_path": "somaskel77/skin_standard.npz",
   "model_post_init": "<bound method BaseModel.model_post_init of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='transfer_rig', model_path='somaskel77/skin_standard.npz', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_rebuild": "<bound method BaseModel.model_rebuild of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate": "<bound method BaseModel.model_validate of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_json": "<bound method BaseModel.model_validate_json of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_strings": "<bound method BaseModel.model_validate_strings of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_file": "<bound method BaseModel.parse_file of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_obj": "<bound method BaseModel.parse_obj of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_raw": "<bound method BaseModel.parse_raw of <class 'melite_models.grammar.LaneInputs'>>",
   "sampling_shift": 0.0,
   "schema": "<bound method BaseModel.schema of <class 'melite_models.grammar.LaneInputs'>>",
   "schema_json": "<bound method BaseModel.schema_json of <class 'melite_models.grammar.LaneInputs'>>",
   "text_encoder": "",
   "texture_vae": "",
   "unet": "",
   "unet_quant": "",
   "unet_unconditional": "",
   "unet_variant": "",
   "update_forward_refs": "<bound method BaseModel.update_forward_refs of <class 'melite_models.grammar.LaneInputs'>>",
   "vae": "",
   "validate": "<bound method BaseModel.validate of <class 'melite_models.grammar.LaneInputs'>>",
   "weightless": false
  },
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "step1x_texture": {
  "id": "step1x_texture",
  "label": "Step1X-3D Texture",
  "description": "Diffusion-based 3D texture synthesis — 1 reference image → 6 multi-view images via SDXL ig2mv flow → baked onto UV atlas. Fills ALL surfaces (no coverage gaps unlike camera projection). 3.5B model, ~15s on 4090.",
  "engine": "",
  "form": "form_3d_step1x_texture",
  "card": "",
  "unoffered": false,
  "defaults": {
   "preset": "standard",
   "texture_size": 2048,
   "render_size": 2048,
   "remove_bg": false,
   "seed": 2025,
   "filename_prefix": "step1x_texture"
  },
  "base_body": "",
  "genre": "Genre.THREED",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "step1x_texture",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "native",
      "label": "Native",
      "route": "step1x_texture",
      "engine": "",
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "somax": {
  "id": "somax",
  "label": "SOMAX",
  "description": "TRELLIS → SOMA weight transfer — image to SOMAX rigged GLB with anatomically correct SOMA-77 skeleton weights.",
  "engine": "",
  "form": "form_3d_somax",
  "card": "",
  "unoffered": false,
  "defaults": {
   "filename_prefix": "KimodoAnimated",
   "file_format": "glb",
   "decimate_ratio": 0.2,
   "preserve_texture": true,
   "in_place": true
  },
  "source": {
   "repo_id": "nvidia/soma-x"
  },
  "studio": {
   "tenant": "3d/body",
   "owns_params": false
  },
  "base_body": "",
  "genre": "Genre.THREED",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "somax",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "native",
      "label": "Native",
      "route": "somax",
      "engine": "",
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "skin": {
  "id": "skin",
  "label": "Skin",
  "description": "Deterministic skin detail maps onto a SOMAX body (albedo + normal + kind sidecar) and the proof turnaround.",
  "engine": "comfyui",
  "form": "form_3d_skin",
  "card": "skin",
  "unoffered": false,
  "base_body": "",
  "genre": "Genre.THREED",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "skin",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "native",
      "label": "Native",
      "route": "skin",
      "engine": "",
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "lane_inputs": {
   "background_removal": "",
   "checkpoint": "",
   "clip_vision": "",
   "construct": "<bound method BaseModel.construct of <class 'melite_models.grammar.LaneInputs'>>",
   "copy": "<bound method BaseModel.copy of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=True)>",
   "dict": "<bound method BaseModel.dict of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=True)>",
   "family": "",
   "from_orm": "<bound method BaseModel.from_orm of <class 'melite_models.grammar.LaneInputs'>>",
   "json": "<bound method BaseModel.json of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=True)>",
   "latent_node": "EmptySD3LatentImage",
   "model_computed_fields": {},
   "model_config": {
    "extra": "forbid",
    "frozen": true
   },
   "model_construct": "<bound method BaseModel.model_construct of <class 'melite_models.grammar.LaneInputs'>>",
   "model_copy": "<bound method BaseModel.model_copy of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=True)>",
   "model_dump": "<bound method BaseModel.model_dump of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=True)>",
   "model_dump_json": "<bound method BaseModel.model_dump_json of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=True)>",
   "model_fields": {
    "unet": "annotation=str required=False default=''",
    "unet_variant": "annotation=str required=False default=''",
    "unet_quant": "annotation=str required=False default=''",
    "text_encoder": "annotation=str required=False default=''",
    "clip_type": "annotation=Union[ClipType, NoneType] required=False default=None",
    "vae": "annotation=str required=False default=''",
    "family": "annotation=str required=False default=''",
    "model_path": "annotation=str required=False default=''",
    "checkpoint": "annotation=str required=False default=''",
    "texture_vae": "annotation=str required=False default=''",
    "clip_vision": "annotation=str required=False default=''",
    "background_removal": "annotation=str required=False default=''",
    "sampling_shift": "annotation=float required=False default=0.0",
    "latent_node": "annotation=LatentNode required=False default=<LatentNode.SD3: 'EmptySD3LatentImage'>",
    "unet_unconditional": "annotation=str required=False default=''",
    "weightless": "annotation=bool required=False default=False"
   },
   "model_fields_set": "{'weightless'}",
   "model_json_schema": "<bound method BaseModel.model_json_schema of <class 'melite_models.grammar.LaneInputs'>>",
   "model_parametrized_name": "<bound method BaseModel.model_parametrized_name of <class 'melite_models.grammar.LaneInputs'>>",
   "model_path": "",
   "model_post_init": "<bound method BaseModel.model_post_init of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=True)>",
   "model_rebuild": "<bound method BaseModel.model_rebuild of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate": "<bound method BaseModel.model_validate of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_json": "<bound method BaseModel.model_validate_json of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_strings": "<bound method BaseModel.model_validate_strings of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_file": "<bound method BaseModel.parse_file of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_obj": "<bound method BaseModel.parse_obj of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_raw": "<bound method BaseModel.parse_raw of <class 'melite_models.grammar.LaneInputs'>>",
   "sampling_shift": 0.0,
   "schema": "<bound method BaseModel.schema of <class 'melite_models.grammar.LaneInputs'>>",
   "schema_json": "<bound method BaseModel.schema_json of <class 'melite_models.grammar.LaneInputs'>>",
   "text_encoder": "",
   "texture_vae": "",
   "unet": "",
   "unet_quant": "",
   "unet_unconditional": "",
   "unet_variant": "",
   "update_forward_refs": "<bound method BaseModel.update_forward_refs of <class 'melite_models.grammar.LaneInputs'>>",
   "vae": "",
   "validate": "<bound method BaseModel.validate of <class 'melite_models.grammar.LaneInputs'>>",
   "weightless": true
  },
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "pixal3d": {
  "id": "pixal3d",
  "label": "Pixal3D",
  "description": "Pixel-aligned image → textured 3D mesh (native ComfyUI Pixal3D, MoGe camera conditioning → DINOv3+NAF pixel-aligned embeddings → shared TRELLIS.2 sampler chain → textured .glb). Hero-asset tier: nearest reconstruction fidelity, slower than TRELLIS.2.",
  "engine": "comfyui",
  "form": "form_img_to_mesh",
  "card": "img-to-mesh",
  "unoffered": false,
  "defaults": {
   "resolution": 1024,
   "bg_removal": "auto",
   "steps": 12,
   "cfg": 7.5,
   "shape_steps": 20,
   "shape_cfg": 7.5,
   "tex1_steps": 12,
   "tex1_cfg": 7.5,
   "tex2_steps": 12,
   "tex2_cfg": 1.0,
   "remesh_resolution": 768,
   "decimate_faces": 700000,
   "smooth_angle": 180,
   "atlas_size": 4096,
   "ao_size": 1024,
   "normal_size": 2048,
   "struct_sampler": "euler",
   "struct_scheduler": "normal",
   "shape_sampler": "euler",
   "shape_scheduler": "normal",
   "tex1_sampler": "euler",
   "tex1_scheduler": "simple",
   "tex2_sampler": "euler",
   "tex2_scheduler": "normal",
   "sd3_shift": 5.0,
   "rescale_struct": 0.7,
   "rescale_shape": 0.5,
   "override_struct": 0.667,
   "override_shape": 0.769,
   "seed": 42,
   "camera_fov": "auto"
  },
  "studio": {
   "tenant": "3d/img_to_mesh",
   "owns_params": false,
   "writes": "('input_image', 'rigged_glb', 'target_glb')"
  },
  "base_body": "",
  "genre": "Genre.THREED",
  "mods": [],
  "variants": [
   {
    "id": "1024",
    "label": "1024",
    "hint": "Standard resolution — DEFAULT",
    "group": "Variant",
    "route": "pixal3d",
    "engine": "",
    "order": 0,
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "bf16",
      "label": "BF16",
      "route": "pixal3d-bf16",
      "engine": "",
      "vram_peak_gb": 12.0,
      "resolver_defaults": {},
      "hide_from_dropdown": false
     },
     {
      "quant": "int8",
      "label": "INT8 ConvRot",
      "route": "pixal3d-int8",
      "engine": "",
      "vram_peak_gb": 8.0,
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
   },
   {
    "id": "1536",
    "label": "1536",
    "hint": "Quality resolution — hero assets, final production",
    "group": "Variant",
    "route": "pixal3d-1536",
    "engine": "",
    "order": 2,
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "bf16",
      "label": "BF16",
      "route": "pixal3d-1536-bf16",
      "engine": "",
      "vram_peak_gb": 16.0,
      "resolver_defaults": {},
      "hide_from_dropdown": false
     },
     {
      "quant": "int8",
      "label": "INT8 ConvRot",
      "route": "pixal3d-1536-int8",
      "engine": "",
      "vram_peak_gb": 10.0,
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
   },
   {
    "id": "512",
    "label": "512",
    "hint": "Fast resolution — props, thumbnails, iteration",
    "group": "Variant",
    "route": "pixal3d-512",
    "engine": "",
    "order": 1,
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "bf16",
      "label": "BF16",
      "route": "pixal3d-512-bf16",
      "engine": "",
      "vram_peak_gb": 8.0,
      "resolver_defaults": {},
      "hide_from_dropdown": false
     },
     {
      "quant": "int8",
      "label": "INT8 ConvRot",
      "route": "pixal3d-512-int8",
      "engine": "",
      "vram_peak_gb": 5.0,
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [
   {
    "name": "pixal3d_int8_convrot.safetensors",
    "url": "https://huggingface.co/Comfy-Org/Pixal3D/resolve/main/diffusion_models/pixal3d_int8_convrot.safetensors",
    "folder": "diffusion_models",
    "sha256": "4621eac3b715484f79303c7152af641fe0b2b14f4d0e3d394fd6922d00f955ec",
    "size_bytes": 5584555824
   },
   {
    "name": "dino_v3_L_naf_fp32.safetensors",
    "url": "https://huggingface.co/Comfy-Org/Pixal3D/resolve/main/clip_vision/dino_v3_L_naf_fp32.safetensors",
    "folder": "clip_vision",
    "sha256": "4ad2ec4e0879a5b5b04cd97325cc37da954a7b6edca5170b86510f17f2b2290f",
    "size_bytes": 1215214176
   },
   {
    "name": "trellis_2_shape_vae_bf16.safetensors",
    "url": "https://huggingface.co/Comfy-Org/Pixal3D/resolve/main/vae/trellis_2_shape_vae_bf16.safetensors",
    "folder": "vae",
    "sha256": "de0cb4949a76c59ee5c091a995a69bcc8c51d5aeda939f0c641a50d2a72341f4",
    "size_bytes": 1095844024
   },
   {
    "name": "trellis_2_texture_vae_bf16.safetensors",
    "url": "https://huggingface.co/Comfy-Org/Pixal3D/resolve/main/vae/trellis_2_texture_vae_bf16.safetensors",
    "folder": "vae",
    "sha256": "714e5ebf094a610e12a8e3b5175c18a62f37f6ea4218acb6073644456b73ab0e",
    "size_bytes": 948461364
   },
   {
    "name": "birefnet.safetensors",
    "url": "https://huggingface.co/Comfy-Org/BiRefNet/resolve/main/background_removal/birefnet.safetensors",
    "folder": "background_removal",
    "sha256": "9ab37426bf4de0567af6b5d21b16151357149139362e6e8992021b8ce356a154",
    "size_bytes": 444473596
   },
   {
    "name": "moge_2_vitl_normal_fp16.safetensors",
    "url": "https://huggingface.co/Comfy-Org/MoGe/resolve/main/geometry_estimation/moge_2_vitl_normal_fp16.safetensors",
    "folder": "geometry_estimation",
    "sha256": "cb1a692d03235671e959e81360d7b4d9f44aefadb1f852d6ca6aa17799d5e31f",
    "size_bytes": 661859924
   }
  ],
  "accepts": [],
  "character_presets": [],
  "lane_inputs": {
   "background_removal": "birefnet.safetensors",
   "checkpoint": "",
   "clip_vision": "dino_v3_L_naf_fp32.safetensors",
   "construct": "<bound method BaseModel.construct of <class 'melite_models.grammar.LaneInputs'>>",
   "copy": "<bound method BaseModel.copy of LaneInputs(unet='pixal3d_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='trellis_2_shape_vae_bf16.safetensors', family='', model_path='', checkpoint='', texture_vae='trellis_2_texture_vae_bf16.safetensors', clip_vision='dino_v3_L_naf_fp32.safetensors', background_removal='birefnet.safetensors', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "dict": "<bound method BaseModel.dict of LaneInputs(unet='pixal3d_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='trellis_2_shape_vae_bf16.safetensors', family='', model_path='', checkpoint='', texture_vae='trellis_2_texture_vae_bf16.safetensors', clip_vision='dino_v3_L_naf_fp32.safetensors', background_removal='birefnet.safetensors', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "family": "",
   "from_orm": "<bound method BaseModel.from_orm of <class 'melite_models.grammar.LaneInputs'>>",
   "json": "<bound method BaseModel.json of LaneInputs(unet='pixal3d_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='trellis_2_shape_vae_bf16.safetensors', family='', model_path='', checkpoint='', texture_vae='trellis_2_texture_vae_bf16.safetensors', clip_vision='dino_v3_L_naf_fp32.safetensors', background_removal='birefnet.safetensors', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "latent_node": "EmptySD3LatentImage",
   "model_computed_fields": {},
   "model_config": {
    "extra": "forbid",
    "frozen": true
   },
   "model_construct": "<bound method BaseModel.model_construct of <class 'melite_models.grammar.LaneInputs'>>",
   "model_copy": "<bound method BaseModel.model_copy of LaneInputs(unet='pixal3d_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='trellis_2_shape_vae_bf16.safetensors', family='', model_path='', checkpoint='', texture_vae='trellis_2_texture_vae_bf16.safetensors', clip_vision='dino_v3_L_naf_fp32.safetensors', background_removal='birefnet.safetensors', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump": "<bound method BaseModel.model_dump of LaneInputs(unet='pixal3d_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='trellis_2_shape_vae_bf16.safetensors', family='', model_path='', checkpoint='', texture_vae='trellis_2_texture_vae_bf16.safetensors', clip_vision='dino_v3_L_naf_fp32.safetensors', background_removal='birefnet.safetensors', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump_json": "<bound method BaseModel.model_dump_json of LaneInputs(unet='pixal3d_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='trellis_2_shape_vae_bf16.safetensors', family='', model_path='', checkpoint='', texture_vae='trellis_2_texture_vae_bf16.safetensors', clip_vision='dino_v3_L_naf_fp32.safetensors', background_removal='birefnet.safetensors', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_fields": {
    "unet": "annotation=str required=False default=''",
    "unet_variant": "annotation=str required=False default=''",
    "unet_quant": "annotation=str required=False default=''",
    "text_encoder": "annotation=str required=False default=''",
    "clip_type": "annotation=Union[ClipType, NoneType] required=False default=None",
    "vae": "annotation=str required=False default=''",
    "family": "annotation=str required=False default=''",
    "model_path": "annotation=str required=False default=''",
    "checkpoint": "annotation=str required=False default=''",
    "texture_vae": "annotation=str required=False default=''",
    "clip_vision": "annotation=str required=False default=''",
    "background_removal": "annotation=str required=False default=''",
    "sampling_shift": "annotation=float required=False default=0.0",
    "latent_node": "annotation=LatentNode required=False default=<LatentNode.SD3: 'EmptySD3LatentImage'>",
    "unet_unconditional": "annotation=str required=False default=''",
    "weightless": "annotation=bool required=False default=False"
   },
   "model_fields_set": "{'texture_vae', 'vae', 'background_removal', 'unet', 'clip_vision'}",
   "model_json_schema": "<bound method BaseModel.model_json_schema of <class 'melite_models.grammar.LaneInputs'>>",
   "model_parametrized_name": "<bound method BaseModel.model_parametrized_name of <class 'melite_models.grammar.LaneInputs'>>",
   "model_path": "",
   "model_post_init": "<bound method BaseModel.model_post_init of LaneInputs(unet='pixal3d_int8_convrot.safetensors', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='trellis_2_shape_vae_bf16.safetensors', family='', model_path='', checkpoint='', texture_vae='trellis_2_texture_vae_bf16.safetensors', clip_vision='dino_v3_L_naf_fp32.safetensors', background_removal='birefnet.safetensors', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_rebuild": "<bound method BaseModel.model_rebuild of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate": "<bound method BaseModel.model_validate of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_json": "<bound method BaseModel.model_validate_json of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_strings": "<bound method BaseModel.model_validate_strings of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_file": "<bound method BaseModel.parse_file of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_obj": "<bound method BaseModel.parse_obj of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_raw": "<bound method BaseModel.parse_raw of <class 'melite_models.grammar.LaneInputs'>>",
   "sampling_shift": 0.0,
   "schema": "<bound method BaseModel.schema of <class 'melite_models.grammar.LaneInputs'>>",
   "schema_json": "<bound method BaseModel.schema_json of <class 'melite_models.grammar.LaneInputs'>>",
   "text_encoder": "",
   "texture_vae": "trellis_2_texture_vae_bf16.safetensors",
   "unet": "pixal3d_int8_convrot.safetensors",
   "unet_quant": "",
   "unet_unconditional": "",
   "unet_variant": "",
   "update_forward_refs": "<bound method BaseModel.update_forward_refs of <class 'melite_models.grammar.LaneInputs'>>",
   "vae": "trellis_2_shape_vae_bf16.safetensors",
   "validate": "<bound method BaseModel.validate of <class 'melite_models.grammar.LaneInputs'>>",
   "weightless": false
  },
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "mesh_refine": {
  "id": "mesh_refine",
  "label": "UltraShape Mesh Refine",
  "description": "Image-guided coarse-mesh refinement (UltraShape 1.0 DiT) — carves sharp limb separation + hard-surface edges into blobby TRELLIS output using the SAME guide image the mesh was generated from. The pre-rig cleanup step: run BEFORE SOMAX so proximity-based weight transfer can't glue arm vertices to torso bones.",
  "engine": "",
  "form": "form_3d_mesh_refine",
  "card": "",
  "unoffered": false,
  "defaults": {
   "box_v": 1.0,
   "mc_level": 0.0,
   "normalize_scale": 0.99,
   "num_latents": 32768,
   "num_sharp_points": 204800,
   "num_uniform_points": 204800,
   "preset": "standard",
   "dtype": "bfloat16",
   "low_vram": false,
   "steps": 50,
   "guidance_scale": 5.0,
   "octree_resolution": 384,
   "num_chunks": 8000,
   "remove_bg": false,
   "seed": 42,
   "file_format": "glb",
   "filename_prefix": "ultrashape_refined"
  },
  "base_body": "",
  "genre": "Genre.THREED",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "mesh_refine",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "native",
      "label": "Native",
      "route": "mesh_refine",
      "engine": "",
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "fit": {
  "id": "fit",
  "label": "Fit",
  "description": "Seat a static prop onto a SOMAX body (socket/fit/grip placement laws) and render the proof turnaround.",
  "engine": "comfyui",
  "form": "form_3d_fit",
  "card": "fit",
  "unoffered": false,
  "base_body": "",
  "genre": "Genre.THREED",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "fit",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "native",
      "label": "Native",
      "route": "fit",
      "engine": "",
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "lane_inputs": {
   "background_removal": "",
   "checkpoint": "",
   "clip_vision": "",
   "construct": "<bound method BaseModel.construct of <class 'melite_models.grammar.LaneInputs'>>",
   "copy": "<bound method BaseModel.copy of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=True)>",
   "dict": "<bound method BaseModel.dict of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=True)>",
   "family": "",
   "from_orm": "<bound method BaseModel.from_orm of <class 'melite_models.grammar.LaneInputs'>>",
   "json": "<bound method BaseModel.json of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=True)>",
   "latent_node": "EmptySD3LatentImage",
   "model_computed_fields": {},
   "model_config": {
    "extra": "forbid",
    "frozen": true
   },
   "model_construct": "<bound method BaseModel.model_construct of <class 'melite_models.grammar.LaneInputs'>>",
   "model_copy": "<bound method BaseModel.model_copy of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=True)>",
   "model_dump": "<bound method BaseModel.model_dump of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=True)>",
   "model_dump_json": "<bound method BaseModel.model_dump_json of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=True)>",
   "model_fields": {
    "unet": "annotation=str required=False default=''",
    "unet_variant": "annotation=str required=False default=''",
    "unet_quant": "annotation=str required=False default=''",
    "text_encoder": "annotation=str required=False default=''",
    "clip_type": "annotation=Union[ClipType, NoneType] required=False default=None",
    "vae": "annotation=str required=False default=''",
    "family": "annotation=str required=False default=''",
    "model_path": "annotation=str required=False default=''",
    "checkpoint": "annotation=str required=False default=''",
    "texture_vae": "annotation=str required=False default=''",
    "clip_vision": "annotation=str required=False default=''",
    "background_removal": "annotation=str required=False default=''",
    "sampling_shift": "annotation=float required=False default=0.0",
    "latent_node": "annotation=LatentNode required=False default=<LatentNode.SD3: 'EmptySD3LatentImage'>",
    "unet_unconditional": "annotation=str required=False default=''",
    "weightless": "annotation=bool required=False default=False"
   },
   "model_fields_set": "{'weightless'}",
   "model_json_schema": "<bound method BaseModel.model_json_schema of <class 'melite_models.grammar.LaneInputs'>>",
   "model_parametrized_name": "<bound method BaseModel.model_parametrized_name of <class 'melite_models.grammar.LaneInputs'>>",
   "model_path": "",
   "model_post_init": "<bound method BaseModel.model_post_init of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=True)>",
   "model_rebuild": "<bound method BaseModel.model_rebuild of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate": "<bound method BaseModel.model_validate of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_json": "<bound method BaseModel.model_validate_json of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_strings": "<bound method BaseModel.model_validate_strings of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_file": "<bound method BaseModel.parse_file of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_obj": "<bound method BaseModel.parse_obj of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_raw": "<bound method BaseModel.parse_raw of <class 'melite_models.grammar.LaneInputs'>>",
   "sampling_shift": 0.0,
   "schema": "<bound method BaseModel.schema of <class 'melite_models.grammar.LaneInputs'>>",
   "schema_json": "<bound method BaseModel.schema_json of <class 'melite_models.grammar.LaneInputs'>>",
   "text_encoder": "",
   "texture_vae": "",
   "unet": "",
   "unet_quant": "",
   "unet_unconditional": "",
   "unet_variant": "",
   "update_forward_refs": "<bound method BaseModel.update_forward_refs of <class 'melite_models.grammar.LaneInputs'>>",
   "vae": "",
   "validate": "<bound method BaseModel.validate of <class 'melite_models.grammar.LaneInputs'>>",
   "weightless": true
  },
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "autoremesher": {
  "id": "autoremesher",
  "label": "AutoRemesher",
  "description": "AI triangle soup → clean quad topology (explicit budget, no silent defaults).",
  "engine": "comfyui",
  "form": "form_quad_remesh",
  "card": "quad-remesh",
  "unoffered": false,
  "base_body": "",
  "genre": "Genre.THREED",
  "mods": [],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "autoremesher",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "native",
      "label": "Native",
      "route": "autoremesher",
      "engine": "",
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "character_presets": [],
  "lane_inputs": {
   "background_removal": "",
   "checkpoint": "",
   "clip_vision": "",
   "construct": "<bound method BaseModel.construct of <class 'melite_models.grammar.LaneInputs'>>",
   "copy": "<bound method BaseModel.copy of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=True)>",
   "dict": "<bound method BaseModel.dict of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=True)>",
   "family": "",
   "from_orm": "<bound method BaseModel.from_orm of <class 'melite_models.grammar.LaneInputs'>>",
   "json": "<bound method BaseModel.json of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=True)>",
   "latent_node": "EmptySD3LatentImage",
   "model_computed_fields": {},
   "model_config": {
    "extra": "forbid",
    "frozen": true
   },
   "model_construct": "<bound method BaseModel.model_construct of <class 'melite_models.grammar.LaneInputs'>>",
   "model_copy": "<bound method BaseModel.model_copy of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=True)>",
   "model_dump": "<bound method BaseModel.model_dump of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=True)>",
   "model_dump_json": "<bound method BaseModel.model_dump_json of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=True)>",
   "model_fields": {
    "unet": "annotation=str required=False default=''",
    "unet_variant": "annotation=str required=False default=''",
    "unet_quant": "annotation=str required=False default=''",
    "text_encoder": "annotation=str required=False default=''",
    "clip_type": "annotation=Union[ClipType, NoneType] required=False default=None",
    "vae": "annotation=str required=False default=''",
    "family": "annotation=str required=False default=''",
    "model_path": "annotation=str required=False default=''",
    "checkpoint": "annotation=str required=False default=''",
    "texture_vae": "annotation=str required=False default=''",
    "clip_vision": "annotation=str required=False default=''",
    "background_removal": "annotation=str required=False default=''",
    "sampling_shift": "annotation=float required=False default=0.0",
    "latent_node": "annotation=LatentNode required=False default=<LatentNode.SD3: 'EmptySD3LatentImage'>",
    "unet_unconditional": "annotation=str required=False default=''",
    "weightless": "annotation=bool required=False default=False"
   },
   "model_fields_set": "{'weightless'}",
   "model_json_schema": "<bound method BaseModel.model_json_schema of <class 'melite_models.grammar.LaneInputs'>>",
   "model_parametrized_name": "<bound method BaseModel.model_parametrized_name of <class 'melite_models.grammar.LaneInputs'>>",
   "model_path": "",
   "model_post_init": "<bound method BaseModel.model_post_init of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='', model_path='', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=True)>",
   "model_rebuild": "<bound method BaseModel.model_rebuild of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate": "<bound method BaseModel.model_validate of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_json": "<bound method BaseModel.model_validate_json of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_strings": "<bound method BaseModel.model_validate_strings of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_file": "<bound method BaseModel.parse_file of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_obj": "<bound method BaseModel.parse_obj of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_raw": "<bound method BaseModel.parse_raw of <class 'melite_models.grammar.LaneInputs'>>",
   "sampling_shift": 0.0,
   "schema": "<bound method BaseModel.schema of <class 'melite_models.grammar.LaneInputs'>>",
   "schema_json": "<bound method BaseModel.schema_json of <class 'melite_models.grammar.LaneInputs'>>",
   "text_encoder": "",
   "texture_vae": "",
   "unet": "",
   "unet_quant": "",
   "unet_unconditional": "",
   "unet_variant": "",
   "update_forward_refs": "<bound method BaseModel.update_forward_refs of <class 'melite_models.grammar.LaneInputs'>>",
   "vae": "",
   "validate": "<bound method BaseModel.validate of <class 'melite_models.grammar.LaneInputs'>>",
   "weightless": true
  },
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 },
 "anny": {
  "id": "anny",
  "label": "Anny (character assembly)",
  "description": "Assemble a character — composite body/hair/outfit GLBs, render the 8-view turnaround, segment a source photo into part sprites.",
  "engine": "comfyui",
  "form": "form_3d_anny",
  "card": "anny",
  "unoffered": false,
  "defaults": {
   "resolution": 768,
   "framing": 1.2,
   "focal_length": 50,
   "samples": 64,
   "transparent": true
  },
  "source": {
   "repo_id": "melite-poser-nodes",
   "note": "our own pack (vendor/comfyui_extensions/melite-poser-nodes) — the ray-era poser chain, stopgap arc 2026-09-04"
  },
  "studio": {
   "tenant": "3d/anny",
   "owns_params": false,
   "writes": "('body_glb', 'source_image', 'sculpt', 'resolution', 'framing', 'focal_length', 'samples', 'transparent')"
  },
  "base_body": "anny-base-body.glb",
  "genre": "Genre.THREED",
  "mods": [
   "EstimateBodyVerb",
   "SavePresetVerb",
   "LoadPresetVerb",
   "DressVerb",
   "PropVerb"
  ],
  "variants": [
   {
    "id": "standard",
    "label": "Standard",
    "hint": "",
    "group": "Variant",
    "route": "anny",
    "engine": "",
    "resolver_defaults": {},
    "cells": [
     {
      "quant": "native",
      "label": "Native",
      "route": "anny",
      "engine": "",
      "resolver_defaults": {},
      "hide_from_dropdown": false
     }
    ]
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
  "loras": [],
  "provisions": [
   {
    "name": "anny-base-body.glb",
    "url": "https://huggingface.co/ProtoPomp/anny/resolve/main/anny/anny-base-body.glb",
    "folder": "anny",
    "sha256": "989eed67a59a4397ac61693e968bcea34504735d2e298eaa1885df6048a95b96",
    "size_bytes": 494404
   }
  ],
  "accepts": [],
  "character_presets": [
   {
    "id": "neutral",
    "label": "Neutral",
    "description": "Androgynous adult, flat-chested, no gender markers. The DEFAULT — only for non-human or deliberately androgynous characters."
   },
   {
    "id": "adult_female",
    "label": "Adult female",
    "description": "Young adult woman. NOTE: cupsize=0.45 is BELOW neutral — still modest. Bump to 0.55-0.65 for curvy/[REDACTED 2026-11-05]."
   },
   {
    "id": "adult_male",
    "label": "Adult male",
    "description": "Adult male, average build, slight muscle."
   },
   {
    "id": "child",
    "label": "Child",
    "description": "Young child (~7yr), androgynous, flat chest, large head ratio, short limbs."
   },
   {
    "id": "child_female",
    "label": "Child (female)",
    "description": "Young girl (~7yr), same as child but feminine face shape."
   },
   {
    "id": "teen",
    "label": "Teen",
    "description": "Androgynous teenager, slim build, minimal secondary [REDACTED 2026-11-05] characteristics."
   },
   {
    "id": "hero",
    "label": "Hero",
    "description": "Muscular male hero, broad shoulders, thick chest, tall."
   },
   {
    "id": "elderly",
    "label": "Elderly",
    "description": "Elderly person, lower muscle, softer tissue, shorter."
   }
  ],
  "lane_inputs": {
   "background_removal": "",
   "checkpoint": "",
   "clip_vision": "",
   "construct": "<bound method BaseModel.construct of <class 'melite_models.grammar.LaneInputs'>>",
   "copy": "<bound method BaseModel.copy of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='anny', model_path='sam_vit_b_01ec64.pth', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "dict": "<bound method BaseModel.dict of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='anny', model_path='sam_vit_b_01ec64.pth', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "family": "anny",
   "from_orm": "<bound method BaseModel.from_orm of <class 'melite_models.grammar.LaneInputs'>>",
   "json": "<bound method BaseModel.json of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='anny', model_path='sam_vit_b_01ec64.pth', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "latent_node": "EmptySD3LatentImage",
   "model_computed_fields": {},
   "model_config": {
    "extra": "forbid",
    "frozen": true
   },
   "model_construct": "<bound method BaseModel.model_construct of <class 'melite_models.grammar.LaneInputs'>>",
   "model_copy": "<bound method BaseModel.model_copy of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='anny', model_path='sam_vit_b_01ec64.pth', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump": "<bound method BaseModel.model_dump of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='anny', model_path='sam_vit_b_01ec64.pth', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_dump_json": "<bound method BaseModel.model_dump_json of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='anny', model_path='sam_vit_b_01ec64.pth', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_fields": {
    "unet": "annotation=str required=False default=''",
    "unet_variant": "annotation=str required=False default=''",
    "unet_quant": "annotation=str required=False default=''",
    "text_encoder": "annotation=str required=False default=''",
    "clip_type": "annotation=Union[ClipType, NoneType] required=False default=None",
    "vae": "annotation=str required=False default=''",
    "family": "annotation=str required=False default=''",
    "model_path": "annotation=str required=False default=''",
    "checkpoint": "annotation=str required=False default=''",
    "texture_vae": "annotation=str required=False default=''",
    "clip_vision": "annotation=str required=False default=''",
    "background_removal": "annotation=str required=False default=''",
    "sampling_shift": "annotation=float required=False default=0.0",
    "latent_node": "annotation=LatentNode required=False default=<LatentNode.SD3: 'EmptySD3LatentImage'>",
    "unet_unconditional": "annotation=str required=False default=''",
    "weightless": "annotation=bool required=False default=False"
   },
   "model_fields_set": "{'model_path', 'family'}",
   "model_json_schema": "<bound method BaseModel.model_json_schema of <class 'melite_models.grammar.LaneInputs'>>",
   "model_parametrized_name": "<bound method BaseModel.model_parametrized_name of <class 'melite_models.grammar.LaneInputs'>>",
   "model_path": "sam_vit_b_01ec64.pth",
   "model_post_init": "<bound method BaseModel.model_post_init of LaneInputs(unet='', unet_variant='', unet_quant='', text_encoder='', clip_type=None, vae='', family='anny', model_path='sam_vit_b_01ec64.pth', checkpoint='', texture_vae='', clip_vision='', background_removal='', sampling_shift=0.0, latent_node=<LatentNode.SD3: 'EmptySD3LatentImage'>, unet_unconditional='', weightless=False)>",
   "model_rebuild": "<bound method BaseModel.model_rebuild of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate": "<bound method BaseModel.model_validate of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_json": "<bound method BaseModel.model_validate_json of <class 'melite_models.grammar.LaneInputs'>>",
   "model_validate_strings": "<bound method BaseModel.model_validate_strings of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_file": "<bound method BaseModel.parse_file of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_obj": "<bound method BaseModel.parse_obj of <class 'melite_models.grammar.LaneInputs'>>",
   "parse_raw": "<bound method BaseModel.parse_raw of <class 'melite_models.grammar.LaneInputs'>>",
   "sampling_shift": 0.0,
   "schema": "<bound method BaseModel.schema of <class 'melite_models.grammar.LaneInputs'>>",
   "schema_json": "<bound method BaseModel.schema_json of <class 'melite_models.grammar.LaneInputs'>>",
   "text_encoder": "",
   "texture_vae": "",
   "unet": "",
   "unet_quant": "",
   "unet_unconditional": "",
   "unet_variant": "",
   "update_forward_refs": "<bound method BaseModel.update_forward_refs of <class 'melite_models.grammar.LaneInputs'>>",
   "vae": "",
   "validate": "<bound method BaseModel.validate of <class 'melite_models.grammar.LaneInputs'>>",
   "weightless": false
  },
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
 }
} as const;
