// families/image/h3-image-edit.ts — the h3-image-edit family
// declaration (authored 2026-11-11 from the Comfy-Org/MiniMax-H3-Image
// release + the official image_minimax_h3_image_edit template,
// hand-owned: this file IS the family's truth — a change here is a
// family change, nothing else moves).
//
// THE PAIR LAW (the qwen-img-21 precedent): MiniMax-H3-Image is ONE
// checkpoint with two lanes; the registry's one-family-one-card law
// boards each family on exactly one card, so the pair is h3-image
// (t2i, the image-gen card) and h3-image-edit (THIS family —
// reference-guided edit, the image-edit card): same physical
// weights (the Comfy-Org/MiniMax-H3-Image repo, three unet quants),
// the shared qwen3vl-32b encoder (content-identical to the h3
// VIDEO family's seated files — the downloader dedups by content),
// version-consistent ids, no operation baked into the model id
// beyond the lane the registry demands.
//
// THE LANE (the official image_minimax_h3_image_edit template,
// verbatim topology): every stated picture first rides the
// template's own pre-scale — ResizeImageMaskNode "scale total
// pixels" to 4 megapixels (area), then "scale to multiple" 32 —
// because the template's own note carries the working-range law:
// "MiniMax H3 Image doesn't work well in low resolution" (the
// effective band is ~4-20MP, best around 16MP; the community
// line's identity craft — the arthan1011 workflow — grounds the
// same law: reference pictures at 4MP carry the identity). The
// scaled ANCHOR (image_1 — the picture to edit) also sizes the
// canvas: GetImageSize feeds the conditioning node's width/height
// (a stated pair overrides the canvas), and MiniMaxH3ImageConditioning
// — ONE node with vae connected (reference latents anchor identity),
// the prompt citing pictures as <Picture 1>, <Picture 2>, ... —
// emits the positive conditioning (out 0) AND the canvas latent
// (out 1). The negative rides ConditioningZeroOut (the template's
// own arm — distilled guidance at cfg 1). KSampler (6 / 1 / euler /
// simple — the template's own counts) → VAEDecode → SaveImage.
// NO EmptyLatentImage, no VAEEncode-of-source: the conditioning
// node owns the canvas.
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import { ModelsServiceFace } from '@melite/comfyui-card-kit/service-faces'
import type { ModelDecl } from '@melite/comfyui-card-kit/model-contract'
import { edit } from "./actions.ts";

