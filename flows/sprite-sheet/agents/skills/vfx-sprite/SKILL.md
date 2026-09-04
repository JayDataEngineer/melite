---
name: vfx-sprite
description: "Drive the vfx_sprite.yaml lane: generate game particle sprites (smoke, sparks, dust, blood) as opaque-on-black images with a vision recognition gate. Use when the user wants VFX, particle textures, or effect sprites for the game."
---

# Skill: vfx-sprite (the particle-texture lane)

"MOSS SFX for the eyes": same production pattern as the sound-effect lane
(manifest -> text-described events -> seed variations -> contact review),
different medium. Makes ONE opaque sprite on PURE BLACK per run,
recognition-gated. Delivery converts black to alpha.

## The lane

`data/flows/vfx_sprite.yaml` (2 bricks — cheap; batch freely).

## Run loop

```bash
cp data/flows/vfx_sprite.yaml data/flows/vfx_<effect>.yaml
# edit prompt + expect + seed
curl -X POST localhost:33081/v1/flows/yaml/validate \
  -H 'content-type: application/json' -d '{"yaml":"vfx_<effect>.yaml"}'
curl -X POST localhost:33081/v1/flows/start \
  -H 'content-type: application/json' -d '{"yaml":"vfx_<effect>.yaml"}'
curl -s localhost:33081/v1/flows/status/<run_id>
```

## Customization points

- prompt: the EFFECT SUBSTANCE only ("a single soft grey smoke puff"),
  "isolated on a pure solid black background, no ground, no scene".
  One sprite per run — never a sheet, never a scene.
- `expect`: the substance nouns ("smoke", "spark", "flame", "blood
  droplet"). If the reader sees "a scene"/"photograph", the prompt leaked
  environment — regenerate.
- seed: vary for the variation set (3-5 seeds per effect for the
  particle system's random rotation set).

## Delivery (the honest gap)

Image models emit OPAQUE frames; Unity particles need alpha:
- ADDITIVE effects (sparks, fire, magic): black is already transparent
  under additive blend — drop the PNG in as-is.
- MULTIPLICATIVE effects (smoke, dust): needs true alpha — key black to
  alpha at delivery (ffmpeg `geq`/Unity post-processing) until the
  `alpha_key` family lands (to-build, coverage-audit.md #22).
- Flipbook sheets (explosions, dissolves): NOT this lane — video-lane
  short loop -> frame-grab -> pack + loop crossfade (to-build).

## Gate loop (AGENT EYES — blind_read retired 2026-08-25 by operator)

YOU eyeball the sprite via `describe_image` (OpenRouter
`xiaomi/mimo-v2.5`; retry once on empty extraction). PASS = the effect
substance is the subject ("smoke puff"). "A scene"/"explosion photo" =
prompt leaked environment — retake with denser/bolder material, never
lower the bar. For black-background sprites also verify edges
programmatically when precision matters (PIL corner probe; live example
2026-08-25: all corner channels <=5). Record the verdict in session
notes.
