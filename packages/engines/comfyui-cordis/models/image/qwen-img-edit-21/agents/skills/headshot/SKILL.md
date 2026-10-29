---
name: headshot
model: qwen-img-edit-21
description: "Professional headshot from a reference photo — identity locked by pointing at the image, never described; studio light, background, wardrobe designed. Use for headshots, profile and press portraits."
---

# Headshot

> VERIFIED LIVE 2026-11-12 against receipt `contracts/receipts/2026-11-12-models-qwen-edit-21-docs.md` (run run-5248b62e167f-870a5339 — the editorial-headshot prompt rendered live end-to-end with the face held by pointing at the image, never described: the identity law this skill teaches). Geometry note: this doc's sizing passage was reworked to the render-sizing law after that press — the run proves the prompt pattern, density, and identity law; a post-rework stated-pair press is owed for the sizing seat.

## What it is for

A headshot is a NEW PICTURE OF THE SUBJECT — the construct branch:
design the scene (light, background, wardrobe) to a professional
standard while the face stays the input's face. The reference image
is the sole identity source.

## Identity comes from the image, not the words

Never describe the face in the prompt. Point at it: "the person in
the image". A verbal description ("a woman in her 30s with brown
eyes…") makes the model REGENERATE the likeness and degrade it —
identity survives by reference, not by feature list. Personal
accessories that make them recognizable (glasses, a signature
beard) ride the same protection unless the user targets them.

## The prompt pattern

Lead with the operation, then the shoot design:

- the shot: "Create a professional headshot of the person in the
  image"
- framing: bust or three-quarter, direct eye contact or a slight
  off-camera gaze (name which)
- the light rig: one named setup — soft key 45° off-axis with a
  subtle rim, or large window light from the left; name the
  character of the shadows (soft, defined)
- the background: one seamless tone or a gently blurred office/
  studio environment, chosen to the use (corporate, editorial,
  creative)
- wardrobe ONLY if the user asked for a change; otherwise the
  outfit stands (state that it does)
- the blanket clause: "keep the face, hairstyle, skin, and any
  glasses exactly as in the image; photographic realism, natural
  skin texture"

Push the transformation unmistakable — a headshot READS as a
studio shoot, not the same snapshot relit faintly — without
beautifying: no age-shift, no skin smoothing the user did not ask
for. Leakage guard: nothing about the face changes at all.

## Composing the run

image-edit card, `model: qwen-img-edit-21`: `input_images` =
[the photo], the prompt, fixed seed to iterate. THE RENDER SIZES
ITSELF (the ground-truth cure, 2026-11-12): a headshot is vertical,
so state the pair on the card (match OFF, 2:3 or 3:4 portrait —
e.g. 832×1216) and the sampler renders that exact canvas — never
crop the photo to make it vertical (a crop throws away the pixels
the portrait composes with; the pair changes the ratio natively).
Multiple looks (light rigs, backgrounds) are iterations: same seed
family, one prompt change each.

## Density tripwire

A prompt under ~200 words cannot render a designed layout — one
paragraph per zone, every rendered string quoted.
