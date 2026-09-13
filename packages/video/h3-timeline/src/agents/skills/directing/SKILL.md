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
  "preset": "draft_02mp",
  "max_window_seconds": 5.5,
  "audio_stem": "music.mp3",
  "transition": "extend",
  "calls": [
    {"text": "a slow drone push over the foggy pines at dawn",
     "start_frame": 0, "end_frame": 120, "image": "kf_a.png"},
    {"text": "the camera continues the descent toward the still lake",
     "start_frame": 120, "end_frame": 240, "audio": "line_01.wav"}
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
- Dialogue audio → the OWNING call's `audio` (in-point at the call's
  start; anchor the call where the speech begins).
- Music (one long track) → the doc-level `audio_stem`, NEVER per-call.

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

- `audio_stem` (music): sliced per window IN TIME — the bed never
  restarts at a cut. Align shot boundaries to musical beats when you
  know the track.
- Dialogue: per-call `audio` at the speech onset; write that call's
  text to MATCH what is being said (you can hear the WAV).
- The stem is mixed UNDER the windows' own audio — global music +
  local dialog/SFX.

## Rule 5 — the plan-and-repair loop (NEVER skip)

1. Write the document.
2. `plan_timeline(document)` — dry-run, no GPU. Read:
   - `unfilled` — keyframe/call sources that resolve to nothing → wire
     them or drop them (`ready: false` REFUSES the run);
   - `notes` — snap reports (a 21-frame clip guide snaps to 5), forced
     overflows (a call too long for any window), carry snaps;
   - `windows` — the render plan (lengths, feeds, carry math).
3. Repair the document; re-plan. Repeat until `ready: true`.
4. `submit_timeline_run(document)` → `get_run_status(run_id)`.

A failed plan returns the compile-layer violation list — surface the
ACTUAL error to the user, never a summary.

## Rule 6 — iterate fast, finish slow (turbo LoRA + attention)

The main iteration loop is MANY SMALL FAST GENS, never one long gen:

- Windows stay 4–6 s (Rule 2), `preset: "draft_02mp"`,
  `sampling_steps: 10`.
- Speed backend ONCE at doc level: `h3_attention: "sage"`
  (alternatives `"sol"`, `"kitchen"` — ONE at a time; omit on the
  final pass).
- Turbo LoRAs ride the doc-level `loras` list (applied to every window,
  part of every window's cache key). Pair the LightX2V distill with its
  step count and keep strength 0.75–1.0:

      "loras": [{"name": "minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16",
                 "strength": 1.0}]

  (`...4step_v1.1_768p...` pairs with `sampling_steps: 4`.) A name
  with no file on disk is a TODO like any source — provision once via
  `comfy_manage` `provision_model` for `h3`, then re-plan.
- The FINAL pass drops the shortcuts: `final_hd` preset,
  `sampling_steps: 30`, no `h3_attention`, no `loras`. Same calls
  otherwise — windows whose cache key changed simply re-render.

## Gotchas

- A call needs `text` (or `beats` — prompt segments WITHIN the call,
  joined with time markers; never both).
- `knobs` on a call override the doc for that call's window only
  (sampling_steps, sampler, scheduler, shift_video, shift_audio,
  h3_attention, h3_fp16_accumulation, h3_torch_compile).
- Draft preset (`draft_02mp`) for iteration; `final_hd` for output.
- Sources are the attachment filenames the user gave you — spell them
  exactly; an unwired source is a named TODO, never a silent render.

## Rule 6 — lock identity with refs (the h3-timeline-ref route)

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
