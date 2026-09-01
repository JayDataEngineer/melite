---
name: prop-flow-pipeline
description: The static prop chain — concept discipline, the 10K ultra-low budget, and the turntable gate
genre: 3d
---

# Prop Flow Pipeline

The prop lane: concept image -> Pixal3D mesh -> 10K quad remesh ->
8 turntable views. No rig stage, ever.

## When this lane

Static objects: props, furniture, weapons, environment pieces.
Anything skeletal takes creature-flow or humanoid-flow.

## Concept discipline

- Flat background, full silhouette, the prop fully in frame.
- background_color param must match the actual image background.
- One object per concept — the mesh stage traces exactly one body.

## Budget

face_budget 10000 (ultra-low, prop preset). This is furniture-grade
game geometry — resist the urge to raise it for detail; detail lives
in the texture, not the topology.

## The delivery gate

8 turntable views. Reject on: watertight failures, floating geometry,
silhouette drift from the concept.
