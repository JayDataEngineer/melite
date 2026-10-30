---
name: timeline-craft
description: "Plan and run multi-window H3 timelines — window count vs duration, seam conditioning, audio continuity across windows, in-graph assembly. Use when building a piece longer than one H3 window (max 362 f, ~15 s) or when audio must evolve across the film."
---

# H3 Timeline Craft

## Why windows

One H3 window is `22 + 17k` frames — base 22, step 17, cap
`GRID_MAX_FRAMES = 362` (0.92–15.08 s at the 24 fps doc clock; 362 f is
22 + 17 × 20). Off-grid lengths are REFUSED at the compose door with the
nearest legal value named (`assertGridLength`,
`models/h3/src/timelineContract.ts`) — never silently re-framed. A
longer piece is MORE WINDOWS, never one oversized window.

Every window after the first carries the previous window's seam
AUTOMATICALLY (the compose's own overlap machinery — no carrier node, no
carry knob; a carried window's 22 f generation head IS the seam, which is
why its authored span is `17k`). Drift control is prompt-side, not
knob-side: repeat the subject block verbatim and the ambient bed in every
window (the laws below), and let the engine own the seam geometry.

To append seconds AFTER a finished film — instead of re-tiling — the
extend-video flow anchors a fresh window on the film's last frame and
joins the files; a stated append beyond one window composes N uniform
windows in-chain there too — the extend-flow skill owns that multi-window
contract.

The N-window law (operator order 2026-09-04) is "ONE card = N calls =
ONE run = ONE film" — the lane runs **N** windows (any N, default
templated 4), not strictly 4. Fewer calls hold the last on tail windows
(an airlock hold), so three calls is legal. The card composes the entire
multi-window film in a SINGLE ComfyUI submission (ONE `native.execute`);
windows save their own clips and the film is assembled in-graph, never by
the harness (no ffmpeg, no disk stitch).

## The recipe you do not tune

The card's DECL owns the render recipe — it is the calibrated point, not a
suggestion, and every default is the model's own (judged by the model
package's specs, `packages/models/h3/tests/decl.spec.ts` and
`value-roundtrip.spec.ts`):

- 1344×768 (the carrier floor; a lane that stamps no width rides it),
  euler/simple, **denoise 1**, h264 mp4 crf 19, 24 fps doc clock.
- `shift_video` default **8**.
- `sla_enabled` default **true**, `sla_sparsity` default **0.85** (the
  density the speed LoRA was distilled against; **0.90 is the stated
  speed preset**, ~15 % faster). `attention_backend` (default "comfy
  kitchen attention") is what the engine falls back to when SLA is OFF —
  SLA replaces it while on.
- The audio of a joined film is **48 kHz** (`FILM_AUDIO_RATE`,
  `models/h3/src/actions.ts`) — every window and every join speak one
  rate.
- The distill adapter is a MOD, not a knob: the card's `loras` bag
  (max_stack 4) carries whole rows {id, strength, steps}. ABSENT the bag,
  the family's own catalog default resolves (the merge row —
  `h3_lightx2v_turbo`, strength 0.6, 8 steps, `shift_video` 12 — from
  `mods/loras.ts`); the standalone LightX2V turbos stay pick-only for
  audio/dialogue routes. NEVER hand-write a lora filename or a legacy
  `lora` / `lora_strength` knob: an unknown id refuses at the door, and
  the old flat knobs are not in the schema at all.
- Do not "improve" a render by sending sampler/steps/shift/resolution
  numbers the user did not ask for: omitting rides the card's own values;
  sending the retired numbers (8-step @ 0.95, res_multistep/20, 12/3,
  960×544) stomps the calibrated recipe.

Draft vs production is now the CALLS, not knobs: same recipe rides every
render; a draft is 2–3 short calls, production is the full shot list
(90–124 f windows).

Render time: ~3–6 min/window on a 4090 at the 6-step turbo recipe,
1344×768. Render a short draft first, keep the prompt plan, re-render only
failed windows.

## The prompt law (compose owns it)

Every window prompt carries the family preamble automatically — do NOT
write it yourself: window 1 gets the starter ("establish coherent subject
identity... animate naturally forward"), windows 2+ get the continuation
contract ("no cut, reset, or re-establishment; the incoming protected AV
latent prefix is authoritative...") plus "[Shot N]". Your call text is
ONLY the scene/action — the preamble rides in front at compose time. Bare
text was the drunk-vision drift: the model restarted shots without the
contract.

## Planning the windows

Write the film as a numbered shot list FIRST, one window per shot:

1. `w1 (t2v)` — establish. Same opening line as the film's first shot.
   Its span is `22 + 17k`.
2. `w2..wN (fl2va)` — each continues motion from the previous last frame.
   Prompt the CHANGE, not the scene: the scene is already on screen. A
   carried window's span is `17k` (its 22 f head is the seam).
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
- A joined film needs audio in EVERY window (the concat is audio-bearing);
  the lane muxes per window by default.

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
    "fps": 24, "seed": 42}
}
```

- Spans are FRAMES (start_frame/end_frame) and calls TILE: every call
  starts exactly where the previous one ended (no gaps, no overlaps — a
  gap or overlap is refused, not absorbed).
- The engine renders `22+17k` frames per window, so authored spans are
  NOT interchangeable: the FIRST call (and any `"transition": "cut"`
  call) must be `22+17k` — 90, 107, 124, 141 … — while a carried
  (non-cut) later call is `17k` — 51, 68, 119, 153 … — because its 22 f
  seam is the generation head, not the span. The gate names any violation
  with the nearest legal frame; nothing is silently re-framed.
- The lane runs N windows (any N, default templated 4). Fewer calls hold
  the last on tail windows (an airlock hold), so three calls is legal.
- Audio-guided variant: add top-level `"audio": "/abs/path.wav"` — window 1
  runs the AddGuide variant (the card's `audio` knob resolves to the
  guide-audio branch), later windows chain.
- Same seed across windows = consistent world texture.
- Artifacts (all under `<runId>/`, ComfyUI's counter suffix appended):
  `h3_t4_w<k>_*.mp4` per window (its own clip and its own audio stem),
  `h3_t4_film_*.mp4` the assembled film, and `h3_t4_film_audio_*` the
  film's mixed track.
- Do not name `intent` or `continuity` params — they do not exist; the
  calls themselves are the plan.

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

1. Duration is ARITHMETIC, not the sum of spans: the film's frames are
   `Σ spans − 22 × (windows − 1)` (each carried window's 22 f head is
   trimmed at the join), at the doc clock — `3 × 124 f` is 328 f = **13.67
   s** at 24 fps, not 15.5 s. A measured duration that disagrees with that
   arithmetic is a real finding, not a rounding.
2. Audio: one 48 kHz stream present, no gaps across joins, and the mixed
   track audible on both sides of every seam.
3. Scrub each seam: frame continuity (no teleport), audio bed present on
   both sides, no held-shot freeze (a held shot must keep micro-motion).
4. Re-read the run's `_request.json` when a render surprises you: the doc
   that composed it is the truth of what was sent.
5. The submission's own duration cap (if the piece is for a challenge) is
   the submission's rule — the ENGINE has no 90 s cap; it has the 362 f
   per-window cap and as many windows as you spend.
