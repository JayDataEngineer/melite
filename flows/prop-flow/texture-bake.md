---
name: texture-bake
description: "Bake textures onto 3D meshes using Step1X-3D texture synthesis"
---

# Texture Bake — Step1X-3D Texture Synthesis

Bake a reference image onto an untextured 3D mesh to produce a fully textured GLB.

## When to use

- You have an untextured mesh (from Trellis, SOMAX, or other 3D generation)
- You have a reference image showing the desired appearance
- You need full UV coverage (not just camera projection)

## Controls

- **model_folder** — path to Step1X-3D-Texture weights
- **mesh_glb** — path to untextured GLB mesh
- **reference_image** — path to reference PNG
- **seed** — diffusion seed (default: 2025)
- **remove_bg** — run background removal on reference (default: false)
- **texture_size** — output atlas resolution (default: 2048)
- **render_size** — multi-view render resolution (default: 2048)

## Tips

- Start with default settings, adjust seed for variation
- Higher texture_size = more detail but more VRAM
- Use remove_bg=true when reference has distracting backgrounds
