# families-golden.json regold causes

## 2026-09-15 — the h3-timeline DECL gains the MMH3 latent-upscaler provision (late regold)

The provision row (`minimax_h3_latent_upscaler_3d_bf16`, diffusion_models,
LBH-123-AI URL, sha256 4f57821f…) landed in packages/models/h3-timeline
with the V9 regold stroke but the golden was never re-pinned — the wall
went red at HEAD and blocked the pre-commit gate for all later TS work.
Regold adds exactly that 6-line row (verified: diff is the row alone);
the weights were already staged + verified on the engine (690592992
bytes). Walls green after (families-golden 4/4).

## 2026-09-08 — the img-to-mesh tenant flips to the card-id spelling

Card 13 of the card-folder migration (same cause as the catalog
golden regold, same date): the pixal3d/trellis2-native studio
claims join the folder spelling. 18 pins, tenant keys only.
Walls 17/17 after.
