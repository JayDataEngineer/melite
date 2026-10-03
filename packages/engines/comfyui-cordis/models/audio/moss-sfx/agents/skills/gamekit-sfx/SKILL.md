---
name: gamekit-sfx
description: Gameplay SFX wave through the declared Moss SFX card and shared bench
---

# gamekit-sfx

## Provisioning

Use `pnpm run provision -- verify` and `pnpm run provision -- extensions`
for declared resources.
The current management/provisioning contract is documented in
`dev_docs/tools/comfy-manage.md`; do not invoke a separate downloader or assume a
registry tool from this skill.

## Compose and run

Use `melite_discover` → `melite_load` → `melite_construct`. Add the SFX card
with only the parameters returned by its bundle. Browser sessions stop at the
user's Run press. A sanctioned headless commission may use `melite_flow` and
`run_status`.

The five-event set is intentionally serial. Do not start concurrent audio
model runs or invent a bypass.

## Prompting

Describe one sound per stage: material, action, and space. Use a short,
concrete phrase such as “wet mud footsteps, close microphone.” Read the
current schema for seed, duration, and variation fields.

## Gate and delivery

Judge the returned audio artifact and report its name, seed, and duration.
An external game-kit copy/manifest step is separate from the estate run and
must use its own current verification contract.
