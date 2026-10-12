# upscale-tools — the F-cluster tool card

ONE submittable family + five consumed fragments (the F mandate,
2026-09-04: "tool cards consumed BY other cards, not user submits").
The card is HIDDEN in the form table — it exists so the tool lane
has a queue door and the fragments have a rendering home (models
don't render; cards do).

## The boarded family

| family        | lane                                                | required inputs |
|---------------|-----------------------------------------------------|-----------------|
| `seedvr2_ema` | SeedVR2-3B fp16 diffusion upscale (restore detail) | `input_image`   |

## The consumed fragments (never submitted)

| arm              | lane                                                  |
|------------------|-------------------------------------------------------|
| `basic_resize_t1` | ImageScale — exact W/H resample (lanczos etc)         |
| `pixel_upscale_t1`| ImageScaleBy — multiplier upscale (pixel-perfect)     |
| `rtx_vsr_t1`     | RTXVideoSuperResolution — NVIDIA SDK; RTX stack to run |
| `concat_t1`      | ImageConcatMulti — side-by-side A/B compare           |
| `input_t1`       | LoadImage→SaveImage — the input-prep restage          |

Their families (`concat`, `input`) stay card='' — weightless lanes are not card
families (the wall's honest skip); a consuming card imports the arm
from this renderer. (The `basic_resize`, `pixel_upscale`, `rtx-vsr`
fragment arms died with their families in the 2026-10-12 kill sweep —
their table rows above are lane vocabulary, not live offers.)

Unboarded (documented, not phantom): the seedvr2 7B variants on the
volume (VRAM decision, another day); ltx-era fossils are gone.

## Submit shape

```json
{"model": "seedvr2_ema", "params": {
   "input_image": "/abs/path/frame.png",
   "resolution": 1080, "max_resolution": 4096,
   "batch_size": 1, "seed": 42}}
```

The artifact is ONE restored png (`seedvr2/gen_*.png`).

## Honest no-boards on this estate

- `seedvr2_ema` 7B (fp16 / fp8-mixed-block35): weights exist on the
  volume; 3B fp16 is the proven shape — 7B returns by deliberate
  VRAM decision.
- `rtx-vsr` EXECUTION needs the NVIDIA Video Effects SDK; the arm
  is compose-truth only.
