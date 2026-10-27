# Install from a release

Melite publishes through GitHub releases — not a package registry. Every
melite package in a release carries one identical version, the tag is
exactly `v<that version>`, and the tarball filenames say the same string.
Pre-releases carry a `-alpha.N` suffix on every channel.

## The consumer path: the `dsh` CLI

```sh
npm install -g @deepseek-ai/dsh@<version>     # the profile CLI
corepack enable && corepack prepare pnpm@10.33.2 --activate
```

Then install the profile over the release assets — the plugin verb
resolves the profile's packages against the release tarballs listed in
`release-manifest.json` on the release page. Boot the studio with:

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
