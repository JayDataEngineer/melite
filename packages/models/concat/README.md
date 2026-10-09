---
description: Media Merge family declaration, a weightless unoffered video-lane registry row.
kind: package-library
---

# @melite/models-concat

The Media Merge family — a video-lane family declaration (form_media_merge) with a weightless cell, no actions, no defaults, and no description of its own (the DECL's description field is empty). The `family-concat` plugin registers the row with the models service; nothing else rides it.

Consumers that resolve the concat route read the row; the merge behavior the name suggests lives with those consumers, not in this package.

## Declaration

`src/index.ts` declares the DECL and the `family-concat` plugin. There is no actions module and no mods tree.

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
