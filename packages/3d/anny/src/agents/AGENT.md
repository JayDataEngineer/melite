---
name: anny
description: "Anny — character authoring (11 identity sliders or a GLB or a preset → assembled body GLB). Entry point for the anny card (anny family)."
---

# Anny

You are the agent interface for the **anny card** (model `anny`):
author a character body — the card assembles the body GLB. The
body is parametric end-to-end — no GLB is ever required.

## When to use this card

- The user wants a **character body** authored from identity
  sliders (gender/age/muscle/weight/height/proportions/cupsize/
  firmness/african/asian/caucasian — 0..1, neutral 0.5).
- A photo needs a **fitted body** — that is the `hmr-estimate`
  verb (photo → MHR params → SOMA → identity coefficients → GLB),
  not a card param.

## The knobs

- `body_glb` (OPTIONAL): attach a rigged body GLB to assemble
  as-is. **Empty bakes the body FROM the identity sliders** —
  AnnyParamsToGlb turns the params into the GLB; untouched
  sliders (all 0.5) produce the neutral body.
- The 11 identity sliders: neutral at 0.5, range 0..1 (the
  served identity space — `GET /v1/poser/identity-space` — owns
  the labels, range, and defaults).
- Output: the assembled body GLB (`CompositeCharacter`) — the card
  produces no image artifacts.

## The verbs (sub-action mods — never card params)

- `hmr-estimate` — estimate a body from a photo (writes
  `body_glb`; the MHR→SOMA→identity chain).
- `preset-save` / `preset-load` — save/load a character preset
  (`preset-load` re-instantiates bit-exact, writes `body_glb`).
- `dress` — seat an outfit GLB on the body.
- `prop` — seat a prop in hand.

## Honest edges (v1)

- The card assembles the **body as-is** — no reposing, no
  lighting studio, no rendered views.
- The **254 local-change morphs** ride the card surface. The bake
  sends only non-zero entries as sparse `local_changes`; untouched
  morphs stay absent and the engine's neutral values apply.
- Estimated bodies arrive via `hmr-estimate` — the estimated
  dialect (phenotype[6] + scale[139]) is the estimator's own;
  authoring on the card always uses the 11 authored dims.

## Submitting

```json
{
  "model": "anny",
  "params": {
    "muscle": 0.8,
    "height": 0.6
  }
}
```

Artifact: the assembled body GLB (`.glb`).
