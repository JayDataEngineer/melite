---
description: The compose kit — pure graph-compose functions (kit lanes, GraphBuilder, facts, generated vocabularies) that card domains reach for instead of hand-building ComfyUI graphs.
kind: package-library
---

# @melite/comfyui-card-kit

`@melite/comfyui-card-kit` is the named package card domains import for
ComfyUI graph composition: lane recipes, the handle-based GraphBuilder,
model-facts loading, generated closed vocabularies, and the modifier
consumption gate. It calls no engine — it produces `/prompt` graph payloads;
the compose seat in `@melite/comfyui-cordis` owns submission. Card packages
and comfyui-cordis mount it by package name, never by an internal path.

## Contract

Pure functions and frozen data; erasable-syntax TS under
`node --experimental-strip-types`, no build step. Recipe law: creation order
is node-id order, so touching a recipe turns the compose wall red on purpose.

- `.` — the kit face: render-kit re-exports, wire-array coercion, seeds,
  actions, lane finals.
- `./graph` — GraphBuilder + OutputHandle: `{ "<id>": { class_type, inputs } }`
  graphs; wires are handles; creation order is the id.
- `./impact` — the Impact detector table (person/face/hand) with provision
  facts (url, sha256, folder).
- `./tts-segments` — the qwen3-tts segment library, keyed on family data.
- `./facts` — `loadFacts` and the model-facts types (lane_inputs rows).
- `./fields` — shared decl layout fragments (sampling grid, spans, params
  zone).
- `./vocab` — generated closed sampler/scheduler sets; an off-set value fails
  at schema parse, never as an engine 400.
- `./paramRows` — shared action param surfaces over the contract's ParamSpec
  grammar.
- `./morphs` — the poser morph vocabulary from the pinned identity-space
  door.
- `./guard` — the consumption gate: a modifier fires only on an atom that
  boarded its pack; otherwise the run refuses loud.
- `./card-definition` — the card plugin contract: `CardDefinition`, its flow
  bindings and compose estate, the plugin-facing `Context` re-export — cards
  declare, the engine composes.
- `./model-contract` — the model family DECL contract: the row schemas
  (source, cell artifact, variant, cell) and their validation —
  `registerFamily` resolves every DECL strictly, refusing stripped keys as
  drift.
- `./service-faces` — the plugin-side service faces: `registerCard`/
  `registerFlavor`/`registerVerb` and `registerFamily`, plus the context
  augmentations; host classes satisfy them structurally.
- `./admission` — the card-side strict resolve (`callableSchema`,
  `gatedResolve`): unknown keys refuse loud (schemastery's strict flag
  silently drops them); schema knobs and declared riders are the only
  admissions.
- `./errors` — `ComposeRefusal`, the compose door's refusal type with its
  `code` — its own module so the wiring wall throws it without importing the
  service.
- `./params-emit` — the params_schema emitter: the Schemastery schema is the
  single knob declaration, projected to the served JSON-Schema dialect
  (`emitKnob`, `emitParamsSpec`, `emitParamsSchema`, `emitModifierKinds`).
- `./semanticModelKnob` — the served model knob as semantic style entries
  derived from the boarded families' DECL rows
  (`semanticModelEntries`, `resolveSemanticModel`), never a bare id list.
- `./linked` — the linked-input spelling: root-relative asset URLs rewrite to
  the runs-root mount path, absolutes ride verbatim; `resolveLinkedInput`
  confines under the runs root.
- `./pack-fields` — the mod packs' field vocabulary (`LorasFields`,
  `ControlNetFields`, `IPAdapterFields`, `MaskFields`, `QvoiceFields`) plus
  the rider tables admission reads.
- `./bare-flavor` — the bare-flavor primitive: parameterized by pack +
  families, it mints the flavor plugin a family's `mods/mask.ts` re-exports.
- `./package.json`.

## Model Experience

### Request context and condition

#### What the model sees

None — the package contributes no model-visible input.

#### Token effect

Zero-direct token effect; its vocabularies surface only inside served form
options owned by other packages.

#### KV Cache effect

Independent — the package holds no conversation state.

## Known Limitations and Deferred Work

- **Generated vocabularies refresh through the regen door** — a new
  engine-side sampler or scheduler is invisible until regen; drift is a loud
  git diff at regen time, never a runtime read.
- **Recipe changes are wall-pinned, not self-healing** — a recipe edit fails
  the compose wall red by design; there is no fallback that silently repairs
  a drifted graph.
