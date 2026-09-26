---
name: timeline-craft
description: Plan and run multi-window H3 timelines — window count vs duration, seam conditioning, audio continuity across windows, auto-stitch. Use when building a piece longer than one H3 window (max ~15s) or when audio must evolve across the film.
---

# H3 Timeline Craft

## Why windows

One H3 window is 48-192f (2-8s @ 24fps; the workflow default renders
56f = 2.33s, production 124f = 5.17s) — longer spans are REFUSED by the
tool (a named 400), not advised against. For anything longer — the
challenge cap is 90s — you tile windows: every window after the first
chains from the previous window's audio-video latent tail
(`MotionContextSave` / `MotionContextLoadLatent`), the workflow's own
carry widget
(`carry_latent_frames`, latent slots) controlling how much. On the card
that knob is `calls[i].seam_carry`: 6 = default (~0.8s carried
continuity), 15 ≈ 2s, 0 = hard cut (standalone render). The carried
head is sliced straight out of the latent — no decode/re-encode
roundtrip, colour and motion carry bit-identical — and the stitch trims
the pinned head so nothing double-plays. Join drift is grid-snapped to
0.00ms.

The N-window law (operator order 2026-09-04) is "ONE card = N calls =
ONE run = ONE film" — the lane runs **N** windows (any N, default
templated 4), not strictly 4. Fewer calls hold the last on tail windows
(an airlock hold), so three calls is legal. The card composes the
entire multi-window film in a SINGLE ComfyUI submission
(`h3-film` skeleton, ONE `native.execute`).

## Budget math

- The lane is 1:1 PlagueKind's V7 recipe (operator law; enforced
  statically by `tests/walls/suites/test_h3_renderer_parity.py` — the
  post-flip python parity runner, 21/21 fields): UNET hybrid_fl2va_ref2va_b30-49-int8 + int8_convrot CLIP +
  MiniMaxH3ReferenceToVideo (audio_vae wired, ref_image_size "match"),
  HIS two-LoRA chain — LoraLoader.0
  fl2v_lightx2v_v0.1_dareties_v4_step600 @ 0.4 + LoraLoader.1
  fl2v_lightx2v_turbo_4to8step_768p_v4_step600_dareties @ 0.6 —
  ModelAttentionBackend "comfy kitchen attention",
  euler/simple/6/denoise 1, SigmaShift 8/5, 1344x768, SLA sparse
  attention ON at 0.9 — output VHS h264-mp4 yuv420p crf 19, 24 fps,
  trim_to_audio. NEVER send lora/lora_strength/resolution/sampler/
  steps/shift knobs unless the user names them — omitting rides HIS
  values baked in the templates; sending the old numbers (8step @ 0.95,
  res_multistep/20, 12/3, 960x544) STOMPS his recipe.
- Draft vs production is now the CALLS, not knobs: same recipe rides
  every render; a draft is 2-3 short calls, production is the full
  shot list (90-124f windows).
- 90s cap / ~5.17s = 17 windows max; plan 12-16 to leave headroom.
- Render time: ~3-6 min/window on a 4090 at his 6-step turbo recipe,
  1344x768. Render a short draft first, keep the prompt plan,
  re-render only failed windows.

## The prompt law (compose owns it)

