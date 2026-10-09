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
