---
name: character-sheet
model: qwen-img-21
description: Compose a character reference sheet with qwen-img-21 — the ten-section prompt contract, the orthographic keyword, the panel set (four views + face close-up), and the cfg knob that locks a requested view. Use when the task names a character, a turnaround, or asks for a reference to drive later edits or video.
---

# Character Sheet

## What the sheet is for

A character sheet is a generation artifact: one image carrying the
character from enough angles that an edit lane or a video lane can
re-identify them. A sheet used as a reference outperforms re-prompting,
and holds identity across edits the way a LoRA would — without training.

## The panel set (less is more)

- full body, front view
- full body, side view
- full body, back view
- face close-up

Nothing else. Extra panels divide the pixels and confuse the model;
accessories earn a panel only for characters defined by them (a weapon, a
helmet). Four views plus the close-up is the whole sheet.

## The orthographic keyword

Put `orthographic` in the prompt. It forces a blueprint sheet — flat,
parallel projection, all panels the same scale — instead of a perspective
scene where the model poses. A character sheet is a reference document,
not a portrait.

## The cfg knob

`cfg` defaults to 1 on this lane. At 1.0 Qwen drifts off a requested
view; at 2.0 it nails "front view" when asked. Set `cfg: 2` for sheet
generation. Keep the seed fixed across regenerations so the character
survives iteration.

## The ten-section prompt contract

Build the prompt as ten fixed sections, one paragraph each, in this
order:

1. identity — who the character is, one line of context
2. face — shape, features, skin, marks
3. hair — length, cut, color, how it sits
4. eyes — color, shape, gaze
5. body — proportions, build, height impression
6. outfit, upper — garments, fit, materials
7. outfit, lower — garments, footwear
8. accessories — only what the character is defined by
9. palette — the color language of the whole character
10. staging — `orthographic`, white background, reference-sheet layout,
    the four views plus face close-up

Each section is one paragraph under 60 words. The staging section always
carries `orthographic`, the white background, and the panel list — the
other nine describe the character, never the layout.

Hard output rules: no code fences, no JSON, English-only visible text in
the image, and no pixel resolutions (the lane's `resolution` knob owns
sizing; naming pixels in the prompt fights it).

## Composing the run

Compose through the image-gen card with `model: qwen-img-21`, the
ten-section prompt, `cfg: 2`, and a fixed seed. One sheet per run — the
panel set is the sheet; do not ask for two characters on one page.

## Hand-off

The sheet is input, not a deliverable: pass it as the reference image to
an edit lane (qwen-img-edit-21 — for the full production sheet see the
design-sheet skill) or as
the first frame to a video lane. Lock the ten-section prompt with the
seed in the character's record so the sheet can be regenerated.
