# image-upscale (flow mega-skill)

One call: prompt → image → 1080p SeedVR2 upscale. No graph to build,
no card to compose — stage the flow and the user runs it.

## Call shape

```
melite_construct add_stage  flow "image-upscale" (or the two cards:
image-gen + upscale-tools) — the stage is live in the user's cards
tab; the run starts at the user's Run press.
```

The compile gate rides the stage's own validate (`melite_construct`
`validate` — verbatim refusals, zero GPU) before the user presses
Run.

## Knobs

- `image_model` (required) — one of `krea-2`, `z-image`. Picks the
generator family AND its baked graph (krea-2: krea2 CLIP +
qwen_image_vae, cfg 4.5; z-image: AuraFlow shift 3, lumina2 CLIP,
ae.safetensors, cfg 1.0). No other value compiles.
- `prompt` (required) — what to generate, up to 4000 chars. An empty
or missing prompt 4xxes at the door, never on the GPU.
- `seed` (optional, default 42) — sampler seed, 0 to 2147483647.
Numeric strings coerce (`"7"` works); booleans never do.

The `seed` default (42) stamps into the run body when absent, so
`_request.json` shows exactly what ran. `image_model` has no
default — the call names its family, every time.

## What runs

One `make` stage (comfyui): T2I at 1024×1024, 8 steps, then the
SeedVR2 chain to 1080p — chained in-graph, always on. There is no
upscale bypass knob: a bypass would be a second graph shape needing
its own skill version. The upscaled file lands as the run artifact
(`image-upscale-<family>` prefix).

## Craft notes (merged skills)

- Prompt craft: `card:image-gen` + the generator rows
(`model:krea-2`, `model:z-image`).
- Upscale behavior/limits: `card:upscale-tools` (seedvr2_ema ships
no model docs, so all upscale craft rides the card row).
- One example that compiles:

```json
{
  "flow": "image-upscale",
  "params": {
    "image_model": "krea-2",
    "prompt": "a fox at dawn, mist, 35mm",
    "seed": 7
  }
}
```
