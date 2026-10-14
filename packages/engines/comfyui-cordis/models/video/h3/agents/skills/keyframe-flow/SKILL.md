---
name: keyframe-flow
description: Keyframe-first production loop — pose/edit stills cheaply with qwen-img-edit-2511 (4-step lightning + vn lora), then animate the approved frame through h3's first-frame anchoring. Use when a shot must start on an exact composition or a specific character pose.
---

# Keyframe Flow

## The loop

1. **Base frame** — generate or take a still (z-image, scan, drawing).
2. **Pose it** — qwen-img-edit-2511 lane: qwen-image-edit-2511 lightning
   (4 steps, cfg 1.0) + `vn_character_sheet` lora (0.9). Iterate HERE —
   an edit costs seconds; a re-render costs minutes.
3. **Approve** — look at the frame: composition, wardrobe, lighting.
4. **Animate** — h3 with the approved PNG as the image input (I2VA
   first-frame anchoring). The video's first frame IS that PNG.

## Prompting the animate pass

The first frame already defines composition and subject. Prompt MOTION
and SOUND, not appearance:

- Bad: a courier in a jade raincoat stands in a night market (static
  restatement — you get a nearly still shot).
- Good: the courier pushes off and rolls forward through the lantern
  glow; rain hisses on the stall awnings, a vendor calls out — verb
  first, sound second.

## Chaining into a timeline

Keyframes make good window-1s: render the opening frame, animate it with
h3, then continue with h3-timeline windows (each later window seams on
the previous last frame). Character consistency survives because every
window re-conditions on rendered frames, not re-imagined text.

## Run doors

qwen-img-edit-2511: model qwen-img-edit-2511-lightning4, prompt, image /abs/base.png
h3:                model h3, prompt, image /abs/frame.png, seed 7

All three recipes (standard / draft / final) ride the ByteDance 4-step
lora — the pick changes geometry and the finishing rail, not the speed.
Same seed family across a shot re-rolls; change seed for variation.

(2026-11-02) The folded `h3-keyframe` route is retired — h3's own image
input carries the anchoring (one model, one variant, one quant, three
recipes). This skill left its old home with the route.
