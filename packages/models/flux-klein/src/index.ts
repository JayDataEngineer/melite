// @melite/models-flux-klein/src — the flux-klein family declaration
// (authored 2026-10-22 from the Comfy-Org split release + the official
// FLUX.2 Klein workflow templates, hand-owned: this file IS the
// family's truth — a change here is a family change, nothing else
// moves).
//
// WHAT THIS FAMILY IS (006/U1, the audit's low-VRAM story): FLUX.2
// Klein 4B — the distilled 4-step lane runs on modest VRAM where the
// estate's other image families do not, and the model is
// reference-native (ReferenceLatent conditioning over scaled
// reference images, the official edit template's own arm). The audit
// round's "9B INT8" premise corrected by research: no INT8 Klein
// exists anywhere; the 9B diffusion weights live only in
// licence-gated black-forest-labs repos (the FLUX Non-Commercial
// License + contact-info consent — the 9B stays non-commercial where
// the 4B is Apache-2.0, BFL's own release decision), so no anonymous
// sha256/size is authorable for them — the 9B lane lands when
// operator HF credentials unblock it. The 4B split files (ungated
// Comfy-Org vae-text-encorder-for-flux-klein-4b — upstream's own
// repo-name spelling) carry every fact verbatim.
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import { ModelsServiceFace } from '@melite/comfyui-card-kit/service-faces'
import type { ModelDecl } from '@melite/comfyui-card-kit/model-contract'
import { t2i } from "./actions.ts";

