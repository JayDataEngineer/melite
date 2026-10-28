---
name: try-on
model: qwen-img-edit-21
description: "Virtual try-on — the garment from a second image onto the person in the anchor: the canvas rule (person first, garment cited <image2>), fit and fabric named, identity untouched."
---

# Try-On

## What it is for

Try-on is a TWO-image edit: the person is the canvas, the garment
is a reference. The order is the law: `input_images` =
[the person, the garment] — the FIRST image is the one being
edited, and the prompt cites the garment as `<image2>`. Swap the
order and the model dresses the shirt in a person.

## The prompt pattern

- the operation: "Dress the person in <image1> in the garment from
  <image2>"
- the fit: name it — tailored and fitted, relaxed drape, tucked or
  loose — so the silhouette is decided, not guessed
- the fabric behavior: how the material sits — "the jacket's
  leather holds its structure over the shoulders", "the dress
  fabric follows the body with soft vertical folds"
- coverage honesty: if the garment's cut differs from what the
  person wears (a swimsuit for a coat), say the underlying outfit
  is REPLACED, not layered
- the blanket clause: "keep the person's face, hairstyle, body
  shape, pose, and the background exactly as in <image1>; keep the
  garment's exact color, pattern, cut, and every detail from
  <image2>"

## Guards

Identity survives by reference — never describe the face; point at
<image1>. The garment's identity is its details: pattern repeat,
buttons, seams, logos — they transfer verbatim or the try-on is
worthless. Accessories the person wears (watch, glasses) survive
unless the outfit change implies them. Under-editing guard: the
result must show THE reference garment, not "a similar one".

More garments (a look from three pieces): `input_images` =
[person, garment, garment], citing `<image2>` and `<image3>` in
one prompt — one compose, never a chain of three.

## Composing the run

image-edit card, `model: qwen-img-edit-21`: the ordered
`input_images`, the prompt, fixed seed. The output inherits the
ANCHOR's frame (the person's image) — pick or crop the person's
photo to the target framing FIRST (the input-prep card's crop);
the garment's own ratio never matters.
