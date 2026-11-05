# Melite

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)
[![docs](https://img.shields.io/github/actions/workflow/status/JayDataEngineer/melite/docs.yml?branch=main&label=docs)](https://github.com/JayDataEngineer/melite/actions/workflows/docs.yml)
[![tests](https://img.shields.io/github/actions/workflow/status/JayDataEngineer/melite/tests.yml?branch=main&label=tests)](https://github.com/JayDataEngineer/melite/actions/workflows/tests.yml)
[![Release](https://img.shields.io/github/v/release/JayDataEngineer/melite?include_prereleases)](https://github.com/JayDataEngineer/melite/releases)

Melite is an agent media-creation kit. Users and agents compose cards on a shared bench; the
estate validates the card, queues one run at a time, calls ComfyUI or another engine behind the
engines contract, and serves the resulting artifacts. The architecture is DSH + Cordis +
TypeScript; DSH is the only web host.

## Architecture

- **Layer A — DSH/Cordis harness:** tool surface, shared bench, card view,
  card deck, run registry, Typert remotes, and operator UI.
- **Layer B — engines:** ComfyUI and MCP-backed engines. Layer A calls these
  engines through the `engines` service contract; it does not modify them.
- **Layer C — engine extensions:** first-party ComfyUI packs under
  `vendor/comfyui_extensions/`. Foreign packs are declared and installed by
  the provisioning path.

The agent and developer contract is [`AGENTS.md`](AGENTS.md). Read it before
changing the harness or composing media.

## Install

Prerequisites: Node.js ≥ 22.18 with pnpm ≥ 10 (pnpm is a Node program — enable it with
`corepack enable pnpm`), a ComfyUI you already run, and the `dsh` CLI:

```sh
npm install -g @deepseek-ai/dsh
```

Melite installs engine extensions through ComfyUI-Manager's git-url door and downloads weights
through Manager's model queue. Open both in `<ComfyUI>/user/__manager/config.ini` (Manager's
v3.38 layout — create the file if it is absent) and restart ComfyUI. Manager reads the file once
at startup:

```ini
[default]
security_level = normal-
allow_git_url_install = true
```

This is the full setting for a local engine: the git-url door wants the flag plus a loopback
listen (`--listen 127.0.0.1`, the default for a personal ComfyUI) and is independent of the
tier; the tier itself admits every melite download at `normal-` on a loopback engine. Set
`security_level = weak` only when the engine listens on a shared address and still needs
non-safetensors weights. The estate verifies every downloaded file against its declared
sha256, so the digest gate, not the tier, owns the download boundary. Check the live value
any time with `comfy_manage`'s `status` action: the manager row reports the security line
verbatim.

Seat Melite into a DSH profile — the official DSH way, one command:

```sh
dsh plugin --profile melite add "github:JayDataEngineer/melite#v0.2.2-alpha"
```

Installs are pinned to the release tag — they never move on their own.
To upgrade, run the same command with the newer tag, then restart the
runner. (Releases are cut as `v*` tags with minted asset bundles;
`#main` tracks the unreviewed tip and is not the install door.) The pin
names the newest tag whose root manifest carries a package name: pnpm
refuses a `github:` ref whose manifest has none
(`ERR_PNPM_MISSING_PACKAGE_NAME`), which is why `v0.2.0-alpha` — cut
before that field existed — is not the seat ref.

An estate job server exists as a separate profile (`estate`); one-shot headless agents
are DSH's own surface (`dsh headless "task brief"`), not a melite profile.

## Quick start

1. Seat — the official DSH way, one command:

```sh
dsh plugin --profile melite add "github:JayDataEngineer/melite#v0.2.2-alpha"
```

2. Boot:

```sh
dsh --profile melite
```

The boot binds a port itself and prints the entry token URL; pass `--port` only when a fixed port
is required. The agent seats need one LLM driver — configure it
with DSH's provider mechanism (the DSH documentation owns the row format); until then the studio
runs and the agent tools report themselves unseated.

3. Compose: ask the agent for media, or open a card in the studio — the contract is the next
section.

4. Acquire on missing — no shell step, ever. Missing models and packs install into YOUR engine:
in-app pack installs ride your own ComfyUI-Manager's git-url door, weights land on your engine's
own model folders, and when the estate's store should join the engine's view the attach door
writes `extra_model_paths.yaml` into the engine tree (a restart applies it). The endpoint is
configured by the seat; the attach door and `comfy_manage` status report the live one. The load
payload marks every boarded model and declared pack present or absent; the agent acquires through
`comfy_manage` (`install_extension`, `provision_model`, `acquire_weight`); you acquire from the
card form — the Download prompt beside an undownloaded model, the Install prompt beside a missing
declared pack — and from the run-failure popup, which queues the same doors with live byte
progress.

Estate admins pre-seeding a managed instance use the provisioning CLI (`pnpm run provision`,
`--dry-run` first) — its own documentation is the provision script's header and
[`docs/guide/getting-started.md`](docs/guide/getting-started.md). Model files keep their own
upstream licenses; this repository's license covers the code.

## Composing and running

The browser/chat compose contract is progressive disclosure:

```text
melite_discover → melite_load → melite_construct
```

`melite_construct` authors the shared bench with `read`, `add_stage`, `patch`,
`rewire`, and related verbs. The user watches and edits that bench in the
Cards tab. The user's **Run** press starts inference.

Agents must not curl ComfyUI, hand-build a workflow, or call raw estate
endpoints in this mode. `comfy_manage` is for status and declared resource
management, not generation.

## License

Code: GNU AGPL-3.0-or-later ([LICENSE](LICENSE)). Model weights, LoRAs,
control nets, and other provisioned artifacts keep their own upstream
licenses, which prevail over AGPL for those artifacts — scope and
carve-outs in [NOTICE](NOTICE) (mirrored publicly as [NOTICE.md](NOTICE.md)). Vendored code under `vendor/`
retains its upstream licenses.
