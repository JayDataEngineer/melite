---
name: gamekit-vision-gate
description: Agent-eyes vision gate - neutral three-view reads, retry-once rule, stdev blank-frame test, honest verdict statuses.
---

## Protocol
1. Gate THREE views (front/left/back) of one run IN ONE BATCH.
2. Same neutral prompt every view: "Describe this render: subject,
   silhouette, materials. If there is no clear subject, say so."
3. Retry once on empty (~10% flake). Two fails = unread.
4. Views must agree on ONE subject.

## Verdicts
green = consistent readable subject. yellow = subject right, one view off
(usually shippable). red = blob/no subject in 2+ views -> rework ONCE with
bolder proportions, then report.

## Blank-frame law
Uniform gray frames are a RENDER defect, not an asset defect (pixel stdev<1
confirms). Do NOT rework the asset; re-render through the patched
blender_render.py (gate renders are intentionally flat-color since the
2026-08-25 material law; Cycles does NOT help - image-sampled materials skip
in both engines here).

## Flank-view law (rig-aligned quadrupeds)
For a correctly aligned quadruped, LEFT (azimuth 270) sees the FLANK — that
is the view that must read the animal. FRONT is chest-on and reads abstract
for ANY aligned quadruped; treat that as expected. If FRONT reads as a
clean side profile, the mesh is ~90deg yawed on the rig (the v3 statue
tell — fixed by bridge yaw_align:true). Gate with NEUTRAL open-ended
reads; forced YES/NO prompts inflate yes-answers.