---
name: gamekit-vo
description: Character VO lines via qwen3-tts CustomVoice - preset voice + locked instruct DNA per character, one line per brick.
---

## Voice identity
One voice per character. Current cast: **scavenger** = voice `aiden` +
instruct DNA "weathered desert survivor, low gravelly timbre".
Per-LINE instruct carries only the emotion ("surprised, warming into relief").

## Casting a voice (export_qvoice)
Flat door with `export_qvoice: true, export_name: <char>_v1` emits a real
`.qvoice` (QVOICE-LITE magic, lands in the run dir + output/voices).
Drive lines THROUGH a cast voice via the voice-studio flow:
`{"yaml":"qwen3-tts-voice-studio","voice_studio_mode":"generate",
"qvoice_path":"<bare input name>","text":"..."}` — NOT form_tts
`voice_file` (that slot wants raw float32 embeddings by design).

## Run (queue door — the only inference door)
Gateway: in-process estate lanes (DSH host; no port — the python gateway is retired).

Cast voice:
Run via the estate tools (melite_flow) — same verb, in-process.

Raw TTS (no cast):
Run via the estate tools (melite_flow) — same verb, in-process.

Poll `GET /v1/flows/status/<run_id>`.

## Deliver
WAV/FLAC -> `data/delivery/unity/audio/vo/<character>/`, manifest rows.
