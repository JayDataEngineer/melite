# Install

The publish channel is npm: one version across the estate
(`release:bump`), gated tarballs (`release:mint`), registry publish,
and the GitHub release landing the same bytes as the asset record.
Every melite package in a release carries one identical version, the
tag is exactly `v<that version>`, and pre-releases carry a `-alpha.N`
suffix on every channel. The sequence is proven end-to-end on every
release by `tools/release-rehearsal.mjs`.

## The consumer path: the `dsh` CLI

```sh
npm install -g @deepseek-ai/dsh@<version>     # the profile CLI
corepack enable && corepack prepare pnpm@10.33.2 --activate
dsh plugin --profile <name> add @melite/harness-tools@<version>
dsh plugin --profile <name> install
```

The plugin verbs resolve the profile's packages from the npm
registry. Boot the studio with:

```sh
dsh --profile melite-test --port 3088
```

The printed token URL is the entry point. The port is a deployment
choice; `3088` is the test-lane convention.

## Weights and the engine are not included

An install ships code. Model weights and the ComfyUI engine are
separate, deliberate downloads — see
[getting started](/guide/getting-started) for the provisioning steps.
Model files keep their own upstream licenses; see
[license](/guide/license).
