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

In `flowsData.ts`, add to `REGISTRY` (a hand-owned table — one
row per flow, sorted keys):

```ts
const MY_FLOW: RegistryFlow = {
  // stages: Record<string, RegistryStage> — each stage names its
  //   card (a REGISTERED card — the amnesty is over; an empty or
  //   unknown card ref refuses LOUD in the models-against-cards wall)
  // inputs: Record<string, RegistryEdge> — initial edges or
  //   fromFlow stage outputs
  // expected/outputs/cardIo: Record<string, string>
  //   THE DERIVATION LAW (roadmap §12): for card= stages, an input
  //   the card's own flowKinds.inputs declares needs NO hand-written
  //   expected — the kind derives from the card (the registry row
  //   never hand-mirrors what the card already declares). A row that
  //   hand-writes a kind the card contradicts refuses LOUD. Hand-
  //   write expected only for initials/edges the card cannot know.
  // params: Record<string, unknown>
};
const REGISTRY: Record<string, RegistryFlow> = {
  ...,
  "my-flow": MY_FLOW,
};
```

Stage shapes that exist (read the file, do not guess):

- `photo` / `glb` / `bake_params` initial kinds
- `card=` stages + FlowTool overlays + skill_refs (carried verbatim)
- `fromFlow` rows resolve against other flows' stages LIVE

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
                 # flows/prop-flow/tool.json), params_schema
  AGENTS.md      # the operator-facing law of the leaf
  agents/AGENT.md             # the driving agent's brief
  agents/skills/<name>-pipeline/SKILL.md   # the stage-by-stage skill
```

The `description` in tool.json is where agents learn the drive model:
stages are AGENT-DRIVEN card chains through the queue door
(`{model: ...}`) — there is no single-shot yaml door
(dev_docs/queue/flows.md).

## 3. The gates

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
