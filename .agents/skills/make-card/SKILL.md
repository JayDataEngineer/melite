---
name: make-card
description: Use when authoring a new melite card (a compose-surface operation living in its own package under packages/<genre>/), or when auditing why an existing card fails the boundary wall or the tool-emission wall. Covers the file-by-file shape, the cardPackages SSOT row, the studio-subpath exports rows, and the exact gates to run.
---

# Make a card

A card is ONE PACKAGE: `packages/<genre>/<card>/` with `src/card.ts`
(the registration plugin), optional `src/ui/studio/component.tsx`
(the authoring-surface override), optional `src/agents/` (agent
facing docs). One card one package — never a second card in the same
package.

## 1. The genre dir

Bare word, one of `3d/ audio/ image/ models/ motion/ video/`
(`packages/models/` is for model families — see the `make-model`
skill; cards never live there). New genre? Read
`docs/dsh-homolog/structure.md` (the naming law) first — the studio
glob admits any `packages/*/*/src/ui/studio/component.tsx`
automatically, but the boundary walk must agree.

## 2. The files

```
packages/<genre>/<card>/
  package.json     # name "@melite/<genre>-<card>", private, deps on
                   # @melite/comfyui-card-kit (+ @melite/comfyui-cordis
                   # subpaths as needed). LITERAL studio-subpath rows
                   # when a studio ships (see step 4).
  tsconfig.json    # copy from a sibling card package
  src/card.ts      # THE registration plugin (shape below)
  src/ui/studio/component.tsx   # OPTIONAL studio body
  src/agents/                      # OPTIONAL agent docs
```

`src/card.ts` — the shape (copy from `packages/image/ideogram4/src/card.ts`):

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

## 3. The SSOT row

`packages/engines/comfyui-cordis/src/cardDefs.ts` → the
`cardPackages` array — one row `'@melite/<genre>-<card>'`. This
table is the ONLY card composition (loadCardDefs' cache-boot AND the
compose door's fresh-Context boot both ride it). A card lands by
adding its package + one row.

## 4. The studio (optional)

`src/ui/studio/component.tsx` default-exports the studio body; its
presence CLAIMS tenant id `<genre>/<card>` (the join key the served
body claims declare — `cardStudios.ts` derives it from the path
anchor `/src/ui/studio/`).

`package.json` exports need LITERAL subpath rows for every studio
import target (TS bundler resolution treats pattern exports
literally — no extension probing):

```json
"exports": {
  ".": "./src/index.ts",
  "./ui/studio/component": "./src/ui/studio/component.tsx",
  "./ui/studio/IdeoPanels": "./src/ui/studio/IdeoPanels.tsx"
}
```

No studio → the card renders as a schema form (lawful; most cards do).

## 5. The gates (run all, in this order)

```sh
pnpm install                                   # re-materialize the link
cd packages/web/editor && npx tsc -p tsconfig.app.json --noEmit   # exports rows resolve
cd ../.. && node tests/walls/ts/run.mjs        # walls (m1 emission, boundary, law-hygiene)
cd packages/web/editor && npx vitest run src/__tests__/card-studio-boundary.test.ts
```

The boundary wall fails LOUD if the studio glob and the fs walk
disagree — that is the design, not a bug to code around.

## 6. Restart PROD, prove the card

```sh
systemctl --user restart melite-gateway.service
curl -s http://127.0.0.1:33081/v1/lanes | python3 -m json.tool | grep -c id
curl -s -X POST http://127.0.0.1:33081/v1/flows/validate \
  -H 'content-type: application/json' -d '{"model":"<a-model>","params":{...}}'
```
