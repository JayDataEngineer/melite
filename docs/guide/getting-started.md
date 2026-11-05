# Getting started

From a seated profile to your first media. The seat itself is one
command — see [install](/guide/install).

## Boot

```sh
dsh --profile melite
```

The boot binds a port itself and prints the entry token URL. The
agent seats need one LLM driver — configure it with DSH's provider
mechanism.

## Compose

Ask the agent for media, or open a card in the studio. The agent
lands the flow on the shared bench, live in your cards tab; you edit
alongside it, and runs start at your run press on the card. The
compose contract is [composing and running](/guide/composing).

## Acquire on missing — no shell step

Missing models and packs install into your engine, in-app:

- the load payload marks every boarded model and declared pack
  present or absent
- the agent acquires through `comfy_manage` (install_extension,
  provision_model, acquire_weight)
- you acquire from the card form — the Download prompt beside an
  undownloaded model, the Install prompt beside a missing declared
  pack — and from the run-failure popup, which queues the same doors
  with live byte progress

Packs install through your ComfyUI-Manager's git-url door; weights
land on your engine's own model folders; the estate verifies every
downloaded file against its declared sha256.

## Your own LoRAs — upload once, they ride with a skill

The ComfyUI Manager sidebar in the studio carries a LoRAs section:
"Copy a LoRA in" takes a file you already have
(.safetensors/.ckpt/.pt/.bin/.gguf — or drop it on the field) and
copies it, never fetches, into the family you name. The row seats at
once; the door's own reply states whether the engine wants a restart
for it.

The seated LoRA then appears in that family's lora mod slot on the
card — pick it, set its strength, compose.

And it comes with a skill: hand the agent your trigger words and
examples, and it writes the LoRA's skill (naming the row it applies
to) into the estate's authored-skill plane. Every later session
discovers that skill through the skill index — the trigger words are
yours to state, never invented.

## Estate admins — pre-seeding a managed instance

The provisioning CLI is plain Node — the same commands on Windows,
macOS, and Linux:

```sh
pnpm run provision -- init-store   # lay the empty model store
pnpm run provision -- sync         # ComfyUI core + Manager checkout
pnpm run provision -- extensions   # declared packs — the engine must be UP first
pnpm run provision -- models       # declared weights — tens of GB, sha-pinned rows
```

`--dry-run` lists the plan without downloading; `pnpm run provision
-- verify` checks the configured ComfyUI endpoint and declarations.
This is an admin tool for pre-seeding managed instances — consumer
installs never touch it. Its full documentation is the provision
script's header.

## Weights and the engine are not included

An install ships code. Model weights and the ComfyUI engine are
separate, deliberate downloads — the acquire doors above are the
consumer path. Model files keep their own upstream licenses; see
[license](/guide/license).
