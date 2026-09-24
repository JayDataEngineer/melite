---
name: directing
description: "Timeline-studio card authoring — the director's handbook: the nested document shape, keyframe ordering, ~5s calls, per-seam extend/cut, music/dialogue placement, the plan-and-repair loop."
---

# Directing — the timeline authoring rules

You are DIRECTING a sequence: the user gives keyframes (still images),
a scene description, maybe a music track and dialogue audio. You write
ONE nested JSON `document`; the card does the rest — compile → windows
→ weave → one concatenated video with mixed audio.

## The document

```json
{
  "fps": 24,
  "width": 768, "height": 448,
  "max_window_seconds": 5.5,
  "transition": "extend",
  "calls": [
    {"text": "a slow drone push over the foggy pines at dawn",
     "start_frame": 0, "end_frame": 120, "image": "kf_a.png"},
    {"text": "the camera continues the descent toward the still lake",
     "start_frame": 120, "end_frame": 240}
  ],
  "audio_clips": [
    {"id": "l1", "name": "line_01.flac", "src": "/v1/assets/runs/run-tts1/tts/SaveAudio.0.flac",
     "start_frame": 124, "dur_frames": 82, "text": "We should not be here after dark."},
    {"id": "s1", "name": "boom.flac", "src": "/v1/assets/runs/run-sfx/sfx/boom.flac",
     "start_frame": 60, "dur_frames": 30, "class": "sfx",
     "text": "a sudden explosion rocks the room"},
    {"id": "m1", "name": "score.flac", "src": "/v1/assets/runs/run-m/music/score.flac",
     "start_frame": 0, "dur_frames": 240, "class": "music",
     "text": "a low synth pad, warm and slow"}
  ],
  "keyframes": [
    {"frame": 240, "kind": "image", "source": "kf_b.png"}
  ]
}
```

Every key = a param the family accepts; anything else REFUSES the run.
Calls must tile the timeline exactly — no gaps, no overlaps
(`start_frame` of one = `end_frame` of the previous, frame 0 first).

## Rule 1 — ORDER the keyframes (the frame number IS the order)

You see the stills; the card only sees frame numbers. Sequence them by
VISUAL CONTINUITY: geometry that continues (same horizon line, same
light direction, the closer version of the same subject) goes next.
Where two stills continue one camera move, their calls share a seam
with `transition: extend` (below). Say the ordering OUT LOUD in your
reply before writing the document — the user can drag frames on the
card afterward if they disagree.

