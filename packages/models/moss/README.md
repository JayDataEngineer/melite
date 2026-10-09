---
description: MOSS text-to-speech family on the audio_cpp engine — the Nano TTS, VoiceGenerator voice-design, and Local Transformer routes.
kind: package-library
---

# moss

moss registers the MOSS text-to-speech family (label "MOSS", genre `audio`, engine `audio_cpp`, source huggingface audio-cpp/audio.cpp-gguf) as a run-route declaration: three variants, no actions, no defaults, no lane inputs. The engine lane serving each route owns the graph.

## Routes

- `tts` — route `moss-tts`, cell filename MOSS-TTS-Nano-100M-GGUF: the 100M Nano TTS checkpoint.
- `voicegen` — route `moss_voicegenerator`, cell MOSS-VoiceGenerator-GGUF: voice design from a description.
- `tts-local` — route `moss-tts-local`, cell MOSS-TTS-Local-v1.5-GGUF: the Local Transformer v1.5 checkpoint.
- `default` recipe — no-op stamp.

MOSS-SFX v2 is a different architecture and is deliberately absent from this family: it lives in the sibling moss-sfx package and is never a variant here.

## Model Experience

### Request context and condition

Cards bind this family by id and pick a route; voice text, speaker hints, and generation settings belong to the audio_cpp lane that serves the route.

#### What the model sees

Undeclared here — the DECL names no params or weights; the serving lane owns the graph and its inputs.

#### Token effect

None — the package contributes no model-visible input.

#### KV Cache effect

Independent — nothing shared is declared.

## Known Limitations and Deferred Work

- **No action surface** — the family cannot tune the TTS lanes; everything rides the engine's own vocabulary.
- **Route-only registration** — no provisions are declared; the GGUF files' downloads are the engine rail's business.
- **Live behavior unobserved** — not verified against the running model.

Exports: the plugin root, `./package.json`.
