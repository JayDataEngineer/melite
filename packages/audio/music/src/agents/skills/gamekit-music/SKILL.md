---
name: gamekit-music
description: Survival theme music via music3 - three-section structured caption; draft_short iterate, final_long deliver.
---

## Caption contract (90% of quality)
Plain `Label: text` lines, exactly three sections:
Genre (2-4 tags + era) / Vocal Details (or "instrumental, no vocals") /
Arrangement (instrumentation timeline, bpm, key).

## Run (queue door — the only inference door)
Gateway: in-process estate lanes (DSH host; no port — the python gateway is retired).
Compose via `melite_construct` `add_stage` onto the shared bench — the run
starts at the user's Run press (chat lanes; a headless commission's brief
IS that press — melite_flow executes there).
Iterate ONLY at **`duration: 30`**; render the final at `duration: 90–120`
once the caption is locked (no `preset` knob exists — duration is the
draft/final lever; the caption itself rides `params.prompt`).
**LENGTH LIVES IN `params.lyrics`, not duration**: duration is a LEVER for
sung songs (the plan fills toward the cap) — but an INSTRUMENTAL has no
words to carry the clock, so the section tags ARE the roadmap and the
model stops when they run out (blank or lone `[instrumental]` wraps
~20-35s no matter the duration). Long-form formula:
- 8-12 structural tags, one per line, NOTHING on the line or under the
  tags (`[intro]` / `[instrumental]` / `[interlude]` / `[solo]` /
  `[break]` / `[build up]` / `[outro]`) — ~20-40s per movement, repeat
  to target length.
- Vocal Details carries the disarm directive: "Instrumental track — no
  vocals. Strictly non-vocal composition without background humming,
  chops, or synthesized vocal pads."
- Arrangement names lead/rhythm instruments PER SECTION so the take
  doesn't loop or cut short.
- `duration` rides at the max you'll allow — cap only, the roadmap
  decides.
Variations = same caption, new seeds.

## Gotcha
The status endpoint may list NO artifacts while the FLAC lands in the run dir -
trust disk (`ls data/runs/<run_id>/`).

## Deliver
FLAC in the run output dir — hand the artifact path to the asker
(the destination is the caller's product, not this skill's).
