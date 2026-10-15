// families/other/gem-soma.ts — the gem-soma family declaration
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
import { rig } from "./actions.ts";

export const DECL: ModelDecl = {
  "id": "gem-soma",
  "form": "form_edit",
  "label": "SOMA",
  "description": "GEM-X SOMA pose estimation and retargeting.",
  "engine": "comfyui",
  "unoffered": true,
  // No defaults: the declared-plane door's catch (2026-10-12) — the
  // t2i transcription block (scheduler/width/height/steps/sampler/cfg)
  // composed nothing on this mesh family; the SOMA lane owns its own
  // sampler truth.
  "source": {
    "type": "",
    "repo_id": "nvidia/soma-x",
    "note": ""
  },
  "genre": "other",
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "gem-soma",
      "cells": [
        {
          "quant": "native",
          "label": "Native (weightless)",
          "route": "gem-soma",
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
  // the rig action the rig card binds for its `auto` mode (the
  // SOMA-77 weight transfer — the weights ship in the autorig pack).
  "actions": [rig],
};

export const family: Plugin = {
  name: "family-gem-soma",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};

export { rig } from "./actions.ts";

// The Loader-row face: DSH loads plugin rows by bare specifier and
// unwraps `exports.default ?? exports` (vendor/cordis_plugins/loader
// unwrapExports) — the default export IS the row-loadable plugin. The
// named `family` stays the library face (engine loadFamilies).
export { family as default };
