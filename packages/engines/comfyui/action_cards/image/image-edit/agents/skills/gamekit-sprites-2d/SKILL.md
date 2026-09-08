# gamekit-sprites-2d — 2D / 2.5D sprite lane

Sprite sheets, tilesets, and parallax layers for 2D and 2.5D games.
Generation is plain z-image (sheet on a strict grid) -> qwen-img-edit
background removal -> CPU slicing/packing. No new GPU code.

## Lane shape

```
generate_image (z-image, seed 6xx, square, grid-discipline prompt)
  -> edit_image (qwen-img-edit-2511, input_artifact: sheet,
                 prompt: "remove background completely, transparent")
  -> [offline] pack_sprites.py --grid WxH --cols N --rows M
```

Prompt laws:
- tileset: "sprite sheet, NxM grid of square tiles, each cell one
  [terrain/object], uniform cell size, no gaps, no borders"
- character: "sprite sheet, single character, N-frame walk cycle left to
  right, same pose scale every frame, flat side view"
- parallax (2.5D): one layer per brick — far dunes / mid ridge / near
  scrub — "wide seamless horizontal parallax layer, transparent sky"
- shared style suffix per set (registry seed band 6xx); palette anchor:
  desert-dusk ochres, bone-whites, bruise-violet

## Post-process (CPU)

`python3 pack_sprites.py sheet.png --cols 4 --rows 2
  -o outdir [--trim] [--name walk]`

Slices the grid, optional per-frame alpha-trim, packs a shelf atlas,
emits `frames/walk_00.png...`, `walk_atlas.png`, `walk_rows.json`
(TexturePacker-style rows: frame name -> x,y,w,h). Exit non-zero if any
frame is fully transparent or the sheet alpha coverage is <5% (bg
removal failed) — that is the retry trigger.

## Gate

- pack_sprites.py report must pass (no dead frames, alpha coverage sane)
- gamekit-vision-gate on the atlas: each frame recognizable, no bleed
  between cells, consistent silhouette scale across frames
- retry-once per sheet (new 6xx seed), else honest FAIL verdict

## Delivery

Sprites enter the kit as `sprites/` (frames + atlas + rows json).
Consumer wiring (Unity sprite import / Godot) is the consumer repo's
one-line import — this lane delivers standard frames + metadata only.
