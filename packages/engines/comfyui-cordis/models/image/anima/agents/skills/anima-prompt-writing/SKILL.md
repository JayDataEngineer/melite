---
name: anima-prompt-writing
description: How to write an Anima prompt — token separation is load-bearing, tags first with captions mixed in, weighting at 1.5-2.0, structure over length
---
# Anima — prompt writing

The prompting grammar for the `anima` family (2B text-to-image,
anime/illustration). The `prompt-enhance` skill in this bundle is the
Enhance-button recipe source — a loader-parsed DSL, not prose. THIS
file is the agent-facing craft; read this one first.

## Token separation is load-bearing

Anima expects `tag|comma|space|tag`. One missing space after a comma
can make a character unrecognizable; a doubled comma fries the image.
The compose gate (`checkAnimaPromptTags` in the family's actions)
refuses LOUD on a missing space, a doubled comma, or an underscore in
a tag — write it right, never rely on silent rewriting. Underscores
are legal ONLY inside score tags (`score_9`, `score_8_up`).

## Tags first, captions mixed in

Danbooru-style tags are the primary grammar, but the model is trained
on mixed tag+caption data — a SHORT natural-language caption alongside
the tags renders well and often beats tags alone. Invented tags,
layout ("Person on the left side of image"), and panels ("Panel one:
…") ride the prose chunk. Never a long prose-ONLY prompt, and never
markdown or JSON scaffolding — both read as bloat.

## The settled prefix and negative

- Positive prefix: `masterpiece, best quality, highres, safe,` —
  score tags (`score_9`, `score_8`, `score_7`) are OPTIONAL quality
  tags, never a forced prefix; mandating them narrows style.
- Negative (short, NL-capable): `worst quality, low quality,
  score_1, score_2, score_3, artist name`. Broadening a negative
  concept degrades quality — negate the specific bias instead.
- This model does NOT do realism — never suggest photographic styles.

## Weighting needs a heavier hand

`(tag:1.5)` is the minimum effective weight, `(tag:2.0)` the sweet
spot — lighter weights barely register. Capitalization matters in
prose chunks.

## Tag order

`[quality/meta/year/safety] [@artist] [1girl/1boy/1other]
[character] [series] [anything else]`, with the natural-language
chunk FIRST when the prompt splits into two. Lowercase for tags,
spaces instead of underscores; when a tag differs between Danbooru
and Gelbooru, prefer the Gelbooru spelling. Artist tags take the `@`
prefix (`@namie`, `@wlop`).

## Character/series tags are the style anchor

The single biggest stylization lever is a character + series tag pair
(`hera (hades), hades (game)`): it drags the render toward that
work's real art — composition, palette, and linework follow the tag,
not the prose. When the operator wants a look anchored to a known
game or show, state the pair FIRST and let the rest of the prompt
describe the scene; prose alone cannot hold a house style.

## Structure beats length

Double newlines to chunk the prompt; short structured sections beat
one long run. Bias management is a practice: check the Danbooru wiki
for a tag's dataset bias and negate the bias, not the concept (a
`wet` bias is worth a permanent negative).

## Anima is a base model

Seed rolling, inpainting, and upscaling are part of the workflow, not
afterthoughts — iterate the seed before rewriting the prompt.
