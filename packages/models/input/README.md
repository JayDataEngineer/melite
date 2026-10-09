---
description: Input Prep family, staged source intake for images and audio with optional crop and scale.
kind: package-library
---

# @melite/models-input

The Input Prep family — source intake: attach an image or an audio file (an upload, an asset drop, a prior run's artifact, or an input-dir filename), staged, optionally transformed, and emitted as a media artifact downstream cards wire. The family serves a catalog row (offered, comfyui, genre image) carrying accepts: image and audio.

The input-prep card binds the prep action: audio passes through (LoadAudio → SaveAudio); images ride LoadImage → optional crop → optional scale (method defaults to lanczos) → SaveImage under `<run>/input_prep`. The lane is weightless — no model ever loads — and the wire is pinned to committed goldens. The `source` field is required as stated law (2026-10-10, the DECL audit's gap 4): the bench-write door refuses an absent source first, in the field's voice. This is the one relation word that deliberately overrides blank tolerance, because a source that is still being typed composes nothing.

## Declaration

`src/index.ts` declares the DECL and the `family-input` plugin; `src/actions.ts` owns the prep segment and its typed params.

## Model Experience

#### What the model sees

None — the package contributes no model-visible input. The DECL serves the estate's model catalog (label, description, variants, defaults) and the input-prep card that boards the family; it registers no session events and writes no prompt segments.

#### Token effect

Zero-direct token effect — the package registers a model family and composes engine graphs; it writes no prompt text into any model request.

#### KV Cache effect

Independent — the package contributes no persistent prompt prefix, so registering or removing the family invalidates nothing cached.

## Known Limitations and Deferred Work

- **Required source** — a draft without a staged source refuses at the bench-write door before a run registers; the relation is deliberate, not an oversight.
- **Two media kinds** — accepts image and audio only; anything else refuses at the family surface.
- **Weightless** — no checkpoint and no provisions ride the DECL; every transform is engine node work.
