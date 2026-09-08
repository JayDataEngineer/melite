---
name: melite-voice
description: Voice-actor line generation — qwen3-tts with CustomVoice personas and instruct-text emotion control.
---

Character/VO lines via qwen3-tts. Live-proven pattern.

## Pattern
- CustomVoice = the character persona (name + voice description); keep it stable across a character's lines.
- Emotion via instruct text on the request ("delivered exhausted, half-whispered, after the fight"), not by rewriting the line.
- One line per run; batch a script as sequential runs. Keep lines < ~20s of speech.
- Iterate: adjust the instruct emotion first, voice description second.