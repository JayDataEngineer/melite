---
name: gamekit-icons-ui
description: UI icon wave via z-image - four-icon set with identical style suffix, base-seed family, transparent-sprite post-process notes.
---

## Recipe
1. Gen: "<object>, game icon style, centered, plain white background, flat even
   lighting, bold readable silhouette" (+ shared negative prompt). Seeds =
   base family (301..304) - one design per category.
2. Variants: edit the SAME base via qwen-img-edit-2511 lightning
   ("same sword, golden trim") - edits preserve identity better than
   fresh gens.
3. Transparent sprite: qwen-img-edit-2511 "remove background completely".
4. Soft base? upscale via seedvr2_ema.

## Run (queue door — the only inference door)
Gateway: `http://127.0.0.1:33081` (canonical; `:18201` for the manual port; discover live: `ss -ltnp | grep gateway.py`).
`curl -s -X POST http://127.0.0.1:33081/v1/flows/start -d '{"yaml":"z-image","prompt":"icon set wave"}'`
Poll `GET /v1/flows/status/<run_id>`.

## Gate
Vision-check each icon: subject must read instantly at 64px. Regenerate the
individual brick on failure (bricks are independent).

## Deliver
PNGs -> `data/delivery/unity/icons/`, manifest rows.
