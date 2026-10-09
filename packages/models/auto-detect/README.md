---
description: Auto Detect family declaration, a weightless unoffered row for automatic model and conditioning selection.
kind: package-library
---

# @melite/models-auto-detect

The Auto Detect family — automatically selects the model and conditioning for a given input (the DECL's own description), form_detect, genre image. The declaration is the whole package: an unoffered registry row with a weightless cell, no actions, no defaults, no mods, no provisions.

The `family-auto_detect` plugin registers the DECL with the models service; nothing else rides it. Consumers that resolve the auto-detect route read the row; every behavior the name suggests lives with those consumers, not in this package.

## Declaration

`src/index.ts` declares the DECL and the `family-auto_detect` plugin. There is no actions module and no mods tree.

## Model Experience

#### What the model sees

None — the package contributes no model-visible input. The DECL registers in the models registry only; the catalog emission serves it no row (only offered comfyui-engine families serve), and it registers no session events and writes no prompt segments.

#### Token effect

Zero-direct token effect — the package registers a model family; it writes no prompt text into any model request.

#### KV Cache effect

Independent — the package contributes no persistent prompt prefix, so registering or removing the family invalidates nothing cached.

## Known Limitations and Deferred Work

- **Unoffered** — the family serves no catalog row (the 2026-08-11 catalog contract reserves serving for offered families that route and render); it resolves as a registry route only.
- **No actions, no defaults** — the DECL carries neither, so the package contributes nothing at compose time.
- **Weightless** — no checkpoint and no provisions ride the DECL; nothing downloads on its account.
