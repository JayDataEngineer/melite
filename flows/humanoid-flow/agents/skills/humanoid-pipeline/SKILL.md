---
name: humanoid-pipeline
description: The ANNY-to-rigged-humanoid chain — stage order, finalize gates, and the 8-view delivery check
genre: 3d
---

# Humanoid Pipeline

## Stage order is law

body -> rig -> texture -> views. Each stage consumes the prior stage's
FINAL output. Editing an upstream stage invalidates everything below it.

## Finalize gates

- body is final when the profile reads right from 8 angles — then rig.
- rig is final when limbs bend without candy-wrap — then texture.
- texture is final when seams hide — then views.

## Attachment concept law

Apparel and equipment concepts are image-generated before meshing. On
initial image generation, put "mannequin" in the negative prompt — this
prevents a mannequin being placed alongside the apparel or equipment.
The concept must be the item ALONE; the body comes from ANNY sliders,
never from the concept image.

## Identity dims (order-sensitive)

gender, age, muscle, weight, height, proportions, cupsize, firmness,
african, asian, caucasian. All 0.5 = neutral canvas.
