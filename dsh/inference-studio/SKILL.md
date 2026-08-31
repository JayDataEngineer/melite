---
name: video-timeline
description: "Authoring multi-shot video on the h3-timeline card — the calls document (text/beats, guides, per-call knobs, the audio_stem bed) and the draft→run→fix loop. Use when the user wants a VIDEO WITH SHOTS/CUTS."
---

# Skill: authoring multi-shot video (the h3-timeline card)

> **OPERATOR DIRECTIVE 2026-09-01 — PlagueKind 1:1, 15 seconds.**
> The next timeline video: **15 s** on the delivered lattice — author 4
> calls at `0-90 / 90-179 / 179-268 / 268-357` (= 90+89×3 = 357 f =
> 14.875 s, the closest on-grid 15 s). Parameters ride the t4 template
> defaults — that IS the original PlagueKind workflow 1:1 (turbo-4 LoRA,
> euler/simple, steps 4, cfg 1, shifts 12/3, 768×448, SLA sparse
> attention on: 0.9/32/8192/comfy_kitchen, protect_audio +
> stabilize_motion). **Motion context = seam_carry, and the default 6 is
> the original workflow's carry_latent_frames — DO NOT override it.**
> Send no exotic knobs; every deviation from the template is a deviation
> from 1:1. Do NOT send `context_length` (retired, compose error -17).

Domain knowledge for the timeline card — the ONLY surface that makes
multi-shot video in one run. Use it when the user asks for a VIDEO WITH
SHOTS/CUTS/BEATS (not a single-shot clip: that's the plain video card).

## The document (`params` of the `h3-timeline` stage)

```
calls: [                            # REQUIRED — tiles 0..T exactly
  { text: "shot prompt",            #   prompt = `text` XOR `beats`
    start_frame: 0, end_frame: 192, #   end EXCLUSIVE, contiguous (GRID LAW below)
    image: "artifact",              #   opening still (the window's first frame)
    last_frame: "artifact",         #   closing still (pinned at final frame)
    clip: "artifact", audio: "artifact",   # guides anchored at the cut
    knobs: {shift_video: 6, sampler: "euler", h3_attention: "sage", ...} } ]
keyframes: [...]                    # optional frame-exact escape hatch
preset, fps, seed, continuity, audio_mode, audio_stem,   # Layer A globals
shift_video, shift_audio, sampler, scheduler, sampling_steps,
h3_attention   # (+ every knob in card_knobs.yaml — the SSOT)
```

- `context_length` is RETIRED (compose error -17 since 2026-09-01): it
  belonged to the retired Motion-Context pack. Motion context IS the
  latent chain — control it with `calls[i].seam_carry` (default 6
  slots = 18 pixel frames). Do NOT send `context_length`; the card
  rejects it by name.
- `h3_fp16_accumulation` and `h3_torch_compile` are RETIRED TOO
  (2026-09-01): they were dead knobs — zero consumers in the v7
  templates — and the strict card gate now REJECTS them by name
  (compose error -18 with the JSON path). Any card still carrying
  them is a 4xx, not a silent drop.

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

## SEAM LAW (how cuts transition — machinery, not authored)

Every call boundary after the first is a LATENT-CHAIN seam (the
ComfyUI-H3-Motion-Context pack was RETIRED 2026-08-30; motion context is
now latent chaining between windows, nothing external):

- THE SPINE IS PLAGUEKIND'S OWN CHAIN NODE (2026-09-01 layer law,
  1:1 his pack): MiniMaxH3GeneratedAVMaskedContext — the previous
  window's final JOINT video+audio latent run is copied directly into
  the new window's prefix, both streams protected, audio released over
  8 half-cosine ticks (~0.2 s at H3's 40 Hz audio rate) so the model
  CONTINUES the sound. Valid context runs are 5/22/39/... — the seam
  rides 22. No pixel round trip, no external frames: the chain is
  latent-space end to end.
- Slot law (his Motion-Context pack): window k saves slot k
  (MiniMaxH3MotionContextSaveLatent, run dir h3_context/clip_%05d.
  safetensors), window k+1 loads slot k. `calls[i].seam_carry` tunes
  the carried run; default rides the template.
- THE GLOBAL LAYER IS OPTIONAL (operator: "IT'S LAYER — I can add the
  global layer or not"): with `audio_stem`, his MV node
  (MiniMaxH3SongMaskedAVContext) rides the SAME spine behind the CORE
  lazy If/Else switch and pins the master slice at each window's film
  time (music/dialogue track = Layer A); without it the chain spine
  alone runs and each window GENERATES its own audio. ONE card either
  way — the layer is add/not-add, never two cards.
- The carried head is trimmed at the stitch: every window is delivered
  as exactly its tile (songless seams trim the 22-grid; song seams ride
  the carry) — meta cross-check hard-errors on any drift.
- Executor boundary law: tails travel ComfyUI's own artifact doors —
  save node UI outputs → /view fetch into the run dir → /upload into
  the input dir → chain reads. Relative paths only; the executor is
  containerized and absolute paths vanish into its overlay.
- There is NO per-call seam field. Seams are automatic on every call
  after call[0]. (Hard cuts would need a no-seam window template — not
  built; if asked for, say so.)
- Prompts still own WHAT HAPPENS NEXT: the model renders contradictions
  as unions — open the next call holding the previous closing framing
  for ~2 s (the "airlock"), then move to the new action. A held shot
  with nothing happening renders as a freeze: write in a breath, a
  weight shift, an eyeline change.
- With audio_stem, the bed slices per-window at each window's timeline
  position — the music never restarts at a cut.

## GRID LAW (frame math — author spans the grid can deliver)

H3 samples on the 17k+5 frame grid (5, 22, 39, 56, 73, 90, 107, 124,
141 …). With the latent-chain trim (carry 6 slots = 18 frames), the
DELIVERED lattice is:

- call[0] (no carry): a 17k+5 value — 56, 73, 90, 107 …
- every later call: ≡4 mod 17 — 72, 89, 106, 123, 140 …

AUTHOR spans on those values and the film is exactly what you wrote
(e2e-verified 2026-08-30: 56+89×4 = 412 f = 17.167 s, every seam meta
carried_pixel_frames=18). ONE card carries every call: the gateway
expands the run graph to N windows (up to 128) automatically — never
split a film across runs. Off-grid spans snap to the nearest grid
point (±8 frames max) and the run log states the actual tiling
(`[timeline] latent-chain law: windows=… carry=… trims=[…] tiles=[…]
total=…f/…s`). Budget film length on the grid: a 4-shot ≈15 s film is
56+89×3 = 323 f = 13.46 s, or 73+106×3 = 391 f = 16.29 s.

## CONTEXT ENGINE (continuation across runs)

Every timeline run emits durable per-window context beside the video:
<window>_image_last.png (last rendered frame) and
<window>_tail.pt + .meta.json (the chain tail latent). The LAST
window's context is the RUN's continuation point.

A continuation card opens from a prior run's ending:

    {yaml: "h3-timeline", continue_from: "<run-id>", calls: [...]}

- continue_from stages the prior run's last window tail into the new
  run and seeds window1's chain node with it (run-scoped relative
  path, same artifact doors as intra-run seams): motion, scene, and
  pacing carry into the new run's first call. Write the first call's
  text as a CONTINUATION ("the rain has stopped...", not a fresh
  establishing shot).
- The queue rejects loudly (404) if the prior run has no window tail
  latent — fix the run id, never retry blind.
- Combined with the automatic latent-chain seams INSIDE a run, the
  fabric is continuous across runs: run N's ending is run N+1's
  opening.
- card.json captures continue_from verbatim; the continuation is
  reconstructable forever from the run dir.
- Series recipe: each episode card sets continue_from to the previous
  episode's run id and ends on a strong, describable final shot.

## ACTION CARD PILOTING (the card is the unit)

The timeline action card composes via the **h3_timeline_card TOOL** —
the card's own dedicated tool (registered from the card dir's
tool.json manifest via the card-tools plugin door), obtained through
PROGRESSIVE DISCLOSURE: this skill names it; the model calls it when
the job is a multi-shot video. It is a plain tool call, NOT MCP. MCP
belongs to the ASSET QUEUE only (claim_asset_request /
complete_asset_request).

