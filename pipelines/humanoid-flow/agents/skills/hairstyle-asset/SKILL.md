---
name: hairstyle-asset
description: "Drive the hairstyle_asset.yaml lane: generate one hairstyle as a standalone rigged GLB library asset (hair = rigid attachment, ADR modular pivot). Use when the user wants hairstyles, hair libraries, or swappable hair generated for game characters."
---

# Skill: hairstyle-asset (the hair LIBRARY lane)

Makes ONE hairstyle per run: wig-form concept -> TRELLIS -> Step1X texture
-> rig transfer -> turntable + vision gates. Output `rigged_hairstyle_glb`
is a LIBRARY asset (ADR-CHARACTER-PIPELINE-MODULAR-PIVOT: hair is the
prototype rigid attachment) — a character's hair is a SLOT CHOICE, not a
generation. Swap = compose with a different library GLB.

## The lane

`data/pipelines/hairstyle_asset.yaml`. Same run loop as garment-asset
(copy -> edit attachment bricks -> validate -> start -> poll); see that
skill for the exact curl sequence.

## THE FROZEN BODY PREFIX LAW

Bricks 1-7 are byte-identical with garment_asset's prefix BY DESIGN —
that is what makes the body free on every run after the first. Never
edit, never reorder, never insert a brick before the END marker. Hair
runs and garment runs mutually benefit from the same cached body.

## Customization points (attachment bricks only)

- `generate_image` prompt: "detached hair sculpture ... shaped like a
  wig with no head inside — hollow where the scalp would be". Style,
  length, color are the free variables. Keep the "no head/skull/face"
  negative list — a generated head ruins the slot.
- `expect`: "wig", "hairstyle", "hair" (+ specific: "ponytail",
  "bob cut"). If the reader says "helmet" or "animal", the silhouette
  drifted — regenerate.
- `simplify_target` 40000 (F2 hair budget).
- Library discipline: one copy per style, named
  `hair_<style>_<variant>.yaml`; seeds vary per variant.

## KNOWN BUG (2026-08-25, run pmt8ghpfdzz0qxp): render_glb_views renders textured+rigged hair GLBs as BLANK gray frames (stdev ~0.5) while the software rasterizer renders the same GLB fine (verify_glb visual PASS). The mesh/texture/rig are good — the BLENDER step is the bug. Before gating a hairstyle on views, pixel-stat them (stdev < 1 = empty render = broken render step, NOT a bad asset); do not regenerate bolder silhouettes against blank renders.

## Gate loop (AGENT EYES — blind_read retired 2026-08-25 by operator)

Same law as garment-asset: after `render_glb_views`, YOU eyeball each
view via `describe_image` (OpenRouter `xiaomi/mimo-v2.5`; retry once on
empty extraction, ~10% flake). PASS = a stranger's noun
(wig/hairstyle/hair). "Helmet"/"animal" = silhouette wrong — retake with
bolder form, never lower the bar. Record verdict + reader words in
session notes. `verify_glb` advisory.

## Known failure modes

- Same step1x SDXL cache failure as the garment lane (provision first).
- Hair mesh includes face fragments: the concept leaked a head — tighten
  the negative list, re-roll the seed.

## Unity delivery

Rigid-parent to the head bone (the composite's helmet method) or keep the
SkinnedMeshRenderer sharing SOMA-77 (head-adjacent weights dominate).
Runtime swapping in the character creator = swap the mesh instance.
