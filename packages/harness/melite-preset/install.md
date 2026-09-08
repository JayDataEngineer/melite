# Install — make the preset visible to DSH

A DSH agent preset is a **directory** under `<DSH_HOME>/.agent-presets/<id>/`.
The directory name is the preset id (must match `[a-z0-9][a-z0-9-]*`; here:
`melite`) and it must hold `agent.cordis.yml`, optionally beside `preset.yml`
(display metadata only: `name` / `description` / `order`).

## One command

```sh
D="${DSH_HOME:-$HOME/.dsh}/.agent-presets/melite"; mkdir -p "$D" && \
  cp $MELITE_REPO/packages/harness/dsh/melite-preset/preset.yml \
     $MELITE_REPO/packages/harness/dsh/melite-preset/agent.cordis.yml "$D/"
```

For the isolated test home, prefix `DSH_HOME=/tmp/melite-dsh-home`.

Discovery is unmemoized (`dsh-agent-presets` re-reads the roots on every
roster read): the preset shows up on the next picker / `agentPreset.list`
read **without restarting DSH**, and disappears again when the directory is
removed.

## Why copy and not symlink

Discovery scans the root with `readdir(..., { withFileTypes: true })` and
keeps only entries whose dirent reports `isDirectory()`. A symlinked
directory reports `isSymbolicLink()` and is skipped **silently** — the
preset never appears and nothing complains. Copy the files (or the whole
directory); do not link them.

## What the preset changes

v1 scope: the builtin `standard` tool surface with the Melite persona row
swapped in. Nothing else differs from `standard` — tool FILTERING is phase 2
(after W2 lands the Melite tool names). All rows name official
`@deepseek-ai/dsh-*` packages, so no overlay/patch is needed; bare
specifiers resolve from the harness base at mount time, not from this
directory.
