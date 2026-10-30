---
name: make-flow
description: Use when authoring a new multi-stage flow (a named pipeline of card stages served by the runs registry's validation path), or when a flow fails form-spec parity or the registry walls. Covers the REGISTRY declaration in estate-queue's flowsData.ts, the flows/ leaf (tool.json + agent docs), and the gates.
---

# Make a flow

A flow has TWO homes — the compile truth and the agent face:

1. **The registry row** — `packages/harness/estate-queue/src/flowsData.ts`,
   the `REGISTRY` table (the TS flow-authoring plane; everything the
   retired `flows/*/flow.py` owned; re-homed from the dead gateway
   package in REBUILD-13, 2026-09-10). This is the SSOT: the runs
   registry's `{flow:}` arms resolve stages LIVE through
   `expandRegistryFlow` — no snapshot drift.
2. **The flows leaf** — `flows/<name>/` (agent-facing: `tool.json`,
   `AGENTS.md`, `agents/skills/*/SKILL.md`, stage `.md` files).

## 1. The registry row

A flow row has TWO code homes in `packages/harness/estate-queue/src/`:

1. **The row object** — `flowsRegistryRows.ts`, one `export const MY_FLOW:
   RegistryFlow` per flow. This is where the stages are authored.
2. **The pointer** — `flowsData.ts`'s `REGISTRY` table, one line
   (`"my-flow": MY_FLOW,`). The table stays a readable index; it is NOT a
   sorted list (new landings append; read it, do not re-sort it).

```ts
// flowsRegistryRows.ts
export const MY_FLOW: RegistryFlow = {
  id: "my-flow",
  description: "…",
  stages: [
    plainStage({
      id: "s_0",
      engine: CARD_PLANE_ENGINE,
      card: "h3-timeline",           // the card plane
      description: "…",
      inputs: { clip: initial("video") },
      params: {},
    }),
  ],
  initialValidators: { clip: "video" },   // camelCase; the retired
                                          // flows/*/flow.py spelling was
                                          // initial_validators
  requiredInitials: ["clip"],
  tool: null,
  skillRefs: [],
};
```

Shapes (read `flowsData.ts` and `flowsRegistryRows.ts`, do not guess):

- `RegistryFlow.stages` is a `readonly RegistryStage[]` built through the
  builders — `plainStage(row)`, `linkedStage(flow, stage, id, inputs)`,
  `initial(key)`, `fromStage(stage, output)`. A stage row is JSON-shaped
  and every field is `readonly`.
- `initialValidators` kinds: `photo` | `video` | `glb` | `bake_params` |
  `text`. `requiredInitials` names the ones the flow cannot run without
  (refused at the door, before a run registers).
- `inputs: Record<string, RegistryEdge>` — initial edges or `fromFlow`
  stage outputs; `expected/outputs/cardIo: Record<string, string>`.
  THE DERIVATION LAW (roadmap §12): for `card=` stages, an input the
  card's own `flowKinds.inputs` declares needs NO hand-written
  `expected` — the kind derives from the card (the registry row never
  hand-mirrors what the card already declares). A row that hand-writes a
  kind the card contradicts refuses LOUD. Hand-write `expected` only for
  initials/edges the card cannot know.
- `params: Record<string, unknown>`.

### The three stage planes (never a fourth)

A stage is composed by EXACTLY ONE of (`flowsData.ts` `RegistryStage`):

| plane | fields | who composes |
|---|---|---|
| **card** | `card: "<name>"`, `engine: CARD_PLANE_ENGINE` | the card plane's dispatch — the registered card's own graph |
| **family action** | `family: "<family>"`, `action: "<verb>"` | the family's DECL (`flowsFamilyCompose` interprets it at expansion; e.g. `anny/estimate_photo`, `anny/bake`, `fit/seat`, `h3`'s extend action) |
| **engine verb** | `engine: "<verb>"` (not `CARD_PLANE_ENGINE`) | the runs door drives the engine's own verb directly (craft/agent stages) |

`family`/`action` default to `""` on the builders; a `card=` stage naming
neither a card nor a family action is the retired raw-workflow shape and
`expandRegistryFlow` refuses it, named. `fromFlow` rows resolve against
another flow's stage LIVE at expansion (never a snapshot), which is how
one flow reuses another's stage.

Wire laws:

- **validate vs start**: single-stage comfyui graphs serve at BOTH
  validate and start; multi-stage serves at validate only (start
  refuses multi-stage explicitly); `card=` stages serve at validate
  (start refuses `card=` explicitly). Never widen start quietly —
  the refusal text is the contract.
- **initial_validators**: the compile-time door (`photo` =
  EstatePhotoRef: browser-local / bad-ext refuse paths) — declare
  one per initial input that can carry a file.

## 2. The flows leaf

```
flows/<name>/
  tool.json      # name "<name>_flow" (underscores), kind "flow",
                 # model "<name>", stage_title, description (WHAT the
                 # flow produces + HOW agents drive it — see
                 # flows/extend-video/tool.json, the richest live
                 # leaf), params_schema
  AGENTS.md      # the operator-facing law of the leaf
  agents/AGENT.md             # the driving agent's brief
  agents/skills/<name>-pipeline/SKILL.md   # the stage-by-stage skill
```

The leaf is OWED, not decorative: a row that carries a RegistryTool
(`tool:`) or non-empty `skillRefs` must carry `flows/<name>/tool.json`
— the flows-wiring wall derives that owed roster from the rows and
reds an owed row whose leaf is absent.

The `description` in tool.json is where agents learn the drive model:
stages are AGENT-DRIVEN card chains through the queue door
(`{model: ...}`) — there is no single-shot yaml door
(dev_docs/queue/flows.md).

## 3. Build + the built plane

Every package carries a tracked `lib/` (the tsc output external
consumers import): after ANY `src/` edit in a package you touched,
rebuild and re-stamp it —

```sh
cd packages/<genre>/<pkg> && npm run build
find src \( -name '*.ts' -o -name '*.tsx' \) | sort | xargs sha256sum | sha256sum | cut -c1-16 > lib/.src-stamp
node scripts/canonicalize-sourcemaps.mjs
node scripts/rewrite-dts-specifiers.mjs packages/<genre>/<pkg>
```

A client-bearing package builds `./node_modules/.bin/tsdown` FIRST,
then `tsc` (the client-bundle-freshness wall reads `lib/client.js`'s
mtime against `src/`). The full battery's lib-sync pass reds a stale
`lib/` — it is the build law, not a flake.

## 4. The gates

The walls are vitest specs under `tests/walls/ts/suites/` (the old
`tests/walls/ts/run.mjs` runner and `*.test.ts` spellings died with
the rebuild — never invoke them):

```sh
pnpm install
node node_modules/vitest/vitest.mjs run tests/walls/ts/suites/mod-interlock.spec.ts
node node_modules/vitest/vitest.mjs run tests/walls/ts/suites/models-flows.spec.ts
node node_modules/vitest/vitest.mjs run tests/walls/ts/suites/runs-remote.spec.ts
# or all walls at once (plus every typecheck-owning package's tsc):
node tools/hook-full-battery.mjs
cd packages/harness/estate-queue && pnpm run typecheck
```

## 4. Prove the flow (no second process — the estate row serves)

```sh
MELITE_STATE_ROOT=$(mktemp -d) node test/estate-drive.mjs   # the live lane
# In an agent lane, prove the same contract through melite_load/melite_construct
# validation. Do not curl a raw estate route.
```

A validate with your stages expanded (and the honest refusal from
start if multi-stage) is the flow's proof — served in-process by the
runs registry's `{flow:}` arms on the estate profile.