- The FIRST still → call 0's `image` (the opening frame).
- A still mid-sequence → a `keyframes` entry at the seam frame (it
  becomes that window's first frame).
- Dialogue audio → an `audio_clips` row (film-time placement —
  NEVER a call field; calls have no audio). Anchor the row's
  `start_frame` where the speech begins.
- Music → an `audio_clips` row with `class: "music"` (film-time
  placement, per window — the bed param is GONE, 2026-09-22; long
  scores ride one long music clip spanning the film).

## Rule 2 — write ~5s calls (H3 attention is non-linear)

H3's attention cost grows faster than linearly with window length: one
12 s window is slower AND worse than two 6 s chained windows. Target
**4–6 s per call** (96–144 frames @ 24 fps). Long unbroken action =
several calls with `transition: extend` seams, not one long call.
`max_window_seconds: 5.5` is the safety net — a longer call you write
by mistake force-cuts with the prompt riding both sides, and the plan's
NOTES will say so (repair it).

## Rule 3 — choose the transition PER SEAM

- `extend` — the camera KEEPS MOVING the same way: long pans, tracking
  shots, continued action, extended descent. The previous window's
  SAMPLED latent tail carries into the next (motion and audio
  phase-locked; the seam replays the tail bit-exact and continues it).
- `cut` — the camera ANGLE changes: wide → close-up, over-the-shoulder,
  new scene. Resets the latent spatial lock; the seam keyframe anchors
  the new shot.

Doc-level `transition` is the default; per-call `calls[i].transition`
overrides the seam INTO that call. Window 0 has no predecessor — its
seam is always cut. Never put a seam KEYFRAME on an extend seam (the
latent chain IS the seam — the plan refuses the conflict).

## Rule 4 — audio

- Music: an `audio_clips` row with `class: "music"` — one long clip
  can span the whole film (it conditions every window it crosses).
  Align shot boundaries to musical beats when you know the track.
- Dialogue: an `audio_clips` row in the calls' frame coordinates (doc time — the card seats it on the film), and its `text` field
  MUST carry the exact spoken words ( unabridged, matching the audio
  take verbatim — generate the line first, then copy its text into
  the row). The words ride the owning window's prompt as a timed
  <d> dialogue tag and move the mouth; the audio supplies the voice.
  A row crossing a seam continues across both windows (same line,
  no restart). One dialogue lane per window: two lines in ONE window
  — only the first conditions lips, the second is overlay-only
  (give each line its own window).
- Every conditioned clip ducks the generated voice -14dB under it at
  film time; the clean source overlays verbatim on top.
- THE NO-SPEECH LAW (2026-09-24, the operator's catch, paid for on
  the BRIEF9 films): the H3 model INVENTS random gibberish speech in
  any window that has neither a dialogue conditioning nor an explicit
  'no speech' indication — an sfx/music bed does NOT save it (the
  bed-conditioned first window gibberished; the dialogue-conditioned
  second was clean). The CARD stamps the indicator itself on every
  window without a dialogue stamp or live ref audios; author the
  speechless shots as ambient-only and never rely on the model
  staying silent on its own.
- THE THREE CLASSES (`class`: dialogue | sfx | music; auto when
  omitted — text -> dialogue, else music). All three go INTO the
  model (its 3 audio inputs, one per class): dialogue's `text` = the
  exact words (the <d> tag moves the mouth); sfx's `text` = the
  timed event (rides overall_soundscape at its onset — the model
  hears the blast and times the visual to it); music's `text` = the
  description (rides non_diegetic_music). Music ducks under
  dialogue+sfx; one lane per class per window.
- THE DOOR GUARD: a dialogue/sfx-stamped window mutes ref audios —
  the pinned window owns its audio conditioning, no accidental
  overlap.

## Rule 5 — the plan-and-repair loop (NEVER skip)

1. Write the document.
2. Dry-run the document — no GPU. THE VERB DEPENDS ON YOUR FACE
   (2026-09-21, the two-face law):
   - **bench face (agent lanes)**: `melite_construct` `validate` —
     it compiles the bench's stages (grid, wires, tiling) and
     answers `compiles`. You have NO `plan_timeline` tool here;
     never go hunting for one — validate IS your dry-run.
   - **maker face (the studio lane)**: `plan_timeline(document)`
     answers the richer report (`unfilled`, `notes`, `windows`).
   When you have both, validate is the cheaper first pass.
3. Repair the document; re-check. Repeat until it compiles clean.
4. `melite_construct` lands the repaired document on the shared
   bench (live in the user's cards tab). THE USER'S RUN PRESS
   starts the render — never yours. Stay on the bench: refine as
   they ask; the run's own status surfaces on the card.

A failed check returns the compile-layer violation list — surface the
ACTUAL error to the user, never a summary.

## Rule 6 — iterate fast, finish slow (turbo LoRA + attention)

The main iteration loop is MANY SMALL FAST GENS, never one long gen:

- Windows stay 4–6 s (Rule 2); draft at `width: 768, height: 448`
  (the draft recipe pill's geometry) with `steps: 8` when a turbo
  row rides the doc (the marriage below), `steps: 10` bare.
- Speed backend: SLA sparse attention is the primary arm (ON by
  default — `sla_sparsity: 0.9`, ≈1.75× with no quality loss). The
  non-SLA arm's solver is `attention_backend: "comfy kitchen
  attention"` (estate-proven; `"pytorch attention"` is the engine's
  enumerated alternative). There is NO sage/sol knob — that was
  folklore, never a served value.
- Turbo LoRAs ride the doc-level `loras` list (applied to every
  window, part of every window's cache key) — USER PICKS from the
  family's catalog, and EVERY row carries its own marriage
  (strength + step count; the service takes steps from the row
  when the doc doesn't pin them — trust the row over folklore):

      "loras": [{"id": "h3_turbo8_v1", "strength": 1.0}]

  (`h3_turbo4_v1` pairs with `steps: 4`; `h3_larryvrh_v4_ema` runs
  6 steps at 1.0; `h3_pk_parasyte` declares 1.5 at 8 steps — the
  arena's operating points, landed with the evidence.) A catalog
  id with no file on disk is a TODO like any source — provision
  once via `comfy_manage` `provision_model` for `h3`, then re-plan.
- The FINAL pass drops the shortcuts: `width: 1344, height: 768`
  (the `final_hd` recipe pill), `steps: 30`, no `loras`. Same calls
  otherwise — windows whose cache key changed simply re-render.

## Gotchas

- A call needs `text` (or `beats` — prompt segments WITHIN the call,
  joined with time markers; never both).
- `knobs` on a call override the doc for that call's window only —
  the wire vocabulary: steps, denoise, sampler_name, sched_name,
  shift_video, shift_audio, the sla_* family, the sharpen_*
  family, the interp_* family, length.
- Draft geometry (768×448) for iteration; 1344×768 for output —
  the family's recipe pills stamp both.
- Sources are the attachment filenames the user gave you — spell them
  exactly; an unwired source is a named TODO, never a silent render.

## Rule 7 — lock identity with refs (the h3-timeline-ref route)

Cast/creature identity across the whole timeline: put "model":
"h3-timeline-ref" and a doc-level refs block. Refs condition EVERY
sampling step of EVERY window — the same face/rig rides every seam
(stronger than keyframes, which pin single frames).

    {"model": "h3-timeline-ref", "document": {
      "refs": {
        "images": ["hero_face.png", "hero_outfit.png"],
        "videos": ["hero_gait_clip.mp4"],
        "image_size": "match"
      },
      "calls": [...]}}

- Cite refs IN THE PROMPT by node ordinals: <Picture 1>, <Picture 2>,
  <Video 1> — order is images, then videos.
- image_size "max" upscales refs to full canvas — best identity,
  several times slower (the node's own warning). "match" (default) is
  the fast lane.
- Refs are DOC-LEVEL only (never per-call) and ride every window.
- Ref AUDIOS (refs.audios) are recognized but refused today — the
  graph builder composes no ref-audio inputs yet (loud, not silent).
- The dry-run plan echoes refs and folds them into each window's
  cache key — same refs + same calls = cache hits; new ref = full re-render.