export const DECL: ModelDecl = {
  "id": "h3-image-edit",
  "form": "form_edit",
  "label": "MiniMax H3 Image Edit",
  "description": "Reference-guided image editing on the MiniMax-H3-Image checkpoint — the same weights as the h3-image t2i sibling (the pair rides one checkpoint; the encoder dedups against the h3 video family's seated files). The official template's lane: every stated picture pre-scales to 4 megapixels (the working-range law — H3-Image composes low-resolution work poorly), the anchor (image_1, cited in-prompt as <Picture 1>) sizes the conditioning canvas through GetImageSize, and one MiniMaxH3ImageConditioning node — vae connected, so reference latents anchor identity — emits the positive conditioning AND the canvas latent; the negative rides ConditioningZeroOut at cfg 1 (distilled guidance), 6 steps euler/simple. Action-focused prompting: name the RESULT of the edit ('the plant disappears behind the bench'), not the instruction alone — the community line's craft.",
  "engine": "comfyui",
  // THE VARIANT-CLASS DEFAULTS LEAVE THE FAMILY BLOCK (the
  // 25-on-Turbo banner cure, audit 013): steps/cfg are declared
  // variant-class below, and each Variant row's own
  // resolver_defaults owns its face. THE GEOMETRY IS THE ANCHOR'S
  // OWN: no width/height default exists — the canvas derives from
  // the scaled anchor (the template's GetImageSize wiring); a
  // stated pair overrides the canvas as a run param (match OFF +
  // both axes, the shared size law).
  "defaults": {
    "sampler": "euler",
    "scheduler": "simple"
  },
  "genre": "image",
  // THE REQUIRED DEFAULTS (operator contract 2026-11-07): every
  // variant row declares its own steps+cfg in resolver_defaults.
  // input_images + prompt are the user-provided seats (the edit
  // lane edits what the caller brings).
  "required_defaults": [
    { "name": "steps", "class": "variant" },
    { "name": "cfg", "class": "variant" },
    { "name": "input_images", "class": "user" },
    { "name": "prompt", "class": "user" }
  ],
  // THE LANE SURFACE (the same visible set the sibling edit lanes
  // serve): the ordered input list + the card's validation-only
  // legacy aliases + the mask gate (refused-loud on this lane —
  // no mask mod boards here yet; the crop_stitch region arm is the
  // mask plane's own cure when it lands) + the sampling block and
  // the canvas pair. NO negative_prompt: the lane zeroes the
  // negative by design (ConditioningZeroOut at cfg 1) — a stated
  // negative has no seat and refuses field-named.
  "params": [
    "input_images",
    "image1",
    "image2",
    "image3",
    "reference_images",
    "input_mask",
    "prompt",
    "match_input_resolution",
    "width",
    "height",
    "seed",
    "steps",
    "cfg",
    "sampler",
    "scheduler",
  ],
  "relations": {
    // THE COMPOSE LAW, STATED (the sibling edit families' rows
    // verbatim — the words must AGREE member-wise or the
    // model-less draft intersection empties and the bench admits
    // what compose refuses — the GAP-7 shape). `required: prompt`
    // and the legacy-aware anchor law are the card's own compose
    // gates, stated here so the bench-write door refuses them
    // first, in the field's voice, on this family too.
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
  // THE LORAS BOARDING (operator 2026-11-06: every family applies
  // LoRAs): boards 'loras' — no first-party rows (the h3 VIDEO
  // turbo line is the video unet's, never this checkpoint's); user
  // filename rows pass through compose. The flavor seed in
  // mods/loras.ts lands with this declaration.
  "mods": [
    "mask",
    "loras"
  ],
  // THE PROVISION TRUTH: the same shared rows the t2i sibling
  // provisions (the encoder tiers + vae — identical urls, sha256s,
  // sizes; the unet rides the cell artifacts). Content-dedup makes
  // the pair one download on a fresh box.
  "provisions": [
    {
      "name": "qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
      "url": "https://huggingface.co/Comfy-Org/MiniMax-H3-Image/resolve/main/text_encoders/qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
      "folder": "text_encoders",
      "sha256": "bc2ced0fbea64757fa9acddccfc0b3f4819d1dcf1da6c124d690d368be283923",
      "size_bytes": 27141342152
    },
    {
      "name": "qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors",
      "url": "https://huggingface.co/Comfy-Org/MiniMax-H3-Image/resolve/main/text_encoders/qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors",
      "folder": "text_encoders",
      "sha256": "35a88d51044231fe332301d7a62aa81e3f2cba62febeb446e2c1e3e0ef76f2c6",
      "size_bytes": 15687142551
    },
    {
      "name": "minimax_h3_image_vae_fp16.safetensors",
      "url": "https://huggingface.co/Comfy-Org/MiniMax-H3-Image/resolve/main/vae/minimax_h3_image_vae_fp16.safetensors",
      "folder": "vae",
      "sha256": "d80e9c2e5cfc9844869961ff5a58c9a9e52182df6bfb30b26018dd7f348721af",
      "size_bytes": 1168505312
    }
  ],
  // THE MATRIX: the same single-base line the t2i sibling carries —
  // one Variant token, the QUANT axis owning the three download
  // tiers (int8_convrot default / w4a8 with the nvfp4 encoder
  // pairing / bf16). No distilled edit tier exists.
  "variants": [
    {
      "id": "base",
      "label": "Base",
      "hint": "The H3-Image base checkpoint on the edit lane — 6 steps, cfg 1 (the official template's own counts), three download tiers below. Requires provisioning: the H3-Image files are NOT on this box by default; the encoder dedups against the h3 video family's seated files.",
      "group": "Variant",
      "route": "h3-image-edit",
      "order": 0,
      // The base face declared, never inherited: 6 / 1 — the
      // official template's own count; the envelope matches the
      // t2i sibling's (steps [4, 20], cfg [1, 2] — the guidance
      // mode leans on a zeroed conditioning, a bounded
      // experiment).
      "sampler_envelope": { "steps": [4, 20], "cfg": [1, 2] },
      "resolver_defaults": { "steps": 6, "cfg": 1 },
      "cells": [
        {
          "quant": "int8_convrot_pruned",
          "label": "INT8 ConvRot Pruned",
          "route": "h3-image-edit-int8",
          "vram_peak_gb": 30,
          "artifact": {
            "source_url": "https://huggingface.co/Comfy-Org/MiniMax-H3-Image/resolve/main/diffusion_models/minimax_h3_image_pruned_int8_convrot.safetensors",
            "size_bytes": 20979314802,
            "sha256": "83eb140f1ff95c068f8a6886e6d3f3d0d4ab2e07bb2fe6d2ef992a51146ee622",
            "dest_root": "COMFYUI_ROOT",
            "dest_sub": "diffusion_models",
            "size_hint_gb": 21
          }
        },
        {
          "quant": "w4a8",
          "label": "W4A8",
          "route": "h3-image-edit-w4a8",
          "vram_peak_gb": 20,
          "lane_inputs": {
            "unet": "minimax_h3_image_pruned_w4a8.safetensors",
            "text_encoder": "qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors"
          },
          "artifact": {
            "source_url": "https://huggingface.co/Comfy-Org/MiniMax-H3-Image/resolve/main/diffusion_models/minimax_h3_image_pruned_w4a8.safetensors",
            "size_bytes": 12549794530,
            "sha256": "517cc19b85348386f4df7c806dce80d839d0899e7cdaa3e1dbb09de964381dbb",
            "dest_root": "COMFYUI_ROOT",
            "dest_sub": "diffusion_models",
            "size_hint_gb": 12.5
          }
        },
        {
          "quant": "bf16",
          "label": "BF16",
          "route": "h3-image-edit-bf16",
          "vram_peak_gb": 64,
          "lane_inputs": {
            "unet": "minimax_h3_image_pruned_bf16.safetensors"
          },
          "artifact": {
            "source_url": "https://huggingface.co/Comfy-Org/MiniMax-H3-Image/resolve/main/diffusion_models/minimax_h3_image_pruned_bf16.safetensors",
            "size_bytes": 40234657162,
            "sha256": "a767f5325db019588b3491a93d80288d336c826a7aeb87bec67675e554367222",
            "dest_root": "COMFYUI_ROOT",
            "dest_sub": "diffusion_models",
            "size_hint_gb": 40.2
          }
        }
      ]
    },
    {
      "id": "upstream-solvers",
      "label": "Upstream Solvers",
      "hint": "Sampler euler + scheduler simple — the official H3-Image edit template's own solver truth.",
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
      "tooltip": "The checkpoint line — one base (the official template's 6-step distilled guidance); no turbo tier exists for H3-Image.",
    },
    {
      "id": "Quant",
      "label": "Quant",
      "tooltip": "The download tier — INT8 ConvRot (21GB, the official template pick), W4A8 (12.5GB, paired with the nvfp4 encoder), or BF16 (40.2GB, full precision).",
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
    "clip_type": "minimax",
    // THE LANE BRANCH KEY: naming the conditioning class routes the
    // kit's builders onto the H3-Image edit lane (the 4MP pre-scale
    // + GetImageSize canvas + ONE conditioning node emitting the
    // positive and the latent; the negative rides
    // ConditioningZeroOut).
    "text_encode_node": "MiniMaxH3ImageConditioning",
    // THE NODE'S OWN CAP (the autogrow max): 100 total slots,
    // anchor included.
    "max_images": 100,
    "text_encoder": "qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
    "unet": "minimax_h3_image_pruned_int8_convrot.safetensors",
    "vae": "minimax_h3_image_vae_fp16.safetensors"
  },
};

export const family: Plugin = {
  name: "family-h3-image-edit",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};

// The family's offered actions (the atom vocabulary): the edit
// action the image-edit card binds.
export { edit, parseEditFacts, type EditFacts, type EditParams } from "./actions.ts";

// The Loader-row face: DSH loads plugin rows by bare specifier and
// unwraps `exports.default ?? exports` (vendor/cordis_plugins/loader
// unwrapExports) — the default export IS the row-loadable plugin. The
// named `family` stays the library face (engine loadFamilies).
export { family as default };
