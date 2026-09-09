---
name: video-timeline
description: "Author multi-shot video on the h3-timeline card — the calls document (text, guides, per-call knobs, the audio_stem bed) and the compose→queue→fix loop."
---

# Skill: authoring multi-shot video (the h3-timeline card)

Domain knowledge for the timeline card — the ONLY card that
produces multi-shot video in a single compose/queue cycle. Use it when
the user wants a VIDEO WITH SHOTS/CUTS/BEATS.

## The card body

The h3-timeline card is a SIMPLE card. The compose tool call carries:

- **model**: `"h3-timeline"`
- **params.calls[]**: one entry per shot — at minimum `text`, `start_frame`, `end_frame`
- **params.audio_stem** (optional): bed audio file or `{file: "path"}`
- **params.identity** (optional but REQUIRED for multi-window films, REQUIRED for continuation)
- **params.context** (optional): a LATENT artifact ref to chain from (e.g. `runs/<prior-run>/h3_context`)
- **params.seed** / **params.fps** / **params.width** / **params.height** (optional — omit to use defaults)
- **params.lora_name** / **params.lora_strength** (optional): a lora on the ComfyUI loras mount riding entry[0] of the stack (`h3/<file>.safetensors`, strength default 0.5). The lane's turbo row always rides behind it — declared lane data, not card code.
- Per-call: `seam_carry`, `image`, `knobs`

ONE card composes ALL windows. One tool call. One queue submission. No per-shot scheduling.

## The calls document

```
calls:
  - text: "shot description — include motion AND sound"
    start_frame: 0
    end_frame: 56
    image: "optional first-frame keyframe filename"
  - text: "next shot description"
    start_frame: 56
    end_frame: 112
```

Guidelines:
- Call lengths snap to the 17k+5 frame grid at 24fps (56, 124, 362...).
- For timelines: describe MOTION and SOUND together — H3 generates both.
- Repeat the ambient soundscape verbatim across windows; add one new layer per window where the story needs it.
- Same seed across a shot's re-renders keeps the world texture.

## SEAM LAW

Every window boundary is a seam. One real knob controls it:
`calls[i].seam_carry` — in latent slots per seam:

- **seam_carry: 6** (default — omit and 6 rides): the prior window's
  audio-video latent tail carries into the next window (exact-carry
  mask, zero VAE round-trip). ~0.8s of motion continuity at the join;
  the carried head is re-rendered then trimmed, so the timeline length
  stays exact. Motion, scene, and audio stay continuous.
- **seam_carry: 0 = HARD CUT**: the window renders standalone (no
  chain, nothing carries). For scene changes, time jumps, deliberate
  contrast. Windows 2–4 only.
- **Higher (up to 64)**: more carried context — 15 ≈ 2s. Stronger
  motion lock for long pans/extended action.

Rules (enforced — tool errors, not advice):
- seam_carry on calls[0] → 400: window 1 has no predecessor.
- Each call's span must be 48–192 frames; outside → 400 naming the call.
- A hard cut can pin an explicit `last_frame` on the PREVIOUS call —
  the cut lands on that exact image. (Implementation pending; the extension
  h3-motion-context v0.3+ preserves last_frame anchors through the chain.)

## Continuation (chaining runs)

A continuation card opens from a prior run's ending:

```
{model: "h3-timeline", params: {context: "runs/<prior-run>/h3_context", ...}}
```

Continuation requires `params.identity` — a continuation has no image
input on its first window; identity is the only text that survives the seam.

The compose dispatcher resolves `context` through the shared artifact primitive (compose/artifact, kind=latent) against the output mount:
the prior run must have `h3_context/clip_*.safetensors` present; the
dispatcher rejects silently with, typically, a 404 (no context → nothing
to chain from). The chain windows then load the prior run's Motion Context
seamlessly.

Combined with `seam_carry` seams inside a run, the fabric is continuous
across runs. Series recipe: each subsequent film sets `context` to the prior run's strip ref
previous run's id.

## Composing and queuing

The card composes via the `h3_timeline_card` tool — the tool the model
receives for this non-form card (progressive disclosure: the tool's
schema IS the card document contract).

The loop (agent law):

1. **COMPOSE**: `h3_timeline_card(intent, calls, seed?, fps?)` —
   validates the document (contiguous frame tiling from 0, seam law,
   window budgets) and returns the durable draft + runPlan (>4 calls →
   chained runs with `context`).
2. **RUN**: submit to the queue start door —
   `POST /v1/flows/start` with `{yaml: "h3-timeline", ...}`.
   NEVER by-pass the queue (INFERENCE LAW).
3. **MONITOR**: `GET /v1/flows/status/<run_id>` every 10s.
   Status: queued → running → completed | error.
4. **FIX**: on error, read the exact error from the status response,
   fix the CARD (not the queue), resubmit. Max 3 retries.
5. **DELIVER**: verify the video bytes (ffprobe duration, md5), then
   `complete_asset_request(run_id, sha16)`.

## The compose flow

The card composes in a single `plugins.compose` call. There are no
endpoint multiplexes for per-window scheduling — the compose dispatcher
resolves the H3 motion context chain initialization for the executor at
hook time.

## Per-window knobs

Any per-call knob (sampler, sampler_steps, shift_video, etc.) can be
overridden inside a call. Knobs NOT in the call inherit from the card-
level params (the card_knobs SSOT — read via tools/code).
