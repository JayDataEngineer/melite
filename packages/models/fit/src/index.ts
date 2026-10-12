// models/fit/src/index.ts — the fit family declaration
// (the atom vocabulary, stroke 4): a WEIGHTLESS verb family — the
// fit-seat backend the meld flows route to. The 2026-09-16
// retirement killed the fit CARD; this family owns the nodes
// without a card face (the retirement order's sanctioned seam).
// This file IS the family's truth — a change here is a family
// change, nothing else moves.
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
// The ModelsService type import is LOAD-BEARING: its module
// augmentation declares ctx.models on Context (typing the
// registerFamily call below) — removing it fails tsc.
import type { ModelsService } from "@melite/comfyui-cordis/models-service";
import type { ModelDecl } from "@melite/comfyui-cordis/model-contract";
import { seat } from "./actions.ts";

export const DECL: ModelDecl = {
  "id": "fit",
  "label": "Fit (meld seat)",
  "description": "Analytic bone-scale fitting — the fit-seat verb's node family (weightless: no checkpoint loads).",
  // no engine (absent = comfyui, the contract default); no form,
  // unoffered: a verb family serves no bench surface (the
  // weightless-verb precedent) — the flows' family-action stages are
  // its only riders.
  "unoffered": true,
  "genre": "3d",
  // no Recipe `default` variant row: the served siblings carry it
  // because their cards ride quant/recipe lanes; this family has no
  // card, so no lane ever resolves a variant — the standard row
  // exists only to give the DECL a non-empty truth.
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "fit",
      "cells": [
        {
          "quant": "native",
          "label": "Native (weightless)",
          "route": "fit",
        },
      ],
    },
  ],
  "variant_groups": [
    {
      "id": "Variant",
      "label": "Variant",
    },
  ],
  // the seat action the fit-seat flow routes to (the fit-seat
  // verb's backend — family-owned nodes; SubActionMod law).
  "actions": [seat],
};

export const family: Plugin = {
  name: "family-fit",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};

export { seat } from "./actions.ts";
