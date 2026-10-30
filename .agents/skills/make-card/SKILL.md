---
name: make-card
description: Use when authoring a new melite card (a compose-surface operation living in its own package under packages/<genre>/), or when auditing why an existing card fails the walls, the coverage gate, or the census. Covers the dual-face file shape, the cardPackages SSOT row, the literal exports rows, the client bundle seam, and the exact gates to run.
---

# Make a card

A card is ONE PACKAGE: `packages/<genre>/<card>/` with `src/card.ts`
(the registration plugin, the `./card` face), a `src/index.ts` host
marker (registers NOTHING node-side), and — when the card ships an
authoring surface — a `src/client/index.ts` browser face that mounts
the studio on the `cards.stage.view` seam. Optional `src/agents/`
(agent-facing docs). One card one package — never a second card in
the same package.

## 1. The genre dir

Bare word, one of `3d/ audio/ image/ models/ motion/ video/`
(`packages/models/` is for model families — see the `make-model`
skill; cards never live there). New genre? Read
`dev_docs/dsh-homolog/structure.md` (the naming law) first.

## 2. The files

```
packages/<genre>/<card>/
  package.json     # name "@melite/<genre>-<card>", private. LITERAL
                   # exports rows (step 4) + dsh.client declaration
                   # (step 4) + "typecheck": "tsc --noEmit" (the
                   # battery gates every package that owns the script,
                   # the day it declares it).
  tsconfig.json    # copy from a sibling card package (mask is
                   # the reference: types:["node"], per-program ambient)
  tsdown.config.ts # ONLY when a studio ships: the shared clientBundle
                   # preset (step 4)
  src/index.ts     # the HOST marker: export name/inject/apply, apply
                   # is empty — the card rides ./card, the studio rides
                   # the client face (copy from mask)
  src/card.ts      # THE registration plugin (shape below)
  src/client/index.ts    # ONLY when a studio ships: the adapter (step 4)
  src/ui/studio/   # ONLY when a studio ships: the studio body files
  src/agents/      # OPTIONAL agent docs
  src/env.d.ts     # per-program ambient (copy from a sibling)
  src/css-modules.d.ts   # per-program ambient (copy from a sibling)
  tests/           # card.spec.ts; + <card>-client.spec.tsx when a
                   # studio ships (dom lane)
```

`src/card.ts` — the shape (copy from `packages/3d/rig/src/card.ts`):

```ts
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

const schema = z.object({ /* fields; .extra('extra', {...}) for groups */ })

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerCard({
    id: '<card>',            // the tenant id's second segment
    skeleton: 'generate',    // the stage-row id the compose emits
    boarded: [...],          // capability packs this card boards
    tags: ['image', 'generate'],  // RETRIEVAL (card-catalog search):
                                  // modality + operation words the card
                                  // DECLARES — never derived
    schema,
    compose(p, model, g, runId) { /* throw on missing required; emit the graph */ },
  }))
}
```

Laws the walls check (do not learn these by failing them):

- **schema defaults**: ride-the-model keys carry NO schema default
  (the compose-door cascade overlays model defaults); HINT-ONLY
  ranges via `.extra('extra', { min, max })` — whoever owns the
  default owns the floor (RANGE RULE 2026-09-08).
- **required params**: `compose` refuses LOUD (`throw new Error(...)`)
  on missing required params — never a silent default.
- **identity**: the CardDefinition carries identity (the m1 wall:
  no card without it, never a generated title).
- **tool face** (when the card also ships `src/tool.ts`): `execute`
  returns the FLOW ENVELOPE inferred from its own `OUTPUT_SCHEMA`
  (`as const` + `type OutputEnvelope = InferValue<typeof
  OUTPUT_SCHEMA>`) — never a guessed `CardResult` annotation.

## 3. The SSOT row

`packages/engines/comfyui-cordis/src/cardDefs.ts` → the
`cardPackages` array. One row per card. Packages with a client face
mount their registration via the `./card` subpath
(`'@melite/image-mask/card'` — the host `.` is the marker);
packages whose card.ts IS the main ride the bare specifier
(`'@melite/audio-music'`). This table is the ONLY card composition
(loadCardDefs' cache-boot AND the compose door's fresh-Context boot
both ride it). A card lands by adding its package + one row.

## 4. The studio (optional)

No studio → the card renders as a schema form (lawful; most cards do).

A studio ships as TWO faces of the same package (the dual-face law,
2026-09-12; `input-prep` and `h3-timeline` are the live references):

- **`src/ui/studio/component.tsx`** (+ per-seam body files) — the
  studio body. Consumed RELATIVELY by the client face.
