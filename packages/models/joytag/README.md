---
description: Danbooru-style image tagger family — the CXH_JoyTag graph, weightless facts, tag text saved under the run directory.
kind: package-library
---

# joytag

joytag registers one model family: a Danbooru-style image tagger (the JoyTag lineage), form `form_tagger`, genre `image`, on the ComfyUI engine. The package contributes one action — `tag` — which composes LoadImage → CXH_JoyTag → taggerSaveText and writes the tag text under `<run>/tags`.

## Weights and variants

One variant, `standard` (group Variant, F32 cell, 4 GB VRAM peak), with a single provision: `model.safetensors` (366 MB, from the fancyfeast/joytag release). The action's facts door is deliberately weightless: the checkpoint name rides the variant rail's stamped weight, so there is nothing per-row to parse, and the family carries no recipe rows.

## The tag action

Params: `input_image` (required — the family's one relation: an image to tag), `threshold` (default 0.2), `add_tag` and `remove_tag` (defaults empty — comma-separated vocabulary hints passed through to the tagger node). Runs save the tag text under `<run>/tags`.

The DECL re-exports the card kit's tag-side facts helpers, so a card binding this action shares the same closed shapes the kit validates.

## Model Experience

### Request context and condition

A run needs one image and, optionally, a threshold and vocabulary tune. This is a classifier lane, not a generator: no seed, steps, or sampler knobs exist on this family — the DECL declares none and the build reads none.

#### What the model sees

The graph the build composes is three nodes: LoadImage (or the upstream `$spell` tensor, riding node inputs verbatim), CXH_JoyTag with the threshold and the add/remove vocabulary, taggerSaveText. The weights file is the variant rail's `model.safetensors`.

#### Token effect

Zero-direct: the action composes an engine graph, not a token stream. No value this family declares is measured in model tokens.

#### KV Cache effect

Independent: the tagger contributes no shared context; each run is self-contained.

## Known Limitations and Deferred Work

- **Single-checkpoint family** — one provision, one variant; no quant tiers are declared, so heavy VRAM pressure has no lighter cell to fall back to.
- **Weightless facts door** — the door reads nothing off the resolved row; a wrong checkpoint name surfaces only at engine validation, never at compose time.
- **Live behavior unobserved** — thresholds and vocabulary behavior are documented from the DECL and node inputs, not verified against the running model.

Exports: the plugin root, `./package.json`.
