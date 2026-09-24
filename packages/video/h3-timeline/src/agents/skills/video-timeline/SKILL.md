---
name: video-timeline
description: "Author multi-shot video on the h3-timeline card — the calls document (text, guides, per-call knobs, the audio_clips D-M-E lanes) and the compose→queue→fix loop."
---

# Skill: authoring multi-shot video (the h3-timeline card)

Domain knowledge for the timeline card — the ONLY card that
produces multi-shot video in a single compose/queue cycle. Use it when
the user wants a VIDEO WITH SHOTS/CUTS/BEATS.

## The card body

The h3-timeline card is a SIMPLE card. The compose tool call carries:

- **model**: `"h3"` (the checkpoint id — the family; the pre-correction id `h3-timeline` still resolves to this same timeline lane)
- **params.calls[]**: one entry per shot — at minimum `text`, `start_frame`, `end_frame`
- (THE BED IS GONE, 2026-09-22 — no `bed_audio` param exists: film
  music rides the MUSIC lane's clips below)
- **params.audio_clips** (optional): the D-M-E rows on the film
  timeline — `[{ id, name, src, start_frame, dur_frames, class?, text }]`.
  `class` = dialogue | sfx | music (auto when omitted: text ->
  dialogue, else music). All three go INTO the model (its 3 audio
  inputs, one per class — it hears voice, blast, score and times the
  picture to them). dialogue `text` = the exact spoken words
  (verbatim from the take): they ride the owning window's prompt as a
  timed <d> tag and drive the mouth. sfx `text` = the timed event
  (overall_soundscape at its onset — the model times the visual to
  the blast). music `text` = the description (non_diegetic_music).
  Crossing a seam continues the clip across both windows; one lane
  per class per window; conditioned clips duck the generated voice
  -14dB, music ducks under dialogue+sfx. THE DOOR GUARD: a
  dialogue/sfx-stamped window mutes ref audios (the pin owns that
  window's audio conditioning).
- **IDENTITY RIDES TEXTS + REFS — there is NO `params.identity`** (the
  admission refuses it LOUD; agent-debt F-2, 2026-09-22: this skill
  once claimed it REQUIRED): character identity across the film lives
  in (a) the per-call texts — every window that shows a character
  names the character sheet slot in prose (`<Picture 1>` / `<Picture 2>`
  with the full description) — and (b) `ref_images` conditioning (the
  character sheets themselves, max 8). A window with no image rail and
  no named slot drifts.
- **NO chaining key** — `params.context` DOES NOT EXIST (the promise was retired 2026-09-24, BRIEF4 defect 35: the docs advertised a latent-strip chain no build ever saved or consumed). Within-run chaining is automatic; across-run is authored by hand (see Continuation below).
- **params.seed** / **params.fps** / **params.width** / **params.height** (optional — omit to use defaults)
- **params.lora_name** / **params.lora_strength** (optional): a lora on the ComfyUI loras mount riding entry[0] of the stack (`h3/<file>.safetensors`, strength default 0.5). The lane's turbo row always rides behind it — declared lane data, not card code.
- Per-call: `image`, `knobs`, `transition`

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

## SEAM LAW (reworked 2026-09-22 — the old carry knob is DEAD)

Every window boundary is a seam, and the seam is AUTOMATIC — never
user-authored lane physics. One knob remains:

- **transition: "extend"** (default): the prior window's audio-video
  latent tail carries into the next window via drift-control
  continuation at a FIXED 22-frame overlap — motion, scene, and audio
  stay continuous, the timeline length stays exact (sum of spans minus
  the overlaps). Nothing to tune; omit it.
- **transition: "cut"** = HARD CUT: the window renders standalone (no
  continuation, nothing carries). For scene changes, time jumps,
  deliberate contrast. Windows 2+ only.

Rules (enforced — tool errors, not advice):
- Calls must tile the timeline exactly: start_frame of one =
  end_frame of the previous, frame 0 first; every call carries its
  own text.
- Window lengths snap to the 17k+5 grid (56/90/124/.../362 frames);
  the card sizes each window from its span — write the span you mean.
- A dialogue line crossing a seam CONTINUES (same line, no restart) —
  place the audio_clips row across the boundary and the card stamps
  both windows.

## Continuation (WITHIN a run — automatic; ACROSS runs — by hand)

WITHIN one film, every window k≥2 chains automatically: the previous
window's raw sampled latent rides the drift-control continuation at a
fixed 22-frame overlap (schedule-matched prefix noise + Soft AV audio
release — no knob, no seam vocabulary). A `transition: "cut"` call is
the one exception: a true fresh window.

ACROSS runs there is NO chaining (2026-09-24: the old `context` /
`h3_context` promise was documentation vapor — no completed film ever
saved a context strip, and the compose never consumed one; BRIEF4
defect 35, where the maker trusted the docs and shipped a deliberate
two-part cut). To extend a story past one run:

1. author part 2 as its OWN film (its own calls document);
2. match the seams by hand — part 2's opening call lands on the visual
   beat part 1 ended on (same setting, wardrobe, lighting);
3. lean on the ref-image rail (`ref_images` with the character sheets)
   for identity across the join — prose-named slots alone drift;
4. a cut-on-action or a fresh establishing shot hides the seam. The
   two-part BRIEF4 film (`run-e42ba0e8b80b` + `run-fcfeb440082b`) is
   the worked example.

## Composing and queuing

The card composes via `melite_construct` `add_stage` (card
`h3-timeline`) — the stage's params ARE the card document contract
(progressive disclosure: the card's schema rides the stage).

The loop (agent law):

1. **COMPOSE**: `melite_construct` `add_stage` with card
   `h3-timeline` and your `params.calls` (seed?, fps?) — the compile
   validates the document (contiguous frame tiling from 0, seam law,
   window budgets; >4 calls → chained runs with `context`). The
   stage is live in the user's cards tab.
2. **RUN**: THE USER'S Run press on the card — never yours.
   NEVER by-pass the queue (INFERENCE LAW).
3. **MONITOR**: the progress on the card (the user watches it run).
4. **FIX**: on error, read the exact error the card reports,
   fix the CARD (not the queue), `patch` the stage. Max 3 retries.
5. **DELIVER**: verify the video bytes with the byte-cheap probe
   below, then `complete_asset_request(run_id, sha16)`.

## The verify recipe (efficiency review 002, §27 — READ THIS)

`ffprobe -show_format -show_streams` DUMPS 50 KB (the executor echoes
the whole film doc in the MP4 metadata). The only probe that ever
runs on a film:

```
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,r_frame_rate <film.mp4>
```

~300 chars out (duration/size/streams — the whole verification).
`melite_view` cannot show mp4 — never call it on a film; ffprobe is
the observe arm.

## The compose flow

The card composes in a single `plugins.compose` call. There are no
endpoint multiplexes for per-window scheduling — the compose dispatcher
resolves the H3 motion context chain initialization for the executor at
hook time.

## Per-window knobs

Any per-call knob (sampler, sampler_steps, shift_video, etc.) can be
overridden inside a call. Knobs NOT in the call inherit from the card-
level params (the card_knobs SSOT — read via tools/code).