export const DECL: ModelDecl = {
  "id": "flux-klein",
  "form": "form_generate",
  "label": "FLUX.2 Klein 4B",
  "description": "FLUX.2 Klein 4B — the low-VRAM image lane: a 4-step distilled checkpoint for modest cards plus the 20-step base tier, reference-guided through ReferenceLatent (the first reference sizes the canvas). Apache-2.0 licensed (BFL's own release terms for the 4B family).",
  "engine": "comfyui",
  // The official distilled template's own defaults: 1024², 4 steps,
  // cfg 1, euler. `scheduler` declares the card domain (the
  // models-against-cards law) and wires nothing on this lane — the
  // Flux2Scheduler node computes the empirical shift from steps and
  // the canvas itself.
  "defaults": {
    "width": 1024,
    "height": 1024,
    "steps": 4,
    "cfg": 1,
    "sampler": "euler",
    "scheduler": "simple"
  },
  "genre": "image",
  // MASK-C (the image-gen region gap — deliberate no-board): no
  // mods key (absent ≡ boards nothing) — the klein edit story is
  // ReferenceLatent references, not masks (the operator ruling keeps
  // references off the gen card too), and no klein edit family
  // shares these weights. Serving the surface would promise what no
  // lane builds; a stated mask refuses LOUD at admission like every
  // undeclared key.
  // THE LICENCE ROW (corrected 2026-10-22 by BFL's own sources — the
  // U1 premise had it backwards): the 4B family is Apache-2.0 — BFL's
  // release decision ("the open-weight FLUX.2 [klein] 4B models under
  // an Apache 2.0 license"), the klein-4B model card's License
  // section, and the flux2 repo's overview table all name it; the 9B
  // tier is the non-commercial one. The ungated Comfy-Org split repo
  // redistributes those same Apache weights.
  "licence": {
    "id": "apache-2.0",
    "commercial_use": true
  },
  // THE PROVISION TRUTH (the silent-failure cure, 2511's law): the
  // shared lane weights carry their provision — the flux2 tokenizer
  // (qwen_3_4b) and the flux2 VAE from the same Comfy-Org split
  // repo; the unet rides the cell artifacts (the variant owns the
  // download).
  "provisions": [
    {
      "name": "qwen_3_4b.safetensors",
      "url": "https://huggingface.co/Comfy-Org/vae-text-encorder-for-flux-klein-4b/resolve/main/split_files/text_encoders/qwen_3_4b.safetensors",
      "folder": "text_encoders",
      "sha256": "6c671498573ac2f7a5501502ccce8d2b08ea6ca2f661c458e708f36b36edfc5a",
      "size_bytes": 8044982048
    },
    {
      "name": "flux2-vae.safetensors",
      "url": "https://huggingface.co/Comfy-Org/vae-text-encorder-for-flux-klein-4b/resolve/main/split_files/vae/flux2-vae.safetensors",
      "folder": "vae",
      "sha256": "868fe7b343cc8f3a19dbcfcafbc3d5f888802be3f89bd81b65b3621a066ce8f3",
      "size_bytes": 336211292
    }
  ],
  "variants": [
    {
      "id": "distilled",
      "label": "Distilled 4-Step",
      "hint": "The official distilled template — 4 steps, cfg 1, ConditioningZeroOut negative. The low-VRAM lane (DEFAULT).",
      "group": "Variant",
      "route": "flux-klein",
      "order": 0,
      "sampler_envelope": {
        "steps": [4, 8],
        "cfg": [1, 2]
      },
      "resolver_defaults": {
        "model": "flux-klein"
      },
      "cells": [
        {
          "quant": "bf16",
          "label": "BF16",
          "route": "flux-klein",
          "vram_peak_gb": 16,
          "artifact": {
            "source_url": "https://huggingface.co/Comfy-Org/vae-text-encorder-for-flux-klein-4b/resolve/main/split_files/diffusion_models/flux-2-klein-4b.safetensors",
            "size_bytes": 7751105712,
            "sha256": "ec3d4e733a771f61c052fb4856c48b336c55eaf2c65487c2a1faeb9bbda7a343",
            "dest_root": "COMFYUI_ROOT",
            "dest_sub": "diffusion_models",
            "size_hint_gb": 7.8
          }
        }
      ]
    },
    {
      "id": "base",
      "label": "Base 20-Step",
      "hint": "The official base template — 20 steps, cfg 5, encoded negative prompt. Higher fidelity, more compute.",
      "group": "Variant",
      "route": "flux-klein-base",
      "order": 1,
      "sampler_envelope": {
        // WIDENED 2026-10-22 (the author-recipe cure): BFL's own
        // base defaults are 50 steps / guidance 4.0 (flux2
        // src/flux2/util.py FLUX2_MODEL_INFO flux.2-klein-base-4b,
        // fixed_params {}), while the ComfyUI template rides 20/5 —
        // the envelope covers both official recipes (the old
        // [10,30] refused the author's own 50-step recipe at the
        // stamp gate).
        "steps": [10, 60],
        "cfg": [2, 8]
      },
      "resolver_defaults": {
        "model": "flux-klein-base",
        "steps": 20,
        "cfg": 5
      },
      // The base tier's own checkpoint (the krea-2 raw-lane law): the
      // family view spells the distilled unet; this variant's cell
      // downloads the base weights, and the lane override points the
      // run's UNETLoader at them.
      "lane_inputs": {
        "unet": "flux-2-klein-base-4b.safetensors"
      },
      "cells": [
        {
          "quant": "bf16",
          "label": "BF16",
          "route": "flux-klein-base",
          "vram_peak_gb": 16,
          "artifact": {
            "source_url": "https://huggingface.co/Comfy-Org/vae-text-encorder-for-flux-klein-4b/resolve/main/split_files/diffusion_models/flux-2-klein-base-4b.safetensors",
            "size_bytes": 7751105712,
            "sha256": "9c5fed22b76baea749d88fc2abe3ad53245e7b21a0d353a762665eea00043b92",
            "dest_root": "COMFYUI_ROOT",
            "dest_sub": "diffusion_models",
            "size_hint_gb": 7.8
          }
        }
      ]
    },
    // THE RECIPE ROWS (2026-10-22, the 006-tail cure — the operator
    // supplied the official sources). One verified Klein-native
    // preset the template marriages do NOT already ride: BFL's own
    // base defaults (flux2 src/flux2/util.py, flux.2-klein-base-4b:
    // guidance 4.0, num_steps 50, fixed_params {}) differ from the
    // ComfyUI template's 20/5 the base route marries, and the stamps
    // sit inside the card's declared bounds (steps [1,100], cfg
    // [1,20]) and the widened base envelope. The distilled tier has
    // NO such second recipe — BFL pins it fixed (guidance 1.0,
    // num_steps 4, fixed_params {guidance, num_steps}), exactly what
    // `defaults` above already rides; stamping it again would
    // duplicate the axis the retired Default row was condemned for.
    {
      "id": "author-base",
      "label": "Author base recipe",
      "hint": "BFL's own base defaults — 50 steps, guidance 4.0 (flux.2-klein-base-4b; fixed_params {}). Pick the Base variant with it.",
      "group": "Recipe",
      "order": 0,
      "wire_defaults": {
        "steps": 50,
        "cfg": 4
      },
      "cells": [],
    },
    {
      "id": "default",
      "label": "Default",
      "hint": "The family default — no extra stamps; a fresh card lands here.",
      "group": "Recipe",
      "order": 1,
      "cells": [],
    }
  ],
  // THE RECIPE GROUP (2026-10-22, the 006-tail cure — see the rows'
  // comment in `variants` above): the group returns with the first
  // verified Klein-native preset.
  "variant_groups": [
    {
      "id": "Variant",
      "label": "Variant",
      "tooltip": "The official template tiers — Distilled 4-Step (cfg 1, fast, low-VRAM) or Base 20-Step (cfg 5, encoded negative, higher fidelity).",
    },
    {
      "id": "Quant",
      "label": "Quant",
      "tooltip": "The download tier — BF16 (7.8GB) on both variants; the gated BFL fp8/nvfp4 quants are not anonymously authorable.",
    },
    {
      "id": "Recipe",
      "label": "Recipe",
      "tooltip": "One-click recipes — patch-only rows that stamp picks onto the card; Default stamps nothing. The author recipe wants the Base variant.",
      "default": "default"
    }
  ],
  "has_agent": true,
  "has_inference": true,
  // THE LANE SURFACE (the edit-2511 precedent — the DECL is the one
  // truth the face is judged against): exactly the knobs the create
  // card serves. NO reference seat — the create card takes no
  // reference inputs (operator ruling, 2026-10-11); a stated
  // reference_images key refuses at the gated resolve as an unknown
  // param, and the face-lane unity wall reds the moment a served knob
  // is missing from this list.
  "params": [
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
  "lane_inputs": {
    "clip_type": "flux2",
    // THE LATENT CLASS (the z-image/anima precedent — data, never a
    // family-id switch): the flux2 canvas node the every-address wall
    // expects the graph to build from this row.
    "latent_node": "EmptyFlux2LatentImage",
    // THE LANE BRANCH KEY (the text_encode_node precedent — data,
    // never a family-id switch): the stock CLIPTextEncode over the
    // flux2 multimodal tokenizer; the negative arm branches on the
    // stated prompt (blank → ConditioningZeroOut, the distilled
    // template's own unconditional).
    "text_encode_node": "CLIPTextEncode",
    "text_encoder": "qwen_3_4b.safetensors",
    "unet": "flux-2-klein-4b.safetensors",
    "vae": "flux2-vae.safetensors"
  },
  // THE REQUIRED WORD, STATED (the qwen-img-21 precedent): every
  // image lane states WHAT the picture is — the bench-write door
  // refuses an empty prompt in the field's voice before compose.
  "relations": {
    "required": [
      {
        "fields": ["prompt"],
        "cure": "every image lane states WHAT the picture is — write the prompt",
      },
    ],
  },
  // THE FAMILY DOOR (the atom vocabulary): the t2i action's facts
  // parse runs over this row and every variant merge AT REGISTRATION
  // — a drifted lane_input (a renamed latent class, a bad variant
  // override) refuses at boot in the door's own voice, never at
  // first compose.
  "actions": [t2i],

};

export const family: Plugin = {
  name: "family-flux-klein",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};

// The family's offered actions (the atom vocabulary): the t2i
// segment the image-gen card binds. The card imports this beside the
// DECL — the family's whole offer, one face.
export { t2i, parseT2IFacts, type T2IFacts, type T2IParams } from "./actions.ts";

// The Loader-row face: DSH loads plugin rows by bare specifier and
// unwraps `exports.default ?? exports` (vendor/cordis_plugins/loader
// unwrapExports) — the default export IS the row-loadable plugin. The
// named `family` stays the library face (engine loadFamilies).
export { family as default };
