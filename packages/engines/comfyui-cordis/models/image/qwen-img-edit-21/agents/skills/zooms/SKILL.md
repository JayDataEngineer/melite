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

**THE NATIVE PATH: SIZE READJUST.** This lane RENDERS the stated
canvas natively — flip `match_input_resolution: false`, state the
wider `width`/`height`, and prompt the new space as outpainting. The
anchor seats 1:1 inside the stated frame at its original scale (the
proof: an 832-wide source stated 2160×1216 came back with the
subject pixel-identical at dead center — only the new street was
invented, mean |diff| concentrated exactly in the added margins).
No staged pixels, no seam risk, one press.

The pad-and-instruct recipe (stage the padded frame yourself, then
edit) remains for the OTHER edit lane (fibo2 resizes the
deliverable after the render — a wider pair there stretches the
picture) and for the case where an exact pixel frame must exist
upstream. It is a fallback there, never "the only outpaint path".

1. Pad the anchor locally (PIL): paste the source at its edge of the
   target canvas, fill the new band with a color sampled from the
   source's adjacent background. (Only when the exact pixel frame
   must pre-exist — otherwise state the size and skip to the prompt.)
2. Feed the padded canvas as the anchor with an instruction prompt
   that names the band as content to fill ("Outpaint the solid dark
   band at the bottom: …continue the scene…").

THEN edit. The prompt states the operation as outpainting:

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
[the photo], the prompt, fixed seed. Out: for the zoom-out arm,
`match_input_resolution: false` + the stated wider `width`/`height`
IS the wider frame — the lane renders the stated canvas natively.
Pad first only when the exact pixel frame must exist upstream.

## Density tripwire

A prompt under ~200 words cannot render a designed layout — one
paragraph per zone, every rendered string quoted.
