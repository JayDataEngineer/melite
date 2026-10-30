---
description: Caption-and-tag card over four tagger families — wd14, joytag, florence2, and joycaption.
kind: package-library
---

# @melite/image-tagger

`@melite/image-tagger` is the image captioning card (`id: 'tagger'`): one image in, a caption or tag list out as a `tags.txt` run artifact. Four families board, each through its own declared `tag` action: `wd14`, `joytag`, `florence2`, and `joycaption`. The lane is weightless — models load, nothing else computes. The package's single source module is the root face the cardPackages SSOT composes (`@melite/image-tagger`), which the manifest spells again as the explicit `./card` door; there is no tool or client face.

## Contract

- `.` — the card definition and registration (the root module carries `inject = ['comfyui']`). Schema: `input_image` (required); `threshold` — the general-tag confidence floor; `character_threshold` — the person-identity floor, deliberately higher; and four defaultless optionals backfilled per family: `exclude_tags` (wd14), `add_tag`/`remove_tag` (joytag), and `extra_option` (joycaption). Ride keys carry NO `.default` — the model picks the floor by default, the caller overrides explicitly. The per-family requirement map is declared here by augmenting `CardDefinition` (`requiresByFamily`), and the SaveText tail plus the caption vocabularies (`TAGGER_CAPTION_TASKS`, `TAGGER_CAPTION_TYPES`, `TAGGER_CAPTION_LENGTHS`, `TAGGER_EXTRA_OPTIONS`) come from `@melite/comfyui-card-kit`. There is NO weights knob — the Model/Variant/Quant rail is the only picker, and validation stamps `resolver_defaults` (absent keys only).
- `./card` — the same card module as the root face, re-exported as the explicit named door (one file, two specifiers).
- `./package.json` — the manifest.

## Model Experience

### Request context and condition

A run conditions the tagger graph only when the card composes; no agent tool face ships.

#### What the model sees

The active tagger model receives `input_image` plus the gated thresholds and the family's tag knobs as graph inputs.

#### Token effect

zero-direct — the package contributes no prompt or schema to any language-model context.

#### KV Cache effect

independent — nothing here appends to or reshapes a session cache.

## Known Limitations and Deferred Work

- **No weights knob** — the variant rail owns checkpoints; the 2026-09-22 weights-law removal is total.
- **Per-family key subsets** — each optional tag key backfills on exactly one family; asking a key of the wrong family refuses rather than ignoring.
