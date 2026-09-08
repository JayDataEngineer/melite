---
name: edit-craft
description: Instruction-edit discipline — delta prompts, mask-aware regions, pose iteration on the image-edit card
genre: image
---

# Edit Craft

## Delta prompts

Write the CHANGE, not the scene. "turn head to left profile" beats
"a person facing left in a market". The model keeps everything you do
not mention.

## Mask law

With a mask: only the masked region regenerates — keep masks tight.
Without: the whole image re-renders at your resolution.

## Pose iteration

Sheet -> pose edit -> animate is the chain. Edit poses on the SAME seed
to keep identity; change only the pose clause in the prompt.
