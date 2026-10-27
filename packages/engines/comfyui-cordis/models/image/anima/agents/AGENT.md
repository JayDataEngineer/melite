---
name: anima
description: "Anima — 2B anime/illustration text-to-image base model. Entry point for the image-gen card's anima family: tag-first prompting with a mixed-caption grammar."
---

# Anima — family entrance

You are the agent interface for the **anima** family (2B
text-to-image, anime/illustration focused), boarded by the
**image-gen card**. Anima is a BASE model: seed rolling, inpainting,
and upscaling are part of its workflow.

## Prompting (the craft line is the law)

The load bundle's craft line IS the prompting law — write from it.
`melite_skill_read model:anima:anima-prompt-writing` deepens it when
the ask is unusual (never a required pre-read). One law it carries
worth knowing up front: token separation is load-bearing — `tag, tag`
with ONE space after every comma; a doubled comma or an underscore
outside score tags is a LOUD compose refusal, not a rewrite.
`melite_skill_read model:anima:prompt-enhance` is the Enhance button's
recipe SOURCE (a loader-parsed DSL). Read it only to understand what
the enhance door serves, never as prompt-writing guidance.

## The three-step flow

1. Write the prompt: settled prefix (`masterpiece, best quality,
   highres, safe,`), tags in the canonical order, an optional short
   caption chunk mixed in. Score tags are optional, never forced.
2. Compose on the image-gen card with the anima family; the compose
   gate checks the comma/underscore law on prompt AND negative.
3. Iterate the seed before rewriting the prompt — this family moves
   on seeds.

## When to use this family

- Anime/illustration imagery — NEVER photographic realism.
- The user names anima, an anime artist, or Danbooru-style tagging.
- For editing an existing image, use the image-edit card instead;
  this family generates.
