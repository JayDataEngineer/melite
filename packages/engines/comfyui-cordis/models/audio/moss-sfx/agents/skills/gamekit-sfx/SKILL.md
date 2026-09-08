---
name: gamekit-sfx
description: Gameplay SFX wave via moss-sfx - five-event lane (combat, creature, foley, ambience); serial execution law.
---

Deploy: `./setup.sh extensions` (declared packs: registry via comfy-mcp `install_node`; vendor packs symlinked from `vendor/comfyui_extensions/`). No `sync.sh`, no `data/flows/` — the EXTENSION LAW (extensions DECLARED, never vendored) replaces the C-era `sync.sh` ritual.

## Run
`curl -s -X POST localhost:33081/v1/flows/start -d '{"yaml":"audio_sfx_wave"}'`
Poll `GET /v1/flows/status/<run_id>`. Five bricks run serially ON PURPOSE
(concurrent audio model loads contend and fail).

## Prompting law
- Describe the SOUND, not the scene. "machete blade impact into rotten wood" not "epic battle".
- ONE event per brick. Compound sounds = separate bricks.
- 5-15 word prompts. Material + action + space ("wet mud footsteps, close mic").

## Gate
No blind audio gate exists - judge by ear via the artifact URLs. Present a
contact table (name / seed / duration) to the operator.

## Deliver
Copy FLACs to `data/delivery/unity/audio/sfx/` with descriptive names, then
append rows to `data/delivery/unity/MANIFEST.json` (see unity-delivery/).
