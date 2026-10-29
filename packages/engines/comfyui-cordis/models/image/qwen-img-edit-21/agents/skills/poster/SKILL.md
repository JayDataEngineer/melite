---
name: poster
model: qwen-img-edit-21
description: "Poster or flyer layout — zones, type hierarchy, and the rendered-text doctrine: exact characters, quoted, one language, matched to the input or named by the user. Use for posters, flyers, covers."
---

# Poster

## What it is for

A poster is a NEW PICTURE built from the reference: the subject or
product rides in as the hero, and the composition, typography, and
copy are designed. It carries the one doctrine this family holds
hardest: TEXT RENDERED INTO THE IMAGE IS LITERAL.

## The rendered-text doctrine

Decide the language FIRST, in priority order: (1) the user named
the text or its language — that is what renders; (2) else the
dominant language of text already in the image; (3) else the
language of the user's instruction. One language inside the quotes
— never a bilingual pair unless asked. Genre never overrides input
language: a "movie poster" look comes from layout and typography,
NOT from switching the title to English.

Commit to the exact characters: every headline, tagline, and credit
quoted in the prompt, nothing summarized or abbreviated away. Text
you cannot commit to does not go on the poster. This model renders
quoted text faithfully — short strings only; a paragraph of body
copy will degrade.

## The prompt pattern

- the operation: "Turn the image into a <genre> poster featuring
  the <subject/product> in the image"
- the layout zones: name them with rough positions — hero image
  zone (upper two-thirds), headline zone (top or center, one
  line), tagline under it, credit/venue/date strip along the
  bottom; one accent color pulled from the subject, generous
  margins
- the type hierarchy: display serif/slab or bold grotesque for the
  headline (name the feel, not a brand font), light uppercase
  tracking for the tagline, small caps for the credit strip
- the quoted strings: "headline: "<exact text>"", tagline:
  "<exact text>"", credit: "<exact text>""
- the blanket clause: "keep the <subject> exactly as in the image;
  clean print-quality composition, no additional text anywhere"

## Guards

Leakage guard: the subject is not restyled beyond the poster
treatment; no extra words creep in around the edges (say "no
additional text"). Under-editing guard: the result must clearly
read as a DESIGNED poster — real hierarchy, real margins — not the
photo with a caption. If the canvas grows (portrait poster from a
landscape still), a bare prompt cannot grow it — the output
inherits the anchor's frame: pad the canvas to the poster ratio
first (the pad-and-instruct recipe — stage the wider frame as
pixels, then prompt the band as scene to continue; the zooms
skill's outpaint arm owns the recipe).

## Composing the run

image-edit card, `model: qwen-img-edit-21`: `input_images` =
[the source], the prompt, fixed seed. THE RENDER SIZES ITSELF (the
ground-truth cure, 2026-11-12): state the poster's portrait pair on
the card (match OFF, 2:3 or 3:4 — e.g. 832×1216) and the sampler
renders that exact canvas — never crop the anchor to portrait (pad
the canvas to grow it instead when the layout needs more room; the
outpaint arm owns that recipe).

## Density tripwire

A prompt under ~200 words cannot render a designed layout — one
paragraph per zone, every rendered string quoted.
