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
                   # deps: @melite/comfyui-card-kit (model-contract,
                   # service-faces) — the ONLY required dep (28 of the
                   # 32 families declare nothing else). Add
                   # @melite/contracts and/or @deepseek-ai/schemastery
                   # ONLY when this family's code imports them (anny,
                   # fit, h3, skin do; krea-2 does not). NOT
                   # comfyui-cordis — the family↔engine cycle died with
                   # the string table; a family that imports the engine
                   # re-opens it. devDeps: typescript ^5.9.3 +
                   # @types/node ^22.20.0 + @deepseek-ai/cordis;
                   # scripts own "typecheck": "tsc --noEmit" (the
                   # battery gates the package the day the script
                   # exists)
  tsconfig.json    # copy from a sibling (packages/models/krea-2)
  src/index.ts     # THE DECL plugin (shape below) + the re-export
                   # face (actions, default)
  src/actions.ts   # OPTIONAL: the family's offered ACTION ATOMS —
                   # the handlers a card imports beside the DECL
                   # (krea-2's t2i, h3's extend/refine/repair). The
                   # card binds them; nothing else moves when one
                   # lands (fibo2-edit, h3)
  mods/            # OPTIONAL capability packs (loras.ts, ...)
  tests/decl.spec.ts   # the family's own conformance spec
```

`src/index.ts` — the shape (copy from `packages/models/krea-2/src/index.ts`):

```ts
import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelDecl } from "@melite/comfyui-card-kit/model-contract";

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

A family that offers ACTIONS re-exports them from `src/index.ts` beside
the DECL (krea-2's tail, `packages/models/krea-2/src/index.ts`):

```ts
// The family's offered actions (the atom vocabulary) — the card
// imports this beside the DECL: the family's whole offer, one face.
export { t2i, parseT2IFacts, type T2IFacts, type T2IParams } from "./actions.ts";
```

The atoms live in their own `src/actions.ts` (one handler per verb the
cards bind: krea-2 `t2i`, h3 `extend`/`refine`/`repair`/`reshoot`/`swap`);
`src/index.ts` stays the DECL + the re-export face, never a second
handler body.

`ModelDecl` fields that matter (the law-hygiene wall checks them):

- `id` / `label` / `description` — identity (never generated).
- defaults — every default must live inside its owning card's field
  domains (the models-against-cards wall); a default naming no card
  field refuses LOUD.
- variant matrices — MUST AGREE with model-facts (two spellings
  refuse; the models-flows wall).
- `resolve()` — returns the DOWNLOAD ARTIFACT (url + sha256 + size),
  never a bare boolean.
- enhance recipes — the family's lead prompt-enhance skill lives in the
  ENGINE's models tree, NOT in `packages/models/<genre>/<family>/`:
  `packages/engines/comfyui-cordis/models/<genre>/<family>/agents/skills/
  prompt-enhance/SKILL.md`. The loader
  (`src/models/enhanceRecipes.ts`, `declarationModelsRoot()`) resolves
  against the engine package's own `models/` dir, so a recipe written
  into the model package is read by NOBODY and the family silently
  falls back to the generic enhance path. A recipe-less model keeps
  that fallback; do not invent a DECL field for recipes. (A different
  "recipe": the RECIPE LAW variant rows below — never conflate the
  two.)

- the ACTIONS face (`src/actions.ts`) — the compose/render wiring a
  boardable family must expose (the h3 and krea-2 references): the
  families that board a card ride it, the rest are DECL-only. If your
  family boards, the card's compose reads actions; a missing face
  fails at the door, never silently.

- `model-facts.json` — the family's measured facts (variant matrix,
  VRAM notes) are authored there and the models-flows wall refuses a
  DECL that disagrees; and the engine package's own `package.json`
  must list the family dep row (W9).

## 1a. Build + the built plane

Every package carries a tracked `lib/` (the tsc output). After ANY
`src/` edit in the package you touched: `npm run build`, then
`find src \( -name '*.ts' -o -name '*.tsx' \) | sort | xargs sha256sum |
sha256sum | cut -c1-16 > lib/.src-stamp`, then
`node scripts/canonicalize-sourcemaps.mjs` and
`node scripts/rewrite-dts-specifiers.mjs packages/<genre>/<pkg>`. The
battery's lib-sync pass reds a stale `lib/` — it is the build law.

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

## 2. The two load faces (string-table row + composition row)

A family lands on TWO faces (the Loader-composition stroke,
2026-10-13; the string-table cure sealed the family↔engine import
cycle) — a new family owes BOTH rows:

