---
name: product-shot
model: qwen-img-edit-21
description: "Studio product shot from a reference — the product's exact design, markings, and count survive while surface, light rig, and staging are designed. Use for product photos and on-white listing images."
---

# Product Shot

## What it is for

A product shot is a NEW PICTURE OF THE PRODUCT: the scene (surface,
light, staging) is designed; the product itself is untouchable. A
product's identity is its exact design, markings, logos, and COUNT
— buttons, vents, pills in the blister, laces on the shoe. These
survive the edit absolutely.

## The prompt pattern

Lead with the operation, then the staging:

- the shot: "Create a professional studio product photograph of the
  <product> in the image"
- the surface and set: one named look — seamless white sweep, matte
  stone slab, brushed steel, soft gradient backdrop
- the light rig: name it — large softbox above and left with a
  gradient falloff, or a defined specular streak along the edge for
  glass/metal; say what the reflections do (clean single
  highlight, no studio visible in the finish)
- the staging: hero angle (three-quarter, top-down flat lay, low
  dramatic), floating or grounded, props ONLY if the user asked
- the blanket clause: "keep the product's exact shape, materials,
  colorway, markings, text, and every component exactly as in the
  image, same count and positions"

## The variants a listing needs

One reference, several iterations on a fixed seed: on-white
straight-on (the catalog cell), three-quarter hero on a styled
surface (the campaign cell), and a detail macro if the product has
a signature mechanism. Change ONE staging clause per iteration.

## Guards

Under-editing guard: the result must clearly read as a studio
shoot, not the casual source photo. Leakage guard: no props, no
 reflections of a room, no "improvements" to the product — no
cleaned scratches, no added features, no altered proportions. If
the canvas must grow (float the product with more air), STATE THE
PAIR (match_input_resolution off, width/height) — the geometry sizes
the render itself at the stated frame (the ground-truth
cure); never crop the anchor first (the anti-crop law: cropping the
source throws away pixels the render could have used). The zooms
skill's outpaint arm owns the wider-frame recipes.

## Composing the run

image-edit card, `model: qwen-img-edit-21`: `input_images` =
[the product photo], the prompt, fixed seed. Square (1:1) or 4:5
for listings: STATE THE PAIR (match off, width/height) — the geometry
sizes the render at the listing frame; never crop the anchor (the
anti-crop law).

## Density tripwire

A prompt under ~200 words cannot render a designed layout — one
paragraph per zone, every rendered string quoted.
