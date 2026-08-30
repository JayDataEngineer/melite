---
name: gamekit-icons-ui
description: UI icon wave via z-image - four-icon set with identical style suffix, base-seed family, transparent-sprite post-process notes.
---

Deploy: `bash ../../sync.sh`.

## Recipe
1. Gen: "<object>, game icon style, centered, plain white background, flat even
   lighting, bold readable silhouette" (+ shared negative prompt). Seeds =
   base family (301..304) - one design per category.
2. Variants: edit the SAME base via qwen-img-edit-251 ("same sword, golden
   trim") - edits preserve identity better than fresh gens.
3. Transparent sprite: qwen-img-edit "remove background completely".
4. Soft base? upscale via seedvr2_ema.

## Run
`curl -s -X POST localhost:33081/v1/pipelines/start -d '{"yaml":"icons_ui_wave.yaml"}'`

## Gate
Vision-check each icon: subject must read instantly at 64px. Regenerate the
individual brick on failure (bricks are independent).

## Deliver
PNGs -> `data/delivery/unity/icons/`, manifest rows.