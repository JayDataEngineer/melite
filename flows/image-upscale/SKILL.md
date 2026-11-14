# image-upscale (flow mega-skill)

One call: prompt → image → 1080p SeedVR2 upscale. No graph to build,
no card to compose — stage the flow and the user runs it.

## Call shape

```
melite_flow {flow: "image-upscale", prompt: "…", params: {seed: 7}}
```

`prompt` rides TOP-LEVEL (it is the row's one request initial —
`initialValidators: {prompt}`); `seed` and the size channels ride
the overlay bag (`params`) — never the call's top level, where the
envelope law refuses a bare seed. There is NO
`image_model` seat anywhere: the make stage FIXES the generator at
krea-2, cardAdmission has no image-gen seat for the key, and a
stated value is a silent dead letter — never
teach or state it.

`add_stage` has NO flow seat (it stages CARDS by id) — a flow is its
own door. To hand the user an editable bench instead, stage the two
cards the flow composes (`melite_construct add_stage card
"image-gen"`, then `card "upscale-tools"`); that path is manual and
the flow door above is the one call.

The compile gate rides the stage's own validate (`melite_construct`
`validate` — verbatim refusals, zero GPU) before the user presses
Run.

## Knobs

- `prompt` (required) — what to generate, up to 4000 chars. An EMPTY
  prompt refuses at the door; a MISSING prompt RIDES and kills the
  run mid-graph — author it explicitly, every time.
- `seed` (optional) — sampler seed, 0 to 2147483647.
  Numeric strings coerce (`"7"` works); booleans never do. Omit it and
  each stage's card default rules (a fresh take, minted per run —
  never a locked repeat).
- `width`/`height` (optional) — the make canvas (16-step, 256–2048;
  the operator's class is 1344×768).
- `resolution` (optional) — the SeedVR2 target short side (256–2160;
  1080 = the FHD rail; state twice the make short side to double,
  e.g. 1536).

A stated `seed` stamps into the run body, so `_request.json` shows
exactly what ran; an omitted one rides the card defaults.

## What runs

TWO queue stages, one merged run: `make` (the image-gen card on
krea-2 — T2I at the stated canvas, krea-2's own defaults cfg 1,
steps 8, euler/simple) wired to `polish` (the upscale-tools card on
seedvr2-ema) on `$image`. The upscale is ALWAYS on — there is no
bypass knob: a bypass would be a second graph shape needing its own
skill version. The artifact lands under the run id (`${runId}/gen` —
filename_prefix is retired here, SD-4b).

## Craft notes (merged skills)

- Prompt craft: `card:image-gen` + the generator rows
  (`model:krea-2`, `model:z-image` — the bench path picks either;
  the flow row is krea-2).
- Upscale behavior/limits: `card:upscale-tools` (seedvr2_ema ships
  no model docs, so all upscale craft rides the card row).
- One example that compiles:

```json
{
  "flow": "image-upscale",
  "prompt": "a fox at dawn, mist, 35mm",
  "params": {
    "make": { "width": 1344, "height": 768 },
    "polish": { "resolution": 1536 }
  }
}
```
