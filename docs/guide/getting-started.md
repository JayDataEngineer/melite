# Getting started

The development path from a fresh clone to a booted studio.

## Requirements

- Node.js and pnpm
- git with network access for submodules — the vendored engine extensions
  and reference trees ride submodules
- a reachable ComfyUI instance, or the managed-instance recipe below
- `dsh` on `PATH` for profile boot

## Clone and install

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

The provisioner renders `melite-test`, `headless`, and `estate` under
`${DSH_HOME:-$HOME/.dsh}/profiles/`. It writes machine-local profile
state; the source of truth remains the repository.

## Provision the engine and weights

Those two commands do **not** give you a runnable estate. Weights and
the engine are separate, deliberate downloads on a fresh machine. The
provisioning CLI is plain Node — the same commands on Windows, macOS,
and Linux:

```sh
pnpm run provision -- init-store   # lay the empty model store (fresh clones)
pnpm run provision -- sync         # ComfyUI core + Manager checkout (managed instance)
pnpm run provision -- extensions   # declared packs — the engine must be UP first
pnpm run provision -- models       # declared weights — tens of GB, sha-pinned rows
```

`provision models` queues every declared provision through
ComfyUI-Manager; `--dry-run` lists the plan without downloading. Check
the configured ComfyUI endpoint and declarations with:

```sh
pnpm run provision -- verify
```

If you cloned or moved the checkout, repin the profile paths once with
`pnpm run profile:regen`.

## Boot the studio

```sh
dsh --profile melite-test --port 3088
```

The port is a deployment choice; the test lane conventionally uses
`3088`. The printed token URL is the entry point.

From inside a DSH session, provisioning rides the estate's own tools:
loading a card reports missing weights and packs in the load payload,
and `comfy_manage` installs them.

Next: [Composing and running](/guide/composing).
