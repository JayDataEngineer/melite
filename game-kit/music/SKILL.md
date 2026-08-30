---
name: gamekit-music
description: Survival theme music via music3 - three-section structured caption; draft_short iterate, final_long deliver.
---

Deploy: `bash ../../sync.sh`.

## Caption contract (90% of quality)
Plain `Label: text` lines, exactly three sections:
Genre (2-4 tags + era) / Vocal Details (or "instrumental, no vocals") /
Arrangement (instrumentation timeline, bpm, key).

## Run
`curl -s -X POST localhost:33081/v1/pipelines/start -d '{"yaml":"music_survival_theme.yaml"}'`
Iterate ONLY on `preset: draft_short`; render `final_long` once the caption
is locked. Variations = same caption, new seeds.

## Gotcha
The status endpoint may list NO artifacts while the FLAC lands in the run dir -
trust disk (`ls data/runs/<run_id>/`).

## Deliver
FLAC -> `data/delivery/unity/audio/music/`, manifest row appended.