- **`src/client/index.ts`** — the ADAPTER (never a second definition
  site), via the COMPOSITION-ROOT law (2026-11): exports
  `name` / `inject = ['slots']` / `apply`, where the registration is
  the exported factory, never a hand-rolled slot call:

```ts
import { defineStageViewRegistration } from '@melite/card-base/client'
import { MyCardStudio } from '../ui/studio/component.tsx'
export const name = 'myCardStudio'
export const inject = ['slots']
export const apply = defineStageViewRegistration('<card>', MyCardStudio)
```

  Props translate onto the tenant contract `{stage, onSave,
  upstreams?, onRun?}`; writes ride `onSave → props.onPatch`; the run
  rides `props.onRun` (the host drill). NOTE the import truths: the
  seam helper is `@melite/card-base/client` (there is NO
  `@melite/card-base/slots` export row), and a static DSH estate
  inject is FORBIDDEN (it parks the plugin waiting on card-view — the
  2026-09-29 receipt); `ctx.slots.register(...)` hand-rolls are the
  retired pre-composition-root spelling.
- **`tsdown.config.ts`** — `clientBundle('@melite/<genre>-<card>',
  ['src/card.ts'], {})` from `packages/web/shared/tsdown.client.ts`;
  the build output `lib/client.js` is TRACKED (committed).
- **package.json** needs the `dsh` client declaration + the BUILT
  export rows — every card in the tree ships `lib/*`, the `./src/*`
  rows were retired (an exports row is an artifact path, never a
  source path):

```json
"exports": {
  ".": { "types": "./lib/index.d.ts", "default": "./lib/index.js" },
  "./card": { "types": "./lib/card.d.ts", "default": "./lib/card.js" },
  "./tool": { "types": "./lib/tool.d.ts", "default": "./lib/tool.js" },
  "./client": "./lib/client.js",
  "./package.json": "./package.json"
},
"dsh": { "client": { "platform": "web", "external": ["@melite/card-base/client"] } }
```

LITERAL rows only, one per file that external consumers import (TS
bundler resolution treats pattern exports literally — no extension
probing, NO `./ui/*` wildcards). A studio file is consumed RELATIVELY
by `src/client/index.ts` (and bundled into `lib/client.js`), so it
needs no row of its own.

## 5. Build + the built plane

After ANY `src/` edit: `./node_modules/.bin/tsdown` FIRST (the client
bundle), then `npm run build` (tsc), then re-stamp —

```sh
find src \( -name '*.ts' -o -name '*.tsx' \) | sort | xargs sha256sum | sha256sum | cut -c1-16 > lib/.src-stamp
node scripts/canonicalize-sourcemaps.mjs
node scripts/rewrite-dts-specifiers.mjs packages/<genre>/<card>
```

`lib/` is TRACKED and committed with the source; the
client-bundle-freshness wall reds `lib/client.js` older than `src/`,
and the battery's lib-sync pass reds a stale `lib/`. Trusting `tsc`
alone is the order bug (tsdown rewrites `lib/client.js` after it).

## 6. The gates (run all, in this order)

```sh
pnpm install                                    # re-materialize the link
node tools/hook-full-battery.mjs                # tsc per typecheck-owning
                                                # package (the battery
                                                # DERIVES its list from
                                                # the manifests — your
                                                # package gates itself
                                                # the moment it declares
                                                # the script) + the
                                                # walls (node project)
cd packages/<genre>/<card> && pnpm exec tsdown  # when a studio ships:
                                                # rebuild lib/client.js
                                                # (commit the artifact;
                                                # append the final
                                                # newline — tsdown
                                                # omits it and the
                                                # final-newline hook
                                                # refuses the commit)
rm -rf coverage && node node_modules/vitest/vitest.mjs run --coverage
                                                # per-file 100% gate
node scripts/dsh-census.mjs -strict            # ZERO banned imports
```

The client spec (`tests/<card>-client.spec.tsx`) runs in the dom
lane — the root vitest picks it up in both the battery's walls pass
configuration and the coverage gate.

## 6. Restart the lane, prove the card

The standalone gateway is retired (2026-09-10) — never restart it and
never invent a second process; the estate serves from the one DSH
lane. Restart that lane service the way THIS deployment runs it (the
unit/process name is per-installation — never assume a specific one),
then prove the card's flow validates against the running lane's own
base URL:

```sh
# restart the estate lane service for this installation, then:
curl -s -X POST "$LANE/v1/flows/validate" \
  -H 'content-type: application/json' \
  -d '{"id":"<flow>","stages":[{"id":"s_0","engine":"comfyui","params":{}}]}'
# $LANE = the base URL this deployment's estate answers on
# expect {"ok":true,"flow":"<flow>",...}
# the studio proof is build-time + test-time (the client spec), and
# live on the lane's GUI (the cards.stage.view seam serves it).
```
