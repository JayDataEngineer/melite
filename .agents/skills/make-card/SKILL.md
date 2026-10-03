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
2026-09-12; mask is the reference):

- **`src/ui/studio/component.tsx`** (+ per-seam body files) — the
  studio body. Consumed RELATIVELY by the client face.
- **`src/client/index.ts`** — the ADAPTER (never a second definition
  site): exports `name`/`inject = ['slots']`/`apply`, registers the
  tenant on the keyed seam:
  `ctx.slots.register({ name: 'cards.stage.view', key: '<card>' }, Studio)`.
  Props translate onto the tenant contract `{stage, onSave,
  upstreams?, onRun?}`; writes ride `onSave → props.onPatch`; the run
  rides `props.onRun` (the host drill). `Context as ClientContext`
  from cordis + `import type {} from
  '@deepseek-ai/dsh-client-ui-renderer/client'` (the renderer owns
  `ctx.slots`) + `import type {} from '@melite/card-base/slots'`
  (erased, bundle-pure).
- **`tsdown.config.ts`** — `clientBundle('@melite/<genre>-<card>',
  ['src/card.ts'], {})` from `packages/web/shared/tsdown.client.ts`;
  the build output `lib/client.js` is TRACKED (committed).
- **package.json** needs the `dsh` client declaration + the client
  export row:

```json
"exports": {
  ".": "./src/index.ts",
  "./card": "./src/card.ts",
  "./client": "./lib/client.js",
  "./ui/studio/component": "./src/ui/studio/component.tsx"
},
"dsh": { "client": { "platform": "web" } }
```

LITERAL rows only, one per file that external consumers import (TS
bundler resolution treats pattern exports literally — no extension
probing, NO `./ui/*` wildcards). Add per-seam rows (`./tool`,
`./ui/studio/IdeoPanels`, ...) exactly when those files exist.

## 5. The gates (run all, in this order)

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
python3 scripts/dsh-census.py -strict           # ZERO banned imports
```

The client spec (`tests/<card>-client.spec.tsx`) runs in the dom
lane — the root vitest picks it up in both the battery's walls pass
configuration and the coverage gate.

## 6. Restart the lane, prove the card

The gateway (:33081) died 2026-09-10 — never restart it. The estate
serves from the DSH lane:

```sh
systemctl --user restart dsh-melite-test.service
# prove the card's flow validates (flow id = the card's FLOW name):
curl -s -X POST http://127.0.0.1:3088/v1/flows/validate \
  -H 'content-type: application/json' \
  -d '{"id":"<flow>","stages":[{"id":"s_0","engine":"comfyui","params":{}}]}'
# expect {"ok":true,"flow":"<flow>",...}
# the studio proof is build-time + test-time (the client spec), and
# live on the lane's GUI (the cards.stage.view seam serves it).
```
