# upscale-tools — the F-cluster tool card

ONE submittable family + five consumed fragments (tool cards are
consumed BY other cards, not user submits).
The card is HIDDEN in the form table — it exists so the tool lane
has a queue door and the fragments have a rendering home (models
don't render; cards do).

## The boarded family

| family        | lane                                                | required inputs |
|---------------|-----------------------------------------------------|-----------------|
| `seedvr2-ema` | SeedVR2-3B fp16 diffusion upscale (restore detail) | `input_image`   |

## The consumed fragments (RETIRED)

The fragment arms are DEAD. The unsuffixed arms (`basic_resize`,
`pixel_upscale`, `rtx-vsr`, `concat`, `input`) are gone with their
families, and no source serves the
t1-suffixed spellings either (`basic_resize_t1`, `pixel_upscale_t1`,
`rtx_vsr_t1`, `concat_t1`, `input_t1` — no renderer arm, no tool-lane
row, no boarding). Do not submit, import, or route them: a consuming
card composes its own resample/concat segments in-graph.

Unboarded (documented, not phantom): the seedvr2 7B variants on the
volume (VRAM decision, another day); ltx-era fossils are gone.

## Submit shape

```json
{"model": "seedvr2-ema", "params": {
   "input_image": "/abs/path/frame.png",
   "resolution": 1080, "max_resolution": 4096,
   "batch_size": 1, "seed": 42}}
```

The artifact is ONE restored png (`seedvr2/gen_*.png`).

## Honest no-boards on this estate

- `seedvr2-ema` 7B (fp16 / fp8-mixed-block35): weights exist on the
  volume; 3B fp16 is the proven shape — 7B returns by deliberate
  VRAM decision.
- `rtx-vsr` EXECUTION needs the NVIDIA Video Effects SDK; the arm
  is compose-truth only.
