---
name: relight
model: qwen-img-edit-21
description: "Replace the light — a full rig spec (key/fill/rim with direction, quality, ratio, temperature) while geometry, identity, and content hold exactly. Use for relight, time-of-day, and light moves."
---

# Relight

> VERIFIED LIVE 2026-11-12 against receipt `dev_docs/contracts/receipts/2026-11-12-models-qwen-edit-21-docs.md` (run run-4d0291d1515b-87074820 — the hard-cold-key relight prompt rendered live end-to-end with geometry, identity, wardrobe, and composition held: the rig-spec plus blanket-clause pattern this skill teaches).

## What it is for

Relight changes ONE attribute — the light — and holds everything
else at input fidelity. Geometry, identity, wardrobe, every
object: unchanged. It is the purest test of the edit law: push the
light to an unmistakable degree while a blanket clause holds the
world.

## Write the rig as a spec, not a mood

Name the full rig — this model follows it (the density law):

- KEY — the dominant source: direction ("from camera-left, 45°
  up"), quality ("large softbox", "hard direct sun"), color
  temperature ("3200K warm tungsten", "7500K cold overcast")
- FILL — what lifts the shadows and by how much ("gentle bounce,
  shadows keep their depth" vs "flat high-key fill")
- RIM/ACCENT — the separating edge, its direction and color
- SHADOW CHARACTER — the sentence that makes it read: "crisp
  parallel-edged shadows from a low sun", "soft omni shadowless
  wrap"
- PRACTICALS if any — lamps, windows, screens visible in frame,
  and whether they now motivate the light

Recipes that compose well: golden-hour rim (low warm key from
behind camera-left, amber practicals glowing), noir (hard key 60°
side, deep unfilled shadows, venetian-blind streak), overcast
product (large top softbox, near-shadowless), candle-lit interior
(single warm practical key at eye level, falloff into darkness).

## The prompt pattern

"Relight the scene: <the full rig spec>. Keep every person's face,
body, and clothing, every object, the composition, and the camera
angle exactly as in the image; only the light changes."

Time-of-day and season are relights too ("relight as late dusk",
"as hard noon summer sun") — the rig is implied by the hour; state
the hour's rig anyway. Reflections, caustics, and shadow direction
belong to the light — they SHOULD move with it; that is not
leakage.

## Guards

Under-editing guard: a relight must be instantly legible —
different hour, different mood — not the same photo nudged warm.
Leakage guard: relight never restyles content into a different
medium, ages a face, or "cleans" the frame; if the user wants the
film-grain or VHS look too, that is a second named change.

## Composing the run

image-edit card, `model: qwen-img-edit-21`: `input_images` =
[the photo], the rig-spec prompt, fixed seed. The frame never
changes — no crop needed; the geometry law and this skill agree.

## Density tripwire

A prompt under ~200 words cannot render a designed layout — one
paragraph per zone, every rendered string quoted.
