// families/image/fibo2-edit.ts — the Fibo 2.0 Edit family declaration
// (authored from the Comfy-Org/Fibo-2.0 repack + the engine's
// nodes_fibo2.py, hand-owned: this file IS the family's truth — a
// change here is a family change, nothing else moves).
//
// THE FAMILY: Fibo 2.0 Edit — BRIA's licensed image-editing model,
// boarded from the Comfy-Org repack as the image-edit card's THIRD
// family beside the two qwen-img-edit lanes. One checkpoint pair
// (dev 30-step reference, edit-turbo 8-step distilled), one encoder
// class, one VAE.
//
// THE LANE (the engine's TextEncodeFibo2 contract): UNETLoader →
// CLIPLoader(type fibo2) + VAELoader → TextEncodeFibo2 (prompt AND
// negative_prompt from ONE node — an empty negative rides the
// trained null caption, CFG works text-only; the vae seat splices
// reference latents into BOTH conditionings; images ride image_1..
// image_16 autogrow slots, cited in-prompt as <image_N>) → KSampler
// on the ENCODER'S OWN THIRD OUTPUT (a 128-channel zero latent at
// the trained size — width/height 0 means the first image's aspect
// at ~1MP; a stated size would shift the edit) → VAEDecode →
// SaveImage. No EmptyLatentImage, no VAEEncode-of-source.
//
// THE UPSTREAM BUG, RECORDED (issue 17248, open): the INT8 Qwen3-VL
// encoder fails on IMAGE-conditioned encoding — every edit lane here
// rides the BF16 encoder; the INT8 encoder's seat is text-only
// (the FLUX.3-shared use), and it is deliberately NOT provisioned.
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import { ModelsServiceFace } from '@melite/comfyui-card-kit/service-faces'
import type { ModelDecl } from '@melite/comfyui-card-kit/model-contract'
import { edit } from "./actions.ts";

