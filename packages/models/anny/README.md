---
description: Anny 3D character-assembly family, identity-slider body baking with turnaround sheets and sub-action verbs.
kind: package-library
---

# @melite/models-anny

The Anny family — a parametric 3D character body: eleven identity sliders (gender, age, muscle, weight, height, proportions, cupsize, firmness, african, asian, caucasian, defaulting at 0.5), an attached GLB, or a loaded preset, rendered to an 8-view turnaround sheet. The bake is parametric — no checkpoint loads — and the defaults pin the proof framing (resolution 768, framing 1.2, focal length 50, samples 64, transparent background). Provisions land the base body GLB (ProtoPomp/anny) and the SAM checkpoint `sam_vit_b_01ec64.pth`; the lane rides our own vendored pack `melite-poser-nodes`.

The anny card binds the family's actions: compose (the body's three arms — attach, bake, sheet), estimate_photo (photo to body through the estimator MHR chain), and bake (a params json through `AnnyParamsToGlb`). Beyond the package entry, the manifest exports `./mods/verbs` — five family-owned verbs mounted by verb id on the anny card: hmr-estimate (photo to body), preset-save, preset-load, dress, and prop (outfit and prop seating through the fit-seat flow). Verb knobs never join the card surface; each verb's invocation doc owns them (the SubActionMod law).

## Declaration

`src/index.ts` declares the DECL and the `family-anny` plugin; `src/actions.ts` owns the compose, estimate, and bake segments; `mods/verbs.ts` registers the five verbs as effects on the boot fiber.

## Model Experience

#### What the model sees

None — the package contributes no model-visible input. The DECL serves the estate's model catalog (label, description, variants, defaults) and the anny card that boards the family; it registers no session events and writes no prompt segments.

#### Token effect

Zero-direct token effect — the package registers a model family and composes engine graphs; it writes no prompt text into any model request.

#### KV Cache effect

Independent — the package contributes no persistent prompt prefix, so registering or removing the family invalidates nothing cached.

## Known Limitations and Deferred Work

- **The base_body member is retired** — the 2026-09-28 decision (D-C7) removed it; bodies come from the sliders, an attached GLB, or a preset.
- **hmr-estimate needs the estimator chain** — the verb requires `melite-kimodo-nodes` and the estimator flow, so photo-to-body refuses where that pack is absent instead of degrading.
- **Verb knobs are invisible at card level** — the five verbs' fields ride each verb's own invocation doc, so a card schema dump shows none of them.
