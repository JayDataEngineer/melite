# Install

One command and a boot. Melite seats into a DSH profile from this
GitHub repository — no npm account, no token, no repository clone, no
build step. Prerequisites: Node.js ≥ 22.18 and the `dsh` CLI.

```sh
npm install -g @deepseek-ai/dsh
```

## Seat

```sh
dsh plugin --profile melite add "github:JayDataEngineer/melite#main"
```

The command seats the repository into the profile as a prebuilt
bundle — committed build output, no compile step, no npm registry.
Restart an already-running runner after seating; a fresh boot needs
nothing extra. The estate job server exists as its own profile
(`estate`); one-shot headless agents are DSH's own surface
(`dsh headless "task brief"`), not a melite profile.

## Engine doors

Melite installs engine extensions through ComfyUI-Manager's git-url
door and downloads weights through Manager's model queue. Open both in
`<ComfyUI>/user/__manager/config.ini` (create the file if it is
absent) and restart ComfyUI:

```ini
[default]
security_level = normal-
allow_git_url_install = true
```

This is the full setting for a local engine: the git-url door wants
the flag plus a loopback listen (`--listen 127.0.0.1`, the default
for a personal ComfyUI) and is independent of the tier; the tier
itself admits every melite download at `normal-` on a loopback
engine. Set `security_level = weak` only when the engine listens on a
shared address and still needs non-safetensors weights. The estate
verifies every downloaded file against its declared sha256, so the
digest gate, not the tier, owns the download boundary. `comfy_manage`'s
`status` action reports the live line verbatim.

## Boot

```sh
dsh --profile melite
```

The boot binds a port itself and prints the entry token URL; pass
`--port` only when a fixed port is required. The agent seats need
one LLM driver — configure it with DSH's provider mechanism.

## Weights and the engine are not included

An install ships code. Model weights and the ComfyUI engine are
separate, deliberate downloads — missing models and packs are
acquired in-app (see the README's Quick start). Model files keep
their own upstream licenses; see [license](/guide/license).
