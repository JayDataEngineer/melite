// families/image/wd14.ts — the wd14 family declaration
// (generated 2026-09-08 from the frozen registry + facts, then
// hand-owned: this file IS the family's truth — a change here is a
// family change, nothing else moves).
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import { ModelsServiceFace } from '@melite/comfyui-card-kit/service-faces'
import type { ModelDecl } from '@melite/comfyui-card-kit/model-contract'
import { tag } from "./actions.ts";

export const DECL: ModelDecl = {
  "id": "wd14",
  "form": "form_tagger",
  "label": "WD14 Tagger",
  "description": "Booru keyword tagger (WaifuDiffusion v3 lineage) — comma-separated Danbooru tags for NovelAI / Pony / Illustrious recreation. Light ONNX lane, first run downloads weights.",
  "engine": "comfyui",
  "defaults": {
    "checkpoint": "wd-v1-4-moat-tagger-v2",
    "threshold": 0.35,
    "character_threshold": 0.85,
    "exclude_tags": "",
    "replace_underscore": false,
    "trailing_comma": false
  },
  "genre": "image",
  // THE REQUIRED DEFAULTS (operator contract 2026-11-07): the
  // user-provided seat(s) — the compose caller provides them. No
  // variant-class rows: this family's served face exposes no
  // steps+cfg pair (the census's surface-derived carve).
  "required_defaults": [
    { "name": "input_image", "class": "user" }
  ],
  // THE WEIGHTS RAIL (2026-09-22 — the variant rail IS the
  // checkpoint picker; the tagger schema declares no weights knob):
  // one variant per live WD14Tagger|pysssss `model` name
  // (live-pinned off the engine's object_info — the node refuses
  // unknown names at queue time, the rail refuses them at selection
  // time via the unknown-variant refusal). Each variant stamps its
  // name (resolver_defaults — the stamp overlay injects it
  // absent-keys-only); moat rides FIRST (the family default —
  // a fresh card lands here). vram_peak_gb rides ONLY moat's cell
  // (the family's measured light-ONNX figure); unmeasured
  // backbones omit it (null = unknown, never a guessed number).
  // THE WD14 PROVISIONS (burn d, 2026-10-26 — the operator: "HOW
  // DOES models without links go all green?"): one onnx+csv
  // pair per variant, single-file rows off the node's OWN upstream
  // map (pysssss.json — SmilingWolf/<repo>), the csv digests
  // estate-minted off the fetched bytes (git storage carries no LFS
  // oid). The folder rides the wd14_tagger mount (store wd14/) —
  // the flat renamed pair the node's loader reads.
  "provisions": [
    {
      "name": "wd-v1-4-moat-tagger-v2.onnx",
      "url": "https://huggingface.co/SmilingWolf/wd-v1-4-moat-tagger-v2/resolve/main/model.onnx",
      "folder": "wd14_tagger",
      "sha256": "b8cef913be4c9e8d93f9f903e74271416502ce0b4b04df0ff1e2f00df488aa03",
      "size_bytes": 326197340,
    },
    {
      "name": "wd-v1-4-moat-tagger-v2.csv",
      "url": "https://huggingface.co/SmilingWolf/wd-v1-4-moat-tagger-v2/resolve/main/selected_tags.csv",
      "folder": "wd14_tagger",
      "sha256": "8c8750600db36233a1b274ac88bd46289e588b338218c2e4c62bbc9f2b516368",
      "size_bytes": 253906,
    },
    {
      "name": "wd-v1-4-convnext-tagger-v2.onnx",
      "url": "https://huggingface.co/SmilingWolf/wd-v1-4-convnext-tagger-v2/resolve/main/model.onnx",
      "folder": "wd14_tagger",
      "sha256": "71f06ecb7b9df81d8f271da4d43997ea2ed363cdac29aa64fcb256c9631e656a",
      "size_bytes": 387820405,
    },
    {
      "name": "wd-v1-4-convnext-tagger-v2.csv",
      "url": "https://huggingface.co/SmilingWolf/wd-v1-4-convnext-tagger-v2/resolve/main/selected_tags.csv",
      "folder": "wd14_tagger",
      "sha256": "8c8750600db36233a1b274ac88bd46289e588b338218c2e4c62bbc9f2b516368",
      "size_bytes": 253906,
    },
    {
      "name": "wd-v1-4-convnextv2-tagger-v2.onnx",
      "url": "https://huggingface.co/SmilingWolf/wd-v1-4-convnextv2-tagger-v2/resolve/main/model.onnx",
      "folder": "wd14_tagger",
      "sha256": "e91daa19cd9e8725125b7d70702d1560855fb687f8d8c4218eddaa821f41834a",
      "size_bytes": 388479878,
    },
    {
      "name": "wd-v1-4-convnextv2-tagger-v2.csv",
      "url": "https://huggingface.co/SmilingWolf/wd-v1-4-convnextv2-tagger-v2/resolve/main/selected_tags.csv",
      "folder": "wd14_tagger",
      "sha256": "8c8750600db36233a1b274ac88bd46289e588b338218c2e4c62bbc9f2b516368",
      "size_bytes": 253906,
    },
    {
      "name": "wd-v1-4-vit-tagger-v2.onnx",
      "url": "https://huggingface.co/SmilingWolf/wd-v1-4-vit-tagger-v2/resolve/main/model.onnx",
      "folder": "wd14_tagger",
      "sha256": "8a21cadd1f88a095094cafbffe3028c3cc3d97f4d58c54344c5994bcf48e24ac",
      "size_bytes": 373287959,
    },
    {
      "name": "wd-v1-4-vit-tagger-v2.csv",
      "url": "https://huggingface.co/SmilingWolf/wd-v1-4-vit-tagger-v2/resolve/main/selected_tags.csv",
      "folder": "wd14_tagger",
      "sha256": "8c8750600db36233a1b274ac88bd46289e588b338218c2e4c62bbc9f2b516368",
      "size_bytes": 253906,
    },
    {
      "name": "wd-v1-4-swinv2-tagger-v2.onnx",
      "url": "https://huggingface.co/SmilingWolf/wd-v1-4-swinv2-tagger-v2/resolve/main/model.onnx",
      "folder": "wd14_tagger",
      "sha256": "04ec04fdf7db74b4fed7f4b52f52e04dec4dbad9e4d88d2d178f334079a29fde",
      "size_bytes": 455409152,
    },
    {
      "name": "wd-v1-4-swinv2-tagger-v2.csv",
      "url": "https://huggingface.co/SmilingWolf/wd-v1-4-swinv2-tagger-v2/resolve/main/selected_tags.csv",
      "folder": "wd14_tagger",
      "sha256": "8c8750600db36233a1b274ac88bd46289e588b338218c2e4c62bbc9f2b516368",
      "size_bytes": 253906,
    },
    {
      "name": "wd-v1-4-convnext-tagger.onnx",
      "url": "https://huggingface.co/SmilingWolf/wd-v1-4-convnext-tagger/resolve/main/model.onnx",
      "folder": "wd14_tagger",
      "sha256": "b7d7c9923e0056a2def0f4418df01a1274467b3da8480f146b851289257734de",
      "size_bytes": 377430976,
    },
    {
      "name": "wd-v1-4-convnext-tagger.csv",
      "url": "https://huggingface.co/SmilingWolf/wd-v1-4-convnext-tagger/resolve/main/selected_tags.csv",
      "folder": "wd14_tagger",
      "sha256": "898dbc30bec9a5173b5531fc9b3d6058ea79182832ec4a102facc33cae7669cd",
      "size_bytes": 173829,
    },
    {
      "name": "wd-v1-4-vit-tagger.onnx",
      "url": "https://huggingface.co/SmilingWolf/wd-v1-4-vit-tagger/resolve/main/model.onnx",
      "folder": "wd14_tagger",
      "sha256": "22e88a3226e427998fdf669bdbd035ee7040f3229796dd66ec35b8dd90e852b5",
      "size_bytes": 365487723,
    },
    {
      "name": "wd-v1-4-vit-tagger.csv",
      "url": "https://huggingface.co/SmilingWolf/wd-v1-4-vit-tagger/resolve/main/selected_tags.csv",
      "folder": "wd14_tagger",
      "sha256": "898dbc30bec9a5173b5531fc9b3d6058ea79182832ec4a102facc33cae7669cd",
      "size_bytes": 173829,
    },
    {
      "name": "wd-convnext-tagger-v3.onnx",
      "url": "https://huggingface.co/SmilingWolf/wd-convnext-tagger-v3/resolve/main/model.onnx",
      "folder": "wd14_tagger",
      "sha256": "1b8a7abf13d9b8368267df47501d523789c4aeae66b2296ad98483239dfa32eb",
      "size_bytes": 394990732,
    },
    {
      "name": "wd-convnext-tagger-v3.csv",
      "url": "https://huggingface.co/SmilingWolf/wd-convnext-tagger-v3/resolve/main/selected_tags.csv",
      "folder": "wd14_tagger",
      "sha256": "298633d94d0031d2081c0893f29c82eab7f0df00b08483ba8f29d1e979441217",
      "size_bytes": 308468,
    },
    {
      "name": "wd-swinv2-tagger-v3.onnx",
      "url": "https://huggingface.co/SmilingWolf/wd-swinv2-tagger-v3/resolve/main/model.onnx",
      "folder": "wd14_tagger",
      "sha256": "e6774bff34d43bd49f75a47db4ef217dce701c9847b546523eb85ff6dbba1db1",
      "size_bytes": 467460978,
    },
    {
      "name": "wd-swinv2-tagger-v3.csv",
      "url": "https://huggingface.co/SmilingWolf/wd-swinv2-tagger-v3/resolve/main/selected_tags.csv",
      "folder": "wd14_tagger",
      "sha256": "298633d94d0031d2081c0893f29c82eab7f0df00b08483ba8f29d1e979441217",
      "size_bytes": 308468,
    },
    {
      "name": "wd-vit-tagger-v3.onnx",
      "url": "https://huggingface.co/SmilingWolf/wd-vit-tagger-v3/resolve/main/model.onnx",
      "folder": "wd14_tagger",
      "sha256": "35f23693620b668f4d53fd3c62bf65e40af739bc52c7eb0fbc49258b58d065b6",
      "size_bytes": 378536310,
    },
    {
      "name": "wd-vit-tagger-v3.csv",
      "url": "https://huggingface.co/SmilingWolf/wd-vit-tagger-v3/resolve/main/selected_tags.csv",
      "folder": "wd14_tagger",
      "sha256": "298633d94d0031d2081c0893f29c82eab7f0df00b08483ba8f29d1e979441217",
      "size_bytes": 308468,
    },
    {
      "name": "wd-eva02-large-tagger-v3.onnx",
      "url": "https://huggingface.co/SmilingWolf/wd-eva02-large-tagger-v3/resolve/main/model.onnx",
      "folder": "wd14_tagger",
      "sha256": "9e768793060c7939b277ccb382783e8670e8a042d29d77aa736be0c8cc898bfc",
      "size_bytes": 1260435999,
    },
    {
      "name": "wd-eva02-large-tagger-v3.csv",
      "url": "https://huggingface.co/SmilingWolf/wd-eva02-large-tagger-v3/resolve/main/selected_tags.csv",
      "folder": "wd14_tagger",
      "sha256": "298633d94d0031d2081c0893f29c82eab7f0df00b08483ba8f29d1e979441217",
      "size_bytes": 308468,
    },
  ],
  // THE DECLARED HOME (the lane-presence cure): both backing files
  // live in the wd14_tagger mount's store folder.
  "lane_homes": { "onnx": "wd14", "csv": "wd14" },
  "variants": [
    {
      "id": "wd-v1-4-moat-tagger-v2",
      "label": "wd-v1-4-moat-tagger-v2",
      "group": "Variant",
      "route": "wd14",
      "resolver_defaults": { "checkpoint": "wd-v1-4-moat-tagger-v2" },
      // THE BACKING FILES (burn d, 2026-10-26): the node loads
      // engine-side from the wd14_tagger folder — wd-v1-4-moat-tagger-v2.onnx +
      // wd-v1-4-moat-tagger-v2.csv (the node's own download pair, renamed flat).
      // Declared here so the run gate probes them at press and the
      // provisions rows fetch them (no more green-by-luck).
      "lane_inputs": { "onnx": "wd-v1-4-moat-tagger-v2.onnx", "csv": "wd-v1-4-moat-tagger-v2.csv" },
      "cells": [
        {
          "quant": "f32",
          "label": "F32",
          "vram_peak_gb": 4,
        }
      ]
    },
    {
      "id": "wd-v1-4-convnext-tagger-v2",
      "label": "wd-v1-4-convnext-tagger-v2",
      "group": "Variant",
      "resolver_defaults": { "checkpoint": "wd-v1-4-convnext-tagger-v2" },
      // THE BACKING FILES (burn d, 2026-10-26): the node loads
      // engine-side from the wd14_tagger folder — wd-v1-4-convnext-tagger-v2.onnx +
      // wd-v1-4-convnext-tagger-v2.csv (the node's own download pair, renamed flat).
      // Declared here so the run gate probes them at press and the
      // provisions rows fetch them (no more green-by-luck).
      "lane_inputs": { "onnx": "wd-v1-4-convnext-tagger-v2.onnx", "csv": "wd-v1-4-convnext-tagger-v2.csv" },
      "cells": [{ "quant": "f32", "label": "F32" }],
    },
    {
      "id": "wd-v1-4-convnextv2-tagger-v2",
      "label": "wd-v1-4-convnextv2-tagger-v2",
      "group": "Variant",
      "resolver_defaults": { "checkpoint": "wd-v1-4-convnextv2-tagger-v2" },
      // THE BACKING FILES (burn d, 2026-10-26): the node loads
      // engine-side from the wd14_tagger folder — wd-v1-4-convnextv2-tagger-v2.onnx +
      // wd-v1-4-convnextv2-tagger-v2.csv (the node's own download pair, renamed flat).
      // Declared here so the run gate probes them at press and the
      // provisions rows fetch them (no more green-by-luck).
      "lane_inputs": { "onnx": "wd-v1-4-convnextv2-tagger-v2.onnx", "csv": "wd-v1-4-convnextv2-tagger-v2.csv" },
      "cells": [{ "quant": "f32", "label": "F32" }],
    },
    {
      "id": "wd-v1-4-vit-tagger-v2",
      "label": "wd-v1-4-vit-tagger-v2",
      "group": "Variant",
      "resolver_defaults": { "checkpoint": "wd-v1-4-vit-tagger-v2" },
      // THE BACKING FILES (burn d, 2026-10-26): the node loads
      // engine-side from the wd14_tagger folder — wd-v1-4-vit-tagger-v2.onnx +
      // wd-v1-4-vit-tagger-v2.csv (the node's own download pair, renamed flat).
      // Declared here so the run gate probes them at press and the
      // provisions rows fetch them (no more green-by-luck).
      "lane_inputs": { "onnx": "wd-v1-4-vit-tagger-v2.onnx", "csv": "wd-v1-4-vit-tagger-v2.csv" },
      "cells": [{ "quant": "f32", "label": "F32" }],
    },
    {
      "id": "wd-v1-4-swinv2-tagger-v2",
      "label": "wd-v1-4-swinv2-tagger-v2",
      "group": "Variant",
      "resolver_defaults": { "checkpoint": "wd-v1-4-swinv2-tagger-v2" },
      // THE BACKING FILES (burn d, 2026-10-26): the node loads
      // engine-side from the wd14_tagger folder — wd-v1-4-swinv2-tagger-v2.onnx +
      // wd-v1-4-swinv2-tagger-v2.csv (the node's own download pair, renamed flat).
      // Declared here so the run gate probes them at press and the
      // provisions rows fetch them (no more green-by-luck).
      "lane_inputs": { "onnx": "wd-v1-4-swinv2-tagger-v2.onnx", "csv": "wd-v1-4-swinv2-tagger-v2.csv" },
      "cells": [{ "quant": "f32", "label": "F32" }],
    },
    {
      "id": "wd-v1-4-convnext-tagger",
      "label": "wd-v1-4-convnext-tagger",
      "group": "Variant",
      "resolver_defaults": { "checkpoint": "wd-v1-4-convnext-tagger" },
      // THE BACKING FILES (burn d, 2026-10-26): the node loads
      // engine-side from the wd14_tagger folder — wd-v1-4-convnext-tagger.onnx +
      // wd-v1-4-convnext-tagger.csv (the node's own download pair, renamed flat).
      // Declared here so the run gate probes them at press and the
      // provisions rows fetch them (no more green-by-luck).
      "lane_inputs": { "onnx": "wd-v1-4-convnext-tagger.onnx", "csv": "wd-v1-4-convnext-tagger.csv" },
      "cells": [{ "quant": "f32", "label": "F32" }],
    },
    {
      "id": "wd-v1-4-vit-tagger",
      "label": "wd-v1-4-vit-tagger",
      "group": "Variant",
      "resolver_defaults": { "checkpoint": "wd-v1-4-vit-tagger" },
      // THE BACKING FILES (burn d, 2026-10-26): the node loads
      // engine-side from the wd14_tagger folder — wd-v1-4-vit-tagger.onnx +
      // wd-v1-4-vit-tagger.csv (the node's own download pair, renamed flat).
      // Declared here so the run gate probes them at press and the
      // provisions rows fetch them (no more green-by-luck).
      "lane_inputs": { "onnx": "wd-v1-4-vit-tagger.onnx", "csv": "wd-v1-4-vit-tagger.csv" },
      "cells": [{ "quant": "f32", "label": "F32" }],
    },
    {
      "id": "wd-convnext-tagger-v3",
      "label": "wd-convnext-tagger-v3",
      "group": "Variant",
      "resolver_defaults": { "checkpoint": "wd-convnext-tagger-v3" },
      // THE BACKING FILES (burn d, 2026-10-26): the node loads
      // engine-side from the wd14_tagger folder — wd-convnext-tagger-v3.onnx +
      // wd-convnext-tagger-v3.csv (the node's own download pair, renamed flat).
      // Declared here so the run gate probes them at press and the
      // provisions rows fetch them (no more green-by-luck).
      "lane_inputs": { "onnx": "wd-convnext-tagger-v3.onnx", "csv": "wd-convnext-tagger-v3.csv" },
      "cells": [{ "quant": "f32", "label": "F32" }],
    },
    {
      "id": "wd-swinv2-tagger-v3",
      "label": "wd-swinv2-tagger-v3",
      "group": "Variant",
      "resolver_defaults": { "checkpoint": "wd-swinv2-tagger-v3" },
      // THE BACKING FILES (burn d, 2026-10-26): the node loads
      // engine-side from the wd14_tagger folder — wd-swinv2-tagger-v3.onnx +
      // wd-swinv2-tagger-v3.csv (the node's own download pair, renamed flat).
      // Declared here so the run gate probes them at press and the
      // provisions rows fetch them (no more green-by-luck).
      "lane_inputs": { "onnx": "wd-swinv2-tagger-v3.onnx", "csv": "wd-swinv2-tagger-v3.csv" },
      "cells": [{ "quant": "f32", "label": "F32" }],
    },
    {
      "id": "wd-vit-tagger-v3",
      "label": "wd-vit-tagger-v3",
      "group": "Variant",
      "resolver_defaults": { "checkpoint": "wd-vit-tagger-v3" },
      // THE BACKING FILES (burn d, 2026-10-26): the node loads
      // engine-side from the wd14_tagger folder — wd-vit-tagger-v3.onnx +
      // wd-vit-tagger-v3.csv (the node's own download pair, renamed flat).
      // Declared here so the run gate probes them at press and the
      // provisions rows fetch them (no more green-by-luck).
      "lane_inputs": { "onnx": "wd-vit-tagger-v3.onnx", "csv": "wd-vit-tagger-v3.csv" },
      "cells": [{ "quant": "f32", "label": "F32" }],
    },
    {
      "id": "wd-eva02-large-tagger-v3",
      "label": "wd-eva02-large-tagger-v3",
      "group": "Variant",
      "resolver_defaults": { "checkpoint": "wd-eva02-large-tagger-v3" },
      // THE BACKING FILES (burn d, 2026-10-26): the node loads
      // engine-side from the wd14_tagger folder — wd-eva02-large-tagger-v3.onnx +
      // wd-eva02-large-tagger-v3.csv (the node's own download pair, renamed flat).
      // Declared here so the run gate probes them at press and the
      // provisions rows fetch them (no more green-by-luck).
      "lane_inputs": { "onnx": "wd-eva02-large-tagger-v3.onnx", "csv": "wd-eva02-large-tagger-v3.csv" },
      "cells": [{ "quant": "f32", "label": "F32" }],
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
    }
  ],
  // THE REQUIRED WORD, STATED (2026-10-10, the DECL audit's gap 4 —
  // the GAP-7 shape on the legacy lanes): the card's compose seat has
  // refused this field since the merge, imperatively, while the bench
  // admitted the same draft — a state the form could build and the run
  // refused. Stated as the law, the bench-write door refuses it first,
  // in the field's voice (the tts precedent: this is the one relation
  // word that deliberately overrides the blank tolerance, and this
  // field is exactly the one where "still being typed" composes
  // nothing).
  "relations": {
    "required": [
      {
        "fields": ["input_image"],
        "cure": "a tagger inverts an image — nothing to tag is a refusal; state the image",
      },
    ],
  },

  // THE LANE SURFACE (the z-image precedent): exactly the knobs the
  // tagger card serves — the face the four tagger families share.
  "params": [
    "input_image",
    "threshold", "character_threshold",
    "exclude_tags", "replace_underscore", "trailing_comma",
    "add_tag", "remove_tag",
    "caption_task", "caption_type", "caption_length", "extra_option",
  ],

  // THE FAMILY'S DECLARED ACTIONS (the atom vocabulary, stroke 3):
  // the tagger card binds this segment through ACTION_BINDINGS —
  // the admission gate runs the (vacuous, weightless) facts parse
  // at registration.
  "actions": [tag],

};

export const family: Plugin = {
  name: "family-wd14",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};

// The weightless door rides the kit spellings (DRY sweep C2, 2026-10-18);
// the old Tag* aliases are re-served for the family's consumers.
export { tag } from "./actions.ts";
export { parseWeightlessFacts as parseTagFacts, type WeightlessFacts as TagFacts, type WeightlessParams as TagParams } from "@melite/comfyui-card-kit";

// The Loader-row face: DSH loads plugin rows by bare specifier and
// unwraps `exports.default ?? exports` (vendor/cordis_plugins/loader
// unwrapExports) — the default export IS the row-loadable plugin. The
// named `family` stays the library face (engine loadFamilies).
export { family as default };
