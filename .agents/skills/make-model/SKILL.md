---
name: make-model
description: Use when authoring a new model family package (a downloadable model declared as a family DECL under packages/models/), or when a family fails the law-hygiene or registry walls. Covers the DECL shape, the mods/ tree, the plugin registration seam, and the gates.
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
                   # model-contract subpaths); devDeps: typescript
                   # ^5.9.3 + @types/node ^22.20.0; scripts own
                   # "typecheck": "tsc --noEmit" (the battery gates
                   # the package the day the script exists)
  tsconfig.json    # copy from a sibling (packages/models/krea-2)
  src/index.ts     # THE DECL plugin (shape below)
  mods/            # OPTIONAL capability packs (loras.ts, ...)
  tests/decl.spec.ts   # the family's own conformance spec
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
- enhance recipes — the model package may provide
  `agents/skills/prompt-enhance/SKILL.md`; the current loader
  `packages/engines/comfyui-cordis/src/models/enhanceRecipes.ts`
  composes it into the form-spec recipe seat. A recipe-less model falls back
  to the generic enhance path; do not invent a DECL field for recipes. (A
  different "recipe": the RECIPE LAW variant rows below — never conflate
  the two.)

## 1b. RULE A — THE RECIPE LAW (2026-09-18)

Every family authors its preset truth as Recipe variant rows —
`group: "Recipe"`, patch-only `wire_defaults`, the payload 1:1 with
the card's declared params (LORAs included: the bag rows
`{id, strength?, steps?}` resolve against `mods/loras.ts` at
compose):

- ONE preset per fact — never the same fact on two rows (a
  strength-less bag row rides the flavor's own `default_strength`;
  do not add a second explicit-strength row for the same adapter).
- The stamp-less `default` row stays (a fresh card lands there).
- Recipe ids are DISTINCT from route variant ids — a collision
  refuses at the spec.
- THE SCOPING LAW: only family-OWNED functional preset facts ride
  recipes. Style/options packs (anny verbs, qvoice rows, union
  catalogs) stay Modifiers-menu picks — an option is not a preset;
  image-conditioned structural packs (controlnet, ip_adapter,
  lanpaint, mask) stay board surfaces; step marriages stay in the
  ROUTE's `resolver_defaults` — never duplicated on two axes.
- The GPU receipt: a family that lands new recipe rows extends
  `tests/e2e/recipes-gpu.e2e.ts` (engine-gated) — compose the pill
  payload, assert the resolved wiring verbatim, run it live.

## 1c. THE FOLD LAW (2026-09-21 — roadmap §8, the one-model
consolidations; precedents: the qwen TTS fold, the H3 fold)

A MODEL names a CHECKPOINT (a size/weights family); a VARIANT names
a LANE (Base/CustomVoice/VoiceDesign; timeline/single-shot/
keyframe). When two "families" serve one checkpoint's card, the
fold is OWED — never board a lane flavor as its own model:

- The surviving family keeps its id (drafts, skills, tool enums
  address it); the dead families' packages, barrel rows, facts-row
  authorship, and HMR rows die.
- Every dead address survives as a VARIANT ROUTE on the survivor —
  old drafts resolve migration-free (the drafts door resolves
  route mids through the derived facts rows).
- The dead family's `defaults` ride the folded variant's
  `resolver_defaults` VERBATIM (the cascade merges model ← variant;
  the derived view stays byte-identical). A lane the family
  defaults don't fit carries its own stamps; a NULL stamp unsets.
- The dead family's unique provisions JOIN the survivor's list
  (the union; the lanes still load their own weights).
- The card boards the ONE family; the dead addresses ride the
  tool's closed enum via `VARIANT_ADDRESSES` (agents pick no
  matrix variant — the route address IS how the lane is named).
- Mods stay family-level (the bag serves every lane that fires
  it); a lane a mod fires nothing on refuses LOUD in admission,
  never silently skips (the TTS instruction-control law).

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

The walls are vitest specs under `tests/walls/ts/suites/` (the old
`tests/walls/ts/run.mjs` runner, the
`--experimental-strip-types --test` invocations, and the
`*.test.ts` spellings died with the rebuild — never use them):

```sh
pnpm install
node node_modules/vitest/vitest.mjs run tests/walls/ts/suites/families-transaction.spec.ts
node node_modules/vitest/vitest.mjs run tests/walls/ts/suites/models-registry.spec.ts
node node_modules/vitest/vitest.mjs run tests/walls/ts/suites/models-against-cards.spec.ts
node node_modules/vitest/vitest.mjs run tests/walls/ts/suites/models-flows.spec.ts
# or all walls at once (plus every typecheck-owning package's tsc —
# the battery DERIVES its package list from the manifests):
node tools/hook-full-battery.mjs
cd packages/models/<family> && pnpm run typecheck
node node_modules/vitest/vitest.mjs run packages/models/<family>/tests/decl.spec.ts
```

A new family must satisfy the live family registry, transaction, flow, and
against-cards walls. The current proof set has no standalone
`families-golden.spec.ts`; use the package-local `decl.spec.ts` and the
registry/spec walls that exist in this checkout. A family whose DECL touched
the Recipe axis also re-checks the served form spec through the normal
`melite_load`/estate tool path; do not curl a guessed HTTP route.

## 4. Prove the family (no gateway — it died 2026-09-10)

The family's proof is the walls above (the registry/spec comparisons
and the transactional boot count) plus the live lane's catalog tools. The
composition serves model discovery through the estate row, and the engine
loads weights through the configured ComfyUI service. Never restart a
retired gateway; there is none.
