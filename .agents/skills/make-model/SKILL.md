---
name: make-model
description: Use when authoring a new model family package (a downloadable model declared as a family DECL under packages/models/), or when a family fails the law-hygiene declaration wall or the families-golden wall. Covers the DECL shape, the mods/ tree, the plugin registration seam, and the gates.
---

# Make a model family

A model family is ONE PACKAGE under `packages/models/<family>/`
whose `src/index.ts` IS the family's truth — a change there is a
family change, nothing else moves. Every family is a plugin
declaring itself through `ctx.models.registerFamily` inside
`ctx.effect` — fiber-owned, revertible, transactional at boot (the
discharge stroke).

## 1. The files

```
packages/models/<family>/
  package.json     # name "@melite/models-<family>", private,
                   # deps: @melite/comfyui-cordis (models-service,
                   # model-contract subpaths)
  tsconfig.json    # copy from a sibling (packages/models/krea-2)
  src/index.ts     # THE DECL plugin (shape below)
  mods/            # OPTIONAL capability packs (loras.ts, ...)
  tests/decl.test.ts   # the family's own conformance test
```

`src/index.ts` — the shape (copy from `packages/models/krea-2/src/index.ts`):

```ts
import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelDecl } from "@melite/comfyui-cordis/model-contract";

export const DECL: ModelDecl = {
  "id": "<family>",
  "label": "...",
  "description": "...",
  // defaults, variants, cells, resolve() ...
};

export const family: Plugin = {
  name: "family-<family>",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
```

`ModelDecl` fields that matter (the law-hygiene wall checks them):

- `id` / `label` / `description` — identity (never generated).
- defaults — every default must live inside its owning card's field
  domains (the models-against-cards wall); a default naming no card
  field refuses LOUD.
- variant matrices — MUST AGREE with model-facts (two spellings
  refuse; the models-flows wall).
- `resolve()` — returns the DOWNLOAD ARTIFACT (url + sha256 + size),
  never a bare boolean.
- enhance recipes — NO authoring path yet (known gap, 2026-09-09):
  the disclosure bundle serves per-family enhance guidance from the
  FROZEN form-spec capture (10/115 spec keys declare
  enhance_prompt(s)); new families fall back to the kernel
  `GENERIC_ENHANCE_RECIPE` (gateway-core schema/promptGuide.ts).
  Do NOT invent a DECL field for recipes — the capture is the truth
  until the gap is worked.

## 2. The barrel row (the load order)

`packages/engines/comfyui-cordis/src/models/families/index.ts` — the
`FAMILY_PLUGINS` table, one import + one array row per family:

```ts
import { family as <alias> } from "@melite/models-<family>";
// ... then append to FAMILY_PLUGINS
```

This index is the ONLY load order; bootModels loads each through
`ctx.plugin` — one fiber per family, transactional (the boot REFUSES
if familyCount() ≠ FAMILY_PLUGINS.length: a family that registered
nothing is a failed boot, not a warning). Miss this row and the
family never lands — the gates below catch the absence.

## 3. The gates

```sh
pnpm install
node tests/walls/ts/run.mjs
#   law-hygiene      — declaration conformance (no cast, no dead keys)
#   families-golden  — family table ≡ golden snapshots
#   models-registry  — hierarchy, resolve artifact, LOUD refusals
#   models-against-cards — defaults live in card field domains
node --experimental-strip-types --test tests/walls/ts/suites/law-hygiene.test.ts
cd packages/models/<family> && npx tsc --noEmit
```

A new family means NEW GOLDEN ROWS — the families-golden wall will
fail until the golden snapshots are regenerated (that is the wall
working; update the goldens, never the comparison).

## 4. Restart PROD, prove the routes

```sh
systemctl --user restart melite-gateway.service
curl -s http://127.0.0.1:33081/v1/lanes | python3 -m json.tool | grep '<family>'
```
