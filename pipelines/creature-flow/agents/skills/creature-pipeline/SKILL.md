---
name: creature-pipeline
description: The non-humanoid creature chain — concept discipline, 50K quad budget, refine-then-rig order, and the turntable gate
genre: 3d
---

# Creature Pipeline

The creature lane: concept image -> Pixal3D mesh -> 50K quad remesh ->
UltraShape refine -> optional rig -> 8 turntable views.

## When this lane

Non-humanoid creatures ONLY. Humanoids (bipeds with human proportions)
take humanoid-flow. Static props/weapons/furniture take prop-flow.

## Concept discipline

- Flat background, full silhouette, no cropped limbs.
- background_color param must match the actual image background.
- One creature per concept — the mesh stage traces exactly one body.

## Budget + order

- face_budget 50000 (creature preset) — budget before beauty.
- Remesh -> refine -> rig. UltraShape sharpens limbs and hard-surface
  edges on UNRIGGED geometry; rigging first wastes the refine.
- rig=false is legal for display-only creatures.

## The delivery gate

8 turntable views. Reject on: watertight failures, floating geometry,
silhouette drift from the concept, broken limb attachment after rig.
