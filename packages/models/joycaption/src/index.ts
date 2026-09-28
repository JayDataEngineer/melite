// families/image/joycaption.ts — the joycaption family declaration
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
  "id": "joycaption",
  "form": "form_tagger",
  "label": "JoyCaption",
  "description": "Stylized natural-language image captioning (JoyCaption beta-one, 8B VLM) — descriptive / SD-prompt / MJ / booru-list templates for recreating images in FLUX / Ideogram / image-edit.",
  "engine": "comfyui",
  "defaults": {
    "checkpoint": "fancyfeast/llama-joycaption-beta-one-hf-llava",
    "caption_type": "Descriptive",
    "caption_length": "long",
    "extra_option": ""
  },
  "genre": "image",
  // ONE Standard variant, deliberately (the freeform upstream):
  // JJC_DownloadAndLoadJoyCaptionModel takes ANY repo id or local
  // path (unbounded — no closed set to enumerate as variants), so
  // the family default stamps beta-one and custom paths ride
  // explicit params. A variant per checkpoint here would be a lie
  // of closedness.
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "joycaption",
      "cells": [
        {
          "quant": "f32",
          "label": "F32",
          "route": "joycaption",
          "vram_peak_gb": 20,
        }
      ]
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

};

export const family: Plugin = {
  name: "family-joycaption",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
