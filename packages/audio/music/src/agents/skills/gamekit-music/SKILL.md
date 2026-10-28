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
**LENGTH LIVES IN `params.lyrics`, not duration** (operator 2026-11-12):
duration is a CEILING — the model ends the song when its plan ends.
Instrumentals need a sequential section-tag roadmap in `lyrics`
(`[intro]` / `[instrumental]` / `[solo]` blocks, one per line,
~20-40s each — repeat blocks to target length; an empty box wraps
~35s), plus "Strictly instrumental. No vocals, no choir, no humming"
in the caption so extended blocks stay voiceless.
Variations = same caption, new seeds.

## Gotcha
The status endpoint may list NO artifacts while the FLAC lands in the run dir -
trust disk (`ls data/runs/<run_id>/`).

## Deliver
FLAC -> `data/delivery/unity/audio/music/`, manifest row appended.
