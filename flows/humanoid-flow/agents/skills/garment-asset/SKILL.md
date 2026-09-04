---
name: garment-asset
description: "Drive the garment_asset.yaml lane: generate one clothing/armor piece as a standalone SOMA-77-rigged GLB (equipment-matrix volume lane). Use when the user wants clothing, armor, outfits, or equipment pieces generated for game characters."
---

# Skill: garment-asset (the equipment volume lane)

Makes ONE garment per run: concept image -> TRELLIS mesh -> Step1X texture
-> rig transfer from the shared body -> turntable + vision gates. Output is
a STANDALONE `rigged_garment_glb` on the same SOMA-77 skeleton as every
character built on the body prefix — compose in Unity as an extra
SkinnedMeshRenderer sharing the bone hierarchy (MMO pattern), or via the
hero lane's composite.

## The lane

`data/flows/garment_asset.yaml` (served spec space — run by filename).

## The run loop (headless, exact calls)

```bash
# 1. copy per piece (NEVER edit the frozen original in place)
cp data/flows/garment_asset.yaml data/flows/<piece-name>.yaml
# 2. edit ONLY the attachment bricks (see customization)
# 3. validate (GPU-free)
curl -X POST localhost:33081/v1/flows/yaml/validate \
  -H 'content-type: application/json' -d '{"yaml":"<piece-name>.yaml"}'
# 4. run
curl -X POST localhost:33081/v1/flows/start \
  -H 'content-type: application/json' -d '{"yaml":"<piece-name>.yaml"}'
# 5. poll until completed/failed
curl -s localhost:33081/v1/flows/status/<run_id> | jq '.status, .stages[] | {family_id, status}'
```

## THE FROZEN BODY PREFIX LAW (memorize)

Bricks 1-7 (`kimodo_motion` through `somax`) are FROZEN. The cross-run
brick cache keys each brick by family + params + the FULL accumulated
artifact map (`brick_cache.ts computeBrickKey`), so every attachment lane
garment_asset / hairstyle_asset / future slots shares those keys: the body
is paid ONCE, every later run gets bricks 1-7 free (`reused_from` in the
stage status). ONE edited prefix brick forks the cache and silently pays
the whole body chain again. A different body class = a NEW lane family
with its own frozen prefix, never an edit.

## Customization points (attachment bricks only)

- `generate_image` prompt: the garment DETACHED, "hollow inside — no
  body, no mannequin", 45-degree product view, plain background. Match
  `background_color` in the trellis brick to it (gray default).
- `expect` nouns: what a stranger would say seeing the turntable —
  "tunic", "breastplate". NEVER creative names ("the Sunfire Regalia").
- seed: change per retake; keep 42 for cache-neutral first attempts.
- `simplify_target`: 60000 default (F2). 100000 hero pieces.
- Batch = one copy per manifest row; body bricks reuse across all of them.

## KNOWN BUG (2026-08-25): render_glb_views produces washed-out/ghost or BLANK output for step1x-textured + transfer_rig-rigged GLBs (garment run five ghost views; hairstyle run pmt8ghpfdzz0qxp literal blanks, stdev ~0.5) while the software rasterizer renders the same meshes fine. Pixel-stat views before judging content (stdev < 1 = empty render = broken render step, not a bad asset). Fix the render path first; do not iterate silhouettes against broken renders.

## Gate loop (AGENT EYES — blind_read retired 2026-08-25 by operator)

The flow gate brick is GONE from the lane. YOU are the gate now: when
`render_glb_views` completes, call the `describe_image` tool on each
view artifact (OpenRouter `xiaomi/mimo-v2.5`, wired in
`~/.dsh/settings.yaml`). Ask for a factual description of subject +
defects — do NOT lead the witness with "is this a tunic?". Retry once on
empty extraction (~10% reader flake). PASS = a stranger's noun for the
garment (tunic/shirt/kurta/…). FAIL = regenerate with a BOLDER silhouette
or cleaner concept — NEVER lower the bar or add hint nouns. Record the
verdict + the reader's words in your session notes (the run ledger no
longer carries it). `verify_glb` stays advisory (`fail_on: never`) until
garment floors are calibrated; F1 seam-tearing on weight transfer is a
known defect class. Cross-check cue: the three views must agree on ONE
subject — mutually inconsistent reads (legs vs draped form vs sneaker,
seen live 2026-08-25 run pmt81xfhtvrf7z0) mean a broken mesh or render
rig, not a borderline silhouette.

## Known failure modes

- `step1x_texture` OSError `stable-diffusion-xl-base-1.0 not cached`:
  SDXL base missing + Hub unreachable (seen live 2026-08-25, run
  pmt7yay1iqhklf6). Provision the model through the ONE management
  door (`POST /v1/manage` with `{"action": "provision_model", ...}` —
  the C-era `/v1/models/provision` door was cut 2026-09-03) or restore
  network, then re-run — earlier bricks reuse from cache.
- TRELLIS garment comes out blobby: concept image too flat/dark —
  re-shoot the prompt with stronger three-quarter form lighting.

## Unity delivery

FBX via the blender-headless delivery step (delivery-unity.md); the
garment keeps SOMA-77 joint names — add as SkinnedMeshRenderer under the
character's existing bone hierarchy, no retarget needed.
