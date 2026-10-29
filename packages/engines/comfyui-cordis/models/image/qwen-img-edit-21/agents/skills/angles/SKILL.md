---
name: angles
model: qwen-img-edit-21
description: "Change the viewpoint — orbit in degrees, raise or drop the camera, turn a head — identity the hardest invariant, the scene holds. Use for other angles, above/below views, head turns."
---

# Angles

## What it is for

An angle change orbits the CAMERA (or turns the subject's head) and
regenerates the far side coherently — the near side is identity,
the far side is inference. This is the edit family where identity
drifts hardest, so the identity law rides at full strength: point
at the image, never describe the face in words.

## Name the move in degrees and direction

Spec-grade beats gesture (the density law):

- "Rotate the view 45° to the left around the statue, keeping its
  pose and the plaza exactly, revealing the statue's left flank"
- "Change the camera to a high three-quarter view, 30° above eye
  level looking down"
- "Turn the person's head 30° to their left, eyes still toward the
  camera"
- objects: "show the back of the device" — the sides that were
  hidden must be stated as continuing the design ("the back
  continues the same brushed aluminum and button layout")

## The identity clause (strongest form)

"Keep the exact face, hair, skin, and proportions of the person in
the image — same identity, unchanged; same clothing and its
details; the same scene, objects, and lighting from the new
viewpoint." A product adds: "same design, markings, and component
count from every side."

The far side is invented — that is legitimate — but it must extend
the SAME identity: same hairstyle from behind, same garment
seams, same silhouette. One sentence per newly visible region,
role-level abstraction ("the desk continues with the same clutter")
— do not over-specify what you cannot see.

## Guards

Under-editing: the angle must MOVE — 45° reads, 5° does not; if
the user wants subtle, name the degrees anyway. Leakage: an orbit
is not a restyle — wardrobe, medium, and scene hold; the face at
the new angle is the SAME face. Group shots: orbiting multi-person
frames regenerates occlusion relationships — prefer per-person
edits, or accept and state the re-occlusion ("the two remain in
the same relative positions").

## Composing the run

image-edit card, `model: qwen-img-edit-21`: `input_images` =
[the photo], the degrees-and-direction prompt, fixed seed. The
frame inherits the anchor; a viewpoint change that also wants a
wider/taller frame stages the cropped anchor FIRST (the input-prep
card's crop).

## Density tripwire

A prompt under ~200 words cannot render a designed layout — one
paragraph per zone, every rendered string quoted.
