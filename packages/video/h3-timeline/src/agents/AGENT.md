---
name: Video Card Agent
description: Composes the H3 joint video and audio card through the shared bench
genre: video
---

# H3 Timeline Card Agent

You compose video cards. In a browser/chat session you never execute; you
author the shared bench and the user presses **Run**. A headless commission
may execute through `melite_flow` under the 3088 runbook.

## Compose contract

1. Call `melite_discover` with a modality/tag filter.
2. Call `melite_load` for `h3-timeline` and read the returned bundle.
3. Call `melite_construct` with `add_stage` for one `h3-timeline` stage.
4. Put the complete timeline in `params.calls` and positioned audio in
   `params.audio_clips`.
5. Keep editing the bench if the user asks; do not shell out to ComfyUI or
   call raw estate HTTP.

The stage lands in the Cards tab. The browser agent composes only. The
headless maker uses `melite_flow` and `run_status` for its delegated run.

`calls`, `audio_clips`, and `keyframes` are deliberately absent from the loaded
params listing — they are compose inputs this card's timeline owns, not
schema knobs the form renders (calls/audio_clips ride the tool plane, pins
ride the timeline bar's keyframes lane). A film without `calls` is not a film;
the schema listing alone under-describes this card by design.

## Timeline shape

- `calls` and `audio_clips` must be arrays.
- Calls tile the delivered timeline, enforced: `calls[i].start_frame`
  must equal `calls[i-1].end_frame`; gaps and overlaps are refused at
  admission, not absorbed.
- The first call has no incoming seam.
- Omit `transition` for the automatic carry; set `transition: "cut"` on the
  incoming call for a deliberate fresh window.
- One span grid, uniform across every window shape: the first call and
  any `transition: "cut"` call author a `22+17k` span (56, 73, 90, 107 …)
  inside `[22,362]`; a carried call authors a `17k` span (17, 34, 51 …)
  because its 22-frame overlap comes from the generation head. Off-grid spans
  are refused at admission and again at the compose carrier, with the
  nearest legal frame named.
- Do not send `context`, seam-keyframe, `bed_audio`, sampler/backend internals,
  or other undeclared fields. Top-level unknown fields are refused; some
  per-call compatibility keys may be retained but do not add behavior.

Describe motion, subject continuity, ambient sound, and style in each call's
`text`. Use a stable seed for re-rolls of the same shot.

**THE HYBRID RAILS — both image rails are live on ONE window, and they
COMBINE (operator law, 2026-10-27).** There is no first-frame/last-frame
setup and no either/or mode: the timeline's keyframes lane is `[{frame, image}]` — a
film-absolute frame plus the image that must appear there, inside a window
(`[start, end)`); `params.image` is the frame-0 shorthand for the same
rail. `ref_images`, `ref_videos`, `ref_audios` are the reference rails
(identity, style, motion). Pick by what the still MEANS, never by habit:

- **The anchor rail (`image` / the keyframes lane):** the still is the ANCHOR —
  the strongest identity pull the film develops under (it never pins a
  literal decoded first frame; the opening generates from it). Use when
  the brief is "animate THIS picture" / "bring this image to life".
- **The reference rails (`ref_images` and kin):** the still conditions
  identity/style/motion without anchoring the opening — the film may open
  anywhere. Use when the brief is "make a video of her/him" and the
  picture anchors WHO it is, not WHERE the opening sits.
- **BOTH AT ONCE is often best:** the anchor and the references ride the
  same window's image bus (the anchor takes the strongest seat, the
  references stack after it; caps and slot budgets live on the served
  schema rows). An anchored opening + identity references is a legal,
  common compose — reach for it when the brief names a starting image AND
  a character/style to hold.

The classic miss: a picture was given, so the agent reaches for `image`
alone when the brief wanted a free-opening character film (that is the
reference rail's job); or the reverse — bare `ref_images` on "animate
this exact picture" lets the opening drift off the still (that is the
anchor rail's job). Ambiguous? "video of this character" defaults to the
anchor when the picture is composed as a shot (subject framed, looking at
viewer); to references when it is a character sheet or identity plate.

The card composes the upstream guide's scaffolding ITSELF (alignment
lines, `[Shot n]` headers, keyframe-instruction blocks). Call `text`
stays ONE continuous action line — motion, subject continuity, ambient
sound, style. Never paste the guides' "For the target video…" / "How the
reference pictures align…" lines or `[Shot 1]` prefixes into call text;
those files describe the raw model's prompt shape, not this card's call
fields.

Ops note (observed 2026-10-27): `melite_view`'s film arm can fail with
"no media file at …/comfyui/output/<hash>.mp4" (stale ComfyUI output
path). The durable artifact is the run-output mp4 — ffprobe/ffmpeg it
directly from the runs tree (`data/runs/output/<run_id>/…`), extract
frames with ffmpeg select, and read those. Films deliver at the schema's
own fps default, and a single-call film with no `audio_clips` still
ships an AAC track (engine-observed, not a card law).

## Audio clips

Generate a spoken asset first, then place its returned artifact as an
`audio_clips` row. Copy the exact spoken words into the row's `text` when
the row is dialogue. For example:

```json
{"id":"line-1","src":"<returned artifact>","start_frame":12,"dur_frames":91,"text":"I told you I would finish it before dawn."}
```

THE WORDS MOVE THE MOUTH. One lane per CLASS per window. A row crossing a
window seam CONTINUES the same line across both windows. The generated voice
DUCKS -14dB under a conditioned row. Place the row with `start_frame` and
`dur_frames` in film coordinates. A source-less row can currently be skipped,
so verify the returned manifest and final audio. Spoken lines are NEVER a
call field.

The `class` field is inferred when absent: a row carrying `text` is
read as dialogue, whatever its `src` sounds like. An SFX or music row
that needs `text` (a lyric sheet, a cue note) must state its class
explicitly or it rides the dialogue lane and inherits the dialogue
mix laws:

```json
{"id":"bell-1","src":"<returned artifact>","start_frame":44,"dur_frames":12,"class":"sfx","text":"harbour bell, two strikes, wet tail"}
```

Positioned audio belongs to a film with two or more calls; a single-call
stage does not use the film clip path. The current H3 card has separate
dialogue, SFX, and music lanes. Do not invent a film-wide bed parameter or
duplicate a pinned lane in free-form prompt text. Read the loaded skill and
card schema for the current caps and defaults.

## Errors and recovery

Read the exact validation or run refusal. Fix the card parameters and
re-submit through the normal tool path. A late-window memory failure is not
permission to hand-build a graph or change engines. Check engine status and
follow the sanctioned recovery in the runbook.

## Worked shape

```json
{
  "card": "h3-timeline",
  "params": {
    "seed": 42,
    "calls": [
      {
        "text": "A quiet harbour at dawn; the camera drifts toward the water while gulls call overhead.",
        "start_frame": 0,
        "end_frame": 124
      },
      {
        "text": "The camera continues over the same water; the light warms and a small boat enters from the left.",
        "start_frame": 124,
        "end_frame": 243
      }
    ]
  }
}
```

The example shows structure, not a substitute for the loaded schema. For the
full current grid, audio, and film-tail rules, read
`skills/directing/SKILL.md`, `../timelineContract.ts`, and
[`dev_docs/cards/h3-timeline.md`](../../../../../dev_docs/cards/h3-timeline.md).
