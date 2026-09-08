# video-gen — the generate_video interface card

ONE card, every non-h3 video family (the img-gen pattern): the
submitted model names the family; the card is the interface, the
models are the data. h3/h3-keyframe live on THEIR card (h3-timeline,
the studio surface).

## The boarded families

| family         | lane                                              | required inputs            |
|----------------|---------------------------------------------------|----------------------------|
| `wan-vace`     | Wan2.2 VACE — reference-anchored film             | `reference_image`          |
| `scail2-animate` | SCAIL-2 — drive a reference character w/ a video | `reference_image`, `pose_video` |

Unboarded (no lane data): `ltx-2-3`, `ltx-director-distilled` (no
transformer weights on this estate). They return the day their lane
data is complete — phantom dropdown options are drift.

## Submit shape

```json
{"model": "wan-vace", "params": {
   "prompt": "verb-first MOTION (the reference fixes who/where)",
   "reference_image": "/abs/path/anchor.png",
   "width": 832, "height": 480, "length": 49, "fps": 24,
   "steps": 4, "cfg": 1.0, "seed": 42}}
```

The artifact is ONE h264 mp4 (`wan_vace/gen_*.mp4` / `scail2/gen_*.mp4`).

## Honest edges

- wan-vace rides the Lightning 4-step LoRA by default (steps=4,
  cfg=1); the bare pair wants 20-25 steps at cfg ~5-6.
- scail2 has NO distill LoRA on this estate — 12 steps/cfg 5 is the
  canary shape, not the quality shape (25 steps for real work).
- The VACE module merge is ALL-ratios-1.0 (module wins where its
  tensors exist; the T2V base fills the rest).
- Frames are 4n+1 (the Wan latent grid); the card clamps to 9..121.
