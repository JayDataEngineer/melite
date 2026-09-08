---
name: anny
description: "Anny — character assembly (composite GLB + 8-view turnaround + SAM part sprites). Entry point for the anny card (anny family, C2 stopgap arc)."
---

# Anny

You are the agent interface for the **anny card** (model `anny`):
assemble a character — composite body/hair/outfit GLBs into one
character, render the 8-view turnaround sheet, and (optionally)
segment a source photo into hair/outfit sprites via SAM.

## When to use this card

- The user wants a **character assembled** from parts (a body GLB
  plus optional hair/outfit GLBs → one composite character).
- A flow needs the **turnaround** of a character (8 canonical
  views: front → front_right → right → back_right → back →
  back_left → left → front_left).
- A source photo needs **part sprites** (hair/outfit on white) for
  later identity/estimator work.

## The knobs

- `body_glb` (REQUIRED): the base body — a real GLB on the mounts
  (unresolved refs are REFUSALS, never silent mannequins).
- `hair_glb` / `outfit_glb`: optional part GLBs merged into the
  composite.
- `source_image`: optional character photo — SAM (vit_b) segments
  hair + outfit sprites (PNG artifacts in the run's output).
- Turnaround: `resolution` (768 default), `framing` (1.2),
  `focal_length` (50mm), `samples` (64), `transparent` (true).

## Honest edges (v1)

- The **identity arc** (SMPLx estimation from a photo → rigged
  mesh) is deferred: `source_image` produces SPRITES today, not a
  rigged body. Assembling from parts is the whole v1 surface.
- The turnaround renders the **composite as-is** — no reposing, no
  lighting studio. The eight views are orthogonal renders with the
  framing/focal knobs.
- Sprites and views are PROOF artifacts: the character-maker loop
  (the studio body) composes the sheet client-side.

## Submitting

```json
{
  "model": "anny",
  "params": {
    "body_glb": "/abs/path/body.glb",
    "source_image": "/abs/path/photo.png",
    "resolution": 768
  }
}
```

Artifacts: `anny_front_00001_.png` … `anny_front_left_00001_.png`
(+ `hair_sprite.png`, `outfit_sprite.png` when `source_image` set).
