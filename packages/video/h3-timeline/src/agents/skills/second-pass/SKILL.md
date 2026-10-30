---
name: second-pass
description: "The h3-timeline post chain behind ONE master switch: second_pass_enabled gates FSR sharpening, FILM interpolation, the SeedVR2 super-res, the refine rider and the latent-upscale route. Read the master FIRST — with it off (the default) every knob below is inert and the film lands straight from the sampler. Root-knob door, not a mod bag."
genre: video
---

# Second pass (the post chain behind one switch) — SPEC

> STATUS: LANDED as code 2026-09-17 (the honest-boolean / engine-truth
> stroke); this SKILL.md is NEW 2026-11-13 (friction report §14.2: the
> agent surface had NO doc for the master, so an agent set
> `sharpen_strength` and got a silent no-op).
> VERIFIED against the tree's own truth: the group, bands and defaults
> below are read off `packages/models/h3/src/schema.ts` (`paramSchema`),
> and the composition arms that fire on them live in
> `packages/models/h3/tests/value-roundtrip.spec.ts` (ARM 4 mounts the
> refine rider; ARM 5 proves master-off composes the plain pass; the
> latent-route describe proves the in-band upscaler mounts only behind
> the master + `upscale_route`).
> NOT yet verified live: a GPU press with the WHOLE chain armed
> (sharpen + interp + super-res together). Each group has code arms; a
> press that walks all of them in one render is owed.

## THE LAW — the master comes first

| param | band / default | meaning |
| --- | --- | --- |
| `second_pass_enabled` | boolean, **false** | the master: off = the whole post chain is inert |

`second_pass_enabled` is the ONLY seat that arms this chain. With it off:

- the leaves are HIDDEN in the studio (every knob below declares
  `visible_when: second_pass_enabled=true`), and
- the compose door gates them HARD — sharpen, interpolation, the
  super-res and the refine rider all read the master FIRST, so a legacy
  doc carrying leaves but no master renders the plain pass.

That is a **silent no-op, not a refusal**: the knob looks applied and is
not. If any knob below matters, `second_pass_enabled: true` is the first
param you set. Setting the leaves alone is the trap this doc exists to
close.

## The four groups (and the route)

### A. FSR sharpening — RCAS on the final pixels

| param | band / default | meaning |
| --- | --- | --- |
| `sharpen_enabled` | boolean, false | arms the sharpening pass; needs the master |
| `sharpen_method` | select, **rcas** | `rcas` \| `adaptive_usm` \| `high_pass` \| `deconvolution` — the kernel |
| `sharpen_strength` | 0–1, step 0.05, **0.3** | 0.3 = natural, 0.5 = crisp, 0.0 = off |
| `sharpen_radius` | 0.5–5, step 0.5, **no default** | the kernel radius; rides `adaptive_usm`/`high_pass`/`deconvolution` only |
| `sharpen_threshold` | 0–1, step 0.05, **no default** | the noise gate; `adaptive_usm` only |
| `sharpen_iterations` | 1–100, step 1, **no default** | the iteration count; `deconvolution` only |

`rcas` (the default) ignores radius/threshold/iterations — they are the
other kernels' dials, so state them only after choosing that kernel.

### B. FILM interpolation — double the frame rate

| param | band / default | meaning |
| --- | --- | --- |
| `interpolate_enabled` | boolean, false | arms interpolation; needs the master |
| `interp_model` | `film_net_fp16.safetensors` \| `rife47.pth` | the weights; FILM is the default |
| `interp_multiplier` | 2–4, step 1, **2** | 2 = double the frame rate; doubles render time |

The frame count multiplies on the way out (24 fps × 2 = 48 fps). Size the
render with that in mind: interpolation is cheap next to the sampler, but
it is not free.

### C. SeedVR2 super-res — the final film, upscaled in pixels

| param | band / default | meaning |
| --- | --- | --- |
| `sr_switch` | boolean, false | arms SeedVR2; needs the master |
| `sr_resolution` | 720–2160, step 360, **1080** | the output HEIGHT in px |
| `sr_model` | `seedvr2_ema_3b_fp16.safetensors` \| `seedvr2_ema_3b_fp8_e4m3fn.safetensors` | fp16 3B default; fp8 is the leaner 3B |

A closed file surface: an off-set value fails at the schema door, never as
an engine 400.

### D. The refine rider — a closing pass with a refiner lora

| param | band / default | meaning |
| --- | --- | --- |
| `refine_lora` | select from the loras catalog, '' = none | the refiner instrument (e.g. `h3_taomate_3step`) |
| `refine_strength` | 0–2, step 0.05, **no default** | overrides the row's strength; rides only when `refine_lora` is set |
| `refine_steps` | 1–10, step 1, **no default** | overrides the row's step count (taomate: 3) |
| `refine_denoise` | 0.05–1, step 0.05, **0.35** | the researched 0.30–0.35 window; 1.0 = full re-denoise (opt-in) |

**No default on strength/steps is deliberate**: the adapter's catalog ROW
owns them, so an unstated dial never silently overrides the instrument's
own operating point. Set them only to deviate.

This rider is the FILM's own closing pass (it applies inside the render),
and it is NOT the `refine` mod bag: that bag is a whole separate run over
a staged clip (see the `refine` skill). They can both exist; they are
different doors.

### E. The latent-upscale route (part of the master's group)

| param | band / default | meaning |
| --- | --- | --- |
| `upscale_route` | `off` \| `latent_2x`, **off** | off = the second pass works at full size; `latent_2x` = pass 1 renders at half size and the learned upscaler doubles the latent in-band |
| `upscale_model` | select, **`minimax_h3_latent_upscaler_3d_bf16.safetensors`** | the one learned 3D-conv checkpoint the estate runs (a single-member closed surface) |

`latent_2x` is the memory lever: half-size pass 1 plus an in-band latent
upscale. It is NOT the same as `scale` on the refine bag and NOT the
`upscale` mod arm (that one resumes a prior chain run's latents).

## How to compose it

1. `second_pass_enabled: true`.
2. Arm ONE or more groups: `sharpen_enabled`, `interpolate_enabled`,
   `sr_switch`, a `refine_lora`, or `upscale_route: latent_2x`.
3. State only the dials you actually want to move. Every unstated dial
   keeps its served default (table above), and the refine rider's
   strength/steps keep the CATALOG ROW's values.
4. Confirm in words before the press: which groups are on, the output
   frame rate, the super-res height, and whether the rider is mounted.

## Things that will bite

- **Leaves without the master** — silent plain pass. The number-one
  failure this doc closes.
- **`sr_switch` without `sr_resolution`** — runs at 1080p; state the
  height you want when the film is not 1080p.
- **Interpolation + a 48 kHz soundtrack** — the audio is carried, never
  resampled; the frame-rate change is video-side.
- **The rider's two dials** — an unstated strength/steps rides the row.
  Deviating from the row is a real decision; say it out loud in the
  confirm step.
- **`upscale_route: latent_2x`** — pass 1 composes at half size by
  design (the sub-gate halves the r2v head); do not also demand a
  full-size pass-1 grid.

## Companion surfaces

- `video-timeline` — the film doc, its windows and the grid law.
- `refine` — the separate-run second pass over ONE staged window.
- `upscale` — the whole-film route over a PRIOR chain run.
- `loras` — the catalog the refine rider's `refine_lora` picks from.