The loop (agent law):

1. COMPOSE: h3_timeline_card(intent: "one line", calls: [...], seed: N,
   fps: 24, context_length: "22"). ONE card carries ALL shots — never
   split a video into multiple cards or runs. The tool validates the
   card laws (tiling, grid, artifact names) and lands a durable draft;
   the card tile is the artifact of record.
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

## INTERACTIVE REFINEMENT (the Video Studio profile loop)

When the session IS the studio (the `video-studio` DSH preset), the
card is refined CONVERSATIONALLY before it ever runs:

1. Read this skill first. Then TALK the film: propose the calls
   document (shots, spans, seams, layer on/off) as a compact list and
   let the operator adjust in plain words — "make shot 3 longer",
   "drop the music", "hard cut there". Iterate the DOCUMENT, not the
   run: nothing touches the GPU until the operator says go.
2. ONE card when told: POST /v1/pipelines/start
   {"model":"h3-timeline","prompt":"<one line>","params":{"calls":[...],
   "fps":24}} — the model path resolves through card compose (the
   strict gate + queue; never split a film across runs).
3. Monitor GET /v1/pipelines/status/<run_id>; report each window as it
   lands. On error: read the named stage error, fix the card, resubmit
   (max 3).
4. Deliver verified bytes (ffprobe + md5) and offer the competition
   artifacts (below). Retakes re-render only the changed windows.

## COMPETITION ARTIFACTS (droppable workflow PNGs)

Every run can emit PNGs that rebuild the EXACT executed graph on the
ComfyUI canvas (drag-drop; the `prompt` tEXt chunk is the
reconstruction source — video metadata is ignored by the canvas):

    python3 <repo>/plugins/comfyui/engines/comfyui/tools/competition_artifact.py <run_id>

One PNG per window (frame 0 + the graph as the GPU ran it, straight
from ComfyUI's own history). Ship those with the film for any
submission that wants the workflow.

## Doc-level refs (identity lock, h3-timeline-ref route only)

refs: {images: [...<=10], videos: [...<=4], image_size: match|max} —
reference conditioning on every window (see the card bundle's Rule 6).
Requires "model": "h3-timeline-ref"; on any fl2va route the family
refuses refs loudly. Ref audios are recognized vocabulary but refused
until the graph builder wires them.
