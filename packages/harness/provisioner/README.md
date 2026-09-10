# @infer/dsh-provisioner

Load the inference.cpp media stack into a **vanilla DSH** — extensions,
profiles, and tools, one command each.

## What it mounts (the bundle)

`cordis.patch.yml` (the `dsh.bundle.patch`) inserts into any profile:

| row | package | role |
|---|---|---|
| `infer-tools` | `@melite-plugin/dsh-tools` | tool registry: `model_catalog`, `build_flow`, `refine_draft`, `enhance_prompt`, `provision_model`, `ledger_tail` |
| `infer-card-view-host/client` | `@melite-plugin/dsh-card-view` | editable action cards in the conversation |
| `infer-card-deck` | `@melite-plugin/dsh-card-deck` | sidebar deck: lanes, drafts, past cards |
| `infer-media` | `@infer-media/dsh-media` | inline media previews |
| `infer-gallery-host` | `@infer-media/dsh-gallery` | the runs gallery |

All rows name PACKAGES (pnpm `link:` back into this repo) — no baked
absolute paths, so the checkout can move without re-provisioning. The
gateway endpoint comes from `MELITE_GATEWAY` (default
`http://localhost:33081`, the repo's canonical port).

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
  card-tool surface against the gateway. For persistent serving wrap it
  (systemd per task, or the task-board cron).

## Laws honored

- **INFERENCE LAW**: DSH is only the harness — all inference rides the
  gateway's serial GPU queue; cards in, stop door out.
- **QUEUE LANE LAW**: no hardcoded endpoints; `MELITE_GATEWAY` overrides
  the documented canonical default.
- Cards/compose live in the gateway plugin (`packages/engines/comfyui`),
  never in DSH-side code.
