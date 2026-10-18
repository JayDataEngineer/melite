# What is Melite?

Melite is an agent media-creation kit. You and an agent compose **cards**
— an image, a film, a sound, a mesh, an edit — on a shared **bench**. The
estate validates the card, queues one run, calls ComfyUI or another
engine, and serves the resulting artifacts back to the bench.

## How a session goes

1. You ask for media in chat.
2. The agent finds a card (discover), opens it — parameters, models,
   skills (load) — and constructs it onto the shared bench, where you can
   watch and edit alongside.
3. You press **Run** on the card. The estate queues the run and the
   artifacts land back on the bench.
4. Headless sessions invert the same path: hand the estate a task brief
   and monitor the submitted flow.

## The pieces

| Piece | What it is |
| --- | --- |
| Card | A compose-surface operation — image, film, audio, mesh, edit — with declared parameters, models, and skills. |
| Bench | The shared, live compose state the agent authors and you edit in the Cards tab. |
| Run | One queued engine execution, started by your Run press. |
| Model families | Declared, sha-pinned, provisionable weights — image, video, audio, music, speech, and 3D. |

## Under the hood

Melite runs locally: a DSH-hosted studio (UI, queue, run registry) calls
ComfyUI as its inference engine. Model weights and the engine are
separate, deliberate downloads from the code —
[getting started](/guide/getting-started) walks the provisioning steps.

Where next: [install from a release](/guide/install), or
[composing and running](/guide/composing).
