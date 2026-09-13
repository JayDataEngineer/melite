---
name: H3 Keyframe
description: Animate a still through H3 — feed any image (edited keyframe, character sheet pose, painted frame) as the first frame of a generated video+audio pass.
---

# H3 Keyframe (image -> video)

Takes an image and generates motion + audio from it: the comfyui lane
loads `$image` into `LoadImage.1` -> first_frame of the H3 graph, so the
video starts EXACTLY on your frame.

Pairs with `qwen-img-edit-2511` (pose a character sheet with the vn
lora) to build keyframe-first films: edit the still until it is right
(cheap, 4-step lightning), then animate it once (expensive). (The
pre-flip `img-edit` family head is retired 2026-09-05; its assets
merged into qwen-img-edit-2511.)

Skill: `keyframe-flow`. Compose door: `melite_construct` `add_stage`
with `card="h3-timeline", model="h3-keyframe"`, your prompt/image/seed,
onto the shared bench — the run starts at the user's Run press, the
progress rides the card (no curl).
