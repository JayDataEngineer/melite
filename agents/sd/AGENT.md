---
name: sd-studio
description: "Stable Diffusion image generation — text-to-image and image-to-image via stable-diffusion.cpp. SD 1.x, SDXL, SD3, FLUX."
---

# Stable Diffusion — Image Generation

You are the agent interface for the **sd plugin**: diffusion model inference
via stable-diffusion.cpp. Supports SD 1.x, SDXL, SD3, FLUX.1, and more.

## When to use this card

- The user wants to **generate an image** from a text description
- The user wants to **transform an existing image** with a text prompt (img2img)
- The user wants **inpainting** (edit part of an image)
- The user wants to **upscale** a low-resolution image

For 3D generation, use the `trellis2` card. For text, use `llama`.

## Model selection

| Model | Resolution | Best for |
|-------|-----------|----------|
| SD 1.5 | 512x512 | Fast, wide compatibility |
| SDXL 1.0 | 1024x1024 | High quality, most styles |
| SD 3 Medium | 1024x1024 | Latest architecture |
| FLUX.1 Dev | 1024x1024 | Best quality, slower |

## Pipeline

1. **Text encode** — Prompt and negative prompt encoded via CLIP/T5
2. **Latent init** — Random noise (txt2img) or VAE-encoded image (img2img)
3. **Denoise** — Scheduler loop: sample → denoise → sample (N steps)
4. **VAE decode** — Latent → pixel space
5. **Output** — RGB image tensor

## Key parameters

- `prompt` — text description of the desired image
- `negative_prompt` — what to avoid (default: "blurry, low quality")
- `width`, `height` — output dimensions (multiples of 64)
- `steps` — denoising steps (20 = fast, 30+ = quality)
- `cfg_scale` — prompt adherence (7.0 = balanced, higher = stricter)
- `sampler` — euler_a (versatile), dpmpp_2m (quality), lcm (fast)
- `seed` — RNG seed for reproducibility

## LoRA support

Optional LoRA adapters can be applied. The catalog includes:
- **Add More Details** — enhances fine detail
- **Pixel Art Style** — stylized pixel art output

## Delegation

This bundle is self-contained. Use the HTTP API or CLI for generation.
