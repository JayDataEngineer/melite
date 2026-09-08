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
Gateway: `http://127.0.0.1:33081` (canonical; `:18201` for the manual port; discover live: `ss -ltnp | grep gateway.py`).

Cast voice:
`curl -s -X POST http://127.0.0.1:33081/v1/flows/start -d '{"yaml":"qwen3-tts-voice-studio","voice_studio_mode":"generate","qvoice_path":"<char>_v1","text":"<line>"}'`

Raw TTS (no cast):
`curl -s -X POST http://127.0.0.1:33081/v1/flows/start -d '{"yaml":"qwen3-tts","prompt":"<line>"}'`

Poll `GET /v1/flows/status/<run_id>`.

## Deliver
WAV/FLAC -> `data/delivery/unity/audio/vo/<character>/`, manifest rows.
