---
name: plugin-kit
description: "Author COMPLETE Melite plugins from scratch — the scaffold command, every plugin YAML vocabulary (plugin.yaml, rail, cards, model source decl, themes, kinds, shell, ui, pipelines), the check loop, and the D1 dependency law. Read this before creating or structuring any plugins/<id>/ tree. /v1/agent-manifest is the target-set oracle."
---

# plugin-kit — authoring full plugins

Melite is ALL plugins now: every capability lives in a `plugins/<id>/` drop-in
unit that the walk (`server-js/src/core/catalog/plugins.ts`) mounts with
loud gates. This skill teaches you to author a COMPLETE plugin that mounts
FIRST-TRY — the "remake the app within the app" lane (§16 E-KIT).

## The loop (memorize this)

```
bun run scripts/plugin-kit.ts new <id> --domain <domain> \
     (--model-url <url> | --model-repo <org/repo>)   # scaffold + self-check
# …edit the YAML to make it yours…
bun run scripts/plugin-kit.ts check <id>              # self-check EVERY edit
# commit only when: check exit 0, `cd server-js && bunx tsc --noEmit`, `bun test`
```

The scaffold emits a complete, mount-first-try plugin (every lane the §3
walk validates, right the first time) and immediately runs the check loop
against the REAL loaders — zero edits expected. The check is the product:
it re-runs the actual mount, catalog, card, template, family, rail, and
agent-manifest walks and prints one PASS/FAIL row per rule with the
loader's verbatim error on failure.

## The oracle

`GET /v1/agent-manifest` (server running) is the target-set oracle: if
your plugin, its model (with `source`), and its agents bundle are in the
manifest, discovery sees them. Offline, `check` proves the same surfaces.

## Focused docs

| Doc | Read when you … |
|---|---|
| [scaffold.md](scaffold.md) | run `new` — flags, emitted surface, naming laws |
| [vocabulary.md](vocabulary.md) | write/edit any plugin YAML (every lane's exact shape) |
| [check-loop.md](check-loop.md) | verify before commit — check rules, live curls, disable probe |
| [dependencies.md](dependencies.md) | import from ANOTHER plugin's code (the D1 law) |

## Hard laws (the walks enforce these — never bend them)

- **Conform, never bend.** If the walk rejects your plugin, fix the
  plugin. The loaders are the contract; the kit is a conforming client.
- **One owner per id** — rail entry ids, form targets, theme ids, kind
  strings are GLOBAL: a duplicate fails the mount naming both owners.
- **Graph templates ship with their card** inside the sanctioned plugins/
  tree — out-of-tree (`MELITE_PLUGIN_PATHS`) roots mount DATA lanes only.
- **Every failure is loud.** A malformed plugin fails ITS mount; there is
  no silent skip, no last-wins. `check` surfaces each loader's raw error.
- **AGENT_MADE.md is provenance only** — zero load-time meaning; the
  audit marker for humans. Write it in every scaffold (the kit does).
- **`source:` is a mapping** — `url` XOR `repo_id` (+ optional
  `filename`/`save_path`). A bare URL string is the retired pre-D2 shape
  and fails the catalog load loudly.
