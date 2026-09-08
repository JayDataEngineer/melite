# causes — upscale_seedvr2_default

2026-09-07: first golden for the upscale-tools card (seedvr2_t1
submittable arm), captured from the production python renderer
via render('seedvr2_t1', doc, SeedVr2Ema). Pin: seed 42, koi.png
sample input. The loader nodes' calibration inputs (attention_mode,
tile sizes, ...) ride the pin autofill — this lane does NOT strip.

## 2026-09-08 — input re-pointed to the repo fixture (QUEUE LANE LAW)

The case pinned the estate mount path
`/mnt/melite_weights/input/samples/koi.png` — a hardcode that is a
DEAD PATH on estates without the weights mount (the wall failed
"is not a file on this estate" though compose itself was correct).
Re-pointed to `tests/golden_cordis/fixtures/koi.png` (repo-owned
1x1 PNG stub — compose checks existence only; content is engine-side).
The golden re-cut embeds the relative path verbatim
(LoadImage.image rides the raw param — compose resolves for the
existence check, the graph carries the param as-is), so the golden
stays estate-portable. Wall invoked from repo root (standard
invocation) — the relative resolve depends on it, documented here.
