# extend-video (flow skill)

One call: more seconds of a clip. The prior plays first, fresh motion
and sound follow, joined into one film — the continuation anchors on
the prior clip's LAST FRAME (taken in-graph), renders at full denoise
(new content, nothing held), and the join is the film tail's own file
law. No graph to build, no card to hand-compose.

## Call shape

The BENCH drive (agent mode — the flow id is NOT a card; add_stage
refuses it, naming the card riders):

```
melite_construct add_stage  card "h3-timeline"  params {
  model: "h3-timeline",
  extend: [{ source_clip, extend_prompt, extend_seconds, seed }]
}
```

The stage lands live in the user's cards tab; run
`melite_construct validate` first (verbatim refusals, zero GPU) and
the run starts at the user's Run press.

The RUN-DOOR drive (headless): `melite_flow {flow: "extend-video",
params: {source_clip, extend_prompt, extend: [{extend_seconds,
seed}]}}` — EVERY param of a flow rides `params`, never the call's
top level (the door refuses a stray top-level key by name: only
bench | card (+model) | flow | stages (+connects/id/description/test)
ride there). The two initials and the whole-bag numeric override
travel together inside `params`, which the door spreads into the
run's start body.

## The seats

- `source_clip` — the prior clip: a stageable video
  (mp4/webm/mkv/mov/m4v/avi). Pick it from an earlier run's artifact
  URL (`/melite-media/runs/<run_id>/<file>.mp4` — the runs list or
  the run's hero film). A browser-local blob/data URL refuses at the
  door (upload first); a `.txt` refuses as not-a-video.
- `extend_prompt` (required) — the continuation text: MOTION and
  SOUND together, picking up exactly where the clip ends. Same law
  as the card's own prompting: one continuous action line, no shot
  prefixes. Repeat the ambient soundscape; add one new layer where
  the story needs it.
- `extend_seconds` (bag only, default 2.33) — seconds appended. Up to
  15.08 = 362f — the largest SINGLE window — the value must land on
  the engine grid (frames become seconds at the schema fps default):
  2.33 = 56f, 3.75 = 90f, 5.17 = 124f. Beyond 362f the door composes
  MULTIPLE windows of
  uniform grid length under a 39-frame context overlap — delivered
  frames = N×w − (N−1)×39 must equal the stated frames EXACTLY, or
  the door REFUSES naming the nearest under/over compositions (state
  one of those delivered seconds instead; the ceiling is 32 windows). 15.79 = 379f composes as
  2×209f−39; 20.00 = 480f refuses (nearest: 464f and 481f — state
  19.333 or 20.042). Off-exact values never snap silently.
- `seed` (bag only, default 0) — the plan base seed. Same seed across
  re-extends of one clip keeps the world texture.

One bench example that compiles:

```json
{
  "card": "h3-timeline",
  "params": {
    "model": "h3-timeline",
    "extend": [
      {
        "source_clip": "/melite-media/runs/3f1c…/extend_film_00001_.mp4",
        "extend_prompt": "the dancer keeps spinning as the tempo lifts, the crowd clapping along",
        "extend_seconds": 2.33,
        "seed": 0
      }
    ]
  }
}
```

## What runs

One `extend` arm on the h3-timeline card: the prior clip loads whole
on the VHS seat (force_rate pinned to the film clock), its last frame rides
the plan's anchor seat AND the r2v reference seats (pixel anchor +
motion identity), the new window generates fresh (all-white mask, full
denoise, fresh audio), and prior + window join through
MeliteConcatVideos — the extended film lands as the run artifact
(`<run_id>/extend_film` prefix). Multi-window extends (stated > 362f)
generate each window's fresh motion carrying the chain's own latent
context across the 39-frame overlap, assemble the IN-CHAIN windows
(`ChainAssemble`, `<run_id>/extend_chain`), then join prior file +
assembly through the concat's `append` member — one film, two join
primitives composed. The prior is never re-edited: that is the
repair/replace door, and one door per doc (extend + replace or
repair or reshoot together refuses loud).

## Craft notes

- When to extend vs re-roll: extend when the clip's take is RIGHT and
  the story needs MORE of it; re-roll (same seed, new prompt) when the
  take itself is wrong. Extending never fixes content — it continues.
- Chained extends: the extended film is itself a stageable clip —
  feed `extend_film` back as the next call's `source_clip`.
  `models/video/h3-timeline/agents/skills/timeline-craft` owns the
  drift-control law for long chains.
- Deeper prompting law: `card:h3-timeline`.