**Face 1 — the string-table row** (the in-process boot):
`packages/engines/comfyui-cordis/src/models/families/index.ts` — the
`FAMILY_PKGS` table, ONE BARE-SPECIFIER STRING row per family; the
engine never statically imports its plugins (a static edge would
cycle — every family imports the kit's contract types), `loadFamilies()`
resolves each through dynamic `import()`:

```ts
// append to FAMILY_PKGS (genre-sorted, id-sorted within genre):
"@melite/models-<family>",
```

AND the family owes its OWN manifest row in
`packages/engines/comfyui-cordis/package.json` dependencies —
`"@melite/models-<family>": "workspace:*"` (32 such rows today). The
`FAMILY_PKGS` string is resolved by dynamic `import()` INSIDE the
engine package, so the engine's manifest is what makes the specifier
resolvable; a table row without the dep fails at boot. The same wall
(W9) pins table↔manifests, so neither row can land alone.

bootModels loads each through `ctx.plugin` — one fiber per family,
transactional (the boot REFUSES if familyCount() ≠ the mounted
family fibers: a family that registered nothing is a failed boot,
not a warning). The census wall
(`tests/walls/ts/suites/artifact-plane-law.spec.ts` W9) pins the
table to the manifests and the packages/models roster — a renamed
family cannot rot a stale row silently; a family added to
packages/models without its table row reds the same wall.

**Face 2 — the composition row** (the Loader boot, the estate's
truth): `packages/web/melite-estate/cordis.patch.yml` carries one
insert row per family — `{ id: "family-<family>", name:
"@melite/models-<family>" }` (a BARE SPECIFIER; the DSH Loader
resolves it) — AND the estate's package.json declares
`"@melite/models-<family>": "workspace:*` in dependencies. The
row-without-dep edge fails LOUD at boot (the ESM resolver's
module-not-found — DSH's verify-cordis-config owns the consumer
edge; Melite walls no local twin). The census gate
(`engine-model-census`) awaits the family fibers, censuses
familyCount against them, runs the boot contracts, then arms the
seat — `whenModelsArmed()` is the settle door.

**The default-export law** (the unwrapExports Loader seam): a
row-loadable family package MUST carry

```ts
export { family as default };
```

in `src/index.ts` — the Loader reads the module's default export.
Miss it and the row loads a module whose shape is wrong (loud, at
boot).

Miss either face's row and the family never lands on that face —
the gates below catch the absence.

## 2b. The engine's facts row (model-facts.json)

A family that serves a card face also lands a FACTS row — the engine's
own data plane, `packages/engines/comfyui-cordis/data/model-facts.json`.
Model-owned keys (defaults / lane_inputs / variants / variant_groups /
mods / accepts / studio) DERIVE from the registry at load
(`src/models/facts.ts`); the file keeps only what the registry cannot
carry:

- `cards.<card>.outputs` — the artifact kinds the card emits
  (`label`, `many`, `patterns`).
- `cards.<card>.requires_by_family.<family>` — the EXTENSION PACKS the
  family's arm needs on that card (`["ComfyUI-MoGe"]`; `[]` = core
  only).
- `cards.<card>.card_knobs` — per-address knob overrides.
- `extension_node_types` / `core_node_types` — the node classes the
  pinned engine serves (never extension keys; the upstream gate proves
  each class at `infra/comfyui/core.pin`).

Variants stay the DECL's: if the facts row's variant list disagrees
with the family's matrix, the models-flows wall refuses the two
spellings. An absent `requires_by_family` row is not refused — the
arm's packs simply are not advertised, and the operator learns at the
first missing-node failure instead.

## 3. The gates

The walls are vitest specs under `tests/walls/ts/suites/` and the
engine's package-local suites (the old
`tests/walls/ts/run.mjs` runner, the
`--experimental-strip-types --test` invocations, and the
`*.test.ts` spellings died with the rebuild — never use them):

```sh
pnpm install
node node_modules/vitest/vitest.mjs run tests/walls/ts/suites/families-transaction.spec.ts
node node_modules/vitest/vitest.mjs run tests/walls/ts/suites/models-registry.spec.ts
node node_modules/vitest/vitest.mjs run tests/walls/ts/suites/models-against-cards.spec.ts
node node_modules/vitest/vitest.mjs run tests/walls/ts/suites/models-flows.spec.ts
# the composition face (roster ≡ barrel ≡ patch yml; the census
# gate; live add/remove; the settle contract):
node node_modules/vitest/vitest.mjs run packages/engines/comfyui-cordis/tests/models-composition.spec.ts packages/engines/comfyui-cordis/tests/models-composition-seat.spec.ts
# or all walls at once (plus every typecheck-owning package's tsc —
# the battery DERIVES its package list from the manifests):
node tools/hook-full-battery.mjs
cd packages/models/<family> && pnpm run typecheck
node node_modules/vitest/vitest.mjs run packages/models/<family>/tests/decl.spec.ts
```

A new family must satisfy the live family registry, transaction, flow,
against-cards, and composition walls. The current proof set has no standalone
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
