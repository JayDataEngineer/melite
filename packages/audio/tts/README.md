---
description: Text-to-speech card and agent tool over the one qwen3-tts family (Base/CustomVoice/VoiceDesign variants), with preset voices and saved qvoice personas.
kind: package-library
---

# @melite/audio-tts

`@melite/audio-tts` is the speech card plus the `tts` agent tool. One family boards: `qwen3-tts` (the 2026-10-26 Qwen fold merged the dead `qwen3-tts-voicedesign` atom in — its flavors ride as variants; the old addresses survive as cell routes), on the `save` (declared `export`) and `speak` actions. The cardPackages SSOT composes the card from `./card`; the tool registers through melite-tools' cardTools gate from `./tool`.

## Contract

- `./card` — the card definition. Schema: `text` (required — the words to speak), `voice` (one of nine preset speakers, default `ryan`; the literal `"none"` means no preset, which hands timbre to a `.qvoice` persona and refuses loudly when none is loaded), `style_instruction` ("Emotion & Delivery Style" — the 1.7B CustomVoice lanes only; the 0.6B refuses), and `design_prompt` ("Voice Persona & Timbre" — the VoiceDesign lane). Lane topology is declared per family and variant, and the qvoice riders (`QVOICE_RIDERS`, `QVOICE_SAVE_RIDERS`) scope the persona pack to the active lane.
- `./tool` — `buildTtsTool`, the `tts` tool face; preview field `text`; variant addresses ride the model enum so agents pick no matrix variant.
- `.` — the row-mounted composition marker; it registers the card only when the `comfyui` seat exists, and never registers the tool.
- `./package.json` — the manifest.

## Gates

```sh
pnpm --filter @melite/audio-tts exec vitest run
```

## Model Experience

### Request context and condition

The `tts` tool fires an agent request when called; the card conditions a ComfyUI run when composed.

#### What the model sees

The speech model receives the gated text, voice, style, and design values as graph inputs; the agent sees the tool's parameter schema and the caller's values.

#### Token effect

conditional — the schema occupies context only in sessions that register the tool; values ride only tool-call turns.

#### KV Cache effect

append-only — tool-call turns append messages; earlier turns stay byte-identical.

## Known Limitations and Deferred Work

- **Style is 1.7B-only** — `style_instruction` refuses on the 0.6B lanes by declaration, not by fallback.
- **Voice presets are fixed** — the nine speakers are a closed list; new timbres arrive as saved `.qvoice` personas, not schema growth.
