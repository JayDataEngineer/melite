# inference.cpp

Melite is an agent media-creation kit. Users and agents compose cards on a
shared bench; the estate validates the card, queues one run, calls ComfyUI or
another engine, and serves the resulting artifacts. A card can contain
multi-call compositions such as an H3 film while the current runs seat still
accepts one compiled stage per start.

The current architecture is DSH + Cordis + TypeScript. DSH is the only web
host. The old standalone gateway, Python core, C server, and gateway HTTP
client are retired; they are not alternate launch paths.

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

## Install from a GitHub release

The publish channel is the GitHub release, not a package registry. Every
melite-owned package in a release carries one identical version, and the
release tag is exactly `v<that version>`; the tarball filenames say the
same string. Pre-releases carry a `-alpha.N` suffix on every channel.

Consumers install through the `dsh` CLI over the release assets — the
same sequence `tools/release-rehearsal.mjs` proves on every release
(one command, nine receipts, in a fresh container):

```sh
npm install -g @deepseek-ai/dsh@0.2.0-rc.2   # the profile CLI
corepack enable && corepack prepare pnpm@10.33.2 --activate
```

The plugin verb resolves a profile's packages against release tarballs
(see `release-manifest.json` on the release page). Two dsh runtime
facts the install must honor, both proven by the rehearsal:

- the CLI's profile template pins older member versions; pin
  `@deepseek-ai/dsh-base` and the four members named in the rehearsal
  seed (`tools/release-rehearsal.mjs`, `SKEW_PINNED`) at the CLI's own
  version in dependencies and `pnpm-workspace.yaml` overrides;
- `@deepseek-ai/dsh-web-app` must be a bundle layer of the profile —
  it provides the `webServer` service the melite web plugins wait on.

The web UI boots with `dsh --profile <name> --no-open --port <port>`;
the printed token URL is the entry point (the browser-trust fence
rejects every other first request).

## Quick start

Requirements:

- Node.js and pnpm
- git (with network access for submodules — the vendored engine
  extensions and reference trees ride submodules)
- a reachable ComfyUI instance, or the managed-instance recipe
- `dsh` on `PATH` for profile boot
- the Cordis/DSH reference checkout when implementing framework behavior

Clone with submodules, or initialize them inside an existing checkout:

```sh
git clone --recurse-submodules <repository-url>
# or, inside a plain clone:
git submodule update --init --recursive
```

Install workspace dependencies and render the supported DSH profiles:

```sh
pnpm install
node packages/harness/provisioner/bin/infer-provision.mjs all
```

The provisioner renders `inference`, `headless`, `estate`, and `melite-test`
under `${DSH_HOME:-$HOME/.dsh}/profiles/`. It writes machine-local profile
state; the source of truth remains this repository.

Those two commands do **not** give you a runnable estate. Weights and the
engine are separate, deliberate downloads on a fresh machine. The
provisioning CLI is plain Node — the same commands on Windows, macOS, and
Linux:

```sh
pnpm run provision -- sync        # ComfyUI core + Manager checkout (managed instance)
pnpm run provision -- extensions  # declared packs — installed BY ComfyUI-Manager's
                                   # git-url door, so the engine must be UP first
pnpm run provision -- models      # declared weights — tens of GB, sha-pinned rows
```

`provision models` queues every declared provision (family provisions rows
and variant-cell artifacts) through ComfyUI-Manager; `--dry-run` lists the
plan without downloading. Model files keep their own upstream licenses; this
repository's license covers the code.

Check the configured ComfyUI endpoint and declarations:

```sh
pnpm run provision -- verify
```

If you cloned or moved the checkout, repin the profile paths once:

```sh
pnpm run profile:regen
```

`inference.config.json` is the estate default configuration. The engine reads
its live endpoint from `COMFYUI_URL` or the ComfyUI endpoint file; the current
repository default is `http://127.0.0.1:8188`.

From inside a DSH session, provisioning rides the extension's own tools:
loading a card reports missing weights and packs in the load payload, and
`comfy_manage` installs them (`install_extension`, `provision_model`). No
shell step is part of the product.

Boot the studio:

```sh
dsh --profile inference --port 3088
```

The port is a deployment choice. The test lane conventionally uses `3088`; do
not infer a gateway port from older documentation.

## Composing and running

### Browser/chat sessions

The agent-facing compose contract is progressive disclosure:

```text
melite_discover → melite_load → melite_construct
```

`melite_construct` authors the shared bench with `read`, `add_stage`, `patch`,
`rewire`, and related verbs. The user watches and edits that bench in the
Cards tab. The user's **Run** press starts inference.

Agents must not curl ComfyUI, hand-build a workflow, or call raw estate
endpoints in this mode. `comfy_manage` is for status and declared resource
management, not generation.

### Headless commissions

A headless profile has the delegated execution interface:

```sh
MELITE_HEADLESS=1 MELITE_STATE_ROOT="$PWD" \
  dsh --profile headless "human task brief"
```

Headless sessions may use `melite_flow` to submit a card or named flow and
`run_status` to monitor it. They still cross the same queue and draft-backed
registration path.

## Testing

The repository test plane is Vitest. Package tests live beside their
packages; cross-cutting walls live under `tests/walls/ts`.

```sh
pnpm run test
pnpm run test:coverage
pnpm run test:e2e
pnpm run test:expected
pnpm run test:bench
pnpm run test:snapshot
pnpm run test:web
```

`test:coverage` is the CI coverage command. The e2e tier is mixed: individual
suites gate on their own environment, engine, lane, or `FILM_E2E` conditions;
it is not accurate to describe the whole tier as key-gated. See
[`tests/README.md`](tests/README.md).

Architecture lint is available as:

```sh
pnpm run lint
```

A product-visible tool or card change also updates the relevant recorded-session
snapshot. The coverage policy is described in
`references/deepseek-harness/docs/testing.md` when that external reference
checkout is available.

## Repository map

| Path | Owner |
| --- | --- |
| `packages/harness/` | DSH tools, queue, provisioner, and shared harness contracts |
| `packages/estate/` | DSH-native drafts, runs, media, models, manage, and provisioning seats |
| `packages/engines/` | engine contract and ComfyUI/MCP adapters |
| `packages/{image,audio,video,motion,3d}/` | card and model families |
| `packages/web-kit/` and `packages/web/` | shared UI primitives and DSH web surfaces |
| `vendor/comfyui_extensions/` | first-party Layer C packs |
| `vendor/cordis_plugins/` | pinned Cordis platform packages |
| `references/` | read-only study material; the DSH reference checkout is external |
| `dev_docs/` | developer-local material (untracked): working plan, ledger, audits, runbooks |

## Documentation rules

- Current documentation describes the DSH/Cordis implementation, not a retired
  gateway.
- Historical plans and audits are evidence, not setup instructions.
- The executable declaration or contract owns a list, port, profile, or tool
  vocabulary; prose links to it instead of copying it.
- Update the relevant README and a recorded snapshot when a user-visible
  contract changes.
- Never commit credentials, signed URLs, or machine-specific state roots.

The working plan and the forward-looking work index live in `dev_docs/`
(developer-local, untracked).

## License

Code: GNU AGPL-3.0-or-later ([LICENSE](LICENSE)). Model weights, LoRAs,
control nets, and other provisioned artifacts keep their own upstream
licenses, which prevail over AGPL for those artifacts — scope and
carve-outs in [NOTICE.md](NOTICE.md). Vendored code under `vendor/`
retains its upstream licenses.
