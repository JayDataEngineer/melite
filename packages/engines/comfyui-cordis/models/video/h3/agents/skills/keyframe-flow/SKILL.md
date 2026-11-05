---
name: keyframe-flow
description: Keyframe-first production loop — pose/edit stills cheaply with qwen-img-edit-21 on the image-edit card, then animate the approved frame through h3's first-frame anchoring. Use when a shot must start on an exact composition or a specific character pose.
---

# Keyframe Flow

## The loop

1. **Base frame** — generate or take a still (z-image, scan, drawing).
2. **Pose it** — the qwen-img-edit-21 lane on the image-edit card
   (steps/cfg ride the model's own recipe — leave them unset).
   Iterate HERE — an edit costs seconds; a re-render costs minutes.
   (A character-sheet lora is NOT boarded on this family — pose
   iteration rides the plain edit lane; the family's boarded loras
   are the ones melite_load names.)
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

qwen-img-edit-21:  model qwen-img-edit-21, prompt, image /abs/base.png, seed 7
h3:                model h3, prompt, image /abs/frame.png, seed 7

All three recipes (standard / draft / final) share one lora bag —
the pick changes geometry and the finishing rail, not the speed.
Same seed family across a shot re-rolls; change seed for variation.

There is no separate `h3-keyframe` route — h3's own image input
carries the anchoring (one model, one variant, one quant, three
recipes).
