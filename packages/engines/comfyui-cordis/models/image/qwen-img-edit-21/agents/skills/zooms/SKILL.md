---
name: zooms
model: qwen-img-edit-21
description: "Change the framing — zoom in (tighten on the subject) or zoom out (pull back, restore out-of-frame content as named outpainting) while subject and scene hold. Use for zoom, crop-in, pull back."
---

# Zooms

## What it is for

A zoom is a CAMERA-FRAME edit, not a content edit: the world stays,
the framing changes. Zoom in tightens on what is already there.
Zoom out pulls back — and the newly revealed margins are content
the model must INVENT coherently: that is outpainting, and the
prompt names it as such.

## Zoom in (the safe arm)

Name the new frame by what it contains, precisely:

- "Zoom in to a tight portrait crop of the face, eyes at the upper
  third line, chin near the bottom edge"
- resolution follows the source's pixels: an aggressive crop-in
  asks the model to synthesize detail — say "sharpen naturally,
  keep skin texture" and expect softness past ~3× tighter

The subject holds by reference; the blanket clause keeps "the
face, expression, hair, clothing, and lighting exactly as in the
image". Nothing new may appear — a zoom-in that adds background is
leakage.

## Zoom out (the outpaint arm)

The canvas grows, so the geometry law needs help FIRST: crop/extend
the anchor to the wider frame (the input-prep card's crop — or the
card's outpaint riders) so the output frame is the target, THEN
edit. The prompt states the operation as outpainting:

"Zoom out: pull the camera back to show the subject in full with
the surroundings continuing naturally — outpaint the newly visible
margins: <describe what continues, at the right abstraction —
"the tiled floor continues", "more of the bookshelf and window
wall", "the hillside and sky extend">. Keep the subject, their
pose, clothing, and everything already in frame exactly as in the
image; the new margins match the scene's perspective, lighting,
and grain."

Margins described BY ROLE, not repainted in detail (the same law
as preservation clauses): the more concretely you describe margins
you meant to invent loosely, the more they fight the existing
scene. One coherent continuation sentence per side is enough.

## Guards

Under-editing: a zoom must actually change the framing distance —
not a 10% trim. Leakage: nothing inside the original frame may
move or restyle; if the subject must shrink toward one rule
(off-center), say so explicitly ("keep the subject at the left
third").

## Composing the run

image-edit card, `model: qwen-img-edit-21`: `input_images` =
[the photo], the prompt, fixed seed. In: no prep. Out: prep the
wider anchor FIRST — the output inherits the anchor's frame, so
the frame you want is the frame you stage.
