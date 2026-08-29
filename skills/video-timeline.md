---
name: video-timeline
description: "Authoring multi-shot video on the h3-timeline card — the calls document (text/beats, guides, per-call knobs, the audio_stem bed) and the draft→run→fix loop. Use when the user wants a VIDEO WITH SHOTS/CUTS."
---

# Skill: authoring multi-shot video (the h3-timeline card)

Domain knowledge for the timeline card — the ONLY surface that makes
multi-shot video in one run. Use it when the user asks for a VIDEO WITH
SHOTS/CUTS/BEATS (not a single-shot clip: that's the plain video card).

## The document (`params` of the `h3-timeline` stage)

```
calls: [                            # REQUIRED — tiles 0..T exactly
  { text: "shot prompt",            #   prompt = `text` XOR `beats`
    start_frame: 0, end_frame: 192, #   end EXCLUSIVE, contiguous
    image: "artifact",              #   opening still (the window's first frame)
    last_frame: "artifact",         #   closing still (pinned at final frame)
    first_frame_prev_sec: 2,        #   open from the last X s of the PREVIOUS
                                    #   window's rendered video — NOT call[0],
                                    #   and the call must START a window
    clip: "artifact", audio: "artifact",   # guides anchored at the cut
    knobs: {shift_video: 6, sampler: "euler", h3_attention: "sage", ...} } ]
keyframes: [...]                    # optional frame-exact escape hatch
preset, fps, seed, continuity, audio_mode, audio_stem,   # Layer A globals
shift_video, shift_audio, sampler, scheduler, sampling_steps,
h3_attention, h3_fp16_accumulation, h3_torch_compile
```

- Sources are artifact NAMES from upstream stages or uploaded filenames —
  never URLs.
- `beats` inside a call = prompt segments WITHIN it: they join into ONE
  prompt with time markers and NEVER cut; cuts land on CALL boundaries.
- `audio_stem` = the persistent bed: each window is conditioned with ITS
  OWN SLICE of the track (in-point at the window's timeline position,
  same length in time as the window — the bed never restarts at a cut)
  and the whole track mixes under the final cut.
- Unchanged windows REUSE across re-runs (per-window cache keys): edit
  one call, only it (+ its dependents) re-render.

## SEAM LAW (how cuts transition — authored on the card)

Every call boundary is a cut. Two modes, chosen per call:

- **Motion-continuous seam**: set first_frame_prev_sec (1-3 s, 2 proven)
  on the call that STARTS the next window — never call[0]. That window
  OPENS from the last N seconds of the PREVIOUS window's rendered video:
  the prior tail latent is pinned as this clip's opening motion
  (context_steps + first_frame_latent in the graph), the overlap is
  re-rendered inside the new window, and the pinned head is trimmed at
  the join. Motion, scene, and the audio bed carry across the cut — the
  viewer sees one continuous world. Default for narrative flow.
- **Hard cut**: omit the field. The window starts from its own first
  frame; nothing carries over. Use for scene changes, time jumps,
  deliberate contrast. Keep semantic continuity in the same world by
  reusing style words and subject phrasing from the previous call.

Rules:
- The chained window renders span + overlap frames; the in-graph trim
  removes the pinned head (current chain keeps ~19f ≈ 0.8 s per seam) —
  chained tiles land slightly longer than their span. Budget frames
  accordingly when the total duration must be exact.
- With audio_stem, the bed slices per-window at each window's timeline
  position — the music never restarts at a cut, seamless or hard.
- A hard cut can also pin an explicit last_frame on the PREVIOUS call —
  the cut lands on that exact image (frame-exact montage).
- Retakes: changing a call's text or seam field re-renders it and its
  dependents only (per-window cache).

Agent recipe: storyboard as contiguous calls -> chain same-scene shots
with first_frame_prev_sec: 2 -> drop the field at scene changes (or pin
last_frame for a frame-exact cut) -> state in the plan which cuts are
seamless and which are hard.

## CONTEXT ENGINE (continuation across runs)

Every timeline run emits durable per-window context beside the video:
<window>_image_last.png (last rendered frame) and
<window>_latent_last.h3latent (the tail motion latent). window4's context
is the RUN's continuation point.

A continuation card opens from a prior run's ending:

    {yaml: "h3-timeline", continue_from: "<run-id>", calls: [...]}

- continue_from swaps window1 to the load variant and seeds it with the
  prior run's window4 tail latent: motion, scene, and pacing carry into
  the new run's first call. Write the first call's text as a CONTINUATION
  ("the rain has stopped...", not a fresh establishing shot).
- The queue rejects loudly (404) if the prior run has no window4 context
  — fix the run id, never retry blind.
- Combined with first_frame_prev_sec seams INSIDE a run, the fabric is
  continuous across runs: run N's ending is run N+1's opening.
- card.json captures continue_from verbatim; the continuation is
  reconstructable forever from the run dir.
- Series recipe: each episode card sets continue_from to the previous
  episode's run id and ends on a strong, describable final shot.

## ACTION CARD PILOTING (the card is the unit)

The timeline action card composes via the build_pipeline TOOL — the same
composer the GUI uses, with catalog defaults (seed 42, fps 24). It is a
plain tool call, NOT MCP. MCP belongs to the ASSET QUEUE only
(claim_asset_request / complete_asset_request).

The loop (agent law):

1. COMPOSE: build_pipeline(model: "h3-timeline", params: {calls: [...],
   seed: N, fps: 24}). ONE card carries ALL shots — never split a video
   into multiple cards or runs. The tool lands a durable draft; the card
   tile is the artifact of record.
2. RUN: submit the card's params to the queue start door —
   POST /v1/pipelines/start {yaml: "h3-timeline", calls: [...], seed, fps}.
   The run registers card-linked (draft linkage + card.json sidecar +
   write-back on completion).
3. MONITOR: GET /v1/pipelines/status/<run_id> every 10 s. States:
   queued -> running -> completed | error. Plain HTTP.
4. FIX: on error, read the exact stage error from the status doc, fix THE
   CARD's params (prompts, calls, seams), resubmit. Max 3 retries.
5. DELIVER: verify bytes on disk (ffprobe duration, md5), then — for
   queue-born work — complete_asset_request(run_id, sha16 = first 16 hex
   of the artifact's sha256). Never claim delivery without verified bytes.

Rules:
- Catalog defaults fill anything you omit; only author what differs.
- The card draft + card.json sidecar + _request.json mean every run is
  reconstructable forever — do not improvise side channels.
- A re-run of an edited card re-renders only changed calls (per-window
  cache): fix the shot that is wrong, keep the rest.

## The loop

1. Draft `calls` from the user's ask: one call per shot, ~2-8 s each
   (fps 24 → 48-192 frames), contiguous frames.
2. Write params, run. Compile-time refusals are NAMED (`calls[i]...`)
   and the dry-run plan reports unwired sources as TODOs — fix exactly
   what they name, never guess.
3. Retakes: change only the calls that must change.

## Doc-level refs (identity lock, h3-timeline-ref route only)

refs: {images: [...<=10], videos: [...<=4], image_size: match|max} —
reference conditioning on every window (see the card bundle's Rule 6).
Requires "model": "h3-timeline-ref"; on any fl2va route the family
refuses refs loudly. Ref audios are recognized vocabulary but refused
until the graph builder wires them.
