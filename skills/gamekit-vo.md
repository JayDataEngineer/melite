---
name: gamekit-vo
description: Character VO lines via qwen3-tts CustomVoice - preset voice + locked instruct DNA per character, one line per brick.
---

Deploy: `bash ../../sync.sh`.

## Voice identity
One voice per character. Current cast: **scavenger** = voice `aiden` +
instruct DNA "weathered desert survivor, low gravelly timbre".
Per-LINE instruct carries only the emotion ("surprised, warming into relief").

## Casting a voice (export_qvoice — WORKING since 2026-08-25)
Flat door with `export_qvoice: true, export_name: <char>_v1` emits a real
`.qvoice` (QVOICE-LITE magic, lands in the run dir + output/voices).
Drive lines THROUGH a cast voice via the voice-studio door:
`{"model":"qwen3-tts-voice-studio","voice_studio_mode":"generate",
"qvoice_path":"<bare input name>","text":"..."}` — NOT form_tts
`voice_file` (that slot wants raw float32 embeddings by design).
Upload a .qvoice first via /comfyui/upload/image with type "input".

## Run
`curl -s -X POST localhost:33081/v1/pipelines/start -d '{"yaml":"vo_scavenger_lines.yaml"}'`

## Deliver
WAV/FLAC -> `data/delivery/unity/audio/vo/<character>/`, manifest rows.