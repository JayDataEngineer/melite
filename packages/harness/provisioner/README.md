# @infer/dsh-provisioner

Load the inference.cpp media stack into a **vanilla DSH** — extensions,
profiles, and tools, one command each.

## What it mounts (the bundle)

`cordis.patch.yml` (the `dsh.bundle.patch`) inserts into any profile:

| row | package | role |
|---|---|---|
| `infer-estate` | `@melite-plugin/melite-estate` | the estate row: card registry, runs registry + Typert remotes, disclose/manage/skills/load seats, serial queue |
| `infer-tools` | `@melite-plugin/dsh-tools` | tool registry: `melite_discover`, `melite_load`, `melite_construct`, `comfy_manage`, `skill_index`, `skill_read`, `ledger_tail` (+ headless run doors `melite_flow`, `run_status`) |
| `infer-card-view-host/client` | `@melite-plugin/dsh-card-view` | editable action cards in the conversation |
| `infer-card-deck` | `@melite-plugin/dsh-card-deck` | sidebar deck: lanes, drafts, past cards |
| `infer-gallery-host` | `@infer-media/dsh-gallery` | the runs gallery |

All rows name PACKAGES (pnpm `link:` back into this repo) — no baked
absolute paths, so the checkout can move without re-provisioning.
There is no gateway endpoint to configure (the kill, 2026-09-10):
the tools answer in-process over the estate row's ctx seats.

## Install into an existing profile

    dsh plugin --profile <name> add /path/to/inference.cpp/packages/harness/dsh/provisioner

`dsh plugin` runs pnpm, sees the `dsh.bundle` declaration, and joins
the layer stack automatically. Reboot the profile and the tools are live.

## Provision profiles into any DSH_HOME

    pnpm --dir /path/to/inference.cpp/packages/harness/dsh/provisioner exec infer-provision all
    # or after a global link:
    infer-provision all            # renders every profile (inference, headless, estate) + preset
    infer-provision profile headless --dsh-home /tmp/vanilla
    infer-provision profile estate --dsh-home /tmp/vanilla

Rendered profiles keep an EMPTY user layer — every row lives in this
bundle, so `dsh plugin add` and rendered profiles can never drift.

## The two profiles

- **inference** — the studio: dsh-base + dsh-web-app + this bundle. Boot:
  `dsh web --profile inference`. Pick "Inference Studio" in the preset
  dropdown (installed by `infer-provision preset`).
- **headless** — the agent server: this bundle over the plain base. Boot:
  `dsh --profile headless "<task>"` — a one-shot agent with the full
  estate tool surface in-process. For persistent serving wrap it
  (systemd per task, or the task-board cron).
- **estate** — the SDK job server: the estate row over the SDK app.
  Boot: `dsh --profile estate` (driven over stdio JSON-RPC — the
  estate-drive proof).

## Laws honored

- **INFERENCE LAW**: DSH is only the harness — all inference rides the
  estate's serial GPU queue; cards in, stop door out.
- **ENDPOINT LAW**: no second process, no hardcoded endpoints, no
  `MELITE_GATEWAY` — the tools answer over ctx seats in-process.
- Cards/compose live in the engine + estate packages
  (`packages/engines/comfyui-cordis`, `packages/harness/estate-queue`),
  never in DSH-side code.
