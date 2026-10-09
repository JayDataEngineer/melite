---
description: Basic Resize family declaration, a weightless unoffered image-lane registry row.
kind: package-library
---

# @melite/models-basic_resize

The Basic Resize family — an image-lane family declaration with a weightless cell, no actions, no defaults, and no description of its own (the DECL's description field is empty). The `family-basic_resize` plugin registers the row with the models service; nothing else rides it.

Consumers that resolve the basic_resize route read the row; the resize behavior the name suggests lives with those consumers, not in this package.

## Declaration

`src/index.ts` declares the DECL and the `family-basic_resize` plugin. There is no actions module and no mods tree.

## Model Experience

#### What the model sees

None — the package contributes no model-visible input. The DECL registers in the models registry only; the catalog emission serves it no row (only offered comfyui-engine families serve), and it registers no session events and writes no prompt segments.

#### Token effect

Zero-direct token effect — the package registers a model family; it writes no prompt text into any model request.

#### KV Cache effect

Independent — the package contributes no persistent prompt prefix, so registering or removing the family invalidates nothing cached.

## Known Limitations and Deferred Work

- **Empty DECL description** — the family carries no description, so the registry row explains nothing about what the family does.
- **Unoffered** — the family serves no catalog row; it resolves as a registry route only.
- **Declaration only** — no actions, defaults, mods, or provisions ride the DECL; behavior attributed to the name lives elsewhere.