Every window prompt carries HIS preamble automatically — do NOT write
it yourself: window 1 gets the starter ("establish coherent subject
identity... animate naturally forward"), windows 2+ get the
continuation contract ("no cut, reset, or re-establishment; the
incoming protected AV latent prefix is authoritative...") plus
"[Shot N]". Your call text is ONLY the scene/action — the preamble
rides in front at compose time. Bare text was the drunk-vision drift:
the model restarted shots without the contract.

## Planning the windows

Write the film as a numbered shot list FIRST, one window per shot:

1. `w1 (t2v)` — establish. Same opening line as the film's first shot.
2. `w2..wN (fl2va)` — each continues motion from the previous last frame.
   Prompt the CHANGE, not the scene: the scene is already on screen.
3. Last window — land the ending beat; its final frame is the film's
   final frame.

Rules that keep seams invisible:

- Do not cut location/time INSIDE a seam — the seam is continuous motion.
  A location change is fine at a seam only if the motion carries it
  (camera pans away, subject walks through a door).
- Keep subject description IDENTICAL across windows (same wardrobe words,
  same colors). Copy-paste the subject block, never paraphrase.
- Camera: each window continues the previous camera move at its start.
  Start a new camera move mid-window, not at the seam.

## Audio continuity (the hard part)

Each window renders its own audio. Sound must EVOLVE, not restart:

- Window 1 sets the ambient bed in `overall_soundscape` (e.g. rain on
  lanterns, market murmur). Repeat that bed VERBATIM in every window.
- Add one NEW sound layer per window where the story needs it (bell
  enters w3, footsteps w4) — describe it in that window's soundscape.
- Dialogue: one line per window max; keep speakers consistent with
  `<d>[en] ...</d>` notation.
- Music: if you use `non_diegetic_music`, repeat the same music
  description in every window — it regenerates per window, so describe
  the TRACK (instrumentation, tempo), not the moment.

## Running it

Compose with `melite_construct` `add_stage`, `card="h3-timeline",
model="h3-timeline"` + your window plan (no curl):

```
{
  "prompt": "film logline",
  "params": {"calls": [
    {"start_frame": 0,   "end_frame": 90,  "text": "w1 shot"},
    {"start_frame": 90,  "end_frame": 158, "text": "w2 shot"},
    {"start_frame": 158, "end_frame": 209, "text": "w3 shot"}],
    "fps": 24, "seed": 42, "intent": "film", "continuity": "chain"}
}
```

- Spans are FRAMES (start_frame/end_frame) and calls TILE: every call
  starts exactly where the previous one ended (no gaps, no overlaps).
- The engine renders 22+17k frames per window, so authored spans are
  NOT interchangeable: the FIRST call (and any `"transition": "cut"`
  call) must be 22+17f — 90, 107, 124, 141 … — while a carried
  (non-cut) later call is 17f — 51, 68, 119, 153 … — because its 22f
  seam comes from the generation head, not the span. The strict gate
  names any violation with the nearest legal frame; nothing is
  silently re-framed.

- The lane runs N windows (any N, default templated 4). Fewer calls hold
  the last on tail windows (an airlock hold), so three calls is legal.
- Audio-guided variant: add top-level `"audio": "/abs/path.wav"` — window 1
  runs the AddGuide variant (the card's `audio` knob resolves to the
  `h3-film` graph's guide-audio branch), later windows chain.
- Same seed across windows = consistent world texture.
- Artifacts: `window1..N_video_0.mp4` and the final `stitch_video_0.mp4`
  (auto-concatenated, h264+aac 32kHz, faststart, join loudness matched).
- The stitch node needs audio in EVERY window (concat a=1) — the lane
  muxes audio per window by default.

## Verify before shipping

0. `melite_view` first, `ffprobe` second. On the final film the observe
   door answers with no shell of your own: duration, the stream rows, and
   a 4-frame contact sheet you can SEE. Reach for `ffprobe` when you need
   byte-cheap format detail it prints better than the tool row. Note the
   door does NOT report loudness — that verdict is owed from the engine
   (`metadata.audio.loudness`), so do not claim a mix level you have not
   measured. `melite_read` answers "what did this run actually send?" for
   a run's TEXT sidecars (`_request.json`, `_flow.json`) — run-scoped and
   text-only, so it is the door for receipts and `melite_view` is the door
   for pictures.
1. `ffprobe stitch_video_0.mp4` — duration ≈ the sum of the calls'
   spans (the stitch trims each carried head; a 3×124f piece is
   ~15.5s), aac 32kHz stream present, no gaps.
2. `tests/timeline/seam_probe.py <run_dir>` — per-join level step and
   spectral distance vs the within-window control (gated); exit 1 = FAIL.
3. `tests/timeline/freeze_detect.py <run_dir>` — held shots must keep
   micro-motion; join motion ratio vs control (gated).
4. Scrub each seam: frame continuity (no teleport), audio bed present
   on both sides.
5. 90s cap — the stitched file's duration is the submission duration.
