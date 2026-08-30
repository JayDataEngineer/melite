# gamekit-ground-textures — tileable ground material lane

Ground/terrain textures for MELD: seamless albedo squares + derived
normal/roughness, delivered as a Unity-ready material set.

## Lane

`game-kit/ground-textures/ground_textures_wave.yaml` — one z-image brick
per texture, **square 1024x1024** (`width`/`height` params exist on the
generate_image family), seeds on the 400-family so a set reads as one
biome. Shared style suffix law per ART-MANIFEST: describe the SURFACE,
never a scene — no objects, no horizon, no directional light.

Prompt law:
- open with `seamless tileable ... ground texture`
- `top-down flat diffuse view, uniform lighting, no shadows`
- palette anchor: desert-dusk ochres, bone-whites, bruise-violet accents
- negative: seams/border/frame/objects/scene/vignette/shadows

## Post-process (CPU, offline — NOT a GPU step)

`python3 scripts/textures/make_tiling.py <albedo.png> -o <outdir>`

1. square-crop if needed, 2. offset-half wrap seam-blend (mirrored
   feather across the wrap lines) -> `_albedo.png`
3. luminance -> height -> sobel normal -> `_normal.png` (OpenGL,
   +Y up)
4. inverted-luminance remap -> `_roughness.png`
5. 2x2 tiled `_sheet.png` + `report.json` (seam metric: mean abs delta
   across the wrap edges; lower is better, judge by eye on the sheet)

## Gate

- gamekit-vision-gate on each `_sheet.png`: tiling reads continuous, no
  visible cross seam, no lighting gradient; retry-once per texture
  (bolder grain / new 4xx seed), else honest FAIL verdict.
- Delivery: category `textures/` in the kit manifest; ingest stages them
  (taste call target folder until the Unity material rework lands).