export const DECL: ModelDecl = {
  "id": "fibo2-edit",
  "form": "form_edit",
  "label": "Fibo 2.0 Edit",
  "description": "Instruction-driven image editing on Fibo 2.0 — BRIA's licensed model, boarded from the Comfy-Org repack. One TextEncodeFibo2 encoder emits positive AND negative from one call (an empty negative_prompt rides the model's trained null caption — CFG works text-only), cites input images as <image_N> (up to 16), and — with the VAE seat connected — splices reference latents into BOTH conditionings. The sampler works on the ENCODER'S OWN emitted latent (128-channel, trained-size: width/height 0 means the first input image's aspect at ~1MP), so no edit lane takes a stated size. KNOWN UPSTREAM BUG (issue 17248, open): the INT8 Qwen3-VL encoder fails on image-conditioned encoding — every edit here rides the BF16 encoder (qwen3vl_4b_bf16); the INT8 encoder's seat is the text-only FLUX-shared use and is deliberately not provisioned. Dev is the 30-step CFG 5 reference lane; Edit Turbo is the 8-step CFG 1 distilled lane (a community 4-step report exists and is deliberately not pinned).",
  "engine": "comfyui",
  "defaults": {
    "steps": 30,
    "sampler": "euler",
    "scheduler": "simple",
    "cfg": 5
    // THE GEOMETRY IS THE ENCODER'S OWN (the latent law): this lane
    // samples TextEncodeFibo2's own emitted latent (its third
    // output), so no stated size has a seat — width/height were
    // never on this family's surface.
  },
  "genre": "image",
  // THE REQUIRED DEFAULTS (operator contract 2026-11-07): every
  // variant row declares its own steps+cfg in resolver_defaults —
  // the family defaults can never substitute for a variant's face.
  // input_images + prompt are the user-provided seats (the edit
  // lane edits what the caller brings).
  "required_defaults": [
    { "name": "steps", "class": "variant" },
    { "name": "cfg", "class": "variant" },
    { "name": "input_images", "class": "user" },
    { "name": "prompt", "class": "user" }
  ],
  // THE LANE SURFACE: the same visible set the qwen edit lanes
  // serve (input_images, prompt, negative_prompt, the sampling
  // block) plus the card's validation-only aliases (image1/2/3,
  // reference_images, input_mask — the unified ordered list and the
  // mask gate). No width/height (the latent law), no batch (the
  // encoder's batch_size stays pinned at 1), no use_stock_nodes/
  // double_reference (the qwen lanes' own tuning pair). The card
  // auto+mask gate refuses on this lane (the crop_stitch detailer
  // is the only mask arm here — the LanPaint sampler never boarded).
  "params": [
    "input_images",
    "image1",
    "image2",
    "image3",
    "reference_images",
    "input_mask",
    "prompt",
    "negative_prompt",
    "match_input_resolution",
    "seed",
    "steps",
    "cfg",
    "sampler",
    "scheduler",
  ],
  "relations": {
    // THE COMPOSE LAW, STATED (the sibling edit families' rows
    // verbatim — the words must AGREE member-wise or the model-less
    // draft intersection empties and the bench admits what compose
    // refuses — the GAP-7 shape). `required: prompt` and the
    // legacy-aware anchor law are the card's own compose gates,
    // stated here so the bench-write door refuses them first, in
    // the field's voice, on this family too.
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
  // THE SOLVER SPAN: no stated-size domain exists on this lane;
  // steps rides the edit narrowing's [1,50] — the write door judges
  // a live domain on every edit lane, never one.
  "bounds": {
    "steps": { "min": 1, "max": 50 },
  },
  // THE BOARDING PAIR: 'loras' (operator 2026-11-06 — every image
  // family applies LoRAs; the fired lane fires on every boarding
  // atom; the flavor seed in mods/loras.ts lands with this
  // declaration) and 'mask' (operator 2026-11-07 — the MASK ORDER:
  // every img-gen family boards the region contract; the crop_stitch
  // detailer arm is this lane's only mask path, auto+mask refuses
  // field-named).
  "mods": [
    "loras",
    "mask"
  ],
  // THE PROVISION TRUTH (the silent-failure cure): the two weights
  // every lane shares — the BF16 Qwen3-VL text encoder (the edit
  // lane's encoder: the int8 tower is the open bug's seat and is
  // NOT provisioned) and the flux2-family VAE (byte-identical to
  // flux-klein's row: same digest, one download serves both lanes).
  // The four diffusion checkpoints ride their variant cell artifacts
  // (the quant owns the download).
  "provisions": [
    {
      "name": "qwen3vl_4b_bf16.safetensors",
      "url": "https://huggingface.co/Comfy-Org/Fibo-2.0/resolve/main/text_encoders/qwen3vl_4b_bf16.safetensors",
      "folder": "text_encoders",
      "sha256": "36f3ff447ef59201722e8f9ce6020c9819fdcfba6aa2608c4e09b1c0ce114e34",
      "size_bytes": 8875719384
    },
    {
      "name": "flux2-vae.safetensors",
      "url": "https://huggingface.co/Comfy-Org/Fibo-2.0/resolve/main/vae/flux2-vae.safetensors",
      "folder": "vae",
      "sha256": "868fe7b343cc8f3a19dbcfcafbc3d5f888802be3f89bd81b65b3621a066ce8f3",
      "size_bytes": 336211292
    }
  ],
  // THE TWO-LANE MATRIX: Variant = dev/edit-turbo (the distilled
  // pair — recipe↔weights law: each lane's steps/cfg ride ITS OWN
  // checkpoint, never one without the other), Quant =
  // int8_convrot/bf16 (the cell owns its tier's unet spelling —
  // the cell-lane cascade). The BF16 cells swap lane_inputs.unet to
  // their tier's file; the int8 cells ride the family default.
  "variants": [
    {
      "id": "dev",
      "label": "Dev",
      "hint": "The 30-step reference checkpoint — the official edit recipe pair (CFG 5, Euler/simple, empty null caption). Both quant tiers below. Requires provisioning: the Fibo files are NOT on this box by default; without them the engine validation refuses LOUD (the honest face).",
      "group": "Variant",
      "route": "fibo2-edit-dev",
      "order": 0,
      "sampler_envelope": {
        "steps": [20, 40],
        "cfg": [3.5, 6]
      },
      // The base face declared, never inherited (the variant-sampler-defaults
      // law): 30 / 5 — the official dev recipe, the family mirror.
      // NO `model` key here (2026-11-10): resolver_defaults.model is the
      // resolver's family-pointer vocabulary — a route-shaped value
      // re-routes resolveCardFamily to the route row (empty matrix) and
      // every stated variant refuses "unknown variant". This lane's
      // weights seat is facts.unet (the lane_inputs Loader row); the
      // z-image shape (steps/cfg only) is the convention.
      "resolver_defaults": {
        "steps": 30,
        "cfg": 5
      },
      "cells": [
        {
          "quant": "int8_convrot",
          "label": "INT8 ConvRot",
          "route": "fibo2-edit-dev-int8",
          "artifact": {
            "source_url": "https://huggingface.co/Comfy-Org/Fibo-2.0/resolve/main/diffusion_models/fibo2_dev_int8_convrot.safetensors",
            "size_bytes": 8408562474,
            "sha256": "063dd397395809fd22234c6bd32932cfcb22619f4d2282bdbf1dc58c406fe325",
            "dest_root": "COMFYUI_ROOT",
            "dest_sub": "diffusion_models",
            "size_hint_gb": 8.4
          }
        },
        {
          "quant": "bf16",
          "label": "BF16",
          "route": "fibo2-edit-dev-bf16",
          "lane_inputs": {
            "unet": "fibo2_dev_bf16.safetensors"
          },
          "artifact": {
            "source_url": "https://huggingface.co/Comfy-Org/Fibo-2.0/resolve/main/diffusion_models/fibo2_dev_bf16.safetensors",
            "size_bytes": 16452934194,
            "sha256": "2a09866ff073cae9114f5fd93c0f530f84d41f74dc06e3d0c1372587bb3e9984",
            "dest_root": "COMFYUI_ROOT",
            "dest_sub": "diffusion_models",
            "size_hint_gb": 16.5
          }
        }
      ]
    },
    {
      "id": "edit-turbo",
      "label": "Edit Turbo",
      "hint": "The 8-step distilled edit checkpoint (CFG 1, Euler/simple) — fast edits at the official pair. The community 4-step report is deliberately NOT pinned (unofficial, drifting). Requires provisioning, same as dev.",
      "group": "Variant",
      "route": "fibo2-edit-turbo",
      "order": 1,
      "sampler_envelope": {
        "steps": [6, 12],
        "cfg": [1, 2]
      },
      "resolver_defaults": {
        "steps": 8,
        "cfg": 1
      },
      "cells": [
        {
          "quant": "int8_convrot",
          "label": "INT8 ConvRot",
          "route": "fibo2-edit-turbo-int8",
          // THE WEIGHTS SWAP (recipe↔weights law): the turbo lane's
          // INT8 tier rides ITS OWN checkpoint — the family pin is
          // the dev int8 file, so the cell overrides it explicitly.
          "lane_inputs": {
            "unet": "fibo2_edit_turbo_int8_convrot.safetensors"
          },
          "artifact": {
            "source_url": "https://huggingface.co/Comfy-Org/Fibo-2.0/resolve/main/diffusion_models/fibo2_edit_turbo_int8_convrot.safetensors",
            "size_bytes": 8408562474,
            "sha256": "1f6fa7c499191f405467123f655f11762661eaa5bd479d1da8f161398ef72c3b",
            "dest_root": "COMFYUI_ROOT",
            "dest_sub": "diffusion_models",
            "size_hint_gb": 8.4
          }
        },
        {
          "quant": "bf16",
          "label": "BF16",
          "route": "fibo2-edit-turbo-bf16",
          "lane_inputs": {
            "unet": "fibo2_edit_turbo_bf16.safetensors"
          },
          "artifact": {
            "source_url": "https://huggingface.co/Comfy-Org/Fibo-2.0/resolve/main/diffusion_models/fibo2_edit_turbo_bf16.safetensors",
            "size_bytes": 16452934194,
            "sha256": "028f6cf13af75840d7cc7346a5784fe55887c6b9299d173c8271161ba5ccf7d0",
            "dest_root": "COMFYUI_ROOT",
            "dest_sub": "diffusion_models",
            "size_hint_gb": 16.5
          }
        }
      ]
    }
  ],
  // THE SCOPED AXIS (a deliberate judgment, recorded): NO Recipe
  // group. The qwen edit lanes carry canned-prompt recipes; this
  // family launches without one — nothing upstream canonical enough
  // to pin, and a stamp-less Recipe group is exactly what recipe-rows
  // LAW A refuses. A canned one-click lands with upstream truth.
  "variant_groups": [
    {
      "id": "Variant",
      "label": "Variant",
      "tooltip": "The distilled pair — Dev (30 steps, the reference lane) or Edit Turbo (8 steps, the distilled lane). Each lane's sampler pair rides its own checkpoint.",
    },
    {
      "id": "Quant",
      "label": "Quant",
      "tooltip": "The download tier — INT8 ConvRot (8.4GB) or BF16 (16.5GB). Every edit rides the BF16 text encoder either way (the int8 tower's vision path is the open upstream bug).",
    }
  ],
  "has_agent": true,
  "has_inference": true,
  "actions": [edit],
  "lane_inputs": {
    "clip_type": "fibo2",
    // THE LANE BRANCH KEY (the latent_node precedent — data, never a
    // family-id switch): names this lane's encoder class; the edit
    // action's facts door refuses any other value, so a drifted row
    // never silently routes to another family's lane topology.
    "text_encode_node": "TextEncodeFibo2",
    // THE IMAGE CAPACITY (the node's own truth — the card and the
    // lane RIDE this, never a hardcoded count): TextEncodeFibo2 opens
    // image inputs as filled, up to 16 total (anchor + references),
    // cited in-prompt as <image_N>.
    "max_images": 16,
    // THE BF16 ENCODER (the 17248 rule): image-conditioned encoding
    // on the int8 tower is the open upstream bug — every edit lane
    // encodes through the BF16 Qwen3-VL checkpoint.
    "text_encoder": "qwen3vl_4b_bf16.safetensors",
    "unet": "fibo2_dev_int8_convrot.safetensors",
    "vae": "flux2-vae.safetensors"
  }
};

export const family: Plugin = {
  name: "family-fibo2-edit",
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
