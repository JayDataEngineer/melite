---
name: prop-pipeline
description: The concept-to-game-asset chain — mode choice, budgets, and the delivery gate
genre: 3d
---

# Prop Pipeline

## Mode law

prop = static (buildings, trees, armor, weapons) — no rig stage.
creature = animatable — takes the anyCreature rig bridge.

## Concept law

Flat background named in the prompt, single object, full silhouette in
frame. Pass the same color as background_color — mismatched backgrounds
poison the mesh.
On initial image generation, put "mannequin" in the negative prompt —
this prevents a mannequin being placed alongside the apparel or
equipment. The concept must be the item ALONE.

## Budget law

10k distant, 50k standard, 100k+ hero. CleanMesh decimates to budget;
the gate checks the count.
