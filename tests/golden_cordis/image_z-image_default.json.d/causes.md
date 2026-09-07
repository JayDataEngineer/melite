# image_z-image_default.json — capture causes

## 2026-09-07 — initial capture (Cordis compose plane, card 1)

Captured from the PRODUCTION python renderer (the image-gen card's
`render("image_t2i", doc, ZImage)`), doc = _step_doc shape with
model defaults (cfg 1.0, steps 8, res_multistep/simple, 1024x1024,
seed 42 pinned, prefix "testrun/gen"). The pin-integrity wall fired
during capture (object_info.json updated without re-stamp — the
pre-existing drift); re-stamped via the documented door (meta now
carries the file's actual sha e97aeaebfdeab788; content untouched).

This golden pins the FIRST TS card port (image-gen / z-image): the
Cordis compose door must produce this graph byte-structurally.
