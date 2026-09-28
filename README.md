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

The canonical documentation map is [`docs/README.md`](docs/README.md). Start
with [`AGENTS.md`](AGENTS.md) before changing the harness or composing media.

## Quick start

Requirements:

- Node.js and pnpm
- a reachable ComfyUI instance, or the managed-instance recipe
- `dsh` on `PATH` for profile boot
- the Cordis/DSH reference checkout when implementing framework behavior

Install workspace dependencies and render the supported DSH profiles:

```sh
pnpm install
node packages/harness/provisioner/bin/infer-provision.mjs all
```

The provisioner renders `inference`, `headless`, `estate`, and `melite-test`
under `${DSH_HOME:-$HOME/.dsh}/profiles/`. It writes machine-local profile
state; the source of truth remains this repository.

Check the configured ComfyUI endpoint and declarations:

```sh
./setup.sh verify
./setup.sh extensions
./setup.sh models
```

`inference.config.json` is the estate default configuration. The engine reads
its live endpoint from `COMFYUI_URL` or the ComfyUI endpoint file; the current
repository default is `http://127.0.0.1:8188`. See
[`docs/comfyui/setup.md`](docs/comfyui/setup.md) for BYO/managed behavior and
configuration precedence.

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
registration path. The sanctioned 3088 procedure is
[`docs/RUNBOOK-3088-AGENT.md`](docs/RUNBOOK-3088-AGENT.md); the smaller setup
recipe is [`docs/HEADLESS-CHAT-TESTING.md`](docs/HEADLESS-CHAT-TESTING.md).

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
[`tests/README.md`](tests/README.md) and [`docs/testing/index.md`](docs/testing/index.md).

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
| `docs/` | current documentation plus clearly labeled historical records |

## Documentation rules

- Current docs describe the DSH/Cordis implementation, not a retired gateway.
- Historical plans and audits are evidence, not setup instructions.
- The executable declaration or contract owns a list, port, profile, or tool
  vocabulary; prose links to it instead of copying it.
- Update `docs/README.md`, the relevant current page, and a recorded snapshot
  when a user-visible contract changes.
- Never commit credentials, signed URLs, or machine-specific state roots.

Read [`docs/index.md`](docs/index.md) for the complete documentation map and
[`docs/ROADMAP.md`](docs/ROADMAP.md) for work that is still owed.
