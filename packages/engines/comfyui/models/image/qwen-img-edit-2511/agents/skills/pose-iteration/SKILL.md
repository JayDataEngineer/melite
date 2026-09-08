---
name: pose-iteration
model: qwen-img-edit-2511
description: Iterate character poses and frame compositions cheaply with qwen-image-edit-2511 before committing to an H3 animation pass. Use when preparing keyframes — pose sheets, wardrobe changes, camera framing.
---

# Pose Iteration

## Why iterate here

A qwen-img-edit-2511 pass is ~4 diffusion steps (seconds). An h3-keyframe pass is
a full video render (minutes). NEVER re-render video to fix a pose —
fix the still, then animate once.

## The vn lora is for character sheets

`vn_character_sheet` at 0.9 keeps on-model identity across edits — same
face, wardrobe, proportions. It ships with the lane; do not remove it
when posing the same character across frames.

## Prompting an edit

Name WHAT CHANGES, keep everything else stated as unchanged:

- "she turns her head to look over her left shoulder, rain streaks the
  lantern light, wardrobe unchanged, night market unchanged"

Anti-patterns: describing the whole scene from scratch (drifts),
negations ("no hat" grows a hat), multiple changes in one edit (split
into two passes).

## Locking identity across a sheet

1. Generate the canonical frame first.
2. Every pose edit uses the canonical frame as input (not the previous
   edit) — prevents identity drift compounding.
3. Same seed across the sheet for texture stability.

## Hand-off

When the frame is right, animate: `h3-keyframe` with this PNG and a
MOTION+SOUND prompt (see keyframe-flow skill).
